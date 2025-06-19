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
    readonly viewType: string;
    resolveWebviewView(webviewView: vscode.WebviewView): void;

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
    readonly currentState: Readonly<UIState>;
    updateState(updates: Partial<UIState>): void;
    reset(): void;
}

/**
 * UI State structure
 */
export interface UIState {
    readonly isAutomationEnabled: boolean;
    readonly scheduleInterval: number; // milliseconds
    readonly currentPromptText: string;
    readonly isConnected: boolean;
    readonly executionCount: number;
    readonly lastExecutionTime?: Date;
    readonly errorMessage?: string;
    readonly isExecuting?: boolean;
    readonly workspaceInfo?: WorkspaceInfo;
}

/**
 * Workspace configuration information
 */
export interface WorkspaceInfo {
    readonly hasWorkspaceSettings: boolean;
    readonly workspaceName: string;
    readonly settingsLocation: string;
    readonly configuredSettings: string[];
    readonly isProjectSpecific: boolean;
}

/**
 * WebView message types using const assertion for better type safety
 */
export const WebViewMessageType = {
    READY: 'READY',
    GET_CONFIG: 'GET_CONFIG',
    UPDATE_CONFIG: 'UPDATE_CONFIG',
    TOGGLE_AUTOMATION: 'TOGGLE_AUTOMATION',
    UPDATE_INTERVAL: 'UPDATE_INTERVAL',
    UPDATE_PROMPT_TEXT: 'UPDATE_PROMPT_TEXT',
    EXECUTE_NOW: 'EXECUTE_NOW',
    RESET_STATS: 'RESET_STATS',
    GET_WORKSPACE_INFO: 'GET_WORKSPACE_INFO',
    COPY_GLOBAL_TO_WORKSPACE: 'COPY_GLOBAL_TO_WORKSPACE',
    RESET_WORKSPACE_SETTINGS: 'RESET_WORKSPACE_SETTINGS'
} as const;

export type WebViewMessageTypeValues = typeof WebViewMessageType[keyof typeof WebViewMessageType];

/**
 * WebView Message structure
 */
export interface WebViewMessage {
    readonly type: WebViewMessageTypeValues;
    readonly payload?: Record<string, unknown>;
    readonly requestId?: string;
}

/**
 * WebView Response structure
 */
export interface WebViewResponse {
    readonly success: boolean;
    readonly data?: Record<string, unknown>;
    readonly error?: string;
    readonly requestId?: string;
}
