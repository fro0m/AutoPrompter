import * as vscode from 'vscode';
import { 
    AutoPrompterSidebarProvider,
    ConfigurationManagementUseCase,
    AutomatedPromptingUseCase,
    WorkspaceConfigurationRepository,
    VSCodeChatIntegration,
    PromptScheduler,
    AISessionMonitor,
    AutoPrompterSession,
    AutoPrompterConfiguration,
    SessionState,
    PromptSchedulingEngine,
    AISessionMonitoringService,
    WorkspaceTemplateRepository
} from './index';

let sidebarProvider: AutoPrompterSidebarProvider;
let configRepository: WorkspaceConfigurationRepository;
let schedulingEngine: PromptSchedulingEngine;
let sessionMonitoringService: AISessionMonitoringService;
let templateRepository: WorkspaceTemplateRepository;

export async function activate(context: vscode.ExtensionContext) {
    console.log('AutoPrompter extension is now active!');
    
    try {
        // Initialize infrastructure layer
        configRepository = new WorkspaceConfigurationRepository();
        const chatIntegration = new VSCodeChatIntegration();
        
        // Initialize template repository
        templateRepository = new WorkspaceTemplateRepository();
        await templateRepository.initialize();
        
        // Initialize domain entities  
        const scheduler = new PromptScheduler('main-scheduler', {
            intervalMs: 300000, // 5 minutes
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
        
        const sessionMonitor = new AISessionMonitor('main-session');
        const session = new AutoPrompterSession('main', SessionState.Inactive, 
            new AutoPrompterConfiguration(
                [], // templates
                { // schedule
                    intervalMs: 300000,
                    isActive: false,
                    maxRetries: 3
                },
                false, // isEnabled
                50, // maxDailyPrompts
                ['github'] // enabledTargets
            )
        );
        
        // Initialize application layer use cases
        const configUseCase = new ConfigurationManagementUseCase(configRepository);
        const automationUseCase = new AutomatedPromptingUseCase(
            scheduler,
            sessionMonitor,
            chatIntegration,
            configRepository,
            templateRepository, // Use as ICodeContextService (simplified)
            templateRepository  // Use as ITemplateSelectionService
        );
        
        // Register the scheduler with the scheduling engine
        schedulingEngine.registerScheduler('main-scheduler', scheduler);
        
        // Start the session monitoring service
        sessionMonitoringService.start();
        
        // Initialize presentation layer
        sidebarProvider = new AutoPrompterSidebarProvider(
            context.extensionUri,
            configUseCase,
            automationUseCase
        );
        
        // Register the sidebar provider
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                AutoPrompterSidebarProvider.viewType,
                sidebarProvider
            )
        );
        
        // Register configuration change watcher
        configRepository.watch(async (config) => {
            await sidebarProvider.updateConfiguration(config);
        });
        
        console.log('AutoPrompter extension initialized successfully');
        
    } catch (error) {
        console.error('Failed to activate AutoPrompter extension:', error);
        vscode.window.showErrorMessage(
            `Failed to activate AutoPrompter: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

export function deactivate() {
    console.log('AutoPrompter extension is being deactivated');
    
    try {
        // Cleanup resources
        if (configRepository) {
            configRepository.dispose();
        }
        
        if (schedulingEngine) {
            schedulingEngine.dispose();
        }
        
        if (sessionMonitoringService) {
            sessionMonitoringService.dispose();
        }
        
        console.log('AutoPrompter extension deactivated successfully');
    } catch (error) {
        console.error('Error during AutoPrompter extension deactivation:', error);
    }
}
