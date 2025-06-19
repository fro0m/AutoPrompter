import { IUIStateManager, UIState } from './interfaces';

/**
 * UIStateManager
 * 
 * Manages the UI state for the AutoPrompter sidebar
 */
export class UIStateManager implements IUIStateManager {
    private state: UIState;

    constructor() {
        this.state = this.createDefaultState();
    }

    /**
     * Gets the current UI state
     */
    public getState(): UIState {
        return { ...this.state };
    }

    /**
     * Updates the UI state
     */
    public updateState(partialState: Partial<UIState>): void {
        this.state = {
            ...this.state,
            ...partialState
        };
    }

    /**
     * Resets the UI state to defaults
     */
    public reset(): void {
        this.state = this.createDefaultState();
    }

    /**
     * Creates the default UI state
     */
    private createDefaultState(): UIState {
        return {
            isAutomationEnabled: false,
            currentPromptText: 'Please review the current code and provide suggestions for improvement.',
            scheduleInterval: 300000, // 5 minutes default
            lastExecutionTime: null,
            executionCount: 0,
            errorMessage: null,
            isConnected: false
        };
    }
}
