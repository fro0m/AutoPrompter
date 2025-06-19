import * as assert from 'assert';
import { 
    PromptScheduler, 
    AISessionMonitor, 
    AutoPrompterSession,
    SessionState,
    TimeInterval,
    ScheduleConfiguration,
    AutoPrompterConfiguration
} from '../../domain';

suite('Domain Layer Tests', () => {
    test('PromptScheduler should initialize correctly', () => {
        const config: ScheduleConfiguration = {
            minimalIntervalMs: 5000,
            isActive: true,
            maxRetries: 3
        };
        
        const scheduler = new PromptScheduler('test-scheduler', config);
        
        assert.strictEqual(scheduler.canExecute(), true, 'Should be able to execute when no previous execution');
    });

    test('AISessionMonitor should initialize correctly', () => {
        const monitor = new AISessionMonitor('test-session');
        
        assert.strictEqual(monitor.isAvailableForPrompt(), false, 'Should not be available initially');
    });

    test('AutoPrompterSession should manage state correctly', async () => {
        const config = AutoPrompterConfiguration.createDefault();
        
        const session = new AutoPrompterSession('test-session', SessionState.Inactive, config);
        
        assert.strictEqual(session.getState(), SessionState.Inactive);
        assert.strictEqual(session.isActive(), false);
        
        await session.start();
        
        assert.strictEqual(session.getState(), SessionState.Active);
        assert.strictEqual(session.isActive(), true);
        
        await session.pause();
        
        assert.strictEqual(session.getState(), SessionState.Paused);
        assert.strictEqual(session.isPaused(), true);
    });

    test('TimeInterval should handle time calculations correctly', () => {
        const interval = TimeInterval.fromMinutes(5);
        
        assert.strictEqual(interval.minutes, 5);
        assert.strictEqual(interval.ms, 5 * 60 * 1000);
    });
});
