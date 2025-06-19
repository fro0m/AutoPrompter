import { SessionId, SessionState } from '../domain/types';
import { PromptScheduler, ScheduleConfiguration } from './prompt-scheduler';
import { AISessionMonitor } from './ai-session-monitor';
import { SessionStateChangedEvent } from './events';
import { AutoPrompterConfiguration } from './configuration';

export class AutoPrompterSession {
    private readonly sessionId: SessionId;
    private state: SessionState;
    private configuration: AutoPrompterConfiguration;
    private promptScheduler: PromptScheduler | null = null;
    private sessionMonitor: AISessionMonitor | null = null;
    private readonly events: SessionStateChangedEvent[] = [];

    constructor(
        sessionId: SessionId,
        state: SessionState,
        configuration: AutoPrompterConfiguration
    ) {
        this.sessionId = sessionId;
        this.state = state;
        this.configuration = configuration;
    }

    async start(): Promise<void> {
        const oldState = this.state;
        this.state = SessionState.Active;
        
        await this.initializeScheduler();
        await this.startMonitoring();
        
        this.emitStateChangeEvent(oldState, this.state);
    }

    async pause(): Promise<void> {
        const oldState = this.state;
        this.state = SessionState.Paused;
        
        await this.stopScheduler();
        
        this.emitStateChangeEvent(oldState, this.state);
    }

    async resume(): Promise<void> {
        if (this.state === SessionState.Paused) {
            const oldState = this.state;
            this.state = SessionState.Active;
            
            if (this.promptScheduler) {
                this.promptScheduler.resume();
            }
            
            this.emitStateChangeEvent(oldState, this.state);
        }
    }

    async stop(): Promise<void> {
        const oldState = this.state;
        this.state = SessionState.Inactive;
        
        await this.stopScheduler();
        await this.stopMonitoring();
        
        this.emitStateChangeEvent(oldState, this.state);
    }

    updateConfiguration(newConfiguration: Partial<{
        schedule: ScheduleConfiguration;
        templates: any[];
        enabledTargets: string[];
        maxDailyPrompts: number;
        isEnabled: boolean;
    }>): void {
        // Create new configuration instance with updates
        const updatedConfig = new AutoPrompterConfiguration(
            newConfiguration.templates ?? this.configuration.templates,
            newConfiguration.schedule ?? this.configuration.schedule,
            newConfiguration.isEnabled ?? this.configuration.isEnabled,
            newConfiguration.maxDailyPrompts ?? this.configuration.maxDailyPrompts,
            newConfiguration.enabledTargets ?? this.configuration.enabledTargets
        );
        
        this.configuration = updatedConfig;
        
        // Update scheduler if configuration changed
        if (newConfiguration.schedule && this.promptScheduler) {
            // Recreate scheduler with new configuration
            this.initializeScheduler();
        }
    }

    getState(): SessionState {
        return this.state;
    }

    getSessionId(): SessionId {
        return this.sessionId;
    }

    getConfiguration(): AutoPrompterConfiguration {
        return this.configuration;
    }

    isActive(): boolean {
        return this.state === SessionState.Active;
    }

    isPaused(): boolean {
        return this.state === SessionState.Paused;
    }

    canExecutePrompts(): boolean {
        return this.state === SessionState.Active && 
               this.promptScheduler?.canExecute() === true &&
               this.sessionMonitor?.isAvailableForPrompt() === true;
    }

    getScheduler(): PromptScheduler | null {
        return this.promptScheduler;
    }

    getMonitor(): AISessionMonitor | null {
        return this.sessionMonitor;
    }

    getEvents(): SessionStateChangedEvent[] {
        return [...this.events];
    }

    clearEvents(): void {
        this.events.length = 0;
    }

    private async initializeScheduler(): Promise<void> {
        if (this.promptScheduler) {
            this.promptScheduler.pause();
        }
        
        this.promptScheduler = new PromptScheduler(
            `${this.sessionId}-scheduler`,
            this.configuration.schedule
        );
        
        if (this.state === SessionState.Active) {
            this.promptScheduler.resume();
        }
    }

    private async startMonitoring(): Promise<void> {
        if (!this.sessionMonitor) {
            this.sessionMonitor = new AISessionMonitor(`${this.sessionId}-monitor`);
        }
        
        // Initialize chat window detection
        const chatWindows = await this.sessionMonitor.detectChatWindows();
        chatWindows.forEach(window => {
            this.sessionMonitor?.addChatWindow(window);
        });
    }

    private async stopScheduler(): Promise<void> {
        if (this.promptScheduler) {
            this.promptScheduler.pause();
        }
    }

    private async stopMonitoring(): Promise<void> {
        // Clean up monitoring resources
        // In a real implementation, this would stop any timers or listeners
    }

    private emitStateChangeEvent(oldState: SessionState, newState: SessionState): void {
        const event = new SessionStateChangedEvent(this.sessionId, oldState, newState);
        this.events.push(event);
    }
}
