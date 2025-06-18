import * as assert from 'assert';
import { 
    TimeInterval,
    PromptTemplate,
    TemplateVariable,
    RenderContext,
    UsageQuota,
    PromptCategory,
    TemplateId
} from '../../domain';

suite('Domain Value Objects Tests', () => {
    
    suite('TimeInterval', () => {
        test('should create time interval from minutes', () => {
            const interval = TimeInterval.fromMinutes(5);
            assert.strictEqual(interval.minutes, 5);
            assert.strictEqual(interval.ms, 5 * 60 * 1000);
        });

        test('should create time interval from seconds', () => {
            const interval = TimeInterval.fromSeconds(30);
            assert.strictEqual(interval.seconds, 30);
            assert.strictEqual(interval.ms, 30 * 1000);
        });

        test('should create time interval from hours', () => {
            const interval = TimeInterval.fromHours(2);
            assert.strictEqual(interval.hours, 2);
            assert.strictEqual(interval.ms, 2 * 60 * 60 * 1000);
        });

        test('should throw error for negative values', () => {
            assert.throws(() => TimeInterval.fromMinutes(-1));
            assert.throws(() => TimeInterval.fromSeconds(-1));
            assert.throws(() => TimeInterval.fromHours(-1));
        });

        test('should compare intervals correctly', () => {
            const interval1 = TimeInterval.fromMinutes(5);
            const interval2 = TimeInterval.fromMinutes(5);
            const interval3 = TimeInterval.fromMinutes(7);

            assert.ok(interval1.equals(interval2));
            assert.ok(interval3.isLongerThan(interval1));
            assert.ok(interval1.isShorterThan(interval3));
        });

        test('should add intervals correctly', () => {
            const interval1 = TimeInterval.fromMinutes(3);
            const interval2 = TimeInterval.fromMinutes(2);
            const result = interval1.add(interval2);
            
            assert.strictEqual(result.minutes, 5);
        });

        test('should format toString correctly', () => {
            assert.strictEqual(TimeInterval.fromSeconds(30).toString(), '30s');
            assert.strictEqual(TimeInterval.fromMinutes(5).toString(), '5m');
            assert.strictEqual(TimeInterval.fromHours(2).toString(), '2h');
        });
    });

    suite('TemplateVariable', () => {
        test('should create template variable with valid parameters', () => {
            const variable = new TemplateVariable('fileName', 'string', 'default.ts', 'The current file name');
            
            assert.strictEqual(variable.name, 'fileName');
            assert.strictEqual(variable.type, 'string');
            assert.strictEqual(variable.defaultValue, 'default.ts');
            assert.strictEqual(variable.description, 'The current file name');
        });

        test('should throw error for empty name', () => {
            assert.throws(() => new TemplateVariable('', 'string', 'default'));
            assert.throws(() => new TemplateVariable('   ', 'string', 'default'));
        });

        test('should throw error for mismatched type and default value', () => {
            assert.throws(() => new TemplateVariable('test', 'string', 123));
            assert.throws(() => new TemplateVariable('test', 'number', 'not a number'));
            assert.throws(() => new TemplateVariable('test', 'boolean', 'not a boolean'));
        });

        test('should compare variables correctly', () => {
            const var1 = new TemplateVariable('name', 'string', 'default');
            const var2 = new TemplateVariable('name', 'string', 'default');
            const var3 = new TemplateVariable('name', 'string', 'different');

            assert.ok(var1.equals(var2));
            assert.ok(!var1.equals(var3));
        });
    });

    suite('PromptTemplate', () => {
        test('should create prompt template with valid parameters', () => {
            const variables = [
                new TemplateVariable('fileName', 'string', 'test.ts'),
                new TemplateVariable('language', 'string', 'typescript')
            ];
            
            const template = new PromptTemplate(
                'test-id' as TemplateId,
                'Test Template',
                'Please review {{fileName}} written in {{language}}',
                PromptCategory.CodeReview,
                variables
            );

            assert.strictEqual(template.id, 'test-id');
            assert.strictEqual(template.name, 'Test Template');
            assert.strictEqual(template.category, PromptCategory.CodeReview);
            assert.strictEqual(template.variables.length, 2);
        });

        test('should throw error for empty name or content', () => {
            const variables: TemplateVariable[] = [];
            
            assert.throws(() => new PromptTemplate(
                'id' as TemplateId, '', 'content', PromptCategory.General, variables
            ));
            assert.throws(() => new PromptTemplate(
                'id' as TemplateId, 'name', '', PromptCategory.General, variables
            ));
        });

        test('should throw error for duplicate variable names', () => {
            const variables = [
                new TemplateVariable('name', 'string', 'default1'),
                new TemplateVariable('name', 'string', 'default2')
            ];
            
            assert.throws(() => new PromptTemplate(
                'id' as TemplateId, 'Test', 'content', PromptCategory.General, variables
            ));
        });

        test('should render template with context', () => {
            const variables = [
                new TemplateVariable('fileName', 'string', 'default.ts'),
                new TemplateVariable('language', 'string', 'typescript')
            ];
            
            const template = new PromptTemplate(
                'test-id' as TemplateId,
                'Test Template',
                'Please review {{fileName}} written in {{language}}',
                PromptCategory.CodeReview,
                variables
            );

            const context: RenderContext = {
                getValue: (name: string) => {
                    if (name === 'fileName') { return 'app.ts'; }
                    if (name === 'language') { return 'TypeScript'; }
                    return undefined;
                },
                hasValue: (name: string) => name === 'fileName' || name === 'language'
            };

            const rendered = template.render(context);
            assert.strictEqual(rendered.content, 'Please review app.ts written in TypeScript');
            assert.strictEqual(rendered.templateId, 'test-id');
        });

        test('should use default values when context value not provided', () => {
            const variables = [
                new TemplateVariable('fileName', 'string', 'default.ts')
            ];
            
            const template = new PromptTemplate(
                'test-id' as TemplateId,
                'Test Template',
                'File: {{fileName}}',
                PromptCategory.General,
                variables
            );

            const context: RenderContext = {
                getValue: () => undefined,
                hasValue: () => false
            };

            const rendered = template.render(context);
            assert.strictEqual(rendered.content, 'File: default.ts');
        });

        test('should find variables correctly', () => {
            const variables = [
                new TemplateVariable('fileName', 'string', 'default.ts'),
                new TemplateVariable('language', 'string', 'typescript')
            ];
            
            const template = new PromptTemplate(
                'test-id' as TemplateId,
                'Test Template',
                'content',
                PromptCategory.General,
                variables
            );

            assert.ok(template.hasVariable('fileName'));
            assert.ok(template.hasVariable('language'));
            assert.ok(!template.hasVariable('nonexistent'));

            const fileNameVar = template.getVariable('fileName');
            assert.ok(fileNameVar);
            assert.strictEqual(fileNameVar.name, 'fileName');

            const variableNames = template.getVariableNames();
            assert.deepStrictEqual(variableNames, ['fileName', 'language']);
        });
    });

    suite('UsageQuota', () => {
        test('should create usage quota with valid parameters', () => {
            const quota = new UsageQuota(10, TimeInterval.fromMinutes(1), 3);
            
            assert.strictEqual(quota.maxRequestsPerInterval, 10);
            assert.strictEqual(quota.interval.minutes, 1);
            assert.strictEqual(quota.currentUsage, 3);
        });

        test('should create preset quotas', () => {
            const perMinute = UsageQuota.perMinute(5);
            assert.strictEqual(perMinute.maxRequestsPerInterval, 5);
            assert.strictEqual(perMinute.interval.minutes, 1);

            const perHour = UsageQuota.perHour(60);
            assert.strictEqual(perHour.maxRequestsPerInterval, 60);
            assert.strictEqual(perHour.interval.hours, 1);

            const perDay = UsageQuota.perDay(1000);
            assert.strictEqual(perDay.maxRequestsPerInterval, 1000);
            assert.strictEqual(perDay.interval.hours, 24);
        });

        test('should throw error for invalid parameters', () => {
            assert.throws(() => new UsageQuota(0, TimeInterval.fromMinutes(1)));
            assert.throws(() => new UsageQuota(-1, TimeInterval.fromMinutes(1)));
            assert.throws(() => new UsageQuota(10, TimeInterval.fromMinutes(1), -1));
            assert.throws(() => new UsageQuota(10, TimeInterval.fromMinutes(1), 15));
        });

        test('should check if quota is exceeded', () => {
            const quota1 = new UsageQuota(10, TimeInterval.fromMinutes(1), 10);
            const quota2 = new UsageQuota(10, TimeInterval.fromMinutes(1), 9);
            
            assert.ok(quota1.isExceeded());
            assert.ok(!quota2.isExceeded());
        });

        test('should check if additional requests would exceed quota', () => {
            const quota = new UsageQuota(10, TimeInterval.fromMinutes(1), 8);
            
            assert.ok(!quota.wouldExceed(2));
            assert.ok(quota.wouldExceed(3));
        });

        test('should calculate remaining requests correctly', () => {
            const quota = new UsageQuota(10, TimeInterval.fromMinutes(1), 3);
            assert.strictEqual(quota.getRemainingRequests(), 7);

            const exceededQuota = new UsageQuota(10, TimeInterval.fromMinutes(1), 10);
            assert.strictEqual(exceededQuota.getRemainingRequests(), 0);
        });

        test('should calculate usage percentage correctly', () => {
            const quota = new UsageQuota(10, TimeInterval.fromMinutes(1), 3);
            assert.strictEqual(quota.getUsagePercentage(), 30);

            const exceededQuota = new UsageQuota(10, TimeInterval.fromMinutes(1), 10);
            assert.strictEqual(exceededQuota.getUsagePercentage(), 100);
        });

        test('should create new quota with updated usage', () => {
            const original = new UsageQuota(10, TimeInterval.fromMinutes(1), 3);
            const updated = original.withUsage(5);
            
            assert.strictEqual(original.currentUsage, 3);
            assert.strictEqual(updated.currentUsage, 5);
            assert.strictEqual(updated.maxRequestsPerInterval, 10);
        });

        test('should increment usage correctly', () => {
            const original = new UsageQuota(10, TimeInterval.fromMinutes(1), 3);
            const incremented = original.incrementUsage(2);
            
            assert.strictEqual(original.currentUsage, 3);
            assert.strictEqual(incremented.currentUsage, 5);
        });

        test('should reset usage correctly', () => {
            const original = new UsageQuota(10, TimeInterval.fromMinutes(1), 7);
            const reset = original.reset();
            
            assert.strictEqual(original.currentUsage, 7);
            assert.strictEqual(reset.currentUsage, 0);
        });
    });
});
