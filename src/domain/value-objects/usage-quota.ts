import { TimeInterval } from '../types';

/**
 * UsageQuota Value Object
 * Represents resource usage limits for AI interactions
 */
export class UsageQuota {
    constructor(
        public readonly maxRequestsPerInterval: number,
        public readonly interval: TimeInterval,
        public readonly currentUsage: number = 0
    ) {
        if (maxRequestsPerInterval <= 0) {
            throw new Error('Max requests per interval must be positive');
        }
        if (currentUsage < 0) {
            throw new Error('Current usage cannot be negative');
        }
        if (currentUsage > maxRequestsPerInterval) {
            throw new Error('Current usage cannot exceed maximum requests');
        }
    }

    /**
     * Creates a quota for requests per minute
     */
    static perMinute(maxRequests: number): UsageQuota {
        return new UsageQuota(maxRequests, TimeInterval.fromMinutes(1));
    }

    /**
     * Creates a quota for requests per hour
     */
    static perHour(maxRequests: number): UsageQuota {
        return new UsageQuota(maxRequests, TimeInterval.fromHours(1));
    }

    /**
     * Creates a quota for requests per day
     */
    static perDay(maxRequests: number): UsageQuota {
        return new UsageQuota(maxRequests, TimeInterval.fromHours(24));
    }

    /**
     * Check if the quota has been exceeded
     */
    isExceeded(): boolean {
        return this.currentUsage >= this.maxRequestsPerInterval;
    }

    /**
     * Check if adding more requests would exceed the quota
     */
    wouldExceed(additionalRequests: number): boolean {
        return (this.currentUsage + additionalRequests) > this.maxRequestsPerInterval;
    }

    /**
     * Get remaining available requests
     */
    getRemainingRequests(): number {
        return Math.max(0, this.maxRequestsPerInterval - this.currentUsage);
    }

    /**
     * Get usage percentage (0-100)
     */
    getUsagePercentage(): number {
        return Math.min(100, (this.currentUsage / this.maxRequestsPerInterval) * 100);
    }

    /**
     * Create a new quota with updated usage
     */
    withUsage(newUsage: number): UsageQuota {
        return new UsageQuota(this.maxRequestsPerInterval, this.interval, newUsage);
    }

    /**
     * Create a new quota with incremented usage
     */
    incrementUsage(amount: number = 1): UsageQuota {
        return this.withUsage(this.currentUsage + amount);
    }

    /**
     * Create a new quota with reset usage
     */
    reset(): UsageQuota {
        return this.withUsage(0);
    }

    equals(other: UsageQuota): boolean {
        return this.maxRequestsPerInterval === other.maxRequestsPerInterval &&
               this.interval.equals(other.interval) &&
               this.currentUsage === other.currentUsage;
    }

    toString(): string {
        return `${this.currentUsage}/${this.maxRequestsPerInterval} requests per ${this.interval.toString()}`;
    }
}
