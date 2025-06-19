import * as vscode from 'vscode';
import { 
    AutoPrompterSidebarProvider,
    ConfigurationManagementUseCase,
    AutomatedPromptingUseCase,
    WorkspaceConfigurationRepository,
    VSCodeChatIntegration,
    PromptScheduler,
    AISessionMonitor,
    PromptSchedulingEngine,
    AISessionMonitoringService,
    logger
} from './index';

let sidebarProvider: AutoPrompterSidebarProvider;
let configRepository: WorkspaceConfigurationRepository;
let schedulingEngine: PromptSchedulingEngine;
let sessionMonitoringService: AISessionMonitoringService;

export async function activate(context: vscode.ExtensionContext) {
    logger.info('Extension activation started');
    
    try {
        // Initialize only critical infrastructure immediately
        logger.info('Initializing configuration repository');
        configRepository = new WorkspaceConfigurationRepository();
        logger.info('Configuration repository initialized successfully');
        
        // Defer heavy initialization until needed
        const initializeServices = async () => {
            if (schedulingEngine && sessionMonitoringService) {
                logger.debug('Heavy services already initialized, skipping');
                return; // Already initialized
            }
            
            logger.info('Initializing heavy services (deferred for performance)');
            const chatIntegration = new VSCodeChatIntegration();
            logger.debug('Chat integration initialized');
            
            // Initialize domain entities  
            const scheduler = new PromptScheduler('main-scheduler', {
                minimalIntervalMs: 60000, // 1 minute minimal interval
                isActive: false,
                maxRetries: 3
            });
            
            // Initialize scheduling engine with rate limiting
            schedulingEngine = new PromptSchedulingEngine(chatIntegration, {
                maxPromptsPerMinute: 2,
                maxPromptsPerHour: 20,
                maxPromptsPerDay: 100,
                burstLimit: 3,
                cooldownMs: 60000
            });
            
            // Initialize session monitoring service
            sessionMonitoringService = new AISessionMonitoringService('main-session', {
                idleThresholdMs: 30000,        // 30 seconds
                chatResponseTimeoutMs: 10000,  // 10 seconds
                activityCheckIntervalMs: 5000, // 5 seconds
                maxIdleTimeMs: 300000,         // 5 minutes
                enableWorkspaceMonitoring: true
            });
            
            // Start monitoring services
            sessionMonitoringService.start();
            logger.info('Session monitoring service started');
            
            // Add disposables
            context.subscriptions.push(schedulingEngine);
            context.subscriptions.push(sessionMonitoringService);
            logger.info('Heavy services initialization completed');
        };
        
        // Initialize use cases with lazy service initialization
        logger.info('Initializing configuration use case');
        const configUseCase = new ConfigurationManagementUseCase(configRepository);
        logger.debug('Configuration use case initialized');
        
        // Create lazy-initialized automated prompting use case
        const getAutomatedPromptingUseCase = async () => {
            await initializeServices();
            
            const chatIntegration = new VSCodeChatIntegration();
            const scheduler = new PromptScheduler('main-scheduler', {
                minimalIntervalMs: 60000,
                isActive: false,
                maxRetries: 3
            });
            const sessionMonitor = new AISessionMonitor('main-session');
            
            return new AutomatedPromptingUseCase(
                scheduler,
                sessionMonitor,
                chatIntegration,
                configRepository
            );
        };
        
        // Initialize sidebar provider with lazy loading
        logger.info('Initializing sidebar provider');
        sidebarProvider = new AutoPrompterSidebarProvider(
            context.extensionUri,
            configUseCase,
            await getAutomatedPromptingUseCase() // Initialize this immediately for UI
        );
        logger.debug('Sidebar provider initialized');
        
        // Register webview provider
        logger.info('Registering webview provider');
        const webviewDisposable = vscode.window.registerWebviewViewProvider(
            AutoPrompterSidebarProvider.viewType,
            sidebarProvider
        );
        context.subscriptions.push(webviewDisposable);
        logger.debug('Webview provider registered successfully');
        
        // Check if the sidebar view is available
        setTimeout(() => {
            logger.info('AutoPrompter sidebar registered. To use the extension:');
            logger.info('1. Open the AutoPrompter sidebar panel in the Activity Bar (left side)');
            logger.info('2. Look for the AutoPrompter icon or expand the Explorer panel');
            logger.info('3. The webview should appear when the sidebar becomes visible');
            
            // Try to show a notification to guide the user
            vscode.window.showInformationMessage(
                'AutoPrompter activated! Click "Open Sidebar" to start using the extension.',
                'Open Sidebar',
                'Show in Explorer'
            ).then(selection => {
                if (selection === 'Open Sidebar') {
                    // Try to reveal the AutoPrompter view directly
                    vscode.commands.executeCommand('autoprompter.sidebar.focus').then(() => {
                        logger.info('AutoPrompter sidebar opened successfully');
                    }, () => {
                        // Fallback: try to open the view container
                        vscode.commands.executeCommand('workbench.view.extension.autoprompter').then(() => {
                            logger.info('AutoPrompter view container opened');
                        }, () => {
                            logger.error('Failed to open AutoPrompter sidebar');
                            vscode.window.showErrorMessage('Please manually open the AutoPrompter panel from the Activity Bar (robot icon)');
                        });
                    });
                } else if (selection === 'Show in Explorer') {
                    // Try to show in explorer
                    vscode.commands.executeCommand('workbench.view.explorer');
                }
            });
        }, 2000);
        
        // Register commands with lazy initialization
        logger.info('Registering extension commands');
        
        // Command to open AutoPrompter sidebar
        const openSidebarCommand = vscode.commands.registerCommand('autoprompter.openSidebar', async () => {
            logger.info('Opening AutoPrompter sidebar...');
            
            try {
                // Method 1: Try to focus the specific view
                await vscode.commands.executeCommand('autoprompter.sidebar.focus');
                logger.info('AutoPrompter sidebar focused successfully');
                return;
            } catch (error) {
                logger.debug('Method 1 failed, trying method 2...');
            }
            
            try {
                // Method 2: Try to open the view container
                await vscode.commands.executeCommand('workbench.view.extension.autoprompter');
                logger.info('AutoPrompter view container opened successfully');
                return;
            } catch (error) {
                logger.debug('Method 2 failed, trying method 3...');
            }
            
            try {
                // Method 3: Try to reveal the view
                await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
                await vscode.commands.executeCommand('workbench.view.extension.autoprompter');
                logger.info('AutoPrompter view revealed successfully');
                return;
            } catch (error) {
                logger.error('All methods failed to open AutoPrompter sidebar:', error as Error);
                vscode.window.showErrorMessage(
                    'Could not automatically open AutoPrompter sidebar. Please look for the AutoPrompter icon (🤖) in the Activity Bar and click it.',
                    'Open Activity Bar'
                ).then(selection => {
                    if (selection === 'Open Activity Bar') {
                        vscode.commands.executeCommand('workbench.action.toggleActivityBarVisibility');
                    }
                });
            }
        });
        context.subscriptions.push(openSidebarCommand);
        
        // Command to execute prompt manually
        const executePromptCommand = vscode.commands.registerCommand('autoprompter.executePrompt', async () => {
            try {
                logger.info('Trigger prompt command executed');
                const automatedPromptingUseCase = await getAutomatedPromptingUseCase();
                const result = await automatedPromptingUseCase.executePromptNow(true);
                if (result.success) {
                    logger.info('Prompt sent successfully via command');
                    vscode.window.showInformationMessage('Prompt sent successfully!');
                } else {
                    logger.warn(`Prompt failed via command: ${result.message}`);
                    vscode.window.showWarningMessage(`Prompt failed: ${result.message}`);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error('Trigger prompt command failed', error instanceof Error ? error : new Error(errorMessage));
                vscode.window.showErrorMessage(`Error: ${errorMessage}`);
            }
        });
        context.subscriptions.push(executePromptCommand);
        
        context.subscriptions.push(
            vscode.commands.registerCommand('autoprompter.toggleAutomation', async () => {
                try {
                    logger.info('Toggle automation command executed');
                    const currentState = await configUseCase.isAutomationEnabled();
                    await configUseCase.setAutomationEnabled(!currentState);
                    
                    const newState = !currentState;
                    const message = newState ? 'Automation enabled' : 'Automation disabled';
                    logger.info(`Automation toggled via command: ${message}`);
                    vscode.window.showInformationMessage(message);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    logger.error('Toggle automation command failed', error instanceof Error ? error : new Error(errorMessage));
                    vscode.window.showErrorMessage(`Error: ${errorMessage}`);
                }
            })
        );
        
        // Add critical disposables
        context.subscriptions.push(configRepository);
        
        // Add logger to disposables
        context.subscriptions.push({
            dispose: () => logger.dispose()
        });
        
        logger.info('AutoPrompter extension activated successfully');
        console.log('AutoPrompter extension is now active!');
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Extension activation failed', error instanceof Error ? error : new Error(errorMessage));
        console.error('Failed to activate AutoPrompter extension:', error);
        vscode.window.showErrorMessage(`AutoPrompter activation failed: ${errorMessage}`);
        throw error;
    }
}

export function deactivate() {
    logger.info('Extension deactivation started');
    console.log('AutoPrompter extension is being deactivated');
    
    try {
        // Clean up services
        if (sessionMonitoringService) {
            sessionMonitoringService.dispose();
            logger.debug('Session monitoring service disposed');
        }
        
        if (schedulingEngine) {
            schedulingEngine.dispose();
            logger.debug('Scheduling engine disposed');
        }
        
        if (configRepository) {
            configRepository.dispose();
            logger.debug('Configuration repository disposed');
        }
        
        logger.info('AutoPrompter extension deactivated successfully');
        console.log('AutoPrompter extension deactivated successfully');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error during extension deactivation', error instanceof Error ? error : new Error(errorMessage));
        console.error('Error during extension deactivation:', error);
    }
}
