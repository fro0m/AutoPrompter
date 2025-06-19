import * as vscode from 'vscode';
import { AISessionMonitor, AISessionState } from '../domain/ai-session-monitor';
import { AITarget } from '../domain/types';
import { TimeInterval } from '../domain/types';

/**
 * Chat activity monitor for tracking chat window states
 */
export interface ChatActivityInfo {
    target: AITarget;
    lastActivity: Date;
    isResponding: boolean;
    isWindowVisible: boolean;
    hasActiveConversation: boolean;
    responseCount: number;
}

/**
 * VS Code workspace activity monitoring
 */
export interface WorkspaceActivity {
    lastFileEdit: Date | null;
    lastCommand: Date | null;
    lastCursorMove: Date | null;
    lastSelection: Date | null;
    isUserActive: boolean;
}

/**
 * Comprehensive session monitoring configuration
 */
export interface SessionMonitoringConfig {
    idleThresholdMs: number;        // Time to consider as idle (default: 30 seconds)
    chatResponseTimeoutMs: number;  // Max time to wait for chat response (default: 10 seconds)
    activityCheckIntervalMs: number; // How often to check activity (default: 5 seconds)
    maxIdleTimeMs: number;          // Maximum idle time before marking unavailable (default: 5 minutes)
    enableWorkspaceMonitoring: boolean; // Monitor general VS Code activity
}

/**
 * AISessionMonitoringService
 * 
 * Advanced AI session monitoring service that integrates with VS Code to detect
 * chat window states, user activity, and provide intelligent idle detection.
 */
export class AISessionMonitoringService {
    private readonly monitor: AISessionMonitor;
    private readonly config: SessionMonitoringConfig;
    private readonly chatActivity: Map<AITarget, ChatActivityInfo> = new Map();
    private workspaceActivity: WorkspaceActivity;
    private monitoringTimer: NodeJS.Timeout | null = null;
    private isDisposed: boolean = false;
    
    private readonly disposables: vscode.Disposable[] = [];

    constructor(
        sessionId: string,
        config?: Partial<SessionMonitoringConfig>
    ) {
        this.monitor = new AISessionMonitor(sessionId);
        this.config = {
            idleThresholdMs: 30000,        // 30 seconds
            chatResponseTimeoutMs: 10000,  // 10 seconds  
            activityCheckIntervalMs: 5000, // 5 seconds
            maxIdleTimeMs: 300000,         // 5 minutes
            enableWorkspaceMonitoring: true,
            ...config
        };
        
        this.workspaceActivity = {
            lastFileEdit: null,
            lastCommand: null,
            lastCursorMove: null,
            lastSelection: null,
            isUserActive: false
        };

        this.initialize();
    }

    /**
     * Starts the session monitoring service
     */
    start(): void {
        if (this.monitoringTimer || this.isDisposed) {
            return;
        }

        this.detectInitialChatWindows();
        
        this.monitoringTimer = setInterval(() => {
            this.performMonitoringCycle();
        }, this.config.activityCheckIntervalMs);

        console.log('AISessionMonitoringService started');
    }

