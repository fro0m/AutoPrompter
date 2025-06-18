import * as vscode from 'vscode';
import { PromptScheduler, PromptTemplate, TimeInterval, RenderedPrompt } from '../domain';
import { AITarget, PromptCategory } from '../domain/types';
import { IPromptDeliveryService, ExecutionResult } from '../application/interfaces';

/**
 * Rate limiting interface for controlling prompt execution frequency
 */
export interface RateLimitConfig {
    maxPromptsPerMinute: number;
    maxPromptsPerHour: number;
    maxPromptsPerDay: number;
    burstLimit: number; // Maximum prompts in a burst
    cooldownMs: number; // Cooldown period after burst
}

/**
 * Scheduled prompt execution details
 */
export interface ScheduledExecution {
    id: string;
    templateId: string;
    target: AITarget;
    scheduledTime: Date;
    priority: number;
    retryCount: number;
    maxRetries: number;
}

/**
 * PromptSchedulingEngine
 * 
 * Advanced scheduling engine that orchestrates automated prompt execution
 * with rate limiting, retry logic, and priority-based queuing.
 */
export class PromptSchedulingEngine {
    private readonly schedulers: Map<string, PromptScheduler> = new Map();
    private readonly executionQueue: ScheduledExecution[] = [];
    private readonly executionHistory: { timestamp: Date; success: boolean }[] = [];
    private readonly rateLimitConfig: RateLimitConfig;
    private mainTimer: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private lastBurstTime: Date | null = null;
    private burstCount: number = 0;

    constructor(
        private readonly deliveryService: IPromptDeliveryService,
        rateLimitConfig?: Partial<RateLimitConfig>
    ) {
        this.rateLimitConfig = {
            maxPromptsPerMinute: 2,
            maxPromptsPerHour: 20,
            maxPromptsPerDay: 100,
            burstLimit: 3,
            cooldownMs: 60000, // 1 minute cooldown
            ...rateLimitConfig
        };
        
        // Clean up execution history every hour
        setInterval(() => this.cleanupExecutionHistory(), 60 * 60 * 1000);
    }

    /**
     * Registers a scheduler for automated execution
     */
    registerScheduler(schedulerId: string, scheduler: PromptScheduler): void {
        this.schedulers.set(schedulerId, scheduler);
        
        if (this.schedulers.size === 1 && !this.isRunning) {
            this.start();
        }
    }

    /**
     * Unregisters a scheduler
     */
    unregisterScheduler(schedulerId: string): void {
        const scheduler = this.schedulers.get(schedulerId);
        if (scheduler) {
            scheduler.pause();
            this.schedulers.delete(schedulerId);
        }
        
        if (this.schedulers.size === 0 && this.isRunning) {
            this.stop();
        }
    }

    /**
     * Schedules a prompt for execution
     */
    schedulePrompt(
        templateId: string,
        template: PromptTemplate,
        target: AITarget,
        delay: TimeInterval = TimeInterval.fromSeconds(0),
        priority: number = 0,
        maxRetries: number = 3
    ): string {
        const execution: ScheduledExecution = {
            id: this.generateExecutionId(),
            templateId,
            target,
            scheduledTime: new Date(Date.now() + delay.ms),
            priority,
            retryCount: 0,
            maxRetries
        };

        this.insertIntoQueue(execution);
        return execution.id;
    }

