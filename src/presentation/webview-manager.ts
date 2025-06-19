import * as vscode from 'vscode';
import * as path from 'path';
import { IWebviewManager } from './interfaces';

/**
 * WebviewManager
 * 
 * Manages webview content and HTML generation for the AutoPrompter sidebar
 */
export class WebviewManager implements IWebviewManager {
    
    /**
     * Gets the HTML content for the webview
     */
    public getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        // Get the URI for the CSS and JS files
        const styleUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(extensionUri.fsPath, 'media', 'style.css'))
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(extensionUri.fsPath, 'media', 'script.js'))
        );

        // Use a nonce to whitelist which scripts can be run
        const nonce = this.getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>AutoPrompter</title>
            </head>
            <body>
                <div class="container">
                    <header class="header">
                        <h1>AutoPrompter</h1>
                        <div class="status-indicator" id="statusIndicator">
                            <span class="status-dot"></span>
                            <span class="status-text">Inactive</span>
                        </div>
                    </header>

                    <main class="main-content">
                        <!-- Control Panel -->
                        <section class="control-panel">
                            <div class="control-group">
                                <label for="automationToggle">Automation</label>
                                <div class="toggle-switch">
                                    <input type="checkbox" id="automationToggle" class="toggle-input">
                                    <label for="automationToggle" class="toggle-label">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div class="control-group">
                                <label for="intervalSelect">Minimal Interval</label>
                                <select id="intervalSelect" class="select-input">
                                    <option value="60000">1 minute</option>
                                    <option value="120000">2 minutes</option>
                                    <option value="300000">5 minutes</option>
                                    <option value="600000">10 minutes</option>
                                </select>
                            </div>

                            <div class="button-group">
                                <button id="executeNowBtn" class="btn btn-primary">Execute Now</button>
                            </div>
                        </section>

                        <!-- Prompt Configuration -->
                        <section class="prompt-section">
                            <h2>Prompt Text</h2>
                            <div class="prompt-input-group">
                                <textarea 
                                    id="promptText" 
                                    class="prompt-textarea" 
                                    placeholder="Enter your prompt text here..."
                                    rows="4"></textarea>
                                <button id="savePromptBtn" class="btn btn-secondary">Save Prompt</button>
                            </div>
                        </section>

                        <!-- Status -->
                        <section class="status-section">
                            <h2>Status</h2>
                            <div class="status-info">
                                <div class="status-item">
                                    <span class="status-label">Last Execution:</span>
                                    <span id="lastExecution" class="status-value">Never</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Execution Count:</span>
                                    <span id="executionCount" class="status-value">0</span>
                                </div>
                            </div>
                            <div class="error-message" id="errorMessage" style="display: none;">
                                <!-- Error messages will appear here -->
                            </div>
                        </section>
                    </main>
                </div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }

    /**
     * Handles messages from the webview
     */
    public async handleMessage(message: any): Promise<any> {
        // This method can be extended to handle specific message processing
        // For now, it just passes through the message
        return message;
    }

    /**
     * Generates a random nonce for Content Security Policy
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
