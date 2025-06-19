import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { 
    WorkspaceConfigurationRepository,
    VSCodeChatIntegration,
    PromptSchedulingEngine,
    AISessionMonitoringService
} from '../../infrastructure';
import { 
    AutoPrompterConfiguration,
    PromptScheduler,
    AISessionMonitor,
    TimeInterval
} from '../../domain';
import { AITarget } from '../../domain/types';
import { AutoPrompterSidebarProvider } from '../../presentation/autoprompter-sidebar-provider';
import { WebViewMessageType } from '../../presentation/interfaces';

// Mock VS Code API for testing
const mockVSCode = {
    workspace: {
        getConfiguration: () => ({
            get: () => undefined,
            update: async () => {}
        }),
        onDidChangeConfiguration: () => ({ dispose: () => {} })
    }
};

suite('Infrastructure Layer Tests', () => {
    
    suite('WorkspaceConfigurationRepository', () => {
        let repository: WorkspaceConfigurationRepository;
        let mockWorkspaceConfig: any;
        let originalGetConfiguration: any;

        setup(() => {
            // Mock VS Code workspace configuration
            mockWorkspaceConfig = {
                get: (key: string, defaultValue?: any) => {
                    const configs: Record<string, any> = {
                        'promptText': 'Please review the current code and provide suggestions for improvement.',
                        'schedule': {
                            minimalIntervalMs: 60000,
                            isActive: false,
                            maxRetries: 3
                        },
                        'enabled': false,
                        'maxDailyPrompts': 50
                    };
                    return configs[key] ?? defaultValue;
                },
                update: async (key: string, value: any) => {
                    console.log(`Mock config update: ${key} = ${JSON.stringify(value)}`);
                    return Promise.resolve();
                },
                inspect: (key: string) => ({
                    workspaceValue: key === 'enabled' ? false : undefined,
                    workspaceFolderValue: undefined
                })
            };

            originalGetConfiguration = vscode.workspace.getConfiguration;
            vscode.workspace.getConfiguration = () => mockWorkspaceConfig;

            repository = new WorkspaceConfigurationRepository();
        });

        teardown(() => {
            // Restore original functions
            vscode.workspace.getConfiguration = originalGetConfiguration;
            repository.dispose();
        });

        test('should load default configuration when no workspace config exists', async () => {
            const config = await repository.load();
            
            assert.ok(config instanceof AutoPrompterConfiguration);
            assert.strictEqual(config.isEnabled, false);
            assert.strictEqual(config.maxDailyPrompts, 50);
            assert.strictEqual(config.schedule.minimalIntervalMs, 60000);
            assert.strictEqual(config.schedule.isActive, false);
            assert.strictEqual(config.schedule.maxRetries, 3);
            assert.ok(config.promptText.includes('review'));
        });

        test('should save configuration to workspace settings', async () => {
            const config = AutoPrompterConfiguration.createDefault();
            
            // Should not throw
            await repository.save(config);
        });

        test('should validate configuration before saving', async () => {
            // Create invalid configuration - should fail during constructor
            try {
                new AutoPrompterConfiguration(
                    '', // Empty prompt text
                    {
                        minimalIntervalMs: 500, // Too small
                        isActive: false,
                        maxRetries: 3
                    },
                    true,
                    0 // Invalid max daily prompts
                );
                
                assert.fail('Should have thrown validation error during construction');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Minimal interval must be at least 1000ms') || 
                         error.message.includes('Prompt text cannot be empty') ||
                         error.message.includes('Max daily prompts must be positive'));
            }
        });

        test('should register configuration watchers', () => {
            const callback = () => {
                // Callback implementation for test
            };

            repository.watch(callback);
            
            // Callback should be registered (checking internal state)
            assert.ok((repository as any).watchers.includes(callback));
        });

        test('should check if workspace has configuration', async () => {
            const hasConfig = await repository.hasWorkspaceConfiguration();
            assert.strictEqual(typeof hasConfig, 'boolean');
        });

        test('should reset to defaults', async () => {
            // Should not throw
            await repository.resetToDefaults();
        });

        test('should implement IConfigurationService methods', async () => {
            // Test prompt text methods
            const promptText = await repository.getPromptText();
            assert.ok(typeof promptText === 'string');
            assert.ok(promptText.length > 0);

            await repository.setPromptText('New test prompt text');
            
            // Test minimal interval methods
            const interval = await repository.getMinimalInterval();
            assert.ok(interval instanceof TimeInterval);
            assert.ok(interval.ms >= 1000);

            await repository.setMinimalInterval(TimeInterval.fromMinutes(2));

            // Test automation methods
            const enabled = await repository.isAutomationEnabled();
            assert.strictEqual(typeof enabled, 'boolean');

            await repository.setAutomationEnabled(true);
        });
    });

    suite('AISessionMonitoringService', () => {
        let service: AISessionMonitoringService;

        setup(() => {
            service = new AISessionMonitoringService('test-session', {
                idleThresholdMs: 30000,
                chatResponseTimeoutMs: 10000,
                activityCheckIntervalMs: 5000,
                maxIdleTimeMs: 300000,
                enableWorkspaceMonitoring: true
            });
        });

        teardown(() => {
            service.dispose();
        });

        test('should initialize with correct configuration', () => {
            assert.ok(service);
            const state = service.getSessionState();
            assert.ok(Object.values(['unknown', 'active', 'idle', 'busy', 'unavailable']).includes(state));
        });

        test('should start and stop monitoring', () => {
            // Should not throw
            service.start();
            service.stop();
        });

        test('should track session availability', () => {
            const isAvailable = service.isAvailableForPrompt();
            assert.strictEqual(typeof isAvailable, 'boolean');
        });

        test('should detect idle state', () => {
            const idleDetection = service.getIdleDetection();
            assert.ok(idleDetection);
            assert.strictEqual(typeof idleDetection.isIdle, 'boolean');
            assert.ok(idleDetection.idleDuration);
        });

        test('should provide activity status', () => {
            const chatActivity = service.getChatActivityStatus();
            assert.ok(chatActivity instanceof Map);

            const workspaceActivity = service.getWorkspaceActivity();
            assert.ok(workspaceActivity);
            assert.strictEqual(typeof workspaceActivity.isUserActive, 'boolean');
        });

        test('should register and mark activity', () => {
            // Should not throw
            service.registerActivity();
            service.registerActivity(AITarget.GitHub);
            service.markIdle();
        });

        test('should check idle duration', () => {
            const duration = TimeInterval.fromSeconds(30);
            const isIdleForDuration = service.isIdleForDuration(duration);
            assert.strictEqual(typeof isIdleForDuration, 'boolean');
        });
    });

    suite('PromptSchedulingEngine', () => {
        let engine: PromptSchedulingEngine;
        let mockDeliveryService: any;

        setup(() => {
            mockDeliveryService = {
                sendToAI: async () => ({
                    success: true,
                    message: 'Test delivery',
                    timestamp: new Date()
                })
            };

            engine = new PromptSchedulingEngine(mockDeliveryService, {
                maxPromptsPerMinute: 2,
                maxPromptsPerHour: 20,
                maxPromptsPerDay: 100,
                burstLimit: 3,
                cooldownMs: 60000
            });
        });

        teardown(() => {
            engine.dispose();
        });

        test('should initialize with rate limiting configuration', () => {
            assert.ok(engine);
        });

        test('should dispose properly', () => {
            // Should not throw
            engine.dispose();
        });
    });



    suite('AutoPrompterSidebarProvider', () => {
        test('should handle toggle automation message correctly', async () => {
            const mockConfigUseCase = {
                setAutomationEnabled: sinon.stub().resolves(),
                isAutomationEnabled: sinon.stub().resolves(false),
                getConfigurationSummary: sinon.stub().resolves({
                    automationEnabled: false,
                    promptText: 'Test prompt',
                    minimalInterval: '1 minute',
                    configurationValid: true
                }),
                getPromptText: sinon.stub().resolves('Test prompt')
            };

            const mockAutomationUseCase = {
                executePromptNow: sinon.stub().resolves({ success: true, message: 'Test executed' }),
                getExecutionStatus: sinon.stub().resolves({ 
                    isRunning: false, 
                    lastExecution: null,
                    executionCount: 0
                })
            };

            const mockExtensionUri = vscode.Uri.file('/test/path');
            
            // Create sidebar provider
            const sidebarProvider = new AutoPrompterSidebarProvider(
                mockExtensionUri,
                mockConfigUseCase as any,
                mockAutomationUseCase as any
            );

            // Test the toggle automation handler directly
            const toggleMessage = {
                type: WebViewMessageType.TOGGLE_AUTOMATION,
                payload: { enabled: true },
                requestId: 'test-toggle-123'
            };

            // Call the private method using type assertion
            const response = await (sidebarProvider as any).handleWebviewMessage(toggleMessage);

            // Verify the response
            assert.strictEqual(response.success, true);
            assert.strictEqual(response.data.enabled, true);
            assert.strictEqual(response.data.message, 'Automation enabled');

            // Verify that the configuration was updated
            sinon.assert.calledOnce(mockConfigUseCase.setAutomationEnabled);
            sinon.assert.calledWith(mockConfigUseCase.setAutomationEnabled, true);
        });

        test('should handle toggle automation errors gracefully', async () => {
            const mockConfigUseCase = {
                setAutomationEnabled: sinon.stub().rejects(new Error('Configuration save failed')),
                isAutomationEnabled: sinon.stub().resolves(false),
                getConfigurationSummary: sinon.stub().resolves({
                    automationEnabled: false,
                    promptText: 'Test prompt',
                    minimalInterval: '1 minute',
                    configurationValid: true
                }),
                getPromptText: sinon.stub().resolves('Test prompt')
            };

            const mockAutomationUseCase = {
                executePromptNow: sinon.stub().resolves({ success: true, message: 'Test executed' }),
                getExecutionStatus: sinon.stub().resolves({ 
                    isRunning: false, 
                    lastExecution: null,
                    executionCount: 0
                })
            };

            const mockExtensionUri = vscode.Uri.file('/test/path');
            
            // Create sidebar provider
            const sidebarProvider = new AutoPrompterSidebarProvider(
                mockExtensionUri,
                mockConfigUseCase as any,
                mockAutomationUseCase as any
            );

            // Test the toggle automation handler with error
            const toggleMessage = {
                type: WebViewMessageType.TOGGLE_AUTOMATION,
                payload: { enabled: true },
                requestId: 'test-toggle-error-123'
            };

            // Call the private method using type assertion
            const response = await (sidebarProvider as any).handleWebviewMessage(toggleMessage);

            // Verify the error response
            assert.strictEqual(response.success, false);
            assert.strictEqual(response.error, 'Configuration save failed');

            // Verify that the configuration was attempted to be updated
            sinon.assert.calledOnce(mockConfigUseCase.setAutomationEnabled);
            sinon.assert.calledWith(mockConfigUseCase.setAutomationEnabled, true);
        });
    });


});