    /**
     * Stops the session monitoring service
     */
    stop(): void {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }
        console.log('AISessionMonitoringService stopped');
    }

    /**
     * Gets the current session state
     */
    getSessionState(): AISessionState {
        return this.monitor.getState();
    }

    /**
     * Checks if AI is available for prompting
     */
    isAvailableForPrompt(): boolean {
        return this.monitor.isAvailableForPrompt();
    }

    /**
     * Checks if the session has been idle for a specific duration
     */
    isIdleForDuration(duration: TimeInterval): boolean {
        return this.monitor.isIdleForDuration(duration);
    }

    /**
     * Gets detailed idle detection information
     */
    getIdleDetection() {
        return this.monitor.detectIdleState();
    }

    /**
     * Gets current chat activity status for all targets
     */
    getChatActivityStatus(): Map<AITarget, ChatActivityInfo> {
        return new Map(this.chatActivity);
    }

    /**
     * Gets workspace activity information
     */
    getWorkspaceActivity(): WorkspaceActivity {
        return { ...this.workspaceActivity };
    }

    /**
     * Forces registration of activity (useful for manual integration)
     */
    registerActivity(target?: AITarget): void {
        this.monitor.registerActivity();
        
        if (target && this.chatActivity.has(target)) {
            const activity = this.chatActivity.get(target)!;
            activity.lastActivity = new Date();
            activity.isResponding = true;
        }
        
        this.workspaceActivity.isUserActive = true;
    }

    /**
     * Manually marks session as idle
     */
    markIdle(): void {
        this.monitor.markIdle();
    }

    /**
     * Disposes of the monitoring service
     */
    dispose(): void {
        if (this.isDisposed) {
            return;
        }

        this.stop();
        
        // Dispose of all VS Code disposables
        this.disposables.forEach(d => d.dispose());
        this.disposables.length = 0;
        
        this.chatActivity.clear();
        this.isDisposed = true;
        
        console.log('AISessionMonitoringService disposed');
    }

    /**
     * Initializes the monitoring service with VS Code integration
     */
    private initialize(): void {
        this.setupWorkspaceActivityMonitoring();
        this.setupChatWindowDetection();
    }

    /**
     * Sets up workspace activity monitoring
     */
    private setupWorkspaceActivityMonitoring(): void {
        if (!this.config.enableWorkspaceMonitoring) {
            return;
        }

        // Monitor text document changes
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(() => {
                this.workspaceActivity.lastFileEdit = new Date();
                this.workspaceActivity.isUserActive = true;
                this.registerActivity();
            })
        );

        // Monitor text editor selection changes
        this.disposables.push(
            vscode.window.onDidChangeTextEditorSelection(() => {
                this.workspaceActivity.lastSelection = new Date();
                this.workspaceActivity.isUserActive = true;
                this.registerActivity();
            })
        );

        // Monitor active text editor changes
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor) {
                    this.workspaceActivity.lastCursorMove = new Date();
                    this.workspaceActivity.isUserActive = true;
                    this.registerActivity();
                }
            })
        );

        // Monitor terminal activity
        this.disposables.push(
            vscode.window.onDidOpenTerminal(() => {
                this.workspaceActivity.isUserActive = true;
                this.registerActivity();
            })
        );

        // Monitor window state changes
        this.disposables.push(
            vscode.window.onDidChangeWindowState((state) => {
                if (state.focused) {
                    this.workspaceActivity.isUserActive = true;
                    this.registerActivity();
                }
            })
        );
    }

    /**
     * Sets up chat window detection and monitoring
     */
    private setupChatWindowDetection(): void {
        // Initialize chat activity tracking for supported targets
        this.chatActivity.set(AITarget.GitHub, {
            target: AITarget.GitHub,
            lastActivity: new Date(),
            isResponding: false,
            isWindowVisible: false,
            hasActiveConversation: false,
            responseCount: 0
        });

        // Note: Cursor support would be added here when available
        // this.chatActivity.set(AITarget.Cursor, { ... });
    }

    /**
     * Initial detection of available chat windows
     */
    private async detectInitialChatWindows(): Promise<void> {
        try {
            const windows = await this.monitor.detectChatWindows();
            
            for (const window of windows) {
                this.monitor.addChatWindow(window);
                
                // Update activity info
                const activity = this.chatActivity.get(window.type);
                if (activity) {
                    activity.isWindowVisible = window.isActive;
                    activity.hasActiveConversation = true;
                }
            }
            
            console.log(`Detected ${windows.length} chat windows`);
        } catch (error) {
            console.error('Failed to detect initial chat windows:', error);
        }
    }

    /**
     * Performs a monitoring cycle to check activity and update states
     */
    private performMonitoringCycle(): void {
        try {
            this.updateWorkspaceActivityState();
            this.updateChatActivityStates();
            this.updateSessionState();
        } catch (error) {
            console.error('Error during monitoring cycle:', error);
        }
    }

    /**
     * Updates workspace activity state
     */
    private updateWorkspaceActivityState(): void {
        const now = new Date();
        const activities = [
            this.workspaceActivity.lastFileEdit,
            this.workspaceActivity.lastCommand,
            this.workspaceActivity.lastCursorMove,
            this.workspaceActivity.lastSelection
        ].filter(Boolean) as Date[];

        if (activities.length === 0) {
            this.workspaceActivity.isUserActive = false;
            return;
        }

        const mostRecent = new Date(Math.max(...activities.map(d => d.getTime())));
        const timeSinceActivity = now.getTime() - mostRecent.getTime();
        
        this.workspaceActivity.isUserActive = timeSinceActivity < this.config.idleThresholdMs;
    }

    /**
     * Updates chat activity states for all targets
     */
    private updateChatActivityStates(): void {
        const now = new Date();
        
        for (const [target, activity] of this.chatActivity) {
            const timeSinceActivity = now.getTime() - activity.lastActivity.getTime();
            
            // Check if chat is responding (simplified detection)
            if (timeSinceActivity > this.config.chatResponseTimeoutMs) {
                activity.isResponding = false;
            }
            
            // Update window visibility (simplified - in real implementation would check actual window state)
            activity.isWindowVisible = this.isTargetWindowVisible(target);
        }
    }

    /**
     * Updates the overall session state based on all activity inputs
     */
    private updateSessionState(): void {
        const hasActiveChatWindows = Array.from(this.chatActivity.values())
            .some(activity => activity.isWindowVisible && activity.hasActiveConversation);

        if (!hasActiveChatWindows) {
            this.monitor.getState(); // This would trigger state update to Unavailable
            return;
        }

        const allChatsIdle = Array.from(this.chatActivity.values())
            .every(activity => {
                const timeSinceActivity = new Date().getTime() - activity.lastActivity.getTime();
                return timeSinceActivity >= this.config.idleThresholdMs && !activity.isResponding;
            });

        const workspaceIdle = !this.workspaceActivity.isUserActive;

        if (allChatsIdle && workspaceIdle) {
            // Check if we've been idle too long
            const idleDetection = this.monitor.detectIdleState();
            if (idleDetection.idleDuration.ms > this.config.maxIdleTimeMs) {
                // Mark as unavailable after extended idle period
                return;
            }
            
            this.monitor.markIdle();
        } else {
            this.monitor.registerActivity();
        }
    }

    /**
     * Checks if a target's window is currently visible
     */
    private isTargetWindowVisible(target: AITarget): boolean {
        // Simplified implementation - in real scenarios would check actual window states
        switch (target) {
            case AITarget.GitHub:
                return this.isGitHubCopilotWindowVisible();
            case AITarget.Cursor:
                return this.isCursorWindowVisible();
            default:
                return false;
        }
    }

    /**
     * Checks if GitHub Copilot chat window is visible
     */
    private isGitHubCopilotWindowVisible(): boolean {
        // In a real implementation, this would check:
        // - If GitHub Copilot extension is active
        // - If chat panel is open
        // - If chat has focus or recent activity
        
        try {
            const copilotExtension = vscode.extensions.getExtension('github.copilot-chat');
            return copilotExtension?.isActive ?? false;
        } catch {
            return false;
        }
    }

    /**
     * Checks if Cursor chat window is visible
     */
    private isCursorWindowVisible(): boolean {
        // Cursor integration would be implemented here
        // For now, return false as it's not yet supported
        return false;
    }
}
