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
    AISessionMonitoringService
} from './index';

let sidebarProvider: AutoPrompterSidebarProvider;
let configRepository: WorkspaceConfigurationRepository;
let schedulingEngine: PromptSchedulingEngine;
let sessionMonitoringService: AISessionMonitoringService;

export async function activate(context: vscode.ExtensionContext) {
    console.log('AutoPrompter extension is now active!');
    
    try {
        // Initialize infrastructure layer
        configRepository = new WorkspaceConfigurationRepository();
        const chatIntegration = new VSCodeChatIntegration();
        
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
        
        // Create AI session monitor
        const sessionMonitor = new AISessionMonitor('main-session');
        
        // Initialize use cases
        const configUseCase = new ConfigurationManagementUseCase(configRepository);
        
        const automatedPromptingUseCase = new AutomatedPromptingUseCase(
            scheduler,
            sessionMonitor,
            chatIntegration, // Use chat integration as delivery service
            configRepository
        );
        
        // Initialize sidebar provider
        sidebarProvider = new AutoPrompterSidebarProvider(
            context.extensionUri,
            configUseCase,
            automatedPromptingUseCase
        );
        
        // Register webview provider
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                AutoPrompterSidebarProvider.viewType,
                sidebarProvider
            )
        );
        
        // Register commands
        context.subscriptions.push(
            vscode.commands.registerCommand('autoprompter.openConfiguration', () => {
                vscode.commands.executeCommand('workbench.view.extension.autoprompter');
            })
        );
        
        context.subscriptions.push(
            vscode.commands.registerCommand('autoprompter.triggerPrompt', async () => {
                try {
                    const result = await automatedPromptingUseCase.executePromptNow(true);
                    if (result.success) {
                        vscode.window.showInformationMessage('Prompt sent successfully!');
                    } else {
                        vscode.window.showWarningMessage(`Prompt failed: ${result.message}`);
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
                }
            })
        );
        
        context.subscriptions.push(
            vscode.commands.registerCommand('autoprompter.toggleAutomation', async () => {
                try {
                    const currentState = await configUseCase.isAutomationEnabled();
                    await configUseCase.setAutomationEnabled(!currentState);
                    
                    const newState = !currentState;
                    const message = newState ? 'Automation enabled' : 'Automation disabled';
                    vscode.window.showInformationMessage(message);
                } catch (error) {
                    vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
                }
            })
        );
        
        // Start monitoring services
        sessionMonitoringService.start();
        
        // Add disposables
        context.subscriptions.push(configRepository);
        context.subscriptions.push(sessionMonitoringService);
        context.subscriptions.push(schedulingEngine);
        
        console.log('AutoPrompter extension activated successfully');
        
    } catch (error) {
        console.error('Failed to activate AutoPrompter extension:', error);
        vscode.window.showErrorMessage('Failed to activate AutoPrompter extension');
    }
}

export function deactivate() {
    console.log('AutoPrompter extension is being deactivated');
    
    try {
        // Clean up services
        if (sessionMonitoringService) {
            sessionMonitoringService.dispose();
        }
        
        if (schedulingEngine) {
            schedulingEngine.dispose();
        }
        
        if (configRepository) {
            configRepository.dispose();
        }
        
        console.log('AutoPrompter extension deactivated successfully');
    } catch (error) {
        console.error('Error during extension deactivation:', error);
    }
}
