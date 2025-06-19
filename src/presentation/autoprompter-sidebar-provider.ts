import * as vscode from 'vscode';
import { AutoPrompterConfiguration, TimeInterval } from '../domain';
import { ConfigurationManagementUseCase, AutomatedPromptingUseCase } from '../application';
import { WebviewManager } from './webview-manager';
import { UIStateManager } from './ui-state-manager';
import { 
    ISidebarProvider, 
    IWebviewManager, 
    IUIStateManager,
    WebViewMessage,
    WebViewResponse,
    WebViewMessageType
} from './interfaces';

/**
 * AutoPrompterSidebarProvider
 * 
 * Main sidebar provider for the AutoPrompter extension.
 * Provides a simplified WebView-based interface for configuration and control.
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
        webviewView: vscode.WebviewView
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
                    console.log('Received webview message:', message);
                    const response = await this.handleWebviewMessage(message);
                    if (message.requestId) {
                        response.requestId = message.requestId;
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
        this.uiStateManager.updateState({
            isAutomationEnabled: config.isEnabled,
            scheduleInterval: config.schedule.minimalIntervalMs,
            currentPromptText: config.promptText
        });

        await this.sendMessage({
            type: WebViewMessageType.UPDATE_CONFIG,
            payload: {
                config: {
                    automationEnabled: config.isEnabled,
                    intervalMs: config.schedule.minimalIntervalMs
                },
                promptText: config.promptText,
                state: this.uiStateManager.getState()
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
                case WebViewMessageType.READY:
                    return await this.handleReady();

                case WebViewMessageType.TOGGLE_AUTOMATION:
                    return await this.handleToggleAutomation(message.payload.enabled);

                case WebViewMessageType.UPDATE_INTERVAL:
                    return await this.handleUpdateInterval(message.payload.intervalMs);

                case WebViewMessageType.SET_PROMPT_TEXT:
                    return await this.handleSetPromptText(message.payload.promptText);

                case WebViewMessageType.EXECUTE_NOW:
                    return await this.handleExecuteNow();

                case WebViewMessageType.GET_CONFIG:
                    return await this.handleGetConfig();

                case WebViewMessageType.GET_STATUS:
                    return await this.handleGetStatus();

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
            const promptText = await this.configUseCase.getPromptText();
            
            // Update UI state
            this.uiStateManager.updateState({
                isAutomationEnabled: summary.automationEnabled,
                scheduleInterval: 60000, // Default minimal interval
                currentPromptText: promptText,
                isConnected: true,
                executionCount: 0,
                lastExecutionTime: null
            });

            // Send initial data to webview
            await this.sendMessage({
                type: WebViewMessageType.UPDATE_CONFIG,
                payload: {
                    config: {
                        automationEnabled: summary.automationEnabled,
                        intervalMs: 60000
                    },
                    promptText: promptText,
                    state: this.uiStateManager.getState()
                }
            });
        } catch (error) {
            console.error('Failed to initialize view:', error);
            await this.showStatus('Failed to load configuration', true);
        }
    }

    /**
     * Message handlers
     */
    private async handleReady(): Promise<WebViewResponse> {
        await this.initializeView();
        return { success: true };
    }

    private async handleToggleAutomation(enabled: boolean): Promise<WebViewResponse> {
        try {
            console.log(`Attempting to toggle automation to: ${enabled}`);
            
            // First check if configuration service is available
            if (!this.configUseCase) {
                throw new Error('Configuration service is not available');
            }

            // Set automation state
            await this.configUseCase.setAutomationEnabled(enabled);
            
            // Update UI state
            this.uiStateManager.updateState({ isAutomationEnabled: enabled });
            
            // Show success status
            const statusMessage = enabled ? 'Automation enabled' : 'Automation disabled';
            await this.showStatus(statusMessage);
            
            console.log(`Successfully toggled automation to: ${enabled}`);
            
            return { 
                success: true,
                data: { enabled, message: statusMessage }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to toggle automation:', error);
            
            // Show detailed error message
            await this.showStatus(`Failed to toggle automation: ${errorMessage}`, true);
            
            return { 
                success: false, 
                error: errorMessage
            };
        }
    }

    private async handleUpdateInterval(intervalMs: number): Promise<WebViewResponse> {
        try {
            const interval = new TimeInterval(intervalMs);
            await this.configUseCase.setMinimalInterval(interval);
            this.uiStateManager.updateState({ scheduleInterval: intervalMs });
            await this.showStatus('Interval updated successfully');
            return { success: true };
        } catch (error) {
            console.error('Failed to update interval:', error);
            await this.showStatus('Failed to update interval', true);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async handleSetPromptText(promptText: string): Promise<WebViewResponse> {
        try {
            await this.configUseCase.setPromptText(promptText);
            this.uiStateManager.updateState({ currentPromptText: promptText });
            return { success: true };
        } catch (error) {
            console.error('Failed to update prompt text:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async handleExecuteNow(): Promise<WebViewResponse> {
        try {
            const result = await this.automationUseCase.executePromptNow(true);
            
            const currentState = this.uiStateManager.getState();
            this.uiStateManager.updateState({
                lastExecutionTime: new Date(),
                executionCount: currentState.executionCount + 1
            });

            await this.showStatus(result.message, !result.success);
            
            return {
                success: result.success,
                data: {
                    message: result.message,
                    deliveryResult: result.deliveryResult
                }
            };
        } catch (error) {
            console.error('Failed to execute prompt:', error);
            await this.showStatus('Failed to execute prompt', true);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async handleGetConfig(): Promise<WebViewResponse> {
        try {
            const summary = await this.configUseCase.getConfigurationSummary();
            const promptText = await this.configUseCase.getPromptText();
            
            return {
                success: true,
                data: {
                    config: {
                        automationEnabled: summary.automationEnabled,
                        intervalMs: 60000 // Default
                    },
                    promptText: promptText
                }
            };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async handleGetStatus(): Promise<WebViewResponse> {
        try {
            const executionStatus = await this.automationUseCase.getExecutionStatus();
            
            return {
                success: true,
                data: {
                    ...this.uiStateManager.getState(),
                    executionStatus
                }
            };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
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
}
