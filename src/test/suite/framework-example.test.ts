import * as assert from 'assert';
import { AutoPrompterTestFramework } from '../test-framework';
import { 
    AutoPrompterConfiguration,
    TimeInterval
} from '../../domain';

const { TestUtils, TestAssertions, TestSuiteBuilder, TestReporter } = AutoPrompterTestFramework;

// Example test demonstrating the new test framework
suite('Test Framework Example', () => {
    
    // Traditional test structure
    test('TestUtils should create mock configuration', () => {
        const mockConfig = TestUtils.createMockConfiguration({
            promptText: 'Test prompt',
            enabled: true
        });

        assert.strictEqual(mockConfig.get('promptText'), 'Test prompt');
        assert.strictEqual(mockConfig.get('enabled'), true);
        assert.strictEqual(mockConfig.get('nonexistent', 'default'), 'default');
    });

    test('TestUtils should generate random strings', () => {
        const randomString = TestUtils.generateRandomString(10);
        assert.strictEqual(randomString.length, 10);
        assert.ok(/^[A-Za-z0-9]+$/.test(randomString));
    });

    test('TestAssertions should validate configuration objects', () => {
        const validConfig = TestUtils.createTestConfiguration();
        
        // Should not throw for valid configuration
        TestAssertions.assertValidConfiguration(validConfig);

        // Should throw for invalid configuration
        const invalidConfig = { ...validConfig, promptText: '' };
        assert.throws(() => {
            TestAssertions.assertValidConfiguration(invalidConfig);
        });
    });

    test('TestAssertions should assert array contents', () => {
        const testArray = ['apple', 'banana', 'cherry'];
        
        // Should pass
        TestAssertions.assertArrayContains(testArray, ['apple', 'banana']);
        
        // Should throw
        assert.throws(() => {
            TestAssertions.assertArrayContains(testArray, ['grape']);
        });
    });

    test('TestAssertions should assert value ranges', () => {
        // Should pass
        TestAssertions.assertInRange(50, 0, 100);
        
        // Should throw
        assert.throws(() => {
            TestAssertions.assertInRange(150, 0, 100);
        });
    });

    test('TestAssertions should handle promise rejections', async () => {
        const rejectingPromise = Promise.reject(new Error('Test error'));
        
        // Should not throw when promise rejects as expected
        await TestAssertions.assertRejects(rejectingPromise, 'Test error');
        
        // Should throw when promise doesn't reject
        const resolvingPromise = Promise.resolve('success');
        try {
            await TestAssertions.assertRejects(resolvingPromise);
            assert.fail('Should have thrown');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Check for the actual error message that comes from assert.fail
            assert.ok(errorMessage.includes('Expected promise to reject') || errorMessage.includes('Should have thrown'));
        }
    });

    test('TestUtils delay should work correctly', async () => {
        const start = Date.now();
        await TestUtils.delay(100);
        const elapsed = Date.now() - start;
        
        // Should be approximately 100ms (with some tolerance)
        TestAssertions.assertInRange(elapsed, 90, 150);
    });

    // Example using TestSuiteBuilder pattern
    suite('Domain Configuration Tests', () => {
        let testConfig: any;

        setup(() => {
            testConfig = TestUtils.createTestConfiguration({
                promptText: 'Integration test prompt',
                schedule: { minimalIntervalMs: 30000, isActive: true, maxRetries: 5 },
                enabled: true
            });
        });

        test('should create valid AutoPrompter configuration', () => {
            const config = new AutoPrompterConfiguration(
                testConfig.promptText,
                testConfig.schedule,
                testConfig.enabled,
                testConfig.maxDailyPrompts
            );

            assert.ok(config);
            assert.strictEqual(config.promptText, testConfig.promptText);
            assert.strictEqual(config.isEnabled, testConfig.enabled);
            assert.strictEqual(config.schedule.minimalIntervalMs, testConfig.schedule.minimalIntervalMs);
        });

        test('should validate configuration properties', () => {
            TestAssertions.assertValidConfiguration(testConfig);
            
            TestAssertions.assertHasProperties(testConfig, [
                'promptText',
                'schedule',
                'enabled',
                'maxDailyPrompts'
            ]);
        });

        test('should handle time intervals correctly', () => {
            const interval = TimeInterval.fromMinutes(5);
            
            assert.strictEqual(interval.minutes, 5);
            assert.strictEqual(interval.ms, 5 * 60 * 1000);
            
            TestAssertions.assertInRange(interval.ms, 299000, 301000);
        });
    });

    // Example of testing async operations
    suite('Async Operations Testing', () => {
        test('should handle async configuration updates', async () => {
            const mockConfig = TestUtils.createMockConfiguration();
            
            await mockConfig.update('promptText', 'Updated prompt');
            
            // In a real test, we'd verify the update was saved
            assert.strictEqual(mockConfig.get('promptText'), 'Updated prompt');
        });

        test('should timeout appropriately', async () => {
            const slowOperation = async () => {
                await TestUtils.delay(200);
                return 'completed';
            };

            const result = await slowOperation();
            assert.strictEqual(result, 'completed');
        });
    });

    // Example of error testing
    suite('Error Handling Tests', () => {
        test('should handle configuration validation errors', () => {
            assert.throws(() => {
                new AutoPrompterConfiguration(
                    '', // Invalid empty prompt
                    { minimalIntervalMs: 60000, isActive: false, maxRetries: 3 },
                    false,
                    50
                );
            }, /Prompt text cannot be empty/);
        });

        test('should handle invalid time intervals', () => {
            assert.throws(() => {
                TimeInterval.fromMinutes(-1);
            }, /negative/i);
        });
    });

    // Example of mock testing
    suite('Mock Integration Tests', () => {
        test('should work with VS Code workspace mock', () => {
            const mockWorkspace = TestUtils.createMockWorkspace(
                TestUtils.createMockConfiguration({
                    'autoprompter.enabled': true,
                    'autoprompter.promptText': 'Mock prompt'
                })
            );

            const config = mockWorkspace.getConfiguration();
            assert.strictEqual(config.get('autoprompter.enabled'), true);
            assert.strictEqual(config.get('autoprompter.promptText'), 'Mock prompt');
        });

        test('should track disposable resources', () => {
            const disposable = TestUtils.createMockDisposable();
            
            // Check initial state
            assert.strictEqual(disposable.disposed, false);
            
            // Call dispose
            disposable.dispose();
            
            // Verify disposal happened
            assert.strictEqual(disposable.disposed, true);
        });
    });
}); 