import * as vscode from 'vscode';
import { IConfigurationRepository, AutoPrompterConfiguration, ScheduleConfiguration } from '../domain';
import { IConfigurationService } from '../application/interfaces';
import { TimeInterval } from '../domain/value-objects';

/**
 * Workspace Configuration Repository
 * 
 * Implements configuration persistence using VS Code's workspace configuration system.
 * Provides workspace-specific configuration storage, ensuring each project has its own
 * AutoPrompter settings that are saved independently from other projects.
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
     * Prioritizes workspace-specific settings over user/global settings
     * @returns Promise resolving to AutoPrompterConfiguration
     */
    async load(): Promise<AutoPrompterConfiguration> {
        try {
            console.log('WorkspaceConfigurationRepository: Starting configuration load');
            const workspaceConfig = vscode.workspace.getConfiguration(this.configurationSection);
            console.log('WorkspaceConfigurationRepository: Got workspace configuration object');
            
            // Load prompt text with workspace priority
            const promptTextInspect = workspaceConfig.inspect<string>('promptText');
            console.log('WorkspaceConfigurationRepository: Prompt text inspect:', {
                workspaceFolderValue: promptTextInspect?.workspaceFolderValue,
                workspaceValue: promptTextInspect?.workspaceValue,
                globalValue: promptTextInspect?.globalValue,
                defaultValue: promptTextInspect?.defaultValue
            });
            const promptText = this.getWorkspaceValue(promptTextInspect, 'Please review the current code and provide suggestions for improvement.');
            console.log('WorkspaceConfigurationRepository: Resolved prompt text:', promptText);
            
            // Load minimal interval with workspace priority
            const intervalInspect = workspaceConfig.inspect<number>('minimalIntervalMs');
            console.log('WorkspaceConfigurationRepository: Interval inspect:', {
                workspaceFolderValue: intervalInspect?.workspaceFolderValue,
                workspaceValue: intervalInspect?.workspaceValue,
                globalValue: intervalInspect?.globalValue,
                defaultValue: intervalInspect?.defaultValue
            });
            const minimalIntervalMs = this.getWorkspaceValue(intervalInspect, 60000);
            console.log('WorkspaceConfigurationRepository: Resolved interval ms:', minimalIntervalMs);
            
            // Load enabled state with workspace priority
            const enabledInspect = workspaceConfig.inspect<boolean>('enabled');
            console.log('WorkspaceConfigurationRepository: Enabled inspect:', {
                workspaceFolderValue: enabledInspect?.workspaceFolderValue,
                workspaceValue: enabledInspect?.workspaceValue,
                globalValue: enabledInspect?.globalValue,
                defaultValue: enabledInspect?.defaultValue
            });
            const isEnabled = this.getWorkspaceValue(enabledInspect, false);
            console.log('WorkspaceConfigurationRepository: Resolved enabled state:', isEnabled);
            
            // Create schedule configuration
            const schedule: ScheduleConfiguration = {
                minimalIntervalMs: minimalIntervalMs,
                isActive: isEnabled, // Active when automation is enabled
                maxRetries: 3 // Default value
            };
            console.log('WorkspaceConfigurationRepository: Created schedule config:', schedule);
            
            // Default max daily prompts
            const maxDailyPrompts = 50;
            
            const config = new AutoPrompterConfiguration(
                promptText,
                schedule,
                isEnabled,
                maxDailyPrompts
            );
            console.log('WorkspaceConfigurationRepository: Created configuration object:', {
                promptTextLength: config.promptText.length,
                minimalIntervalMs: config.schedule.minimalIntervalMs,
                isEnabled: config.isEnabled,
                maxDailyPrompts: config.maxDailyPrompts
            });
            
            // Log configuration source information
            const configSource = this.getConfigurationSource();
            console.log('WorkspaceConfigurationRepository: Loaded configuration:', {
                promptText: promptText.substring(0, 50) + '...',
                minimalIntervalMs,
                isEnabled,
                maxDailyPrompts,
                source: configSource
            });
            
            return config;
        } catch (error) {
            console.warn('WorkspaceConfigurationRepository: Failed to load configuration, using defaults:', error);
            return AutoPrompterConfiguration.createDefault();
        }
    }

    /**
     * Saves the configuration to VS Code workspace settings
     * Always saves to workspace scope to ensure per-project configuration
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
            
            // Always save to workspace scope to ensure per-project settings
            const targetScope = this.getConfigurationTarget();
            
            await workspaceConfig.update('promptText', config.promptText, targetScope);
            await workspaceConfig.update('minimalIntervalMs', config.schedule.minimalIntervalMs, targetScope);
            await workspaceConfig.update('enabled', config.isEnabled, targetScope);
            
            console.log('Configuration saved successfully:', {
                promptText: config.promptText.substring(0, 50) + '...',
                minimalIntervalMs: config.schedule.minimalIntervalMs,
                enabled: config.isEnabled,
                scope: this.getTargetScopeName(targetScope),
                workspace: vscode.workspace.name || 'Untitled'
            });
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
        const enabledInspect = workspaceConfig.inspect('enabled');
        const promptInspect = workspaceConfig.inspect('promptText');
        const intervalInspect = workspaceConfig.inspect('minimalIntervalMs');
        
        return (enabledInspect?.workspaceValue !== undefined || 
                enabledInspect?.workspaceFolderValue !== undefined) ||
               (promptInspect?.workspaceValue !== undefined || 
                promptInspect?.workspaceFolderValue !== undefined) ||
               (intervalInspect?.workspaceValue !== undefined || 
                intervalInspect?.workspaceFolderValue !== undefined);
    }

    /**
     * Checks if the current workspace has specific AutoPrompter settings
     * @returns Object with details about workspace-specific settings
     */
    async getWorkspaceConfigurationInfo(): Promise<{
        hasWorkspaceSettings: boolean;
        workspaceName: string | undefined;
        settingsLocation: string;
        configuredSettings: string[];
    }> {
        const workspaceConfig = vscode.workspace.getConfiguration(this.configurationSection);
        const workspaceName = vscode.workspace.name;
        
        const configuredSettings: string[] = [];
        
        // Check each setting for workspace-specific values
        const settings = ['promptText', 'minimalIntervalMs', 'enabled'];
        for (const setting of settings) {
            const inspect = workspaceConfig.inspect(setting);
            if (inspect?.workspaceValue !== undefined || inspect?.workspaceFolderValue !== undefined) {
                configuredSettings.push(setting);
            }
        }
        
        const hasWorkspaceSettings = configuredSettings.length > 0;
        const settingsLocation = this.getSettingsLocation();
        
        return {
            hasWorkspaceSettings,
            workspaceName,
            settingsLocation,
            configuredSettings
        };
    }

    /**
     * Resets configuration to defaults for the current workspace
     */
    async resetToDefaults(): Promise<void> {
        const defaultConfig = AutoPrompterConfiguration.createDefault();
        await this.save(defaultConfig);
    }

    /**
     * Copies settings from user/global scope to workspace scope
     */
    async copyGlobalToWorkspace(): Promise<void> {
        const workspaceConfig = vscode.workspace.getConfiguration(this.configurationSection);
        
        // Get global values
        const promptInspect = workspaceConfig.inspect<string>('promptText');
        const intervalInspect = workspaceConfig.inspect<number>('minimalIntervalMs');
        const enabledInspect = workspaceConfig.inspect<boolean>('enabled');
        
        const globalPrompt = promptInspect?.globalValue || promptInspect?.defaultValue;
        const globalInterval = intervalInspect?.globalValue || intervalInspect?.defaultValue;
        const globalEnabled = enabledInspect?.globalValue || enabledInspect?.defaultValue;
        
        // Save to workspace
        const targetScope = this.getConfigurationTarget();
        
        if (globalPrompt !== undefined) {
            await workspaceConfig.update('promptText', globalPrompt, targetScope);
        }
        if (globalInterval !== undefined) {
            await workspaceConfig.update('minimalIntervalMs', globalInterval, targetScope);
        }
        if (globalEnabled !== undefined) {
            await workspaceConfig.update('enabled', globalEnabled, targetScope);
        }
        
        console.log('Copied global settings to workspace');
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
        console.log('WorkspaceConfigurationRepository: getPromptText() called');
        const config = await this.load();
        console.log('WorkspaceConfigurationRepository: getPromptText() returning:', config.promptText.substring(0, 50) + '...');
        return config.promptText;
    }

    async setPromptText(promptText: string): Promise<void> {
        console.log('WorkspaceConfigurationRepository: setPromptText() called with:', promptText.substring(0, 50) + '...');
        const config = await this.load();
        const updatedConfig = config.withPromptText(promptText);
        await this.save(updatedConfig);
        console.log('WorkspaceConfigurationRepository: setPromptText() completed successfully');
    }

    async getMinimalInterval(): Promise<TimeInterval> {
        console.log('WorkspaceConfigurationRepository: getMinimalInterval() called');
        const config = await this.load();
        const interval = TimeInterval.fromSeconds(config.schedule.minimalIntervalMs / 1000);
        console.log('WorkspaceConfigurationRepository: getMinimalInterval() returning:', interval.ms);
        return interval;
    }

    async setMinimalInterval(interval: TimeInterval): Promise<void> {
        console.log('WorkspaceConfigurationRepository: setMinimalInterval() called with:', interval.ms);
        const config = await this.load();
        const updatedSchedule: ScheduleConfiguration = {
            ...config.schedule,
            minimalIntervalMs: interval.ms
        };
        const updatedConfig = config.withSchedule(updatedSchedule);
        await this.save(updatedConfig);
        console.log('WorkspaceConfigurationRepository: setMinimalInterval() completed successfully');
    }

    async isAutomationEnabled(): Promise<boolean> {
        console.log('WorkspaceConfigurationRepository: isAutomationEnabled() called');
        const config = await this.load();
        console.log('WorkspaceConfigurationRepository: isAutomationEnabled() returning:', config.isEnabled);
        return config.isEnabled;
    }

    async setAutomationEnabled(enabled: boolean): Promise<void> {
        console.log('WorkspaceConfigurationRepository: setAutomationEnabled() called with:', enabled);
        const config = await this.load();
        const updatedConfig = config.withEnabled(enabled);
        await this.save(updatedConfig);
        console.log('WorkspaceConfigurationRepository: setAutomationEnabled() completed successfully');
    }

    /**
     * Gets the workspace-specific value, falling back to global then default
     */
    private getWorkspaceValue<T>(inspect: { 
        workspaceFolderValue?: T; 
        workspaceValue?: T; 
        globalValue?: T; 
        defaultValue?: T; 
    } | undefined, defaultValue: T): T {
        if (!inspect) return defaultValue;
        
        // Priority: workspaceFolder > workspace > global > default
        return inspect.workspaceFolderValue ?? 
               inspect.workspaceValue ?? 
               inspect.globalValue ?? 
               inspect.defaultValue ?? 
               defaultValue;
    }

    /**
     * Gets the appropriate configuration target based on workspace type
     */
    private getConfigurationTarget(): vscode.ConfigurationTarget {
        // If we have a workspace folder, use WorkspaceFolder scope
        // If we have a workspace but no folders, use Workspace scope
        // Otherwise fall back to Global scope
        
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            return vscode.ConfigurationTarget.WorkspaceFolder;
        } else if (vscode.workspace.workspaceFile) {
            return vscode.ConfigurationTarget.Workspace;
        } else {
            return vscode.ConfigurationTarget.Global;
        }
    }

    /**
     * Gets a human-readable name for the configuration target
     */
    private getTargetScopeName(target: vscode.ConfigurationTarget): string {
        switch (target) {
            case vscode.ConfigurationTarget.WorkspaceFolder:
                return 'Workspace Folder';
            case vscode.ConfigurationTarget.Workspace:
                return 'Workspace';
            case vscode.ConfigurationTarget.Global:
                return 'Global (User)';
            default:
                return 'Unknown';
        }
    }

    /**
     * Gets information about where configuration is being loaded from
     */
    private getConfigurationSource(): string {
        const workspaceConfig = vscode.workspace.getConfiguration(this.configurationSection);
        const enabledInspect = workspaceConfig.inspect('enabled');
        
        if (enabledInspect?.workspaceFolderValue !== undefined) {
            return 'Workspace Folder';
        } else if (enabledInspect?.workspaceValue !== undefined) {
            return 'Workspace';
        } else if (enabledInspect?.globalValue !== undefined) {
            return 'Global (User)';
        } else {
            return 'Default';
        }
    }

    /**
     * Gets the location where settings are stored
     */
    private getSettingsLocation(): string {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            return '.vscode/settings.json in workspace folder';
        } else if (vscode.workspace.workspaceFile) {
            return 'workspace settings in .code-workspace file';
        } else {
            return 'user settings.json';
        }
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
