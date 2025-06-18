import * as vscode from 'vscode';
import { IConfigurationRepository, AutoPrompterConfiguration, ScheduleConfiguration } from '../domain';
import { IConfigurationService } from '../application/interfaces';
import { PromptTemplate, TemplateVariable, TimeInterval } from '../domain/value-objects';
import { PromptCategory, TemplateId } from '../domain/types';

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
    private watcherDisposable?: vscode.Disposable;

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
            
            // Load templates
            const templatesData = workspaceConfig.get<any[]>('templates', []);
            const templates = this.deserializeTemplates(templatesData);
            
            // Load schedule configuration
            const scheduleData = workspaceConfig.get<any>('schedule', {});
            const schedule: ScheduleConfiguration = {
                intervalMs: scheduleData.intervalMs || 300000, // 5 minutes default
                isActive: scheduleData.isActive || false,
                maxRetries: scheduleData.maxRetries || 3
            };
            
            // Load other settings
            const isEnabled = workspaceConfig.get<boolean>('enabled', false);
            const maxDailyPrompts = workspaceConfig.get<number>('maxDailyPrompts', 50);
            const enabledTargets = workspaceConfig.get<string[]>('enabledTargets', ['github']);
            
            return new AutoPrompterConfiguration(
                templates,
                schedule,
                isEnabled,
                maxDailyPrompts,
                enabledTargets
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
            
            // Serialize and save templates
            const templatesData = this.serializeTemplates(config.templates);
            await workspaceConfig.update('templates', templatesData, vscode.ConfigurationTarget.Workspace);
            
            // Save schedule configuration
            await workspaceConfig.update('schedule', config.schedule, vscode.ConfigurationTarget.Workspace);
            
            // Save other settings
            await workspaceConfig.update('enabled', config.isEnabled, vscode.ConfigurationTarget.Workspace);
            await workspaceConfig.update('maxDailyPrompts', config.maxDailyPrompts, vscode.ConfigurationTarget.Workspace);
            await workspaceConfig.update('enabledTargets', config.enabledTargets, vscode.ConfigurationTarget.Workspace);
            
            console.log('Configuration saved successfully');
        } catch (error) {
            console.error('Failed to save configuration:', error);
            throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Registers a callback to watch for configuration changes
     * @param callback Function to call when configuration changes
     */
    watch(callback: (config: AutoPrompterConfiguration) => void): void {
        this.watchers.push(callback);
    }

    /**
     * Stops watching for configuration changes and cleans up resources
     */
    dispose(): void {
        if (this.watcherDisposable) {
            this.watcherDisposable.dispose();
            this.watcherDisposable = undefined;
        }
        this.watchers.length = 0;
    }

    /**
     * Sets up the VS Code configuration change watcher
     */
    private setupConfigurationWatcher(): void {
        this.watcherDisposable = vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration(this.configurationSection)) {
                try {
                    const updatedConfig = await this.load();
                    this.notifyWatchers(updatedConfig);
                } catch (error) {
                    console.error('Failed to reload configuration after change:', error);
                }
            }
        });
    }

    /**
     * Notifies all registered watchers of configuration changes
     * @param config The updated configuration
     */
    private notifyWatchers(config: AutoPrompterConfiguration): void {
        this.watchers.forEach(watcher => {
            try {
                watcher(config);
            } catch (error) {
                console.error('Configuration watcher error:', error);
            }
        });
    }

    /**
     * Serializes templates to a format suitable for JSON storage
     * @param templates Templates to serialize
     * @returns Serialized template data
     */
    private serializeTemplates(templates: PromptTemplate[]): any[] {
        return templates.map(template => ({
            id: template.id,
            name: template.name,
            content: template.content,
            category: template.category,
            variables: template.variables.map(variable => ({
                name: variable.name,
                type: variable.type,
                defaultValue: variable.defaultValue,
                description: variable.description
            }))
        }));
    }

    /**
     * Deserializes templates from JSON storage format
     * @param templatesData Serialized template data
     * @returns Array of PromptTemplate instances
     */
    private deserializeTemplates(templatesData: any[]): PromptTemplate[] {
        const templates: PromptTemplate[] = [];
        
        for (const templateData of templatesData) {
            try {
                const variables = (templateData.variables || []).map((varData: any) => 
                    new TemplateVariable(
                        varData.name,
                        varData.type,
                        varData.defaultValue,
                        varData.description
                    )
                );
                
                const template = new PromptTemplate(
                    templateData.id,
                    templateData.name,
                    templateData.content,
                    templateData.category || PromptCategory.General,
                    variables
                );
                
                templates.push(template);
            } catch (error) {
                console.warn(`Failed to deserialize template ${templateData.id}:`, error);
                // Skip invalid templates rather than failing completely
            }
        }
        
        return templates;
    }

    /**
     * Gets the current workspace configuration section
     * @returns VS Code workspace configuration
     */
    private getWorkspaceConfig(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(this.configurationSection);
    }

    /**
     * Checks if the current workspace has a configuration file
     * @returns True if configuration exists in workspace
     */
    async hasWorkspaceConfiguration(): Promise<boolean> {
        const workspaceConfig = this.getWorkspaceConfig();
        const templates = workspaceConfig.get('templates');
        const schedule = workspaceConfig.get('schedule');
        const enabled = workspaceConfig.get('enabled');
        
        return templates !== undefined || schedule !== undefined || enabled !== undefined;
    }

    /**
     * Resets the configuration to default values
     */
    async resetToDefaults(): Promise<void> {
        const defaultConfig = AutoPrompterConfiguration.createDefault();
        await this.save(defaultConfig);
    }

    // IConfigurationService interface methods
    async getPromptTemplates(): Promise<PromptTemplate[]> {
        const config = await this.load();
        return config.templates;
    }

    async updatePromptTemplate(templateId: TemplateId, template: PromptTemplate): Promise<void> {
        const config = await this.load();
        const updatedTemplates = config.templates.map(t => 
            t.id === templateId ? template : t
        );
        const updatedConfig = config.withTemplates(updatedTemplates);
        await this.save(updatedConfig);
    }

    async getScheduleInterval(): Promise<TimeInterval> {
        const config = await this.load();
        return TimeInterval.fromSeconds(config.schedule.intervalMs / 1000);
    }

    async setScheduleInterval(interval: TimeInterval): Promise<void> {
        const config = await this.load();
        const updatedSchedule: ScheduleConfiguration = {
            ...config.schedule,
            intervalMs: interval.ms
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
}
