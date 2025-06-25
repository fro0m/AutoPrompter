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
import { logger } from '../infrastructure/logger';

/**
 * AutoPrompterSidebarProvider
 * 
 * Main sidebar provider for the AutoPrompter extension.
 * Provides a simplified WebView-based interface for configuration and control.
 */
export class AutoPrompterSidebarProvider implements ISidebarProvider {
    public static readonly viewType = 'autoprompter.sidebar';
    public readonly viewType = AutoPrompterSidebarProvider.viewType;

    private _view?: vscode.WebviewView;
    private webviewManager: WebviewManager;
    private uiStateManager: UIStateManager;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly configUseCase: ConfigurationManagementUseCase,
        private readonly automatedPromptingUseCase: AutomatedPromptingUseCase
    ) {
        this.webviewManager = new WebviewManager();
        this.uiStateManager = new UIStateManager();
        logger.debug('AutoPrompterSidebarProvider constructed');
        logger.info('AutoPrompterSidebarProvider: Configuration use case available:', !!this.configUseCase);
        logger.info('AutoPrompterSidebarProvider: Automated prompting use case available:', !!this.automatedPromptingUseCase);
    }

    /**
     * Called when the webview should be resolved
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView
    ): void {
        logger.info('AutoPrompterSidebarProvider: resolveWebviewView called');
        console.log('AutoPrompter: Resolving webview view...');
        this._view = webviewView;

        logger.debug('AutoPrompterSidebarProvider: Setting webview options');
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        logger.debug('AutoPrompterSidebarProvider: Generating HTML content');
        console.log('AutoPrompter: Setting webview HTML content...');
        webviewView.webview.html = this.webviewManager.getHtmlContent(webviewView.webview, this.extensionUri);

        logger.debug('AutoPrompterSidebarProvider: Setting up message listener');
        console.log('AutoPrompter: Setting up message listener...');
        webviewView.webview.onDidReceiveMessage(async (message) => {
            logger.info('AutoPrompterSidebarProvider: Received message from webview:', { 
                type: message.type, 
                hasPayload: !!message.payload,
                requestId: message.requestId 
            });
            console.log('AutoPrompter: Received message from webview:', message.type);
            try {
                const response = await this.handleWebviewMessage(message);
                logger.debug('AutoPrompterSidebarProvider: Generated response:', response);
                console.log('AutoPrompter: Sending response back to webview:', response);
                
                // Send response back to webview if it has a requestId
                if (message.requestId) {
                    const responseMessage = {
                        ...response,
                        requestId: message.requestId,
                        type: message.type + '_RESPONSE'
                    };
                    logger.debug('AutoPrompterSidebarProvider: Sending response with requestId:', responseMessage);
                    await webviewView.webview.postMessage(responseMessage);
                } else {
                    logger.debug('AutoPrompterSidebarProvider: No requestId, sending direct response');
                    await webviewView.webview.postMessage(response);
                }
            } catch (error) {
                logger.error('AutoPrompterSidebarProvider: Error processing webview message:', error instanceof Error ? error : new Error(String(error)));
                console.error('AutoPrompter: Error processing webview message:', error);
                
                // Send error response back to webview if it has a requestId
                if (message.requestId) {
                    const errorResponse = {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                        requestId: message.requestId,
                        type: message.type + '_RESPONSE'
                    };
                    logger.debug('AutoPrompterSidebarProvider: Sending error response:', errorResponse);
                    await webviewView.webview.postMessage(errorResponse);
                }
            }
        });

        logger.info('AutoPrompterSidebarProvider: Webview view resolved successfully');
        console.log('AutoPrompter: Webview view resolved successfully');
        
        // Force initialization after a short delay to ensure webview is ready
        setTimeout(async () => {
            logger.info('AutoPrompterSidebarProvider: Starting delayed initialization');
            console.log('AutoPrompter: Force-initializing webview after delay...');
            try {
                await this.initializeView();
                logger.info('AutoPrompterSidebarProvider: Delayed initialization completed successfully');
                console.log('AutoPrompter: Force initialization completed');
            } catch (error) {
                logger.error('AutoPrompterSidebarProvider: Delayed initialization failed:', error instanceof Error ? error : new Error(String(error)));
                console.error('AutoPrompter: Force initialization failed:', error);
            }
        }, 1000);
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
                state: this.uiStateManager.currentState
            }
        });
    }

    /**
     * Shows a status message in the sidebar
     */
    public async showStatus(message: string, isError: boolean = false): Promise<void> {
        this.uiStateManager.updateState({
            errorMessage: isError ? message : undefined
        });

        await this.sendMessage({
            type: WebViewMessageType.UPDATE_CONFIG,
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
            logger.info('AutoPrompterSidebarProvider: Processing message type:', message.type);
            logger.debug('AutoPrompterSidebarProvider: Message payload:', message.payload);
            console.log('AutoPrompter: Handling webview message:', message.type, 'Payload:', message.payload);
            
            switch (message.type) {
                case WebViewMessageType.READY:
                    logger.info('AutoPrompterSidebarProvider: Handling READY message');
                    console.log('AutoPrompter: Handling READY message - webview is ready for initialization');
                    return await this.handleReady();

                case WebViewMessageType.TOGGLE_AUTOMATION:
                    logger.info('AutoPrompterSidebarProvider: Handling TOGGLE_AUTOMATION message');
                    console.log('Handling TOGGLE_AUTOMATION message:', message.payload?.enabled);
                    if (message.payload && typeof message.payload.enabled === 'boolean') {
                        return await this.handleToggleAutomation(message.payload.enabled);
                    }
                    logger.warn('AutoPrompterSidebarProvider: Invalid payload for TOGGLE_AUTOMATION:', message.payload);
                    return { success: false, error: 'Invalid payload for TOGGLE_AUTOMATION' };

                case WebViewMessageType.UPDATE_INTERVAL:
                    logger.info('AutoPrompterSidebarProvider: Handling UPDATE_INTERVAL message');
                    console.log('Handling UPDATE_INTERVAL message:', message.payload?.intervalMs);
                    if (message.payload && typeof message.payload.intervalMs === 'number') {
                        return await this.handleUpdateInterval(message.payload.intervalMs);
                    }
                    logger.warn('AutoPrompterSidebarProvider: Invalid payload for UPDATE_INTERVAL:', message.payload);
                    return { success: false, error: 'Invalid payload for UPDATE_INTERVAL' };

                case WebViewMessageType.UPDATE_PROMPT_TEXT:
                    logger.info('AutoPrompterSidebarProvider: Handling UPDATE_PROMPT_TEXT message');
                    console.log('Handling UPDATE_PROMPT_TEXT message:', message.payload?.promptText);
                    if (message.payload && typeof message.payload.promptText === 'string') {
                        return await this.handleSetPromptText(message.payload.promptText);
                    }
                    logger.warn('AutoPrompterSidebarProvider: Invalid payload for UPDATE_PROMPT_TEXT:', message.payload);
                    return { success: false, error: 'Invalid payload for UPDATE_PROMPT_TEXT' };

                case WebViewMessageType.EXECUTE_NOW:
                    logger.info('AutoPrompterSidebarProvider: Handling EXECUTE_NOW message');
                    console.log('Handling EXECUTE_NOW message');
                    return await this.handleExecuteNow();

                case WebViewMessageType.GET_CONFIG:
                    logger.info('AutoPrompterSidebarProvider: Handling GET_CONFIG message');
                    console.log('Handling GET_CONFIG message');
                    return await this.handleGetConfig();

                case WebViewMessageType.RESET_STATS:
                    logger.info('AutoPrompterSidebarProvider: Handling RESET_STATS message');
                    console.log('Handling RESET_STATS message');
                    return await this.handleResetStats();

                case WebViewMessageType.GET_WORKSPACE_INFO:
                    logger.info('AutoPrompterSidebarProvider: Handling GET_WORKSPACE_INFO message');
                    console.log('Handling GET_WORKSPACE_INFO message');
                    return await this.handleGetWorkspaceInfo();

                case WebViewMessageType.COPY_GLOBAL_TO_WORKSPACE:
                    logger.info('AutoPrompterSidebarProvider: Handling COPY_GLOBAL_TO_WORKSPACE message');
                    console.log('Handling COPY_GLOBAL_TO_WORKSPACE message');
                    return await this.handleCopyGlobalToWorkspace();

                case 'RESET_WORKSPACE_SETTINGS':
                    logger.info('AutoPrompterSidebarProvider: Handling RESET_WORKSPACE_SETTINGS message');
                    console.log('Handling RESET_WORKSPACE_SETTINGS message');
                    return await this.handleResetWorkspaceSettings();

                default:
                    logger.warn('AutoPrompterSidebarProvider: Unknown message type:', message.type);
                    console.warn('Unknown message type:', message.type);
                    return { success: false, error: `Unknown message type: ${message.type}` };
            }
        } catch (error) {
            logger.error('AutoPrompterSidebarProvider: Error handling webview message:', error instanceof Error ? error : new Error(String(error)));
            console.error('Error handling webview message:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Initialize the view with current configuration and state
     */
    private async initializeView(): Promise<void> {
        logger.info('AutoPrompterSidebarProvider: Starting view initialization');
        try {
            console.log('AutoPrompter: Starting view initialization...');
            
            // Check if configuration service is available
            if (!this.configUseCase) {
                throw new Error('Configuration service is not available');
            }
            logger.debug('AutoPrompterSidebarProvider: Configuration service available');
            
            // Get current configuration directly with individual error handling
            logger.debug('AutoPrompterSidebarProvider: Loading prompt text');
            let promptText: string;
            try {
                promptText = await this.configUseCase.getPromptText();
                logger.debug('AutoPrompterSidebarProvider: Prompt text loaded successfully:', { length: promptText.length });
            } catch (error) {
                logger.error('AutoPrompterSidebarProvider: Failed to load prompt text:', error instanceof Error ? error : new Error(String(error)));
                promptText = 'Please review the current code and provide suggestions for improvement.';
            }

            logger.debug('AutoPrompterSidebarProvider: Loading minimal interval');
            let minimalInterval: any;
            try {
                minimalInterval = await this.configUseCase.getMinimalInterval();
                logger.debug('AutoPrompterSidebarProvider: Minimal interval loaded successfully:', { ms: minimalInterval.ms });
            } catch (error) {
                logger.error('AutoPrompterSidebarProvider: Failed to load minimal interval:', error instanceof Error ? error : new Error(String(error)));
                minimalInterval = { ms: 300000 }; // 5 minutes default
            }

            logger.debug('AutoPrompterSidebarProvider: Loading automation enabled status');
            let automationEnabled: boolean;
            try {
                automationEnabled = await this.configUseCase.isAutomationEnabled();
                logger.debug('AutoPrompterSidebarProvider: Automation enabled status loaded successfully:', automationEnabled);
            } catch (error) {
                logger.error('AutoPrompterSidebarProvider: Failed to load automation status:', error instanceof Error ? error : new Error(String(error)));
                automationEnabled = false;
            }
            
            console.log('AutoPrompter: Configuration loaded:', {
                promptTextLength: promptText.length,
                intervalMs: minimalInterval.ms,
                automationEnabled
            });
            
            // Get workspace configuration info
            logger.debug('AutoPrompterSidebarProvider: Loading workspace configuration info');
            let workspaceInfo: any;
            try {
                console.log('AutoPrompter: Getting workspace configuration info...');
                workspaceInfo = await this.configUseCase.getWorkspaceConfigurationInfo();
                logger.debug('AutoPrompterSidebarProvider: Workspace info loaded successfully:', workspaceInfo);
                console.log('AutoPrompter: Workspace info loaded:', workspaceInfo);
            } catch (workspaceError) {
                logger.error('AutoPrompterSidebarProvider: Failed to load workspace info:', workspaceError instanceof Error ? workspaceError : new Error(String(workspaceError)));
                console.error('AutoPrompter: Failed to load workspace info:', workspaceError);
                workspaceInfo = {
                    hasWorkspaceSettings: false,
                    workspaceName: 'Error Loading',
                    settingsLocation: 'Error Loading',
                    configuredSettings: [],
                    isProjectSpecific: false
                };
            }
            
            // Update UI state
            logger.debug('AutoPrompterSidebarProvider: Updating UI state');
            this.uiStateManager.updateState({
                isAutomationEnabled: automationEnabled,
                scheduleInterval: minimalInterval.ms,
                currentPromptText: promptText,
                lastExecutionTime: undefined,
                executionCount: 0,
                errorMessage: undefined,
                isExecuting: false
            });

            // Prepare message payload
            const messagePayload = {
                config: {
                    automationEnabled: automationEnabled,
                    intervalMs: minimalInterval.ms
                },
                promptText: promptText,
                state: this.uiStateManager.currentState,
                workspaceInfo: {
                    hasWorkspaceSettings: workspaceInfo?.hasWorkspaceSettings ?? false,
                    workspaceName: workspaceInfo?.workspaceName || 'Untitled Workspace',
                    settingsLocation: workspaceInfo?.settingsLocation || 'Global Settings',
                    configuredSettings: workspaceInfo?.configuredSettings || [],
                    isProjectSpecific: workspaceInfo?.hasWorkspaceSettings ?? false
                }
            };

            logger.debug('AutoPrompterSidebarProvider: Prepared message payload:', messagePayload);

            // Send initial configuration to webview
            logger.debug('AutoPrompterSidebarProvider: Sending configuration to webview');
            await this.sendMessage({
                type: WebViewMessageType.UPDATE_CONFIG,
                payload: messagePayload
            });
            
            logger.info('AutoPrompterSidebarProvider: View initialized successfully');
            console.log('AutoPrompter: View initialized successfully with workspace info:', {
                automationEnabled,
                intervalMs: minimalInterval.ms,
                promptTextLength: promptText.length,
                workspaceSettings: workspaceInfo?.hasWorkspaceSettings,
                workspaceName: workspaceInfo?.workspaceName
            });
        } catch (error) {
            logger.error('AutoPrompterSidebarProvider: Failed to initialize view:', error instanceof Error ? error : new Error(String(error)));
            console.error('AutoPrompter: Failed to initialize view:', error);
            
            // Send error state to webview
            const errorPayload = {
                config: {
                    automationEnabled: false,
                    intervalMs: 60000
                },
                promptText: 'Please review the current code and provide suggestions for improvement.',
                state: {
                    isAutomationEnabled: false,
                    scheduleInterval: 60000,
                    currentPromptText: 'Please review the current code and provide suggestions for improvement.',
                    isConnected: false,
                    lastExecutionTime: undefined,
                    executionCount: 0,
                    errorMessage: `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
                    isExecuting: false
                },
                workspaceInfo: {
                    hasWorkspaceSettings: false,
                    workspaceName: 'Error Loading',
                    settingsLocation: 'Error Loading',
                    configuredSettings: [],
                    isProjectSpecific: false
                }
            };

            logger.debug('AutoPrompterSidebarProvider: Sending error state to webview:', errorPayload);
            await this.sendMessage({
                type: WebViewMessageType.UPDATE_CONFIG,
                payload: errorPayload
            });
        }
    }

    /**
     * Message handlers
     */
    private async handleReady(): Promise<WebViewResponse> {
        logger.info('AutoPrompterSidebarProvider: Processing READY message');
        console.log('Webview READY - initializing view');
        try {
            await this.initializeView();
            logger.info('AutoPrompterSidebarProvider: READY message processed successfully');
            console.log('View initialization completed successfully');
            return { success: true };
        } catch (error) {
            logger.error('AutoPrompterSidebarProvider: Failed to handle READY message:', error instanceof Error ? error : new Error(String(error)));
            console.error('Failed to handle READY message:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error) 
            };
        }
    }

    private async handleToggleAutomation(enabled: boolean): Promise<WebViewResponse> {
        logger.info('AutoPrompterSidebarProvider: Processing toggle automation:', enabled);
        try {
            console.log(`Attempting to toggle automation to: ${enabled}`);
            
            // First check if configuration service is available
            if (!this.configUseCase) {
                throw new Error('Configuration service is not available');
            }
            logger.debug('AutoPrompterSidebarProvider: Configuration service available for toggle');

            // Set automation state
            logger.debug('AutoPrompterSidebarProvider: Setting automation enabled to:', enabled);
            await this.configUseCase.setAutomationEnabled(enabled);
            logger.debug('AutoPrompterSidebarProvider: Automation state set successfully');
            
            // Update UI state
            this.uiStateManager.updateState({ isAutomationEnabled: enabled });
            logger.debug('AutoPrompterSidebarProvider: UI state updated');
            
            // Show success status
            const statusMessage = enabled ? 'Automation enabled' : 'Automation disabled';
            await this.showStatus(statusMessage);
            
            logger.info('AutoPrompterSidebarProvider: Toggle automation completed successfully:', enabled);
            console.log(`Successfully toggled automation to: ${enabled}`);
            
            return { 
                success: true,
                data: { enabled, message: statusMessage }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('AutoPrompterSidebarProvider: Failed to toggle automation:', error instanceof Error ? error : new Error(String(error)));
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
            console.log('AutoPrompter: Executing prompt now...');
            
            // Update executing state
            this.uiStateManager.updateState({ isExecuting: true });
            
            const result = await this.automatedPromptingUseCase.executePromptNow(true);
            
            const currentState = this.uiStateManager.currentState;
            this.uiStateManager.updateState({
                lastExecutionTime: new Date(),
                executionCount: currentState.executionCount + 1,
                isExecuting: false
            });

            await this.showStatus(result.message, !result.success);
            
            console.log('AutoPrompter: Prompt execution completed:', {
                success: result.success,
                message: result.message
            });
            
            return {
                success: result.success,
                data: {
                    message: result.message,
                    deliveryResult: result.deliveryResult
                }
            };
        } catch (error) {
            console.error('AutoPrompter: Failed to execute prompt:', error);
            
            // Reset executing state
            this.uiStateManager.updateState({ isExecuting: false });
            
            await this.showStatus('Failed to execute prompt', true);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async handleGetConfig(): Promise<WebViewResponse> {
        try {
            const promptText = await this.configUseCase.getPromptText();
            const minimalInterval = await this.configUseCase.getMinimalInterval();
            const automationEnabled = await this.configUseCase.isAutomationEnabled();
            
            return {
                success: true,
                data: {
                    config: {
                        automationEnabled: automationEnabled,
                        intervalMs: minimalInterval.ms
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

    private async handleResetStats(): Promise<WebViewResponse> {
        try {
            // Reset local UI stats
            this.uiStateManager.updateState({
                executionCount: 0,
                lastExecutionTime: undefined,
                errorMessage: undefined
            });
            await this.showStatus('Stats reset successfully');
            return { success: true };
        } catch (error) {
            console.error('Failed to reset stats:', error);
            await this.showStatus('Failed to reset stats', true);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error) 
            };
        }
    }

    private async handleGetWorkspaceInfo(): Promise<WebViewResponse> {
        try {
            const workspaceInfo = await this.configUseCase.getWorkspaceConfigurationInfo();
            
            return {
                success: true,
                data: {
                    workspaceInfo: {
                        hasWorkspaceSettings: workspaceInfo.hasWorkspaceSettings,
                        workspaceName: workspaceInfo.workspaceName || 'Untitled Workspace',
                        settingsLocation: workspaceInfo.settingsLocation,
                        configuredSettings: workspaceInfo.configuredSettings,
                        isProjectSpecific: workspaceInfo.hasWorkspaceSettings
                    }
                }
            };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async handleCopyGlobalToWorkspace(): Promise<WebViewResponse> {
        try {
            await this.configUseCase.copyGlobalToWorkspace();
            
            // Refresh the view with updated configuration
            await this.initializeView();
            
            await this.showStatus('Global settings copied to workspace successfully');
            
            return {
                success: true,
                data: {
                    message: 'Global settings have been copied to this workspace'
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.showStatus(`Failed to copy global settings: ${errorMessage}`, true);
            return { 
                success: false, 
                error: errorMessage
            };
        }
    }

    private async handleResetWorkspaceSettings(): Promise<WebViewResponse> {
        logger.info('AutoPrompterSidebarProvider: Processing reset workspace settings');
        try {
            logger.debug('AutoPrompterSidebarProvider: Calling resetWorkspaceToDefaults');
            await this.configUseCase.resetWorkspaceToDefaults();
            
            // Refresh the view with updated configuration
            logger.debug('AutoPrompterSidebarProvider: Refreshing view after reset');
            await this.initializeView();
            
            await this.showStatus('Workspace settings reset to defaults successfully');
            
            logger.info('AutoPrompterSidebarProvider: Reset workspace settings completed successfully');
            
            return {
                success: true,
                data: {
                    message: 'Workspace settings have been reset to defaults'
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('AutoPrompterSidebarProvider: Failed to reset workspace settings:', error instanceof Error ? error : new Error(String(error)));
            await this.showStatus(`Failed to reset workspace settings: ${errorMessage}`, true);
            return { 
                success: false, 
                error: errorMessage
            };
        }
    }

    /**
     * Utility methods
     */
    private async sendMessage(message: WebViewMessage): Promise<void> {
        logger.debug('AutoPrompterSidebarProvider: Sending message to webview:', { type: message.type, hasPayload: !!message.payload });
        if (this._view) {
            await this._view.webview.postMessage(message);
            logger.debug('AutoPrompterSidebarProvider: Message sent successfully');
        } else {
            logger.warn('AutoPrompterSidebarProvider: Cannot send message - webview not available');
        }
    }

    private async sendResponse(response: WebViewResponse): Promise<void> {
        if (this._view) {
            await this._view.webview.postMessage(response);
        }
    }
}
