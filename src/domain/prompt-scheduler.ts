import { ScheduleId, AITarget, TimeInterval, DateTime } from '../domain/types';
import { PromptSentEvent } from './events';
import { PromptTemplate } from './value-objects';

export interface ScheduledPrompt {
    id: string;
    template: PromptTemplate;
    target: AITarget;
    scheduledFor: DateTime;
}

export interface ScheduleConfiguration {
    intervalMs: number;
    isActive: boolean;
    maxRetries: number;
}

export class PromptScheduler {
    private readonly scheduleId: ScheduleId;
    private interval: TimeInterval;
    private isActive: boolean;
    private lastExecuted: DateTime | null;
    private timerId: NodeJS.Timeout | null = null;
    private readonly events: PromptSentEvent[] = [];

    constructor(
        scheduleId: ScheduleId,
        configuration: ScheduleConfiguration
    ) {
        this.scheduleId = scheduleId;
        this.interval = TimeInterval.fromSeconds(configuration.intervalMs / 1000);
        this.isActive = configuration.isActive;
        this.lastExecuted = null;
    }

    schedule(template: PromptTemplate, target: AITarget): ScheduledPrompt {
        const scheduledFor = this.calculateNextExecution();
        
        return {
            id: Math.random().toString(36).substr(2, 9),
            template,
            target,
            scheduledFor
        };
    }

    pause(): void {
        this.isActive = false;
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    resume(): void {
        this.isActive = true;
        this.startTimer();
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
        
        return timeSinceLastExecution >= this.interval.ms;
    }

    markExecuted(): void {
        this.lastExecuted = DateTime.now();
        this.events.push(new PromptSentEvent('', '', ''));
    }

    updateInterval(interval: TimeInterval): void {
        this.interval = interval;
        
        // Restart timer with new interval if active
        if (this.isActive && this.timerId) {
            this.pause();
            this.resume();
        }
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

        const nextTime = new Date(this.lastExecuted.toDate().getTime() + this.interval.ms);
        return DateTime.fromDate(nextTime);
    }

    private startTimer(): void {
        if (this.timerId) {
            clearInterval(this.timerId);
        }

        this.timerId = setInterval(() => {
            // This would trigger the execution logic
            // In practice, this would emit an event or call a callback
        }, this.interval.ms);
    }
}
