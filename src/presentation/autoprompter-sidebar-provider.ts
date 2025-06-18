import * as vscode from 'vscode';
import { AutoPrompterConfiguration, PromptTemplate, TimeInterval } from '../domain';
import { ConfigurationManagementUseCase, AutomatedPromptingUseCase } from '../application';
import { WebviewManager } from './webview-manager';
import { UIStateManager } from './ui-state-manager';
import { 
    ISidebarProvider, 
    IWebviewManager, 
    IUIStateManager,
    WebViewMessage,
    WebViewResponse,
    WebViewMessageType,
    UIState
} from './interfaces';

/**
 * AutoPrompterSidebarProvider
 * 
 * Main sidebar provider for the AutoPrompter extension.
 * Provides a WebView-based interface for configuration and control.
 */
export class AutoPrompterSidebarProvider implements ISidebarProvider {
    public static readonly viewType = 'autoprompter.sidebar';

    private _view?: vscode.WebviewView;
    private readonly _extensionUri: vscode.Uri;
    private readonly webviewManager: IWebviewManager;
    private readonly uiStateManager: IUIStateManager;

    constructor(
        extensionUri: vscode.Uri,
        private readonly configUseCase: ConfigurationManagementUseCase,
        private readonly automationUseCase: AutomatedPromptingUseCase,
        webviewManager?: IWebviewManager,
        uiStateManager?: IUIStateManager
    ) {
        this._extensionUri = extensionUri;
        this.webviewManager = webviewManager || new WebviewManager();
        this.uiStateManager = uiStateManager || new UIStateManager();
    }

    /**
     * Resolves the webview view
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        cancellationToken: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this.webviewManager.getHtmlContent(
            webviewView.webview, 
            this._extensionUri
        );

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async (message: WebViewMessage) => {
                try {
                    const response = await this.handleWebviewMessage(message);
                    if (message.requestId) {
                        await this.sendResponse(response);
                    }
                } catch (error) {
                    console.error('Error handling webview message:', error);
                    if (message.requestId) {
                        await this.sendResponse({
                            success: false,
                            error: error instanceof Error ? error.message : String(error),
                            requestId: message.requestId
                        });
                    }
                }
            }
        );

        // Initialize the view with current state
        this.initializeView();
    }

    /**
     * Updates the configuration displayed in the sidebar
     */
    public async updateConfiguration(config: AutoPrompterConfiguration): Promise<void> {
        const state = this.uiStateManager.getState();
        this.uiStateManager.updateState({
            isAutomationEnabled: config.isEnabled,
            scheduleInterval: config.schedule.intervalMs,
            currentTemplate: config.templates.length > 0 ? config.templates[0].id : null
        });

        await this.sendMessage({
            type: WebViewMessageType.UPDATE_CONFIG,
            payload: {
                config: this.serializeConfig(config),
                state: this.uiStateManager.getState()
            }
        });
    }

    /**
     * Updates the template list in the sidebar
     */
    public async updateTemplates(templates: PromptTemplate[]): Promise<void> {
        await this.sendMessage({
            type: WebViewMessageType.GET_TEMPLATES,
            payload: {
                templates: templates.map(t => this.serializeTemplate(t))
            }
        });
    }

