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
    intervalMs: 300000, // 5 minutes default
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
