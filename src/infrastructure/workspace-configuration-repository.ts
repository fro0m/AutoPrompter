import * as vscode from 'vscode';
import { IConfigurationRepository, AutoPrompterConfiguration, ScheduleConfiguration } from '../domain';
import { IConfigurationService } from '../application/interfaces';
import { TimeInterval } from '../domain/value-objects';

/**
 * Workspace Configuration Repository
 * 
 * Implements configuration persistence using VS Code's workspace configuration system.
 * Provides a clean abstraction over VS Code's configuration API with proper error handling
 * and validation for AutoPrompter settings.
 */
export class WorkspaceConfigurationRepository implements IConfigurationRepository, IConfigurationService {
    private readonly configurationSection = 'autoprompter';
    private readonly watchers: Array<(config: AutoPrompterConfiguration) => void> = [];
    private configurationWatcher: vscode.Disposable | null = null;

    constructor() {
        this.setupConfigurationWatcher();
    }

    /**
     * Loads the current configuration from VS Code workspace settings
     * @returns Promise resolving to AutoPrompterConfiguration
     */
    async load(): Promise<AutoPrompterConfiguration> {
        try {
            const workspaceConfig = vscode.workspace.getConfiguration(this.configurationSection);
            
            // Load prompt text
            const promptText = workspaceConfig.get<string>('promptText', 'Please review the current code and provide suggestions for improvement.');
            
            // Load schedule configuration
            const scheduleData = workspaceConfig.get<any>('schedule', {});
            const schedule: ScheduleConfiguration = {
                minimalIntervalMs: scheduleData.minimalIntervalMs || 60000, // 1 minute default
                isActive: scheduleData.isActive || false,
                maxRetries: scheduleData.maxRetries || 3
            };
            
            // Load other settings
            const isEnabled = workspaceConfig.get<boolean>('enabled', false);
            const maxDailyPrompts = workspaceConfig.get<number>('maxDailyPrompts', 50);
            
            return new AutoPrompterConfiguration(
                promptText,
                schedule,
                isEnabled,
                maxDailyPrompts
            );
        } catch (error) {
            console.warn('Failed to load configuration, using defaults:', error);
            return AutoPrompterConfiguration.createDefault();
        }
    }

    /**
     * Saves the configuration to VS Code workspace settings
     * @param config Configuration to save
     */
    async save(config: AutoPrompterConfiguration): Promise<void> {
        try {
            // Validate configuration before saving
            const validationErrors = config.validate();
            if (validationErrors.length > 0) {
                throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
            }

            const workspaceConfig = vscode.workspace.getConfiguration(this.configurationSection);
            
            // Save prompt text
            await workspaceConfig.update('promptText', config.promptText, vscode.ConfigurationTarget.Workspace);
            
            // Save schedule configuration
            await workspaceConfig.update('schedule', config.schedule, vscode.ConfigurationTarget.Workspace);
            
            // Save other settings
            await workspaceConfig.update('enabled', config.isEnabled, vscode.ConfigurationTarget.Workspace);
            await workspaceConfig.update('maxDailyPrompts', config.maxDailyPrompts, vscode.ConfigurationTarget.Workspace);
            
            console.log('Configuration saved successfully');
        } catch (error) {
            console.error('Failed to save configuration:', error);
            throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Registers a callback to be called when configuration changes
     * @param callback Function to call when configuration changes
     */
    watch(callback: (config: AutoPrompterConfiguration) => void): void {
        this.watchers.push(callback);
    }

    /**
     * Checks if the workspace has AutoPrompter configuration
     * @returns true if configuration exists in workspace
     */
    async hasWorkspaceConfiguration(): Promise<boolean> {
        const workspaceConfig = vscode.workspace.getConfiguration(this.configurationSection);
        const inspect = workspaceConfig.inspect('enabled');
        return inspect?.workspaceValue !== undefined || 
               inspect?.workspaceFolderValue !== undefined;
    }

    /**
     * Resets configuration to defaults
     */
    async resetToDefaults(): Promise<void> {
        const defaultConfig = AutoPrompterConfiguration.createDefault();
        await this.save(defaultConfig);
    }

    /**
     * Disposes of the configuration watcher
     */
    dispose(): void {
        if (this.configurationWatcher) {
            this.configurationWatcher.dispose();
            this.configurationWatcher = null;
        }
        this.watchers.length = 0;
    }

    // IConfigurationService interface methods
    async getPromptText(): Promise<string> {
        const config = await this.load();
        return config.promptText;
    }

    async setPromptText(promptText: string): Promise<void> {
        const config = await this.load();
        const updatedConfig = config.withPromptText(promptText);
        await this.save(updatedConfig);
    }

    async getMinimalInterval(): Promise<TimeInterval> {
        const config = await this.load();
        return TimeInterval.fromSeconds(config.schedule.minimalIntervalMs / 1000);
    }

    async setMinimalInterval(interval: TimeInterval): Promise<void> {
        const config = await this.load();
        const updatedSchedule: ScheduleConfiguration = {
            ...config.schedule,
            minimalIntervalMs: interval.ms
        };
        const updatedConfig = config.withSchedule(updatedSchedule);
        await this.save(updatedConfig);
    }

    async isAutomationEnabled(): Promise<boolean> {
        const config = await this.load();
        return config.isEnabled;
    }

    async setAutomationEnabled(enabled: boolean): Promise<void> {
        const config = await this.load();
        const updatedConfig = config.withEnabled(enabled);
        await this.save(updatedConfig);
    }

    /**
     * Sets up automatic configuration watching
     */
    private setupConfigurationWatcher(): void {
        this.configurationWatcher = vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration(this.configurationSection)) {
                try {
                    const updatedConfig = await this.load();
                    this.notifyWatchers(updatedConfig);
                } catch (error) {
                    console.error('Failed to reload configuration:', error);
                }
            }
        });
    }

    /**
     * Notifies all registered watchers of configuration changes
     */
    private notifyWatchers(config: AutoPrompterConfiguration): void {
        this.watchers.forEach(watcher => {
            try {
                watcher(config);
            } catch (error) {
                console.error('Error in configuration watcher:', error);
            }
        });
    }
}