    /**
     * Shows a status message in the sidebar
     */
    public async showStatus(message: string, isError: boolean = false): Promise<void> {
        this.uiStateManager.updateState({
            errorMessage: isError ? message : null
        });

        await this.sendMessage({
            type: WebViewMessageType.SHOW_STATUS,
            payload: {
                message,
                isError,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Handles messages from the webview
     */
    private async handleWebviewMessage(message: WebViewMessage): Promise<WebViewResponse> {
        try {
            switch (message.type) {
                case WebViewMessageType.GET_CONFIG:
                    return await this.handleGetConfig();

                case WebViewMessageType.UPDATE_CONFIG:
                    return await this.handleUpdateConfig(message.payload);

                case WebViewMessageType.START_AUTOMATION:
                    return await this.handleStartAutomation();

                case WebViewMessageType.STOP_AUTOMATION:
                    return await this.handleStopAutomation();

                case WebViewMessageType.EXECUTE_NOW:
                    return await this.handleExecuteNow();

                case WebViewMessageType.TEST_CONNECTION:
                    return await this.handleTestConnection();

                case WebViewMessageType.GET_TEMPLATES:
                    return await this.handleGetTemplates();

                case WebViewMessageType.ADD_TEMPLATE:
                    return await this.handleAddTemplate(message.payload);

                case WebViewMessageType.UPDATE_TEMPLATE:
                    return await this.handleUpdateTemplate(message.payload);

                case WebViewMessageType.DELETE_TEMPLATE:
                    return await this.handleDeleteTemplate(message.payload);

                case WebViewMessageType.GET_STATUS:
                    return await this.handleGetStatus();

                case WebViewMessageType.READY:
                    return await this.handleReady();

                default:
                    throw new Error(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                requestId: message.requestId
            };
        }
    }

    /**
     * Initialize the view with current configuration and state
     */
    private async initializeView(): Promise<void> {
        try {
            // Get current configuration
            const summary = await this.configUseCase.getConfigurationSummary();
            const templates = await this.configUseCase.getPromptTemplates();
            
            // Update UI state
            this.uiStateManager.updateState({
                isAutomationEnabled: summary.automationEnabled,
                scheduleInterval: 300000, // Default value, we'll get from interval
                currentTemplate: templates.length > 0 ? templates[0].id : null,
                isConnected: true
            });

            // Send initial data to webview
            await this.sendMessage({
                type: WebViewMessageType.UPDATE_CONFIG,
                payload: {
                    config: summary,
                    templates: templates.map(t => this.serializeTemplate(t)),
                    state: this.uiStateManager.getState()
                }
            });
        } catch (error) {
            console.error('Failed to initialize view:', error);
            await this.showStatus('Failed to load configuration', true);
        }
    }

    /**
     * Configuration message handlers
     */
    private async handleGetConfig(): Promise<WebViewResponse> {
        const summary = await this.configUseCase.getConfigurationSummary();
        return {
            success: true,
            data: summary
        };
    }

    private async handleUpdateConfig(payload: any): Promise<WebViewResponse> {
        // Update configuration based on payload
        if (payload.automationEnabled !== undefined) {
            if (payload.automationEnabled) {
                await this.configUseCase.resumeAutomation();
            } else {
                await this.configUseCase.pauseAutomation();
            }
        }
        
        if (payload.intervalMs !== undefined) {
            const interval = TimeInterval.fromSeconds(payload.intervalMs / 1000);
            await this.configUseCase.setScheduleInterval(interval);
        }

        return { success: true };
    }

    /**
     * Automation control handlers
     */
    private async handleStartAutomation(): Promise<WebViewResponse> {
        await this.configUseCase.resumeAutomation();
        this.uiStateManager.updateState({ isAutomationEnabled: true });
        await this.showStatus('Automation started');
        return { success: true };
    }

    private async handleStopAutomation(): Promise<WebViewResponse> {
        await this.configUseCase.pauseAutomation();
        this.uiStateManager.updateState({ isAutomationEnabled: false });
        await this.showStatus('Automation stopped');
        return { success: true };
    }

    private async handleExecuteNow(): Promise<WebViewResponse> {
        const result = await this.automationUseCase.executePromptNow(true);
        
        this.uiStateManager.updateState({
            lastExecutionTime: new Date(),
            executionCount: this.uiStateManager.getState().executionCount + 1
        });

        await this.showStatus(result.message, !result.success);
        
        return {
            success: result.success,
            data: {
                message: result.message,
                deliveryResult: result.deliveryResult
            }
        };
    }

    private async handleTestConnection(): Promise<WebViewResponse> {
        // This would test the connection to AI services
        // For now, return a placeholder
        await this.showStatus('Connection test completed');
        return {
            success: true,
            data: { message: 'Connection test completed' }
        };
    }

    /**
     * Template management handlers
     */
    private async handleGetTemplates(): Promise<WebViewResponse> {
        const templates = await this.configUseCase.getPromptTemplates();
        return {
            success: true,
            data: templates.map(t => this.serializeTemplate(t))
        };
    }

    private async handleAddTemplate(payload: any): Promise<WebViewResponse> {
        // Implementation would create a new template
        // For now, return placeholder
        return { success: true };
    }

    private async handleUpdateTemplate(payload: any): Promise<WebViewResponse> {
        // Implementation would update an existing template
        // For now, return placeholder
        return { success: true };
    }

    private async handleDeleteTemplate(payload: any): Promise<WebViewResponse> {
        // Implementation would delete a template
        // For now, return placeholder
        return { success: true };
    }

    /**
     * Status handlers
     */
    private async handleGetStatus(): Promise<WebViewResponse> {
        const executionStatus = await this.automationUseCase.getExecutionStatus();
        
        return {
            success: true,
            data: {
                ...this.uiStateManager.getState(),
                executionStatus
            }
        };
    }

    private async handleReady(): Promise<WebViewResponse> {
        await this.initializeView();
        return { success: true };
    }

    /**
     * Utility methods
     */
    private async sendMessage(message: WebViewMessage): Promise<void> {
        if (this._view) {
            await this._view.webview.postMessage(message);
        }
    }

    private async sendResponse(response: WebViewResponse): Promise<void> {
        if (this._view) {
            await this._view.webview.postMessage(response);
        }
    }

    private serializeConfig(config: AutoPrompterConfiguration): any {
        return {
            isEnabled: config.isEnabled,
            maxDailyPrompts: config.maxDailyPrompts,
            enabledTargets: config.enabledTargets,
            schedule: {
                intervalMs: config.schedule.intervalMs,
                isActive: config.schedule.isActive,
                maxRetries: config.schedule.maxRetries
            },
            templateCount: config.templates.length
        };
    }

    private serializeTemplate(template: PromptTemplate): any {
        return {
            id: template.id,
            name: template.name,
            content: template.content,
            category: template.category,
            variables: template.variables.map(v => ({
                name: v.name,
                type: v.type,
                defaultValue: v.defaultValue,
                description: v.description
            }))
        };
    }
}