    /**
     * Cancels a scheduled prompt execution
     */
    cancelExecution(executionId: string): boolean {
        const index = this.executionQueue.findIndex(exec => exec.id === executionId);
        if (index !== -1) {
            this.executionQueue.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Gets the current execution queue status
     */
    getQueueStatus(): {
        pending: number;
        nextExecution: Date | null;
        rateLimitStatus: {
            canExecuteNow: boolean;
            nextAvailableTime: Date | null;
            dailyUsage: number;
            hourlyUsage: number;
            minuteUsage: number;
        };
    } {
        const now = new Date();
        const rateLimitStatus = this.checkRateLimit(now);
        
        return {
            pending: this.executionQueue.length,
            nextExecution: this.executionQueue.length > 0 ? this.executionQueue[0].scheduledTime : null,
            rateLimitStatus: {
                canExecuteNow: rateLimitStatus.allowed,
                nextAvailableTime: rateLimitStatus.nextAvailableTime,
                dailyUsage: this.getUsageCount(now, 24 * 60 * 60 * 1000),
                hourlyUsage: this.getUsageCount(now, 60 * 60 * 1000),
                minuteUsage: this.getUsageCount(now, 60 * 1000)
            }
        };
    }

    /**
     * Starts the scheduling engine
     */
    start(): void {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        this.mainTimer = setInterval(() => {
            this.processExecutionQueue();
        }, 5000); // Check every 5 seconds

        console.log('PromptSchedulingEngine started');
    }

    /**
     * Stops the scheduling engine
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        if (this.mainTimer) {
            clearInterval(this.mainTimer);
            this.mainTimer = null;
        }

        // Pause all registered schedulers
        for (const scheduler of this.schedulers.values()) {
            scheduler.pause();
        }

        console.log('PromptSchedulingEngine stopped');
    }

    /**
     * Forces immediate execution of next pending prompt (bypassing some rate limits)
     */
    async executeNow(): Promise<ExecutionResult | null> {
        if (this.executionQueue.length === 0) {
            return null;
        }

        const execution = this.executionQueue.shift()!;
        return await this.executePrompt(execution, true);
    }

    /**
     * Processes the execution queue
     */
    private async processExecutionQueue(): Promise<void> {
        if (this.executionQueue.length === 0) {
            return;
        }

        const now = new Date();
        const rateLimitCheck = this.checkRateLimit(now);

        if (!rateLimitCheck.allowed) {
            console.log(`Rate limit reached. Next available: ${rateLimitCheck.nextAvailableTime}`);
            return;
        }

        // Find next execution that's ready
        const readyIndex = this.executionQueue.findIndex(exec => exec.scheduledTime <= now);
        if (readyIndex === -1) {
            return;
        }

        const execution = this.executionQueue.splice(readyIndex, 1)[0];
        await this.executePrompt(execution);
    }

    /**
     * Executes a single prompt
     */
    private async executePrompt(execution: ScheduledExecution, forceExecution: boolean = false): Promise<ExecutionResult> {
        try {
            // Get the template (in a real implementation, this would come from a template service)
            const template = await this.getTemplate(execution.templateId);
            if (!template) {
                throw new Error(`Template not found: ${execution.templateId}`);
            }

            // Create rendered prompt
            const renderedPrompt = new RenderedPrompt(template.content, execution.templateId);

            // Send the prompt
            const result = await this.deliveryService.sendToAI(renderedPrompt, execution.target);
            
            // Record successful execution
            this.recordExecution(true);
            this.updateBurstTracking();

            return ExecutionResult.success('Prompt executed successfully', result);

        } catch (error) {
            console.error(`Failed to execute prompt: ${error}`);
            
            // Record failed execution
            this.recordExecution(false);

            // Handle retry logic
            if (execution.retryCount < execution.maxRetries) {
                execution.retryCount++;
                execution.scheduledTime = new Date(Date.now() + (execution.retryCount * 30000)); // Exponential backoff
                this.insertIntoQueue(execution);
                return ExecutionResult.failed(`Execution failed, retrying (${execution.retryCount}/${execution.maxRetries})`, error as Error);
            } else {
                return ExecutionResult.failed('Execution failed after max retries', error as Error);
            }
        }
    }

    /**
     * Checks if execution is allowed based on rate limits
     */
    private checkRateLimit(now: Date): { allowed: boolean; nextAvailableTime: Date | null } {
        // Check burst limit
        if (this.lastBurstTime && (now.getTime() - this.lastBurstTime.getTime()) < this.rateLimitConfig.cooldownMs) {
            if (this.burstCount >= this.rateLimitConfig.burstLimit) {
                return {
                    allowed: false,
                    nextAvailableTime: new Date(this.lastBurstTime.getTime() + this.rateLimitConfig.cooldownMs)
                };
            }
        }

        // Check minute limit
        const minuteUsage = this.getUsageCount(now, 60 * 1000);
        if (minuteUsage >= this.rateLimitConfig.maxPromptsPerMinute) {
            return {
                allowed: false,
                nextAvailableTime: new Date(now.getTime() + (60 * 1000))
            };
        }

        // Check hour limit
        const hourUsage = this.getUsageCount(now, 60 * 60 * 1000);
        if (hourUsage >= this.rateLimitConfig.maxPromptsPerHour) {
            return {
                allowed: false,
                nextAvailableTime: new Date(now.getTime() + (60 * 60 * 1000))
            };
        }

        // Check daily limit
        const dailyUsage = this.getUsageCount(now, 24 * 60 * 60 * 1000);
        if (dailyUsage >= this.rateLimitConfig.maxPromptsPerDay) {
            return {
                allowed: false,
                nextAvailableTime: new Date(now.getTime() + (24 * 60 * 60 * 1000))
            };
        }

        return { allowed: true, nextAvailableTime: null };
    }

    /**
     * Gets usage count within a time window
     */
    private getUsageCount(now: Date, windowMs: number): number {
        const cutoffTime = new Date(now.getTime() - windowMs);
        return this.executionHistory.filter(entry => 
            entry.timestamp > cutoffTime && entry.success
        ).length;
    }

    /**
     * Records an execution in history
     */
    private recordExecution(success: boolean): void {
        this.executionHistory.push({
            timestamp: new Date(),
            success
        });
    }

    /**
     * Updates burst tracking
     */
    private updateBurstTracking(): void {
        const now = new Date();
        
        if (!this.lastBurstTime || (now.getTime() - this.lastBurstTime.getTime()) > this.rateLimitConfig.cooldownMs) {
            this.burstCount = 1;
            this.lastBurstTime = now;
        } else {
            this.burstCount++;
        }
    }

    /**
     * Inserts execution into priority queue
     */
    private insertIntoQueue(execution: ScheduledExecution): void {
        // Insert maintaining priority order (higher priority first, then by scheduled time)
        let insertIndex = this.executionQueue.length;
        
        for (let i = 0; i < this.executionQueue.length; i++) {
            const existing = this.executionQueue[i];
            
            if (execution.priority > existing.priority || 
                (execution.priority === existing.priority && execution.scheduledTime < existing.scheduledTime)) {
                insertIndex = i;
                break;
            }
        }
        
        this.executionQueue.splice(insertIndex, 0, execution);
    }

    /**
     * Cleans up old execution history
     */
    private cleanupExecutionHistory(): void {
        const cutoffTime = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // Keep 7 days
        const originalLength = this.executionHistory.length;
        
        for (let i = this.executionHistory.length - 1; i >= 0; i--) {
            if (this.executionHistory[i].timestamp < cutoffTime) {
                this.executionHistory.splice(i, 1);
            }
        }
        
        if (this.executionHistory.length < originalLength) {
            console.log(`Cleaned up ${originalLength - this.executionHistory.length} old execution records`);
        }
    }

    /**
     * Gets a template by ID (placeholder implementation)
     */
    private async getTemplate(templateId: string): Promise<PromptTemplate | null> {
        // In a real implementation, this would fetch from a template service
        // For now, return a basic template
        const { PromptTemplate: PT, TemplateVariable } = await import('../domain/value-objects');
        
        return new PT(
            templateId,
            'Default Template',
            'Please provide code suggestions and improvements.',
            PromptCategory.General,
            []
        );
    }

    /**
     * Generates a unique execution ID
     */
    private generateExecutionId(): string {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Disposes of the scheduling engine
     */
    dispose(): void {
        this.stop();
        this.executionQueue.length = 0;
        this.executionHistory.length = 0;
        this.schedulers.clear();
    }
}
