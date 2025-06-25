// AutoPrompter Sidebar Script
(function () {
  console.log('AutoPrompter webview script starting');
  const vscode = acquireVsCodeApi();
  console.log('AutoPrompter: vscode API acquired');

  // Get UI elements
  console.log('AutoPrompter: Getting UI elements');
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

  console.log('AutoPrompter: UI elements found:', {
    automationToggle: !!automationToggle,
    intervalSelect: !!intervalSelect,
    executeNowBtn: !!executeNowBtn,
    promptText: !!promptText,
    savePromptBtn: !!savePromptBtn,
    statusText: !!statusText,
    statusDot: !!statusDot,
    lastExecutionSpan: !!lastExecutionSpan,
    executionCountSpan: !!executionCountSpan,
    errorMessage: !!errorMessage
  });

  // State management
  let currentState = {
    isAutomationEnabled: false,
    intervalMs: 300000, // 5 minutes default
    promptText: '',
    executionCount: 0,
    lastExecutionTime: null
  };
  console.log('AutoPrompter: Initial state:', currentState);

  // Event Listeners
  
  // Automation toggle
  if (automationToggle) {
    console.log('AutoPrompter: Setting up automation toggle event listener');
    automationToggle.addEventListener('change', function () {
      const enabled = automationToggle.checked;
      console.log('AutoPrompter: Automation toggle changed to:', enabled);
      updateAutomationState(enabled);
      const message = { 
        type: 'TOGGLE_AUTOMATION', 
        payload: { enabled: enabled }
      };
      console.log('AutoPrompter: Sending toggle automation message:', message);
      vscode.postMessage(message);
    });
  } else {
    console.warn('AutoPrompter: Automation toggle element not found');
  }

  // Interval selection
  if (intervalSelect) {
    console.log('AutoPrompter: Setting up interval select event listener');
    intervalSelect.addEventListener('change', function () {
      const intervalMs = parseInt(intervalSelect.value);
      console.log('AutoPrompter: Interval changed to:', intervalMs);
      currentState.intervalMs = intervalMs;
      const message = { 
        type: 'UPDATE_INTERVAL', 
        payload: { intervalMs: intervalMs }
      };
      console.log('AutoPrompter: Sending update interval message:', message);
      vscode.postMessage(message);
    });
  } else {
    console.warn('AutoPrompter: Interval select element not found');
  }

  // Execute now button
  if (executeNowBtn) {
    console.log('AutoPrompter: Setting up execute now button event listener');
    executeNowBtn.addEventListener('click', function () {
      console.log('AutoPrompter: Execute now button clicked');
      executeNowBtn.disabled = true;
      executeNowBtn.textContent = 'Executing...';
      
      const message = { 
        type: 'EXECUTE_NOW',
        payload: {}
      };
      console.log('AutoPrompter: Sending execute now message:', message);
      vscode.postMessage(message);

      // Re-enable button after 2 seconds
      setTimeout(() => {
        console.log('AutoPrompter: Re-enabling execute now button');
        executeNowBtn.disabled = false;
        executeNowBtn.textContent = 'Execute Now';
      }, 2000);
    });
  } else {
    console.warn('AutoPrompter: Execute now button element not found');
  }

  // Save prompt button
  if (savePromptBtn) {
    console.log('AutoPrompter: Setting up save prompt button event listener');
    savePromptBtn.addEventListener('click', function () {
      console.log('AutoPrompter: Save prompt button clicked');
      const text = promptText.value.trim();
      if (text) {
        console.log('AutoPrompter: Saving prompt text:', text.substring(0, 50) + '...');
        const message = { 
          type: 'SET_PROMPT_TEXT', 
          payload: { promptText: text }
        };
        console.log('AutoPrompter: Sending set prompt text message:', message);
        vscode.postMessage(message);
        showMessage('Prompt text saved successfully', false);
      } else {
        console.warn('AutoPrompter: No prompt text to save');
        showMessage('Please enter some prompt text', true);
      }
    });
  } else {
    console.warn('AutoPrompter: Save prompt button element not found');
  }

  // Prompt text auto-save on blur
  if (promptText) {
    console.log('AutoPrompter: Setting up prompt text blur event listener');
    promptText.addEventListener('blur', function () {
      const text = promptText.value.trim();
      console.log('AutoPrompter: Prompt text blur event, text:', text.substring(0, 50) + '...');
      if (text && text !== currentState.promptText) {
        console.log('AutoPrompter: Auto-saving prompt text');
        currentState.promptText = text;
        const message = { 
          type: 'SET_PROMPT_TEXT', 
          payload: { promptText: text }
        };
        console.log('AutoPrompter: Sending auto-save prompt text message:', message);
        vscode.postMessage(message);
      }
    });
  } else {
    console.warn('AutoPrompter: Prompt text element not found');
  }

  // Message handling from extension
  console.log('AutoPrompter: Setting up message listener');
  window.addEventListener('message', event => {
    const message = event.data;
    console.log('AutoPrompter: Received message from extension:', message);
    
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
        
      default:
        console.log('AutoPrompter: Unknown message type:', message.type);
    }
  });

  // Helper Functions

  function updateAutomationState(enabled) {
    console.log('AutoPrompter: Updating automation state to:', enabled);
    currentState.isAutomationEnabled = enabled;
    
    if (statusText && statusDot) {
      statusText.textContent = enabled ? 'Active' : 'Inactive';
      if (enabled) {
        statusDot.classList.add('active');
      } else {
        statusDot.classList.remove('active');
      }
      console.log('AutoPrompter: Status UI updated');
    }
  }

  function handleConfigUpdate(payload) {
    console.log('AutoPrompter: Processing config update payload:', payload);
    
    if (payload.config) {
      const config = payload.config;
      console.log('AutoPrompter: Updating config:', config);
      
      // Update automation toggle
      if (automationToggle && config.automationEnabled !== undefined) {
        console.log('AutoPrompter: Setting automation toggle to:', config.automationEnabled);
        automationToggle.checked = config.automationEnabled;
        updateAutomationState(config.automationEnabled);
      }
    }
    
    if (payload.promptText) {
      console.log('AutoPrompter: Setting prompt text to:', payload.promptText.substring(0, 50) + '...');
      currentState.promptText = payload.promptText;
      if (promptText) {
        promptText.value = payload.promptText;
      }
    }
    
    if (payload.state) {
      const state = payload.state;
      console.log('AutoPrompter: Updating state:', state);
      
      // Update interval selection
      if (intervalSelect && state.scheduleInterval) {
        console.log('AutoPrompter: Setting interval to:', state.scheduleInterval);
        intervalSelect.value = state.scheduleInterval.toString();
        currentState.intervalMs = state.scheduleInterval;
      }
      
      // Update execution info
      if (state.executionCount !== undefined) {
        console.log('AutoPrompter: Setting execution count to:', state.executionCount);
        currentState.executionCount = state.executionCount;
        if (executionCountSpan) {
          executionCountSpan.textContent = state.executionCount.toString();
        }
      }
      
      if (state.lastExecutionTime) {
        console.log('AutoPrompter: Setting last execution time to:', state.lastExecutionTime);
        currentState.lastExecutionTime = state.lastExecutionTime;
        if (lastExecutionSpan) {
          const date = new Date(state.lastExecutionTime);
          lastExecutionSpan.textContent = date.toLocaleTimeString();
        }
      }
      
      // Update execute button state
      if (executeNowBtn) {
        if (payload.promptText && payload.promptText.trim().length > 0) {
          console.log('AutoPrompter: Enabling execute button (has prompt text)');
          executeNowBtn.disabled = false;
        } else {
          console.log('AutoPrompter: Disabling execute button (no prompt text)');
          executeNowBtn.disabled = true;
        }
      }
    }
    
    console.log('AutoPrompter: Config update completed, current state:', currentState);
  }

  function updateStatus(text, active) {
    console.log('AutoPrompter: Updating status to:', text, 'active:', active);
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
    console.log('AutoPrompter: Showing message:', message, 'isError:', isError);
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
  console.log('AutoPrompter: Sending READY message to extension');
  vscode.postMessage({ type: 'READY', payload: {} });
  console.log('AutoPrompter: Webview script initialization completed');

})();
