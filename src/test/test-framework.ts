/**
 * AutoPrompter Test Framework
 * Comprehensive testing utilities and helpers for the AutoPrompter extension
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

/**
 * Test utilities for creating mock objects and test data
 */
export class TestUtils {
    /**
     * Creates a mock VS Code configuration object
     */
    static createMockConfiguration(configs: Record<string, any> = {}): any {
        return {
            get: (key: string, defaultValue?: any) => configs[key] ?? defaultValue,
            update: async (key: string, value: any) => {
                configs[key] = value;
                return Promise.resolve();
            },
            inspect: (key: string) => ({
                workspaceValue: configs[key],
                workspaceFolderValue: undefined,
                globalValue: undefined,
                defaultValue: undefined
            }),
            has: (key: string) => key in configs
        };
    }

    /**
     * Creates a mock VS Code workspace
     */
    static createMockWorkspace(config: any = {}): any {
        return {
            getConfiguration: () => config,
            onDidChangeConfiguration: () => ({ dispose: () => {} }),
            workspaceFolders: []
        };
    }

    /**
     * Creates a disposable mock that tracks disposal
     */
    static createMockDisposable(): { disposed: boolean; dispose: () => void } {
        const disposable = {
            disposed: false,
            dispose: function() { 
                this.disposed = true; 
            }
        };
        return disposable;
    }

    /**
     * Creates a promise that resolves after a delay
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Creates test data for configuration objects
     */
    static createTestConfiguration(overrides: any = {}) {
        return {
            promptText: 'Please review the current code and provide suggestions for improvement.',
            schedule: {
                minimalIntervalMs: 60000,
                isActive: false,
                maxRetries: 3
            },
            enabled: false,
            maxDailyPrompts: 50,
            ...overrides
        };
    }

    /**
     * Generates random test data
     */
    static generateRandomString(length: number = 10): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Generates random test intervals
     */
    static generateRandomInterval(): { minimalIntervalMs: number } {
        const intervals = [1000, 5000, 10000, 30000, 60000, 120000, 300000];
        return {
            minimalIntervalMs: intervals[Math.floor(Math.random() * intervals.length)]
        };
    }
}

/**
 * Test assertion helpers for common patterns
 */
export class TestAssertions {
    /**
     * Asserts that a promise rejects with a specific error message
     */
    static async assertRejects(
        promise: Promise<any>, 
        expectedMessage?: string | RegExp,
        message?: string
    ): Promise<void> {
        try {
            await promise;
            assert.fail(message || 'Expected promise to reject, but it resolved');
        } catch (error) {
            if (expectedMessage) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (typeof expectedMessage === 'string') {
                    assert.ok(
                        errorMessage.includes(expectedMessage),
                        `Expected error message to contain "${expectedMessage}", but got "${errorMessage}"`
                    );
                } else {
                    assert.ok(
                        expectedMessage.test(errorMessage),
                        `Expected error message to match ${expectedMessage}, but got "${errorMessage}"`
                    );
                }
            }
        }
    }

    /**
     * Asserts that a value is within a range
     */
    static assertInRange(
        actual: number, 
        min: number, 
        max: number, 
        message?: string
    ): void {
        assert.ok(
            actual >= min && actual <= max,
            message || `Expected ${actual} to be between ${min} and ${max}`
        );
    }

    /**
     * Asserts that an array contains specific items
     */
    static assertArrayContains<T>(
        array: T[], 
        items: T[], 
        message?: string
    ): void {
        for (const item of items) {
            assert.ok(
                array.includes(item),
                message || `Expected array to contain ${item}`
            );
        }
    }

    /**
     * Asserts that an object has specific properties
     */
    static assertHasProperties(
        obj: any, 
        properties: string[], 
        message?: string
    ): void {
        for (const prop of properties) {
            assert.ok(
                obj.hasOwnProperty(prop),
                message || `Expected object to have property ${prop}`
            );
        }
    }

    /**
     * Asserts that a function was called with specific arguments
     */
    static assertCalledWith(
        spy: sinon.SinonSpy, 
        ...args: any[]
    ): void {
        assert.ok(spy.calledWith(...args), 
            `Expected function to be called with ${JSON.stringify(args)}`
        );
    }

    /**
     * Asserts that a configuration object is valid
     */
    static assertValidConfiguration(config: any): void {
        assert.ok(config, 'Configuration should exist');
        assert.ok(typeof config.promptText === 'string', 'promptText should be string');
        assert.ok(config.promptText.length > 0, 'promptText should not be empty');
        assert.ok(typeof config.schedule === 'object', 'schedule should be object');
        assert.ok(typeof config.schedule.minimalIntervalMs === 'number', 'minimalIntervalMs should be number');
        assert.ok(config.schedule.minimalIntervalMs >= 1000, 'minimalIntervalMs should be at least 1000');
        assert.ok(typeof config.enabled === 'boolean', 'enabled should be boolean');
        assert.ok(typeof config.maxDailyPrompts === 'number', 'maxDailyPrompts should be number');
        assert.ok(config.maxDailyPrompts > 0, 'maxDailyPrompts should be positive');
    }
}

