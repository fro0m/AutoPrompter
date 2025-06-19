// AutoPrompter Sidebar Script
(function () {
  const vscode = acquireVsCodeApi();

  // Automation toggle
  const automationToggle = document.getElementById('automationToggle');
  if (automationToggle) {
    automationToggle.addEventListener('change', function () {
      vscode.postMessage({ type: 'toggleAutomation', enabled: automationToggle.checked });
    });
  }

  // Interval select (future extension)
  // const intervalSelect = document.getElementById('intervalSelect');
  // if (intervalSelect) {
  //   intervalSelect.addEventListener('change', function () {
  //     vscode.postMessage({ type: 'setInterval', value: intervalSelect.value });
  //   });
  // }

  // Listen for status updates from extension
  window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'statusUpdate') {
      const statusText = document.querySelector('.status-text');
      const statusDot = document.querySelector('.status-dot');
      if (statusText && statusDot) {
        statusText.textContent = message.text;
        statusDot.style.background = message.active ? '#007acc' : '#888';
      }
    }
  });
})();
