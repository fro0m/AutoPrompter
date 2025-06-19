import { SessionId, AITarget, TimeInterval, DateTime } from '../domain/types';
import { AIIdleDetectedEvent } from './events';

export interface ChatWindow {
    id: string;
    type: AITarget;
    title: string;
    isActive: boolean;
}

export interface ChatWindowMonitor {
    windowId: string;
    lastActivity: DateTime;
    isResponding: boolean;
}

export interface IdleDetection {
    isIdle: boolean;
    idleDuration: TimeInterval;
    target: AITarget;
}

export enum AISessionState {
    Unknown = 'unknown',
    Active = 'active',
    Idle = 'idle',
    Busy = 'busy',
    Unavailable = 'unavailable'
}

export class AISessionMonitor {
    private readonly sessionId: SessionId;
    private currentState: AISessionState;
    private idleStartTime: DateTime | null;
    private readonly chatWindows: Map<string, ChatWindowMonitor> = new Map();
    private readonly events: AIIdleDetectedEvent[] = [];

    constructor(sessionId: SessionId) {
        this.sessionId = sessionId;
        this.currentState = AISessionState.Unknown;
        this.idleStartTime = null;
    }

    async detectChatWindows(): Promise<ChatWindow[]> {
        const copilotChat = await this.findCopilotChat();
        const cursorChat = await this.findCursorChat();
        
        const windows: ChatWindow[] = [];
        
        if (copilotChat) {
            windows.push(copilotChat);
        }
        
        if (cursorChat) {
            windows.push(cursorChat);
        }
        
        return windows;
    }

    detectIdleState(): IdleDetection {
        const now = DateTime.now();
        const isIdle = this.isCurrentlyIdle();
        
        let idleDuration = TimeInterval.fromSeconds(0);
        
        if (isIdle && this.idleStartTime) {
            const durationMs = now.toDate().getTime() - this.idleStartTime.toDate().getTime();
            idleDuration = new TimeInterval(durationMs);
        }
        
        return {
            isIdle,
            idleDuration,
            target: AITarget.GitHub // Default target
        };
    }

    isAvailableForPrompt(): boolean {
        return this.currentState === AISessionState.Idle && 
               this.chatWindows.size > 0;
    }

    isIdleForDuration(duration: TimeInterval): boolean {
        if (!this.isCurrentlyIdle() || !this.idleStartTime) {
            return false;
        }

        const now = DateTime.now();
        const idleDurationMs = now.toDate().getTime() - this.idleStartTime.toDate().getTime();
        
        return idleDurationMs >= duration.ms;
    }

    registerActivity(): void {
        const wasIdle = this.currentState === AISessionState.Idle;
        
        this.currentState = AISessionState.Active;
        this.idleStartTime = null;
        
        // Update all monitored windows
        const now = DateTime.now();
        this.chatWindows.forEach(monitor => {
            monitor.lastActivity = now;
            monitor.isResponding = true;
        });
        
        if (wasIdle) {
            // State changed from idle to active
            this.emitIdleDetectedEvent(0);
        }
    }

    markIdle(): void {
        if (this.currentState !== AISessionState.Idle) {
            this.currentState = AISessionState.Idle;
            this.idleStartTime = DateTime.now();
            
            const idleDuration = this.idleStartTime ? 
                DateTime.now().toDate().getTime() - this.idleStartTime.toDate().getTime() : 0;
            
            this.emitIdleDetectedEvent(idleDuration);
        }
    }

    addChatWindow(window: ChatWindow): void {
        const monitor: ChatWindowMonitor = {
            windowId: window.id,
            lastActivity: DateTime.now(),
            isResponding: false
        };
        
        this.chatWindows.set(window.id, monitor);
    }

    removeChatWindow(windowId: string): void {
        this.chatWindows.delete(windowId);
        
        if (this.chatWindows.size === 0) {
            this.currentState = AISessionState.Unavailable;
        }
    }

    getState(): AISessionState {
        return this.currentState;
    }

    getEvents(): AIIdleDetectedEvent[] {
        return [...this.events];
    }

    clearEvents(): void {
        this.events.length = 0;
    }

    private async findCopilotChat(): Promise<ChatWindow | null> {
        // This would be implemented to find GitHub Copilot Chat window
        // For now, return a mock implementation
        return {
            id: 'copilot-chat',
            type: AITarget.GitHub,
            title: 'GitHub Copilot Chat',
            isActive: true
        };
    }

    private async findCursorChat(): Promise<ChatWindow | null> {
        // This would be implemented to find Cursor Chat window
        // For now, return null as Cursor integration is not yet implemented
        return null;
    }

    private isCurrentlyIdle(): boolean {
        if (this.chatWindows.size === 0) {
            return false;
        }

        const idleThreshold = TimeInterval.fromSeconds(30); // 30 seconds threshold
        const now = DateTime.now();
        
        return Array.from(this.chatWindows.values()).every(monitor => {
            const timeSinceActivity = now.toDate().getTime() - monitor.lastActivity.toDate().getTime();
            return timeSinceActivity >= idleThreshold.ms && !monitor.isResponding;
        });
    }

    private emitIdleDetectedEvent(idleDuration: number): void {
        const event = new AIIdleDetectedEvent(this.sessionId, idleDuration);
        this.events.push(event);
    }
}
