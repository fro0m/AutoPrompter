import { ScheduleConfiguration } from './prompt-scheduler';

/**
 * AutoPrompter main configuration
 */
export class AutoPrompterConfiguration {
    constructor(
        public readonly promptText: string,
        public readonly schedule: ScheduleConfiguration,
        public readonly isEnabled: boolean = true,
        public readonly maxDailyPrompts: number = 100
    ) {
        if (schedule.minimalIntervalMs < 1000) {
            throw new Error('Minimal interval must be at least 1000ms');
        }
        if (maxDailyPrompts < 1) {
            throw new Error('Max daily prompts must be positive');
        }
        if (!promptText.trim()) {
            throw new Error('Prompt text cannot be empty');
        }
    }

    /**
     * Creates a new configuration with updated prompt text
     */
    withPromptText(promptText: string): AutoPrompterConfiguration {
        return new AutoPrompterConfiguration(
            promptText,
            this.schedule,
            this.isEnabled,
            this.maxDailyPrompts
        );
    }

    /**
     * Creates a new configuration with updated schedule
     */
    withSchedule(schedule: ScheduleConfiguration): AutoPrompterConfiguration {
        return new AutoPrompterConfiguration(
            this.promptText,
            schedule,
            this.isEnabled,
            this.maxDailyPrompts
        );
    }

    /**
     * Creates a new configuration with updated enabled state
     */
    withEnabled(enabled: boolean): AutoPrompterConfiguration {
        return new AutoPrompterConfiguration(
            this.promptText,
            this.schedule,
            enabled,
            this.maxDailyPrompts
        );
    }

    /**
     * Validates the configuration
     */
    validate(): string[] {
        const errors: string[] = [];

        if (this.schedule.minimalIntervalMs < 1000) {
            errors.push('Minimal interval must be at least 1000ms');
        }

        if (this.schedule.maxRetries < 0) {
            errors.push('Max retries must be non-negative');
        }

        if (this.maxDailyPrompts < 1) {
            errors.push('Max daily prompts must be positive');
        }

        if (!this.promptText.trim()) {
            errors.push('Prompt text cannot be empty');
        }

        return errors;
    }

    /**
     * Creates a default configuration
     */
    static createDefault(): AutoPrompterConfiguration {
        const defaultSchedule: ScheduleConfiguration = {
            minimalIntervalMs: 60000, // 1 minute minimal interval
            isActive: false,
            maxRetries: 3
        };

        return new AutoPrompterConfiguration(
            'Please review the current code and provide suggestions for improvement.',
            defaultSchedule,
            false, // Start disabled by default
            50
        );
    }
}

/**
 * Repository interface for configuration persistence
 */
export interface IConfigurationRepository {
    load(): Promise<AutoPrompterConfiguration>;
    save(config: AutoPrompterConfiguration): Promise<void>;
    watch(callback: (config: AutoPrompterConfiguration) => void): void;
}