/**
 * Test suite builder for consistent test structure
 */
export class TestSuiteBuilder {
    private suiteName: string;
    private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
    private setupFn?: () => void | Promise<void>;
    private teardownFn?: () => void | Promise<void>;

    constructor(suiteName: string) {
        this.suiteName = suiteName;
    }

    /**
     * Adds a setup function to run before each test
     */
    setup(fn: () => void | Promise<void>): this {
        this.setupFn = fn;
        return this;
    }

    /**
     * Adds a teardown function to run after each test
     */
    teardown(fn: () => void | Promise<void>): this {
        this.teardownFn = fn;
        return this;
    }

    /**
     * Adds a test case
     */
    test(name: string, fn: () => void | Promise<void>): this {
        this.tests.push({ name, fn });
        return this;
    }

    /**
     * Builds and runs the test suite
     */
    run(): void {
        suite(this.suiteName, () => {
            if (this.setupFn) {
                setup(this.setupFn);
            }

            if (this.teardownFn) {
                teardown(this.teardownFn);
            }

            for (const testCase of this.tests) {
                test(testCase.name, testCase.fn);
            }
        });
    }
}

/**
 * Test reporter for custom test output formatting
 */
export class TestReporter {
    private static startTime: number;
    private static passedTests: number = 0;
    private static failedTests: number = 0;
    private static skippedTests: number = 0;

    /**
     * Starts a test run
     */
    static startTestRun(): void {
        this.startTime = Date.now();
        this.passedTests = 0;
        this.failedTests = 0;
        this.skippedTests = 0;
        
        console.log('🧪 AutoPrompter Test Run Started');
        console.log('================================');
    }

    /**
     * Reports a passed test
     */
    static reportPassed(testName: string, duration?: number): void {
        this.passedTests++;
        const durationStr = duration ? ` (${duration}ms)` : '';
        console.log(`✅ ${testName}${durationStr}`);
    }

    /**
     * Reports a failed test
     */
    static reportFailed(testName: string, error: Error, duration?: number): void {
        this.failedTests++;
        const durationStr = duration ? ` (${duration}ms)` : '';
        console.log(`❌ ${testName}${durationStr}`);
        console.log(`   Error: ${error.message}`);
    }

    /**
     * Reports a skipped test
     */
    static reportSkipped(testName: string): void {
        this.skippedTests++;
        console.log(`⏭️  ${testName} (skipped)`);
    }

    /**
     * Ends a test run and shows summary
     */
    static endTestRun(): void {
        const duration = Date.now() - this.startTime;
        const total = this.passedTests + this.failedTests + this.skippedTests;

        console.log('');
        console.log('================================');
        console.log('📊 Test Run Summary');
        console.log(`   Total: ${total}`);
        console.log(`   Passed: ${this.passedTests}`);
        console.log(`   Failed: ${this.failedTests}`);
        console.log(`   Skipped: ${this.skippedTests}`);
        console.log(`   Duration: ${duration}ms`);
        console.log('================================');

        if (this.failedTests > 0) {
            console.log('❌ Some tests failed');
        } else {
            console.log('✅ All tests passed');
        }
    }
}

// Export test framework components
export const AutoPrompterTestFramework = {
    TestUtils,
    TestAssertions,
    TestSuiteBuilder,
    TestReporter
};

export default AutoPrompterTestFramework; 