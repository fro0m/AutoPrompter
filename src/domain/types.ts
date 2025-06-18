// Basic types for the domain
export type ScheduleId = string;
export type SessionId = string;
export type TemplateId = string;
export type ExecutionId = string;

export enum SessionState {
    Inactive = 'inactive',
    Active = 'active',
    Paused = 'paused'
}

export enum AITarget {
    GitHub = 'github',
    Cursor = 'cursor'
}

export enum PromptCategory {
    CodeReview = 'code-review',
    Optimization = 'optimization', 
    Documentation = 'documentation',
    Testing = 'testing',
    Debugging = 'debugging',
    General = 'general'
}

export class DateTime {
    constructor(private readonly date: Date) {}

    static now(): DateTime {
        return new DateTime(new Date());
    }

    static fromDate(date: Date): DateTime {
        return new DateTime(date);
    }

    isBefore(other: DateTime): boolean {
        return this.date.getTime() < other.date.getTime();
    }

    minus(interval: TimeInterval): DateTime {
        return new DateTime(new Date(this.date.getTime() - interval.ms));
    }

    toDate(): Date {
        return new Date(this.date);
    }
}

export class TimeInterval {
    constructor(private readonly milliseconds: number) {
        if (milliseconds < 0) {
            throw new Error('Interval must be non-negative');
        }
    }

    static fromMinutes(minutes: number): TimeInterval {
        if (minutes < 0) {
            throw new Error('Minutes must be non-negative');
        }
        return new TimeInterval(minutes * 60 * 1000);
    }

    static fromSeconds(seconds: number): TimeInterval {
        if (seconds < 0) {
            throw new Error('Seconds must be non-negative');
        }
        return new TimeInterval(seconds * 1000);
    }

    static fromHours(hours: number): TimeInterval {
        if (hours < 0) {
            throw new Error('Hours must be non-negative');
        }
        return new TimeInterval(hours * 60 * 60 * 1000);
    }

    get ms(): number {
        return this.milliseconds;
    }

    get seconds(): number {
        return Math.floor(this.milliseconds / 1000);
    }

    get minutes(): number {
        return Math.floor(this.milliseconds / (60 * 1000));
    }

    get hours(): number {
        return Math.floor(this.milliseconds / (60 * 60 * 1000));
    }

    equals(other: TimeInterval): boolean {
        return this.milliseconds === other.milliseconds;
    }

    isLongerThan(other: TimeInterval): boolean {
        return this.milliseconds > other.milliseconds;
    }

    isShorterThan(other: TimeInterval): boolean {
        return this.milliseconds < other.milliseconds;
    }

    add(other: TimeInterval): TimeInterval {
        return new TimeInterval(this.milliseconds + other.milliseconds);
    }

    toString(): string {
        if (this.milliseconds < 1000) {
            return `${this.milliseconds}ms`;
        } else if (this.milliseconds < 60 * 1000) {
            return `${this.seconds}s`;
        } else if (this.milliseconds < 60 * 60 * 1000) {
            return `${this.minutes}m`;
        } else {
            return `${this.hours}h`;
        }
    }
}
