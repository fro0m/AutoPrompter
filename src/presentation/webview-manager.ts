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

                        <!-- Workspace Configuration -->
                        <section class="workspace-section">
                            <h2>Workspace Settings</h2>
                            <div class="workspace-info">
                                <div class="status-item">
                                    <span class="status-label" title="The name of the current workspace/project">Project Name:</span>
                                    <span id="workspaceName" class="status-value">Loading...</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label" title="Where AutoPrompter settings are stored for this project">Settings Location:</span>
                                    <span id="settingsLocation" class="status-value">Loading...</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label" title="Whether this project has its own AutoPrompter settings (Yes) or uses global settings (No)">Has Project Settings:</span>
                                    <span id="isProjectSpecific" class="status-value">Loading...</span>
                                </div>
                            </div>
                            <div class="button-group">
                                <button id="copyGlobalBtn" class="btn btn-secondary" title="Copy your global AutoPrompter settings to this workspace">
                                    Copy Global → Project
                                </button>
                                <button id="resetWorkspaceBtn" class="btn btn-secondary" title="Reset this workspace's settings to defaults">
                                    Reset to Global
                                </button>
                            </div>
                        </section>
                    </main>
                </div>

                <script>
// AutoPrompter Sidebar Script
console.log('AutoPrompter: Script loaded, waiting for DOM...');

