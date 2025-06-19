/**
 * Presentation Layer Interfaces
 * 
 * Defines contracts for the presentation layer components
 * including sidebar providers, webview management, and UI interactions
 */

import * as vscode from 'vscode';
import { AutoPrompterConfiguration } from '../domain';

/**
 * Interface for the sidebar provider
 */
export interface ISidebarProvider extends vscode.WebviewViewProvider {
    /**
     * Updates the configuration displayed in the sidebar
     * @param config The new configuration
     */
    updateConfiguration(config: AutoPrompterConfiguration): Promise<void>;

    /**
     * Shows a status message in the sidebar
     * @param message The message to display
     * @param isError Whether this is an error message
     */
    showStatus(message: string, isError?: boolean): Promise<void>;
}

/**
 * Interface for webview management
 */
export interface IWebviewManager {
    /**
     * Gets the HTML content for the webview
     * @param webview The webview instance
     * @param extensionUri The extension URI for resource loading
     */
    getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string;

    /**
     * Handles messages from the webview
     * @param message The message from the webview
     */
    handleMessage(message: any): Promise<any>;
}

/**
 * Interface for UI state management
 */
export interface IUIStateManager {
    /**
     * Gets the current UI state
     */
    getState(): UIState;

    /**
     * Updates the UI state
     * @param updates Partial state updates
     */
    updateState(updates: Partial<UIState>): void;

    /**
     * Resets the UI state to defaults
     */
    reset(): void;
}

/**
 * UI State structure
 */
export interface UIState {
    isAutomationEnabled: boolean;
    scheduleInterval: number; // milliseconds
    currentPromptText: string;
    isConnected: boolean;
    errorMessage: string | null;
    lastExecutionTime: Date | null;
    executionCount: number;
}

/**
 * WebView Message Types
 */
export enum WebViewMessageType {
    // Configuration
    READY = 'READY',
    GET_CONFIG = 'GET_CONFIG',
    UPDATE_CONFIG = 'UPDATE_CONFIG',
    
    // Automation Control
    TOGGLE_AUTOMATION = 'TOGGLE_AUTOMATION',
    UPDATE_INTERVAL = 'UPDATE_INTERVAL',
    EXECUTE_NOW = 'EXECUTE_NOW',
    
    // Prompt Management
    SET_PROMPT_TEXT = 'SET_PROMPT_TEXT',
    
    // Status
    GET_STATUS = 'GET_STATUS',
    SHOW_STATUS = 'SHOW_STATUS',
    UPDATE_STATUS = 'UPDATE_STATUS'
}

/**
 * WebView Message structure
 */
export interface WebViewMessage {
    type: WebViewMessageType;
    payload?: any;
    requestId?: string;
}

/**
 * WebView Response structure
 */
export interface WebViewResponse {
    success: boolean;
    data?: any;
    error?: string;
    requestId?: string;
}
