import { IUIStateManager, UIState } from './interfaces';

/**
 * Manages UI state for the AutoPrompter sidebar
 */
export class UIStateManager implements IUIStateManager {
    private _currentState: UIState;

    constructor() {
        this._currentState = this.getDefaultState();
    }

    public get currentState(): Readonly<UIState> {
        return Object.freeze({ ...this._currentState });
    }

    /**
     * Updates the UI state
     */
    public updateState(updates: Partial<UIState>): void {
        this._currentState = {
            ...this._currentState,
            ...updates
        };
    }

    /**
     * Resets the UI state to defaults
     */
    public reset(): void {
        this._currentState = this.getDefaultState();
    }

    private getDefaultState(): UIState {
        return {
            isAutomationEnabled: false,
            scheduleInterval: 60000, // 1 minute
            currentPromptText: '',
            isConnected: false,
            executionCount: 0,
            lastExecutionTime: undefined,
            errorMessage: undefined,
            isExecuting: false
        };
    }
}
