import * as assert from 'assert';
import { 
    AutomatedPromptingUseCase,
    ConfigurationManagementUseCase,
    DeliveryResult,
    CodeContext,
    IPromptDeliveryService,
    IConfigurationService,
    ICodeContextService,
    ITemplateSelectionService
} from '../../application';
import { 
    PromptScheduler,
    AISessionMonitor,
    PromptTemplate,
    TemplateVariable,
    RenderedPrompt,
    TimeInterval,
    PromptCategory,
    TemplateId,
    AITarget,

    AISessionState,
    DateTime,
    AutoPrompterConfiguration,
    ScheduleConfiguration
} from '../../domain';
import { ExecutionResult, SimplePrompt } from '../../application/interfaces';

// Mock implementations for testing
class MockPromptDeliveryService implements IPromptDeliveryService {
    public lastPrompt: any = null;
    public lastTarget: AITarget | null = null;
    public shouldFail: boolean = false;

    async sendToAI(prompt: any, target: AITarget): Promise<DeliveryResult> {
        this.lastPrompt = prompt;
        this.lastTarget = target;

        if (this.shouldFail) {
            return {
                success: false,
                message: 'Mock delivery failure',
                error: new Error('Mock error'),
                timestamp: new Date()
            };
        }

        return {
            success: true,
            message: 'Mock delivery success',
            timestamp: new Date()
        };
    }
}

class MockConfigurationService implements IConfigurationService {
    private promptText: string = 'Please review the current code and provide suggestions for improvement.';
    private minimalInterval: TimeInterval = TimeInterval.fromMinutes(1);
    private automationEnabled: boolean = true;

    async getPromptText(): Promise<string> {
        return this.promptText;
    }

    async setPromptText(promptText: string): Promise<void> {
        this.promptText = promptText;
    }

    async getMinimalInterval(): Promise<TimeInterval> {
        return this.minimalInterval;
    }

    async setMinimalInterval(interval: TimeInterval): Promise<void> {
        this.minimalInterval = interval;
    }

    async isAutomationEnabled(): Promise<boolean> {
        return this.automationEnabled;
    }

    async setAutomationEnabled(enabled: boolean): Promise<void> {
        this.automationEnabled = enabled;
    }

    // Helper methods for testing
    setPromptTextDirect(promptText: string): void {
        this.promptText = promptText;
    }

    setAutomation(enabled: boolean): void {
        this.automationEnabled = enabled;
    }

    setMinimalIntervalDirect(interval: TimeInterval): void {
        this.minimalInterval = interval;
    }
}

class MockCodeContextService implements ICodeContextService {
    private mockContext: CodeContext = {
        currentFile: '/test/file.ts',
        currentLanguage: 'typescript',
        selectedText: 'const x = 5;',
        cursorPosition: { line: 10, character: 5 },
        workspaceRoot: '/test',
        openFiles: ['/test/file.ts'],
        gitBranch: 'main',
        projectType: 'typescript'
    };

    async getCurrentContext(): Promise<CodeContext> {
        return { ...this.mockContext };
    }

    async analyzeCodeForPrompting(): Promise<{
        relevantContext: CodeContext;
        suggestedPromptEnhancements: string[];
    }> {
        return {
            relevantContext: { ...this.mockContext },
            suggestedPromptEnhancements: ['Consider adding type annotations', 'Review error handling']
        };
    }

    setMockContext(context: Partial<CodeContext>): void {
        this.mockContext = { ...this.mockContext, ...context };
    }
}

class MockTemplateSelectionService implements ITemplateSelectionService {
    private templates: PromptTemplate[] = [];

    setTemplates(templates: PromptTemplate[]): void {
        this.templates = templates;
    }

    async selectBestTemplate(): Promise<PromptTemplate | null> {
        return this.templates.length > 0 ? this.templates[0] : null;
    }

    async getAvailableTemplates(): Promise<PromptTemplate[]> {
        return [...this.templates];
    }
}

