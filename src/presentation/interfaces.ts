/**
 * Presentation Layer Interfaces
 * 
 * Defines contracts for the presentation layer components
 * including sidebar providers, webview management, and UI interactions
 */

import * as vscode from 'vscode';
import { AutoPrompterConfiguration, PromptTemplate } from '../domain';

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
     * Updates the template list in the sidebar
     * @param templates The current templates
     */
    updateTemplates(templates: PromptTemplate[]): Promise<void>;

    /**
     * Shows a status message in the sidebar
     * @param message The message to display
     * @param isError Whether this is an error message
     */
    showStatus(message: string, isError?: boolean): Promise<void>;
}

/**
 * Interface for webview content management
 */
export interface IWebviewManager {
    /**
     * Gets the HTML content for the webview
     * @param webview The webview instance
     * @param extensionUri The extension URI for resource loading
     * @returns HTML content string
     */
    getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string;

    /**
     * Handles messages from the webview
     * @param message The message from the webview
     * @returns Promise resolving to response data
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
     * @param state Partial state update
     */
    updateState(state: Partial<UIState>): void;

    /**
     * Resets the UI state to defaults
     */
    resetState(): void;
}

/**
 * UI State representation
 */
export interface UIState {
    isAutomationEnabled: boolean;
    currentTemplate: string | null;
    scheduleInterval: number;
    lastExecutionTime: Date | null;
    executionCount: number;
    errorMessage: string | null;
    isConnected: boolean;
}

/**
 * WebView message types
 */
export enum WebViewMessageType {
    // Configuration messages
    UPDATE_CONFIG = 'updateConfig',
    GET_CONFIG = 'getConfig',
    RESET_CONFIG = 'resetConfig',
    
    // Template messages
    ADD_TEMPLATE = 'addTemplate',
    UPDATE_TEMPLATE = 'updateTemplate',
    DELETE_TEMPLATE = 'deleteTemplate',
    GET_TEMPLATES = 'getTemplates',
    
    // Control messages
    START_AUTOMATION = 'startAutomation',
    STOP_AUTOMATION = 'stopAutomation',
    EXECUTE_NOW = 'executeNow',
    TEST_CONNECTION = 'testConnection',
    
    // Status messages
    GET_STATUS = 'getStatus',
    SHOW_STATUS = 'showStatus',
    
    // UI messages
    READY = 'ready',
    ERROR = 'error'
}

/**
 * WebView message structure
 */
export interface WebViewMessage {
    type: WebViewMessageType;
    payload?: any;
    requestId?: string;
}

/**
 * WebView response structure
 */
export interface WebViewResponse {
    success: boolean;
    data?: any;
    error?: string;
    requestId?: string;
}