function initializeWebview() {
  console.log('AutoPrompter: Webview script starting...');
  
  try {
    const vscode = acquireVsCodeApi();
    console.log('AutoPrompter: VS Code API acquired successfully');
  } catch (error) {
    console.error('AutoPrompter: Failed to acquire VS Code API:', error);
    // Try to show error in DOM
    document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to initialize AutoPrompter: VS Code API not available</div>';
    return;
  }
  
  const vscode = acquireVsCodeApi();

  // Get UI elements
  console.log('AutoPrompter: Getting UI elements...');
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
  const copyGlobalBtn = document.getElementById('copyGlobalBtn');
  const resetWorkspaceBtn = document.getElementById('resetWorkspaceBtn');
  const workspaceNameSpan = document.getElementById('workspaceName');
  const settingsLocationSpan = document.getElementById('settingsLocation');
  const isProjectSpecificSpan = document.getElementById('isProjectSpecific');

  console.log('AutoPrompter: UI elements found:', {
    automationToggle: !!automationToggle,
    executeNowBtn: !!executeNowBtn,
    promptText: !!promptText,
    workspaceNameSpan: !!workspaceNameSpan,
    settingsLocationSpan: !!settingsLocationSpan,
    isProjectSpecificSpan: !!isProjectSpecificSpan
  });

  // Show immediate feedback that webview is loading
  if (workspaceNameSpan) {
    workspaceNameSpan.textContent = 'Initializing...';
    workspaceNameSpan.style.color = 'var(--vscode-terminal-ansiBlue, #0080ff)';
  }
  if (settingsLocationSpan) {
    settingsLocationSpan.textContent = 'Initializing...';
    settingsLocationSpan.style.color = 'var(--vscode-terminal-ansiBlue, #0080ff)';
  }
  if (isProjectSpecificSpan) {
    isProjectSpecificSpan.textContent = 'Initializing...';
    isProjectSpecificSpan.style.color = 'var(--vscode-terminal-ansiBlue, #0080ff)';
  }

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
      
      // Generate a unique request ID for tracking
      const requestId = 'toggle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Update state optimistically for immediate UI feedback
      updateAutomationState(enabled);
      
      console.log('Toggling automation to: ' + enabled + ' (requestId: ' + requestId + ')');
      
      vscode.postMessage({ 
        type: 'TOGGLE_AUTOMATION', 
        payload: { enabled: enabled },
        requestId: requestId
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
          type: 'UPDATE_PROMPT_TEXT', 
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
          type: 'UPDATE_PROMPT_TEXT', 
          payload: { promptText: text }
        });
      }
    });
  }

  // Copy Global Settings button
  if (copyGlobalBtn) {
    copyGlobalBtn.addEventListener('click', function () {
      copyGlobalBtn.disabled = true;
      copyGlobalBtn.textContent = 'Copying...';
      
      vscode.postMessage({ 
        type: 'COPY_GLOBAL_TO_WORKSPACE',
        payload: {}
      });

      // Re-enable button after 3 seconds
      setTimeout(() => {
        copyGlobalBtn.disabled = false;
        copyGlobalBtn.textContent = 'Copy Global → Project';
      }, 3000);
    });
  }

  // Reset Workspace Settings button
  if (resetWorkspaceBtn) {
    resetWorkspaceBtn.addEventListener('click', function () {
      if (confirm('Are you sure you want to reset this workspace\'s AutoPrompter settings to defaults? This cannot be undone.')) {
        resetWorkspaceBtn.disabled = true;
        resetWorkspaceBtn.textContent = 'Resetting...';
        
        vscode.postMessage({ 
          type: 'RESET_WORKSPACE_SETTINGS',
          payload: {}
        });

        // Re-enable button after 3 seconds
        setTimeout(() => {
          resetWorkspaceBtn.disabled = false;
          resetWorkspaceBtn.textContent = 'Reset to Global';
        }, 3000);
      }
    });
  }

  // Message listener
  window.addEventListener('message', event => {
    const message = event.data;
    console.log('AutoPrompter: Received message from extension:', message);
    
    try {
      // Handle response messages (messages with requestId)
      if (message.requestId) {
        console.log('AutoPrompter: Processing response message with requestId:', message.requestId);
        
        if (message.type === 'TOGGLE_AUTOMATION_RESPONSE') {
          const requestId = message.requestId;
          console.log('AutoPrompter: Received toggle response for request:', requestId);
          
          if (message.success) {
            console.log('AutoPrompter: Toggle successful, updating UI state');
            const currentEnabled = message.data?.enabled ?? false;
            updateAutomationState(currentEnabled);
          } else {
            console.error('AutoPrompter: Toggle failed:', message.error);
            showMessage('Failed to toggle automation: ' + (message.error || 'Unknown error'), true);
            
            // Revert toggle state on error
            if (automationToggle) {
              automationToggle.checked = !automationToggle.checked;
              updateAutomationState(automationToggle.checked);
            }
          }
        }
        return; // Exit early for request responses
      }
      
      // Handle regular messages (non-response messages)
      console.log('AutoPrompter: Processing regular message type:', message.type);
      switch (message.type) {
        case 'UPDATE_CONFIG':
          console.log('AutoPrompter: Handling UPDATE_CONFIG message');
          handleConfigUpdate(message.payload);
          break;
          
        case 'SHOW_STATUS':
          console.log('AutoPrompter: Handling SHOW_STATUS message');
          showMessage(message.payload.message, message.payload.isError);
          break;
          
        case 'statusUpdate':
          console.log('AutoPrompter: Handling statusUpdate message');
          updateStatus(message.text, message.active);
          break;
          
        case 'COPY_GLOBAL_TO_WORKSPACE_RESPONSE':
          console.log('AutoPrompter: Handling COPY_GLOBAL_TO_WORKSPACE_RESPONSE');
          if (copyGlobalBtn) {
            copyGlobalBtn.disabled = false;
            copyGlobalBtn.textContent = 'Copy Global → Project';
          }
          if (message.success) {
            showMessage('Global settings copied to workspace successfully', false);
            // Request updated workspace info
            vscode.postMessage({ type: 'REQUEST_WORKSPACE_INFO', payload: {} });
          } else {
            showMessage('Failed to copy global settings: ' + (message.error || 'Unknown error'), true);
          }
          break;
          
        case 'RESET_WORKSPACE_SETTINGS_RESPONSE':
          console.log('AutoPrompter: Handling RESET_WORKSPACE_SETTINGS_RESPONSE');
          if (resetWorkspaceBtn) {
            resetWorkspaceBtn.disabled = false;
            resetWorkspaceBtn.textContent = 'Reset to Global';
          }
          if (message.success) {
            showMessage('Workspace settings reset to defaults successfully', false);
            // Request updated workspace info and config
            vscode.postMessage({ type: 'REQUEST_WORKSPACE_INFO', payload: {} });
            vscode.postMessage({ type: 'READY', payload: {} });
          } else {
            showMessage('Failed to reset workspace settings: ' + (message.error || 'Unknown error'), true);
          }
          break;
          
        case 'EXECUTE_NOW_RESPONSE':
          console.log('AutoPrompter: Handling EXECUTE_NOW_RESPONSE');
          if (executeNowBtn) {
            executeNowBtn.disabled = false;
            executeNowBtn.textContent = 'Execute Now';
          }
          if (message.success) {
            showMessage('Prompt executed successfully', false);
          } else {
            showMessage('Failed to execute prompt: ' + (message.error || 'Unknown error'), true);
          }
          break;
          
        case 'ERROR':
          console.error('AutoPrompter: Received error message:', message);
          showMessage(message.payload?.message || message.error || 'An error occurred', true);
          // Re-enable all buttons on error
          if (copyGlobalBtn) {
            copyGlobalBtn.disabled = false;
            copyGlobalBtn.textContent = 'Copy Global → Project';
          }
          if (resetWorkspaceBtn) {
            resetWorkspaceBtn.disabled = false;
            resetWorkspaceBtn.textContent = 'Reset to Global';
          }
          if (executeNowBtn) {
            executeNowBtn.disabled = false;
            executeNowBtn.textContent = 'Execute Now';
          }
          break;
          
        default:
          console.log('AutoPrompter: Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('AutoPrompter: Error processing message:', error, 'Message:', message);
      showMessage('Error processing extension message: ' + error.message, true);
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
    console.log('Handling config update with payload:', payload);
    
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
      
      // Enable execute button if we have prompt text
      if (executeNowBtn && payload.promptText.trim()) {
        executeNowBtn.disabled = false;
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
      
      // Enable execute button if we have prompt text and not currently executing
      if (executeNowBtn && state.currentPromptText && state.currentPromptText.trim() && !state.isExecuting) {
        executeNowBtn.disabled = false;
      }
    }

    // Update workspace information
    if (payload.workspaceInfo) {
      const workspaceInfo = payload.workspaceInfo;
      console.log('Updating workspace info:', workspaceInfo);
      
      if (workspaceNameSpan) {
        workspaceNameSpan.textContent = workspaceInfo.workspaceName || 'Untitled Workspace';
        console.log('Updated workspace name to:', workspaceNameSpan.textContent);
      }
      
      if (settingsLocationSpan) {
        const location = workspaceInfo.settingsLocation || 'Global Settings';
        settingsLocationSpan.textContent = location;
        settingsLocationSpan.title = workspaceInfo.isProjectSpecific 
          ? 'Settings are stored in .vscode/settings.json in this project' 
          : 'Using global VS Code settings (no project-specific settings)';
        console.log('Updated settings location to:', location);
      }
      
      if (isProjectSpecificSpan) {
        const hasProjectSettings = workspaceInfo.isProjectSpecific;
        isProjectSpecificSpan.textContent = hasProjectSettings ? 'Yes' : 'No';
        isProjectSpecificSpan.style.color = hasProjectSettings 
          ? 'var(--vscode-terminal-ansiGreen, #00ff00)' 
          : 'var(--vscode-terminal-ansiYellow, #ffff00)';
        isProjectSpecificSpan.title = hasProjectSettings
          ? 'This project has its own AutoPrompter settings'
          : 'This project uses global AutoPrompter settings';
        console.log('Updated project-specific to:', hasProjectSettings ? 'Yes' : 'No');
      }
    } else {
      console.log('No workspace info in payload');
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

  // Handle workspace info loading errors
  function handleWorkspaceInfoError(error) {
    console.error('Failed to load workspace info:', error);
    
    if (workspaceNameSpan) {
      workspaceNameSpan.textContent = 'Error loading';
      workspaceNameSpan.style.color = 'var(--vscode-errorForeground, #f48771)';
      workspaceNameSpan.title = 'Failed to load workspace information: ' + error;
    }
    
    if (settingsLocationSpan) {
      settingsLocationSpan.textContent = 'Error loading';
      settingsLocationSpan.style.color = 'var(--vscode-errorForeground, #f48771)';
      settingsLocationSpan.title = 'Failed to load settings location: ' + error;
    }
    
    if (isProjectSpecificSpan) {
      isProjectSpecificSpan.textContent = 'Error loading';
      isProjectSpecificSpan.style.color = 'var(--vscode-errorForeground, #f48771)';
      isProjectSpecificSpan.title = 'Failed to load project settings info: ' + error;
    }
  }

  // Initialize execute button state based on current prompt text
  function updateExecuteButtonState() {
    if (executeNowBtn && promptText) {
      const hasText = promptText.value && promptText.value.trim().length > 0;
      executeNowBtn.disabled = !hasText;
      executeNowBtn.title = hasText 
        ? 'Execute the current prompt immediately' 
        : 'Enter some prompt text first';
      console.log('Execute button state updated:', { disabled: executeNowBtn.disabled, hasText });
    } else {
      console.log('Execute button or prompt text element not found');
    }
  }

  // Debug function to check DOM elements
  function checkDOMElements() {
    console.log('DOM Elements check:', {
      workspaceNameSpan: !!workspaceNameSpan,
      settingsLocationSpan: !!settingsLocationSpan,
      isProjectSpecificSpan: !!isProjectSpecificSpan,
      executeNowBtn: !!executeNowBtn,
      promptText: !!promptText,
      automationToggle: !!automationToggle
    });
  }

  // Handle workspace loading timeout
  function handleWorkspaceLoadingTimeout() {
    if (workspaceNameSpan && workspaceNameSpan.textContent === 'Loading...') {
      console.log('Workspace info loading timeout - setting fallback values');
      workspaceNameSpan.textContent = 'Current Project';
      workspaceNameSpan.title = 'Workspace information could not be loaded';
    }
    
    if (settingsLocationSpan && settingsLocationSpan.textContent === 'Loading...') {
      settingsLocationSpan.textContent = 'Global Settings';
      settingsLocationSpan.title = 'Using global VS Code settings (workspace info unavailable)';
    }
    
    if (isProjectSpecificSpan && isProjectSpecificSpan.textContent === 'Loading...') {
      isProjectSpecificSpan.textContent = 'Unknown';
      isProjectSpecificSpan.style.color = 'var(--vscode-terminal-ansiYellow, #ffff00)';
      isProjectSpecificSpan.title = 'Could not determine if project has specific settings';
    }
  }

  // Ensure execute button works
  function ensureExecuteButtonWorks() {
    if (executeNowBtn) {
      // Enable execute button if we have prompt text
      if (promptText && promptText.value && promptText.value.trim()) {
        executeNowBtn.disabled = false;
        executeNowBtn.title = 'Execute the current prompt immediately';
        console.log('Execute button enabled - has prompt text');
      } else {
        // If no prompt text, set a default and enable
        if (promptText && !promptText.value.trim()) {
          promptText.value = 'Please review the current code and provide suggestions for improvement.';
          executeNowBtn.disabled = false;
          executeNowBtn.title = 'Execute the current prompt immediately';
          console.log('Execute button enabled - default prompt text set');
        }
      }
    }
  }

  // Update execute button when prompt text changes
  if (promptText) {
    promptText.addEventListener('input', updateExecuteButtonState);
  }

  // Check DOM elements on initialization
  checkDOMElements();

  // Initialize by requesting current configuration with retry mechanism
  let readyRetries = 0;
  const maxReadyRetries = 3;
  
  function sendReadyMessage() {
    readyRetries++;
    console.log('AutoPrompter: Sending READY message to extension (attempt ' + readyRetries + ')');
    
    try {
      vscode.postMessage({ 
        type: 'READY', 
        payload: {},
        timestamp: Date.now(),
        attempt: readyRetries
      });
      
      console.log('AutoPrompter: READY message sent successfully');
    } catch (error) {
      console.error('AutoPrompter: Failed to send READY message:', error);
      showMessage('Failed to communicate with extension: ' + error.message, true);
    }
  }
  
  // Send initial READY message
  sendReadyMessage();
  
  // Set up retry mechanism for READY message if no response received
  const readyTimeout = setTimeout(() => {
    if (workspaceNameSpan && workspaceNameSpan.textContent === 'Initializing...') {
      console.log('AutoPrompter: No response to READY message, retrying...');
      if (readyRetries < maxReadyRetries) {
        sendReadyMessage();
      } else {
        console.error('AutoPrompter: Max retries reached, falling back to timeout handling');
        handleWorkspaceLoadingTimeout();
        ensureExecuteButtonWorks();
      }
    } else {
      console.log('AutoPrompter: READY message appears to have been processed successfully');
    }
  }, 2000);

  // Set a timeout to handle cases where workspace info fails to load
  setTimeout(() => {
    console.log('AutoPrompter: Final timeout check - handling potential loading issues');
    
    // Clear the retry timeout if still active
    clearTimeout(readyTimeout);
    
    // Handle any remaining loading states
    handleWorkspaceLoadingTimeout();
    ensureExecuteButtonWorks();
    
    // Show final status
    if (workspaceNameSpan && workspaceNameSpan.textContent.includes('Loading')) {
      console.log('AutoPrompter: Initialization completed with fallback values');
      showMessage('AutoPrompter loaded with default settings', false);
    } else {
      console.log('AutoPrompter: Initialization completed successfully');
    }
  }, 5000); // 5 second final timeout
}

// Initialize webview when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWebview);
} else {
  // DOM is already loaded
  initializeWebview();
}
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
