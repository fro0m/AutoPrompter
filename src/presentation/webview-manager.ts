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
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AutoPrompter</title>
                <style>
/* AutoPrompter Sidebar Styles */
body {
  font-family: var(--vscode-font-family, Arial, sans-serif);
  background: var(--vscode-sideBar-background, #1e1e1e);
  color: var(--vscode-foreground, #cccccc);
  margin: 0;
  padding: 0;
}

.container {
  padding: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header h1 {
  margin: 0;
  font-size: 1.2em;
  color: var(--vscode-foreground, #cccccc);
}

.status-indicator {
  display: flex;
  align-items: center;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #888;
  margin-right: 8px;
}

.status-dot.active {
  background: #007acc;
}

.status-text {
  font-size: 0.9em;
}

.main-content {
  margin-top: 8px;
}

/* Sections */
section {
  background: var(--vscode-editorWidget-background, #252526);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

section h2 {
  margin: 0 0 12px 0;
  font-size: 1em;
  color: var(--vscode-foreground, #cccccc);
}

.control-group {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.control-group label {
  font-size: 0.9em;
  color: var(--vscode-foreground, #cccccc);
}

/* Toggle Switch */
.toggle-switch {
  display: inline-block;
  position: relative;
  width: 40px;
  height: 20px;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 20px;
  background: #444;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-label .toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: left 0.2s;
}

.toggle-input:checked + .toggle-label {
  background: #007acc;
}

.toggle-input:checked + .toggle-label .toggle-slider {
  left: 22px;
}

/* Select Input */
.select-input {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #cccccc);
  border: 1px solid var(--vscode-input-border, #464647);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.9em;
  min-width: 120px;
}

.select-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder, #007acc);
}

/* Buttons */
.button-group {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 0.9em;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}

.btn.btn-primary {
  background: var(--vscode-button-background, #0e639c);
}

.btn.btn-secondary {
  background: var(--vscode-button-secondaryBackground, #5a5d5e);
  color: var(--vscode-button-secondaryForeground, #ffffff);
}

.btn.btn-secondary:hover {
  background: var(--vscode-button-secondaryHoverBackground, #666);
}

.prompt-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-textarea {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #cccccc);
  border: 1px solid var(--vscode-input-border, #464647);
  border-radius: 4px;
  padding: 8px;
  font-size: 0.9em;
  font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
  resize: vertical;
  min-height: 80px;
  width: 100%;
  box-sizing: border-box;
}

.prompt-textarea:focus {
  outline: none;
  border-color: var(--vscode-focusBorder, #007acc);
}

.prompt-textarea::placeholder {
  color: var(--vscode-input-placeholderForeground, #888);
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
}

.status-label {
  color: var(--vscode-foreground, #cccccc);
}

.status-value {
  color: var(--vscode-descriptionForeground, #999);
  font-weight: 500;
}

.error-message {
  background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
  border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
  font-size: 0.9em;
  color: var(--vscode-inputValidation-errorForeground, #f48771);
}

.hidden {
  display: none;
}
                </style>
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

                <script>
// AutoPrompter Sidebar Script
(function () {
  const vscode = acquireVsCodeApi();

  // Get UI elements
  const automationToggle = document.getElementById('automationToggle');
  const intervalSelect = document.getElementById('intervalSelect');
  const executeNowBtn = document.getElementById('executeNowBtn');
  const promptText = document.getElementById('promptText');
  const savePromptBtn = document.getElementById('savePromptBtn');
  const statusText = document.querySelector('.status-text');
  const statusDot = document.querySelector('.status-dot');
  const lastExecutionSpan = document.getElementById('lastExecution');
  const executionCountSpan = document.getElementById('executionCount');
  const errorMessage = document.getElementById('errorMessage');

  // State management
  let currentState = {
    isAutomationEnabled: false,
    intervalMs: 300000,
    promptText: '',
    executionCount: 0,
    lastExecutionTime: null
  };

  // Event Listeners
  
  // Automation toggle
  if (automationToggle) {
    automationToggle.addEventListener('change', function () {
      const enabled = automationToggle.checked;
      updateAutomationState(enabled);
      vscode.postMessage({ 
        type: 'TOGGLE_AUTOMATION', 
        payload: { enabled: enabled }
      });
    });
  }

  // Interval selection
  if (intervalSelect) {
    intervalSelect.addEventListener('change', function () {
      const intervalMs = parseInt(intervalSelect.value);
      currentState.intervalMs = intervalMs;
      vscode.postMessage({ 
        type: 'UPDATE_INTERVAL', 
        payload: { intervalMs: intervalMs }
      });
    });
  }

  // Execute now button
  if (executeNowBtn) {
    executeNowBtn.addEventListener('click', function () {
      executeNowBtn.disabled = true;
      executeNowBtn.textContent = 'Executing...';
      
      vscode.postMessage({ 
        type: 'EXECUTE_NOW',
        payload: {}
      });

      // Re-enable button after 2 seconds
      setTimeout(() => {
        executeNowBtn.disabled = false;
        executeNowBtn.textContent = 'Execute Now';
      }, 2000);
    });
  }

  // Save prompt button
  if (savePromptBtn) {
    savePromptBtn.addEventListener('click', function () {
      const text = promptText.value.trim();
      if (text) {
        vscode.postMessage({ 
          type: 'SET_PROMPT_TEXT', 
          payload: { promptText: text }
        });
        showMessage('Prompt text saved successfully', false);
      } else {
        showMessage('Please enter some prompt text', true);
      }
    });
  }

  // Prompt text auto-save on blur
  if (promptText) {
    promptText.addEventListener('blur', function () {
      const text = promptText.value.trim();
      if (text && text !== currentState.promptText) {
        currentState.promptText = text;
        vscode.postMessage({ 
          type: 'SET_PROMPT_TEXT', 
          payload: { promptText: text }
        });
      }
    });
  }

  // Message handling from extension
  window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.type) {
      case 'UPDATE_CONFIG':
        handleConfigUpdate(message.payload);
        break;
        
      case 'SHOW_STATUS':
        showMessage(message.payload.message, message.payload.isError);
        break;
        
      case 'statusUpdate':
        updateStatus(message.text, message.active);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  });

  // Helper Functions

  function updateAutomationState(enabled) {
    currentState.isAutomationEnabled = enabled;
    
    if (statusText && statusDot) {
      statusText.textContent = enabled ? 'Active' : 'Inactive';
      if (enabled) {
        statusDot.classList.add('active');
      } else {
        statusDot.classList.remove('active');
      }
    }
  }

  function handleConfigUpdate(payload) {
    if (payload.config) {
      const config = payload.config;
      
      // Update automation toggle
      if (automationToggle && config.automationEnabled !== undefined) {
        automationToggle.checked = config.automationEnabled;
        updateAutomationState(config.automationEnabled);
      }
    }
    
    if (payload.promptText) {
      currentState.promptText = payload.promptText;
      if (promptText) {
        promptText.value = payload.promptText;
      }
    }
    
    if (payload.state) {
      const state = payload.state;
      
      // Update interval selection
      if (intervalSelect && state.scheduleInterval) {
        intervalSelect.value = state.scheduleInterval.toString();
        currentState.intervalMs = state.scheduleInterval;
      }
      
      // Update execution info
      if (state.executionCount !== undefined) {
        currentState.executionCount = state.executionCount;
        if (executionCountSpan) {
          executionCountSpan.textContent = state.executionCount.toString();
        }
      }
      
      if (state.lastExecutionTime) {
        currentState.lastExecutionTime = state.lastExecutionTime;
        if (lastExecutionSpan) {
          const date = new Date(state.lastExecutionTime);
          lastExecutionSpan.textContent = date.toLocaleTimeString();
        }
      }
    }
  }

  function updateStatus(text, active) {
    if (statusText) {
      statusText.textContent = text;
    }
    
    if (statusDot) {
      if (active) {
        statusDot.classList.add('active');
      } else {
        statusDot.classList.remove('active');
      }
    }
  }

  function showMessage(message, isError) {
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
      errorMessage.style.background = isError 
        ? 'var(--vscode-inputValidation-errorBackground, #5a1d1d)'
        : 'var(--vscode-inputValidation-infoBackground, #1a3a5c)';
      errorMessage.style.borderColor = isError
        ? 'var(--vscode-inputValidation-errorBorder, #be1100)'
        : 'var(--vscode-inputValidation-infoBorder, #007acc)';
      errorMessage.style.color = isError
        ? 'var(--vscode-inputValidation-errorForeground, #f48771)'
        : 'var(--vscode-inputValidation-infoForeground, #9cdbff)';
      
      // Hide message after 5 seconds
      setTimeout(() => {
        if (errorMessage) {
          errorMessage.style.display = 'none';
        }
      }, 5000);
    }
  }

  // Initialize by requesting current configuration
  vscode.postMessage({ type: 'READY', payload: {} });

})();
                </script>
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
