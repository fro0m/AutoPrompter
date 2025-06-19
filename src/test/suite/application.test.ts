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
    DateTime
} from '../../domain';

// Mock implementations for testing
class MockPromptDeliveryService implements IPromptDeliveryService {
    public lastPrompt?: RenderedPrompt;
    public lastTarget?: AITarget;
    private shouldSucceed: boolean = true;

    setSuccess(success: boolean): void {
        this.shouldSucceed = success;
    }

    async sendToAI(prompt: RenderedPrompt, target: AITarget): Promise<DeliveryResult> {
        this.lastPrompt = prompt;
        this.lastTarget = target;

        return {
            success: this.shouldSucceed,
            message: this.shouldSucceed ? 'Sent successfully' : 'Failed to send',
            timestamp: new Date()
        };
    }
}

class MockConfigurationService implements IConfigurationService {
    private templates: PromptTemplate[] = [];
    private interval: TimeInterval = TimeInterval.fromMinutes(5);
    private automationEnabled: boolean = true;

    async getPromptTemplates(): Promise<PromptTemplate[]> {
        return [...this.templates];
    }

    async updatePromptTemplate(templateId: TemplateId, template: PromptTemplate): Promise<void> {
        const index = this.templates.findIndex(t => t.id === templateId);
        if (index >= 0) {
            this.templates[index] = template;
        } else {
            this.templates.push(template);
        }
    }

    async createPromptTemplate(template: PromptTemplate): Promise<void> {
        if (this.templates.some(t => t.id === template.id)) {
            throw new Error(`Template with ID '${template.id}' already exists`);
        }
        this.templates.push(template);
    }

    async deletePromptTemplate(templateId: TemplateId): Promise<boolean> {
        const initialLength = this.templates.length;
        this.templates = this.templates.filter(t => t.id !== templateId);
        return this.templates.length < initialLength;
    }

    async getScheduleInterval(): Promise<TimeInterval> {
        return this.interval;
    }

    async setScheduleInterval(interval: TimeInterval): Promise<void> {
        this.interval = interval;
    }

    async isAutomationEnabled(): Promise<boolean> {
        return this.automationEnabled;
    }

    async setAutomationEnabled(enabled: boolean): Promise<void> {
        this.automationEnabled = enabled;
    }

    // Helper methods for testing
    addTemplate(template: PromptTemplate): void {
        this.templates.push(template);
    }

    setAutomation(enabled: boolean): void {
        this.automationEnabled = enabled;
    }
}

class MockCodeContextService implements ICodeContextService {
    private context: CodeContext = {
        currentFile: '/test/file.ts',
        currentLanguage: 'typescript',
        selectedText: 'console.log("test");',
        workspaceRoot: '/test',
        projectType: 'node'
    };

    setContext(context: CodeContext): void {
        this.context = context;
    }

    async getCurrentContext(): Promise<CodeContext> {
        return this.context;
    }

