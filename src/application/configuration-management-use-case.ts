import { PromptTemplate, TimeInterval } from '../domain';
import { TemplateId } from '../domain/types';
import { IConfigurationService } from './interfaces';

/**
 * ConfigurationManagementUseCase
 * 
 * Manages AutoPrompter configuration including:
 * 1. Prompt template management (CRUD operations)
 * 2. Schedule interval configuration
 * 3. Automation enable/disable controls
 * 4. Configuration validation and persistence
 */
export class ConfigurationManagementUseCase {
    constructor(
        private readonly configService: IConfigurationService
    ) {}

    /**
     * Updates an existing prompt template
     * @param templateId ID of the template to update
     * @param template Updated template data
     */
    async updatePromptTemplate(templateId: TemplateId, template: PromptTemplate): Promise<void> {
        if (template.id !== templateId) {
            throw new Error('Template ID mismatch: provided ID does not match template ID');
        }

        try {
            await this.configService.updatePromptTemplate(templateId, template);
        } catch (error) {
            throw new Error(`Failed to update prompt template: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Creates a new prompt template
     * @param template New template to create
     */
    async createPromptTemplate(template: PromptTemplate): Promise<void> {
        // Check if template with same ID already exists
        const existingTemplates = await this.configService.getPromptTemplates();
        const existingTemplate = existingTemplates.find(t => t.id === template.id);
        
        if (existingTemplate) {
            throw new Error(`Template with ID '${template.id}' already exists`);
        }

        try {
            await this.configService.updatePromptTemplate(template.id, template);
        } catch (error) {
            throw new Error(`Failed to create prompt template: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Deletes a prompt template
     * @param templateId ID of the template to delete
     */
    async deletePromptTemplate(templateId: TemplateId): Promise<void> {
        const existingTemplates = await this.configService.getPromptTemplates();
        const templateExists = existingTemplates.some(t => t.id === templateId);
        
        if (!templateExists) {
            throw new Error(`Template with ID '${templateId}' not found`);
        }

        try {
            // Implementation depends on configuration service supporting deletion
            // For now, we'll throw an error indicating this needs to be implemented
            throw new Error('Template deletion not yet implemented in configuration service');
        } catch (error) {
            throw new Error(`Failed to delete prompt template: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Gets all prompt templates
     * @returns Array of all configured prompt templates
     */
    async getPromptTemplates(): Promise<PromptTemplate[]> {
        try {
            return await this.configService.getPromptTemplates();
        } catch (error) {
            throw new Error(`Failed to retrieve prompt templates: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Gets a specific prompt template by ID
     * @param templateId ID of the template to retrieve
     * @returns The template if found, null otherwise
     */
    async getPromptTemplate(templateId: TemplateId): Promise<PromptTemplate | null> {
        try {
            const templates = await this.configService.getPromptTemplates();
            return templates.find(t => t.id === templateId) || null;
        } catch (error) {
            throw new Error(`Failed to retrieve prompt template: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Sets the schedule interval for automated prompting
     * @param interval New time interval between prompts
     */
    async setScheduleInterval(interval: TimeInterval): Promise<void> {
        if (interval.ms < 1000) {
            throw new Error('Schedule interval must be at least 1 second');
        }

        if (interval.ms > 24 * 60 * 60 * 1000) { // 24 hours
            throw new Error('Schedule interval cannot exceed 24 hours');
        }

        try {
            await this.configService.setScheduleInterval(interval);
        } catch (error) {
            throw new Error(`Failed to set schedule interval: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Gets the current schedule interval
     * @returns Current time interval between prompts
     */
    async getScheduleInterval(): Promise<TimeInterval> {
        try {
            return await this.configService.getScheduleInterval();
        } catch (error) {
            throw new Error(`Failed to get schedule interval: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Pauses automation by disabling automated prompting
     */
    async pauseAutomation(): Promise<void> {
        try {
            await this.configService.setAutomationEnabled(false);
        } catch (error) {
            throw new Error(`Failed to pause automation: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Resumes automation by enabling automated prompting
     */
    async resumeAutomation(): Promise<void> {
        try {
            await this.configService.setAutomationEnabled(true);
        } catch (error) {
            throw new Error(`Failed to resume automation: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Checks if automation is currently enabled
     * @returns true if automation is enabled, false otherwise
     */
    async isAutomationEnabled(): Promise<boolean> {
        try {
            return await this.configService.isAutomationEnabled();
        } catch (error) {
            throw new Error(`Failed to check automation status: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Toggles automation state (enabled <-> disabled)
     * @returns New automation state
     */
    async toggleAutomation(): Promise<boolean> {
        try {
            const currentState = await this.configService.isAutomationEnabled();
            const newState = !currentState;
            await this.configService.setAutomationEnabled(newState);
            return newState;
        } catch (error) {
            throw new Error(`Failed to toggle automation: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Validates the current configuration
     * @returns Validation result with any issues found
     */
    async validateConfiguration(): Promise<{
        isValid: boolean;
        issues: string[];
    }> {
        const issues: string[] = [];

        try {
            // Check templates
            const templates = await this.configService.getPromptTemplates();
            if (templates.length === 0) {
                issues.push('No prompt templates configured');
            }

            // Validate each template
            for (const template of templates) {
                if (!template.name.trim()) {
                    issues.push(`Template '${template.id}' has empty name`);
                }
                if (!template.content.trim()) {
                    issues.push(`Template '${template.id}' has empty content`);
                }
            }

            // Check schedule interval
            const interval = await this.configService.getScheduleInterval();
            if (interval.ms < 1000) {
                issues.push('Schedule interval is less than 1 second');
            }
            if (interval.ms > 24 * 60 * 60 * 1000) {
                issues.push('Schedule interval exceeds 24 hours');
            }

        } catch (error) {
            issues.push(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    /**
     * Gets a summary of the current configuration
     * @returns Configuration summary
     */
    async getConfigurationSummary(): Promise<{
        templateCount: number;
        scheduleInterval: string;
        automationEnabled: boolean;
        configurationValid: boolean;
    }> {
        try {
            const templates = await this.configService.getPromptTemplates();
            const interval = await this.configService.getScheduleInterval();
            const automationEnabled = await this.configService.isAutomationEnabled();
            const validation = await this.validateConfiguration();

            return {
                templateCount: templates.length,
                scheduleInterval: interval.toString(),
                automationEnabled,
                configurationValid: validation.isValid
            };
        } catch (error) {
            throw new Error(`Failed to get configuration summary: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
