import { PromptTemplate, TimeInterval } from './value-objects';
import { TemplateId, PromptCategory } from './types';
import { ScheduleConfiguration } from './prompt-scheduler';

/**
 * AutoPrompter main configuration
 */
export class AutoPrompterConfiguration {
    constructor(
        public readonly templates: PromptTemplate[],
        public readonly schedule: ScheduleConfiguration,
        public readonly isEnabled: boolean = true,
        public readonly maxDailyPrompts: number = 100,
        public readonly enabledTargets: string[] = ['github']
    ) {
        if (schedule.intervalMs < 1000) {
            throw new Error('Schedule interval must be at least 1000ms');
        }
        if (maxDailyPrompts < 1) {
            throw new Error('Max daily prompts must be positive');
        }
    }

    /**
     * Creates a new configuration with updated templates
     */
    withTemplates(templates: PromptTemplate[]): AutoPrompterConfiguration {
        return new AutoPrompterConfiguration(
            templates,
            this.schedule,
            this.isEnabled,
            this.maxDailyPrompts,
            this.enabledTargets
        );
    }

    /**
     * Creates a new configuration with updated schedule
     */
    withSchedule(schedule: ScheduleConfiguration): AutoPrompterConfiguration {
        return new AutoPrompterConfiguration(
            this.templates,
            schedule,
            this.isEnabled,
            this.maxDailyPrompts,
            this.enabledTargets
        );
    }

    /**
     * Creates a new configuration with updated enabled state
     */
    withEnabled(enabled: boolean): AutoPrompterConfiguration {
        return new AutoPrompterConfiguration(
            this.templates,
            this.schedule,
            enabled,
            this.maxDailyPrompts,
            this.enabledTargets
        );
    }

    /**
     * Gets a template by ID
     */
    getTemplate(templateId: TemplateId): PromptTemplate | null {
        return this.templates.find(t => t.id === templateId) || null;
    }

    /**
     * Validates the configuration
     */
    validate(): string[] {
        const errors: string[] = [];

        if (this.schedule.intervalMs < 1000) {
            errors.push('Schedule interval must be at least 1000ms');
        }

        if (this.schedule.maxRetries < 0) {
            errors.push('Max retries must be non-negative');
        }

        if (this.maxDailyPrompts < 1) {
            errors.push('Max daily prompts must be positive');
        }

        if (this.templates.length === 0) {
            errors.push('At least one template must be configured');
        }

        // Check for duplicate template IDs
        const templateIds = this.templates.map(t => t.id);
        const uniqueIds = new Set(templateIds);
        if (templateIds.length !== uniqueIds.size) {
            errors.push('Template IDs must be unique');
        }

        return errors;
    }

    /**
     * Creates a default configuration
     */
    static createDefault(): AutoPrompterConfiguration {
        const defaultTemplate = new PromptTemplate(
            'default-general',
            'General Code Review',
            'Please review the current code and provide suggestions for improvement.',
            PromptCategory.CodeReview,
            []
        );

        const defaultSchedule: ScheduleConfiguration = {
            intervalMs: 300000, // 5 minutes
            isActive: false,
            maxRetries: 3
        };

        return new AutoPrompterConfiguration(
            [defaultTemplate],
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