    async analyzeCodeForPrompting(): Promise<{
        relevantContext: CodeContext;
        suggestedTemplates: TemplateId[];
    }> {
        return {
            relevantContext: this.context,
            suggestedTemplates: ['test-template-1' as TemplateId]
        };
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
    
    suite('AutomatedPromptingUseCase', () => {
        let useCase: AutomatedPromptingUseCase;
        let mockScheduler: PromptScheduler;
        let mockMonitor: AISessionMonitor;
        let mockDeliveryService: MockPromptDeliveryService;
        let mockConfigService: MockConfigurationService;
        let mockContextService: MockCodeContextService;
        let mockTemplateService: MockTemplateSelectionService;

        setup(() => {
            mockScheduler = new PromptScheduler('test-scheduler', {
                intervalMs: 5000,
                isActive: true,
                maxRetries: 3
            });
            
            mockMonitor = new AISessionMonitor('test-session');
            // Set up monitor to be available for prompts
            mockMonitor['currentState'] = AISessionState.Idle;
            mockMonitor['chatWindows'].set('test-window', {
                windowId: 'test-window',
                lastActivity: DateTime.now(),
                isResponding: false
            });
            
            mockDeliveryService = new MockPromptDeliveryService();
            mockConfigService = new MockConfigurationService();
            mockContextService = new MockCodeContextService();
            mockTemplateService = new MockTemplateSelectionService();

            useCase = new AutomatedPromptingUseCase(
                mockScheduler,
                mockMonitor,
                mockDeliveryService,
                mockConfigService,
                mockContextService,
                mockTemplateService
            );
        });

        test('should execute automated prompting successfully', async () => {
            // Arrange
            const template = new PromptTemplate(
                'test-template' as TemplateId,
                'Test Template',
                'Review this {{language}} code: {{selectedText}}',
                PromptCategory.CodeReview,
                [
                    new TemplateVariable('language', 'string', 'typescript'),
                    new TemplateVariable('selectedText', 'string', 'code')
                ]
            );
            
            mockTemplateService.setTemplates([template]);
            mockConfigService.setAutomation(true);
            
            // Ensure scheduler can execute by setting last execution to past
            mockScheduler['lastExecuted'] = DateTime.now().minus(TimeInterval.fromMinutes(10));

            // Act
            const result = await useCase.executeAutomatedPrompting();

            // Assert
            assert.ok(result.success, 'Execution should succeed');
            assert.ok(result.deliveryResult, 'Should have delivery result');
            assert.strictEqual(mockDeliveryService.lastTarget, AITarget.GitHub);
            assert.ok(mockDeliveryService.lastPrompt?.content.includes('typescript'));
        });

        test('should skip when automation is disabled', async () => {
            // Arrange
            mockConfigService.setAutomation(false);

            // Act
            const result = await useCase.executeAutomatedPrompting();

            // Assert
            assert.ok(!result.success, 'Should not succeed when automation disabled');
            assert.ok(result.message.includes('Skipped'), 'Should indicate skipped execution');
        });

        test('should skip when no template is available', async () => {
            // Arrange
            mockTemplateService.setTemplates([]);
            mockConfigService.setAutomation(true);
            // Set scheduler to allow execution
            mockScheduler['lastExecuted'] = DateTime.now().minus(TimeInterval.fromMinutes(10));

            // Act
            const result = await useCase.executeAutomatedPrompting();

            // Assert
            assert.ok(!result.success, 'Should not succeed when no template available');
            assert.ok(result.message.includes('No suitable template'), 'Should indicate no template found');
        });

        test('should handle delivery failure', async () => {
            // Arrange
            const template = new PromptTemplate(
                'test-template' as TemplateId,
                'Test Template',
                'Test content',
                PromptCategory.General,
                []
            );
            
            mockTemplateService.setTemplates([template]);
            mockConfigService.setAutomation(true);
            mockDeliveryService.setSuccess(false);
            // Set scheduler to allow execution
            mockScheduler['lastExecuted'] = DateTime.now().minus(TimeInterval.fromMinutes(10));

            // Act
            const result = await useCase.executeAutomatedPrompting();

            // Assert
            assert.ok(!result.success, 'Should fail when delivery fails');
            assert.ok(result.message.includes('Failed to deliver'), 'Should indicate delivery failure');
        });

        test('should get execution status correctly', async () => {
            // Arrange
            mockConfigService.setAutomation(true);

            // Act
            const status = await useCase.getExecutionStatus();

            // Assert
            assert.strictEqual(status.automationEnabled, true);
            assert.ok('canExecute' in status);
            assert.ok('schedulerReady' in status);
            assert.ok('sessionAvailable' in status);
        });

        test('should execute prompt now with force flag', async () => {
            // Arrange
            const template = new PromptTemplate(
                'test-template' as TemplateId,
                'Test Template',
                'Test content',
                PromptCategory.General,
                []
            );
            
            mockTemplateService.setTemplates([template]);
            mockConfigService.setAutomation(false); // Disabled, but force should override

            // Act
            const result = await useCase.executePromptNow(true);

            // Assert
            assert.ok(result.success, 'Should succeed with force flag even when automation disabled');
        });
    });

    suite('ConfigurationManagementUseCase', () => {
        let useCase: ConfigurationManagementUseCase;
        let mockConfigService: MockConfigurationService;

        setup(() => {
            mockConfigService = new MockConfigurationService();
            useCase = new ConfigurationManagementUseCase(mockConfigService);
        });

        test('should update prompt template successfully', async () => {
            // Arrange
            const template = new PromptTemplate(
                'test-id' as TemplateId,
                'Test Template',
                'Test content',
                PromptCategory.General,
                []
            );

            // Act
            await useCase.updatePromptTemplate('test-id' as TemplateId, template);

            // Assert
            const templates = await useCase.getPromptTemplates();
            assert.strictEqual(templates.length, 1);
            assert.strictEqual(templates[0].id, 'test-id');
        });

        test('should throw error for template ID mismatch', async () => {
            // Arrange
            const template = new PromptTemplate(
                'different-id' as TemplateId,
                'Test Template',
                'Test content',
                PromptCategory.General,
                []
            );

            // Act & Assert
            await assert.rejects(
                () => useCase.updatePromptTemplate('test-id' as TemplateId, template),
                /Template ID mismatch/
            );
        });

        test('should create new prompt template', async () => {
            // Arrange
            const template = new PromptTemplate(
                'new-template' as TemplateId,
                'New Template',
                'New content',
                PromptCategory.Documentation,
                []
            );

            // Act
            await useCase.createPromptTemplate(template);

            // Assert
            const retrievedTemplate = await useCase.getPromptTemplate('new-template' as TemplateId);
            assert.ok(retrievedTemplate);
            assert.strictEqual(retrievedTemplate.name, 'New Template');
        });

        test('should throw error when creating duplicate template', async () => {
            // Arrange
            const template = new PromptTemplate(
                'duplicate-id' as TemplateId,
                'Template',
                'Content',
                PromptCategory.General,
                []
            );
            
            await useCase.createPromptTemplate(template);

            // Act & Assert
            await assert.rejects(
                () => useCase.createPromptTemplate(template),
                /already exists/
            );
        });

        test('should set and get schedule interval', async () => {
            // Arrange
            const newInterval = TimeInterval.fromMinutes(10);

            // Act
            await useCase.setScheduleInterval(newInterval);
            const retrievedInterval = await useCase.getScheduleInterval();

            // Assert
            assert.ok(retrievedInterval.equals(newInterval));
        });

        test('should throw error for invalid schedule interval', async () => {
            // Arrange
            const tooShortInterval = TimeInterval.fromSeconds(0.5);
            const tooLongInterval = TimeInterval.fromHours(25);

            // Act & Assert
            await assert.rejects(
                () => useCase.setScheduleInterval(tooShortInterval),
                /at least 1 second/
            );

            await assert.rejects(
                () => useCase.setScheduleInterval(tooLongInterval),
                /cannot exceed 24 hours/
            );
        });

        test('should pause and resume automation', async () => {
            // Act
            await useCase.pauseAutomation();
            let isEnabled = await useCase.isAutomationEnabled();
            assert.strictEqual(isEnabled, false);

            await useCase.resumeAutomation();
            isEnabled = await useCase.isAutomationEnabled();
            assert.strictEqual(isEnabled, true);
        });

        test('should toggle automation state', async () => {
            // Arrange
            const initialState = await useCase.isAutomationEnabled();

            // Act
            const newState = await useCase.toggleAutomation();

            // Assert
            assert.strictEqual(newState, !initialState);
            
            const currentState = await useCase.isAutomationEnabled();
            assert.strictEqual(currentState, newState);
        });

        test('should validate configuration', async () => {
            // Act - with no templates
            let validation = await useCase.validateConfiguration();
            assert.strictEqual(validation.isValid, false);
            assert.ok(validation.issues.some(issue => issue.includes('No prompt templates')));

            // Add a valid template
            const template = new PromptTemplate(
                'valid-template' as TemplateId,
                'Valid Template',
                'Valid content',
                PromptCategory.General,
                []
            );
            await useCase.createPromptTemplate(template);

            validation = await useCase.validateConfiguration();
            assert.strictEqual(validation.isValid, true);
            assert.strictEqual(validation.issues.length, 0);
        });

        test('should get configuration summary', async () => {
            // Arrange
            const template = new PromptTemplate(
                'summary-template' as TemplateId,
                'Summary Template',
                'Summary content',
                PromptCategory.General,
                []
            );
            await useCase.createPromptTemplate(template);

            // Act
            const summary = await useCase.getConfigurationSummary();

            // Assert
            assert.strictEqual(summary.templateCount, 1);
            assert.strictEqual(summary.automationEnabled, true);
            assert.ok(summary.scheduleInterval.includes('5m'));
            assert.strictEqual(summary.configurationValid, true);
        });
    });
});
