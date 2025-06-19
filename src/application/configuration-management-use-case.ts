import { TimeInterval } from '../domain';
import { IConfigurationService } from './interfaces';

/**
 * ConfigurationManagementUseCase
 * 
 * Manages AutoPrompter configuration including:
 * 1. Prompt text management
 * 2. Minimal interval configuration
 * 3. Automation enable/disable controls
 * 4. Configuration validation and persistence
 * 5. Workspace-specific configuration operations
 */
export class ConfigurationManagementUseCase {
    constructor(
        private readonly configService: IConfigurationService
    ) {}

    /**
     * Gets the current prompt text
     * @returns Current prompt text
     */
    async getPromptText(): Promise<string> {
        return await this.configService.getPromptText();
    }

    /**
     * Updates the prompt text
     * @param promptText New prompt text
     */
    async setPromptText(promptText: string): Promise<void> {
        if (!promptText.trim()) {
            throw new Error('Prompt text cannot be empty');
        }
        await this.configService.setPromptText(promptText);
    }

    /**
     * Gets the current minimal interval
     * @returns Current minimal interval
     */
    async getMinimalInterval(): Promise<TimeInterval> {
        return await this.configService.getMinimalInterval();
    }

    /**
     * Updates the minimal interval
     * @param interval New minimal interval (must be at least 1 second)
     */
    async setMinimalInterval(interval: TimeInterval): Promise<void> {
        if (interval.ms < 1000) {
            throw new Error('Minimal interval must be at least 1 second');
        }
        await this.configService.setMinimalInterval(interval);
    }

    /**
     * Checks if automation is currently enabled
     * @returns true if automation is enabled
     */
    async isAutomationEnabled(): Promise<boolean> {
        return await this.configService.isAutomationEnabled();
    }

    /**
     * Enables or disables automation
     * @param enabled Whether automation should be enabled
     */
    async setAutomationEnabled(enabled: boolean): Promise<void> {
        await this.configService.setAutomationEnabled(enabled);
    }

    /**
     * Gets workspace configuration information
     * @returns Workspace configuration details
     */
    async getWorkspaceConfigurationInfo(): Promise<{
        hasWorkspaceSettings: boolean;
        workspaceName: string | undefined;
        settingsLocation: string;
        configuredSettings: string[];
    }> {
        // Check if the config service has workspace-specific methods
        if ('getWorkspaceConfigurationInfo' in this.configService && 
            typeof (this.configService as any).getWorkspaceConfigurationInfo === 'function') {
            return await (this.configService as any).getWorkspaceConfigurationInfo();
        }
        
        // Fallback for services that don't support workspace operations
        return {
            hasWorkspaceSettings: false,
            workspaceName: undefined,
            settingsLocation: 'Global settings',
            configuredSettings: []
        };
    }

    /**
     * Copies global settings to workspace
     */
    async copyGlobalToWorkspace(): Promise<void> {
        if ('copyGlobalToWorkspace' in this.configService && 
            typeof (this.configService as any).copyGlobalToWorkspace === 'function') {
            await (this.configService as any).copyGlobalToWorkspace();
        } else {
            throw new Error('Workspace operations are not supported by the current configuration service');
        }
    }

    /**
     * Resets workspace settings to defaults
     */
    async resetWorkspaceToDefaults(): Promise<void> {
        if ('resetToDefaults' in this.configService && 
            typeof (this.configService as any).resetToDefaults === 'function') {
            await (this.configService as any).resetToDefaults();
        } else {
            throw new Error('Workspace operations are not supported by the current configuration service');
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
            // Check prompt text
            const promptText = await this.configService.getPromptText();
            if (!promptText.trim()) {
                issues.push('Prompt text is empty');
            }

            // Check minimal interval
            const interval = await this.configService.getMinimalInterval();
            if (interval.ms < 1000) {
                issues.push('Minimal interval is less than 1 second');
            }
            if (interval.ms > 24 * 60 * 60 * 1000) {
                issues.push('Minimal interval exceeds 24 hours');
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
        promptText: string;
        minimalInterval: string;
        automationEnabled: boolean;
        configurationValid: boolean;
    }> {
        try {
            const promptText = await this.configService.getPromptText();
            const interval = await this.configService.getMinimalInterval();
            const automationEnabled = await this.configService.isAutomationEnabled();
            const validation = await this.validateConfiguration();

            return {
                promptText: promptText.length > 50 ? promptText.substring(0, 50) + '...' : promptText,
                minimalInterval: interval.toString(),
                automationEnabled,
                configurationValid: validation.isValid
            };
        } catch (error) {
            throw new Error(`Failed to get configuration summary: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Creates a recommended configuration based on user context
     * @param userContext Optional context about user's preferences
     * @returns Recommended configuration values
     */
    async getRecommendedConfiguration(userContext?: {
        projectType?: string;
        experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
        focusArea?: 'general' | 'performance' | 'security' | 'testing';
    }): Promise<{
        promptText: string;
        minimalInterval: TimeInterval;
    }> {
        // Default recommendations
        let promptText = 'Please review the current code and provide suggestions for improvement.';
        let minimalInterval = TimeInterval.fromMinutes(1);

        if (userContext) {
            // Customize based on focus area
            switch (userContext.focusArea) {
                case 'performance':
                    promptText = 'Please analyze this code for performance optimization opportunities, including algorithm efficiency, memory usage, and resource utilization.';
                    break;
                case 'security':
                    promptText = 'Please review this code for potential security vulnerabilities and suggest security best practices.';
                    break;
                case 'testing':
                    promptText = 'Please suggest unit tests for this code, covering normal cases, edge cases, and error conditions.';
                    break;
                default:
                    promptText = 'Please review the current code and provide suggestions for improvement.';
            }

            // Adjust interval based on experience level
            switch (userContext.experienceLevel) {
                case 'beginner':
                    minimalInterval = TimeInterval.fromMinutes(2); // Less frequent for beginners
                    break;
                case 'intermediate':
                    minimalInterval = TimeInterval.fromMinutes(1);
                    break;
                case 'advanced':
                    minimalInterval = TimeInterval.fromSeconds(30); // More frequent for advanced users
                    break;
            }
        }

        return {
            promptText,
            minimalInterval
        };
    }
}