suite('Application Layer Tests', () => {
    let configService: MockConfigurationService;
    let useCase: ConfigurationManagementUseCase;

    setup(() => {
        configService = new MockConfigurationService();
        useCase = new ConfigurationManagementUseCase(configService);
    });

    suite('ConfigurationManagementUseCase', () => {
        test('should get prompt text', async () => {
            const promptText = await useCase.getPromptText();
            assert.strictEqual(promptText, 'Please review the current code and provide suggestions for improvement.');
        });

        test('should set prompt text', async () => {
            const newPromptText = 'New prompt text for testing';
            await useCase.setPromptText(newPromptText);
            
            const retrievedText = await useCase.getPromptText();
            assert.strictEqual(retrievedText, newPromptText);
        });

        test('should reject empty prompt text', async () => {
            await assert.rejects(
                async () => await useCase.setPromptText(''),
                /Prompt text cannot be empty/
            );

            await assert.rejects(
                async () => await useCase.setPromptText('   '),
                /Prompt text cannot be empty/
            );
        });

        test('should get minimal interval', async () => {
            const interval = await useCase.getMinimalInterval();
            assert.strictEqual(interval.minutes, 1);
        });

        test('should set minimal interval', async () => {
            const newInterval = TimeInterval.fromMinutes(2);
            await useCase.setMinimalInterval(newInterval);
            
            const retrievedInterval = await useCase.getMinimalInterval();
            assert.strictEqual(retrievedInterval.minutes, 2);
        });

        test('should reject minimal interval less than 1 second', async () => {
            const invalidInterval = TimeInterval.fromSeconds(0.5);
            
            await assert.rejects(
                async () => await useCase.setMinimalInterval(invalidInterval),
                /Minimal interval must be at least 1 second/
            );
        });

        test('should check automation status', async () => {
            const enabled = await useCase.isAutomationEnabled();
            assert.strictEqual(enabled, true);
        });

        test('should set automation enabled/disabled', async () => {
            await useCase.setAutomationEnabled(false);
            let enabled = await useCase.isAutomationEnabled();
            assert.strictEqual(enabled, false);

            await useCase.setAutomationEnabled(true);
            enabled = await useCase.isAutomationEnabled();
            assert.strictEqual(enabled, true);
        });

        test('should validate configuration', async () => {
            // Valid configuration
            let validation = await useCase.validateConfiguration();
            assert.strictEqual(validation.isValid, true);
            assert.strictEqual(validation.issues.length, 0);

            // Empty prompt text
            configService.setPromptTextDirect('');
            validation = await useCase.validateConfiguration();
            assert.strictEqual(validation.isValid, false);
            assert.ok(validation.issues.some(issue => issue.includes('Prompt text is empty')));

            // Invalid minimal interval
            configService.setPromptTextDirect('Valid prompt text');
            configService.setMinimalIntervalDirect(TimeInterval.fromSeconds(0.5));
            validation = await useCase.validateConfiguration();
            assert.strictEqual(validation.isValid, false);
            assert.ok(validation.issues.some(issue => issue.includes('Minimal interval is less than 1 second')));
        });

        test('should get configuration summary', async () => {
            const summary = await useCase.getConfigurationSummary();
            
            assert.strictEqual(summary.promptText, 'Please review the current code and provide suggest...');
            assert.strictEqual(summary.minimalInterval, '1m');
            assert.strictEqual(summary.automationEnabled, true);
            assert.strictEqual(summary.configurationValid, true);
        });

        test('should get recommended configuration', async () => {
            // Default recommendation
            let recommendation = await useCase.getRecommendedConfiguration();
            assert.ok(recommendation.promptText.includes('review'));
            assert.strictEqual(recommendation.minimalInterval.minutes, 1);

            // Performance-focused recommendation
            recommendation = await useCase.getRecommendedConfiguration({
                focusArea: 'performance',
                experienceLevel: 'advanced'
            });
            assert.ok(recommendation.promptText.includes('performance'));
            assert.strictEqual(recommendation.minimalInterval.seconds, 30);

            // Security-focused recommendation
            recommendation = await useCase.getRecommendedConfiguration({
                focusArea: 'security',
                experienceLevel: 'beginner'
            });
            assert.ok(recommendation.promptText.includes('security'));
            assert.strictEqual(recommendation.minimalInterval.minutes, 2);
        });
    });
});
