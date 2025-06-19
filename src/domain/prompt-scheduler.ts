import { ScheduleId, AITarget, TimeInterval, DateTime } from '../domain/types';
import { PromptSentEvent } from './events';

export interface ScheduledPrompt {
    id: string;
    promptText: string;
    target: AITarget;
    scheduledFor: DateTime;
}

export interface ScheduleConfiguration {
    minimalIntervalMs: number;
    isActive: boolean;
    maxRetries: number;
}

export class PromptScheduler {
    private readonly scheduleId: ScheduleId;
    private minimalInterval: TimeInterval;
    private isActive: boolean;
    private lastExecuted: DateTime | null;
    private pendingPromptTimeout: NodeJS.Timeout | null = null;
    private readonly events: PromptSentEvent[] = [];

    constructor(
        scheduleId: ScheduleId,
        configuration: ScheduleConfiguration
    ) {
        this.scheduleId = scheduleId;
        this.minimalInterval = TimeInterval.fromSeconds(configuration.minimalIntervalMs / 1000);
        this.isActive = configuration.isActive;
        this.lastExecuted = null;
    }

    schedule(promptText: string, target: AITarget): ScheduledPrompt {
        const scheduledFor = this.calculateNextExecution();
        
        return {
            id: Math.random().toString(36).substr(2, 9),
            promptText,
            target,
            scheduledFor
        };
    }

    /**
     * Triggers immediate prompt execution if minimal interval has passed
     * If minimal interval hasn't passed, schedules for when it completes
     */
    triggerOnIdle(promptText: string, target: AITarget, onExecute: (prompt: ScheduledPrompt) => void): void {
        if (!this.isActive) {
            return;
        }

        const canExecuteNow = this.canExecute();
        const scheduledPrompt = this.schedule(promptText, target);

        if (canExecuteNow) {
            // Execute immediately
            onExecute(scheduledPrompt);
            this.markExecuted();
        } else {
            // Schedule for when minimal interval completes
            const timeUntilCanExecute = this.getTimeUntilCanExecute();
            
            if (this.pendingPromptTimeout) {
                clearTimeout(this.pendingPromptTimeout);
            }
            
            this.pendingPromptTimeout = setTimeout(() => {
                onExecute(scheduledPrompt);
                this.markExecuted();
                this.pendingPromptTimeout = null;
            }, timeUntilCanExecute.ms);
        }
    }

    pause(): void {
        this.isActive = false;
        if (this.pendingPromptTimeout) {
            clearTimeout(this.pendingPromptTimeout);
            this.pendingPromptTimeout = null;
        }
    }

    resume(): void {
        this.isActive = true;
    }

    canExecute(): boolean {
        if (!this.isActive) {
            return false;
        }

        if (!this.lastExecuted) {
            return true;
        }

        const timeSinceLastExecution = DateTime.now().toDate().getTime() - 
                                     this.lastExecuted.toDate().getTime();
        
        return timeSinceLastExecution >= this.minimalInterval.ms;
    }

    /**
     * Gets the time remaining until a prompt can be executed
     */
    getTimeUntilCanExecute(): TimeInterval {
        if (!this.lastExecuted || this.canExecute()) {
            return TimeInterval.fromSeconds(0);
        }

        const timeSinceLastExecution = DateTime.now().toDate().getTime() - 
                                     this.lastExecuted.toDate().getTime();
        
        const remainingMs = this.minimalInterval.ms - timeSinceLastExecution;
        return new TimeInterval(Math.max(0, remainingMs));
    }

    markExecuted(): void {
        this.lastExecuted = DateTime.now();
        this.events.push(new PromptSentEvent('', '', ''));
    }

    updateMinimalInterval(interval: TimeInterval): void {
        this.minimalInterval = interval;
    }

    getEvents(): PromptSentEvent[] {
        return [...this.events];
    }

    clearEvents(): void {
        this.events.length = 0;
    }

    getId(): ScheduleId {
        return this.scheduleId;
    }

    private calculateNextExecution(): DateTime {
        if (!this.lastExecuted) {
            return DateTime.now();
        }

        const nextTime = new Date(this.lastExecuted.toDate().getTime() + this.minimalInterval.ms);
        return DateTime.fromDate(nextTime);
    }
}
