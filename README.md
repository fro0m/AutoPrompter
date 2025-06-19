# AutoPrompter

AutoPrompter is a VS Code and Cursor IDE extension that intelligently automates AI assistant interactions by periodically sending customized prompts to GitHub Copilot Chat and Cursor Chat when the AI systems are idle or awaiting user input.

## Features

- **Idle-Triggered Automation**: Sends prompts immediately when GitHub Copilot Chat becomes idle, respecting minimal intervals to prevent spam
- **Direct Chat Integration**: Prompts are automatically inserted and submitted directly to GitHub Copilot Chat
- **Workspace-Specific Configuration**: Each project has its own independent AutoPrompter settings saved in workspace/project files
- **Simple Text Prompts**: Easy-to-configure text-based prompts without complex template systems
- **Minimal Interval Controls**: Configurable 1-10 minute minimal intervals between automated prompts
- **Sidebar Configuration Panel**: Intuitive UI for managing all extension settings
- **Pause/Resume Toggle**: Immediate control over automation behavior
- **Manual Execution**: "Execute Now" button for immediate prompt sending
- **GitHub Copilot Integration**: Seamless integration with GitHub Copilot Chat
- **Real-time Status Display**: Shows execution count, last execution time, and automation status
- **Workspace Management**: Copy global settings to workspace or reset workspace settings to defaults

## Prerequisites

Before building and installing the extension, ensure you have:

- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** (version 1.95.0 or higher) or **Cursor** IDE installed

## Building the Extension

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AutoPrompter
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Compile the Extension

```bash
npm run compile
```

### 4. Run Tests (Optional but recommended)

```bash
npm test
```

### 5. Package the Extension

To create a `.vsix` package file for installation:

```bash
npm install -g vsce
vsce package
```

This will create a file named `autoprompter-1.0.0.vsix` in the project root.

## Installation Instructions

### Installing in VS Code

#### Method 1: From VSIX Package (Recommended)

1. **Build the extension** (follow the "Building the Extension" steps above)
2. **Open VS Code**
3. **Open Command Palette** (`Ctrl+Shift+P` on Windows/Linux, `Cmd+Shift+P` on macOS)
4. **Type and select** `Extensions: Install from VSIX...`
5. **Navigate to** the project folder and select `autoprompter-1.0.0.vsix`
6. **Click Install**
7. **Reload VS Code** when prompted

#### Method 2: Development Mode

1. **Clone and build** the extension (follow "Building the Extension" steps)
2. **Open VS Code**
3. **Open the project folder** in VS Code (`File > Open Folder`)
4. **Press `F5`** to run the extension in a new Extension Development Host window
5. **Test the extension** in the new window

### Installing in Cursor

#### Method 1: From VSIX Package (Recommended)

1. **Build the extension** (follow the "Building the Extension" steps above)
2. **Open Cursor IDE**
3. **Open Command Palette** (`Ctrl+Shift+P` on Windows/Linux, `Cmd+Shift+P` on macOS)
4. **Type and select** `Extensions: Install from VSIX...`
5. **Navigate to** the project folder and select `autoprompter-1.0.0.vsix`
6. **Click Install**
7. **Reload Cursor** when prompted

#### Method 2: Manual Installation

1. **Build the extension** (follow "Building the Extension" steps)
2. **Locate Cursor extensions directory**:
   - **Windows**: `%USERPROFILE%\.cursor\extensions`
   - **macOS**: `~/.cursor/extensions`
   - **Linux**: `~/.cursor/extensions`
3. **Create extension folder**: `mkdir autoprompter-1.0.0`
4. **Copy built files** to the extensions directory:
   ```bash
   cp -r out/ package.json README.md icon.png ~/.cursor/extensions/autoprompter-1.0.0/
   ```
5. **Restart Cursor IDE**

## Verification

After installation, verify the extension is working:

1. **Check Extensions Panel**: Look for "AutoPrompter" in the installed extensions list
2. **Look for the Sidebar**: You should see an AutoPrompter robot icon (🤖) in the Activity Bar on the left side
3. **Open AutoPrompter Panel**: Click the robot icon to open the AutoPrompter sidebar panel
4. **Check Status**: The extension should show as "Active" in the bottom status bar

## Development

### Project Structure

```
AutoPrompter/
├── src/
│   ├── application/     # Application layer (use cases, interfaces)
│   ├── domain/          # Domain layer (entities, value objects)
│   ├── infrastructure/  # Infrastructure layer (VS Code API, external services)
│   ├── presentation/    # Presentation layer (UI components)
│   └── test/           # Test suites
├── out/                # Compiled JavaScript output
├── package.json        # Extension manifest and dependencies
└── README.md          # This file
```

### Testing

AutoPrompter includes a comprehensive test framework with multiple test types and utilities.

#### Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:extension

# Run with verbose output
npm run test:verbose

# Generate coverage report
npm run test:coverage
```

#### Build Scripts

```bash
# Full build with tests
npm run build

# Clean build
npm run build:clean

# Skip tests during build
npm run build:fast

# Watch mode for development
npm run build:watch

# Show build options
./build.sh --help

# Show test options
./run_tests.sh --help

# Clean build
./build.sh --clean

# Run only unit tests
./run_tests.sh --unit-only
```

#### Test Types

- **Unit Tests**: Test individual components in isolation (5s timeout)
- **Integration Tests**: Test component interactions (15s timeout)
- **Extension Tests**: Test VS Code extension functionality (30s timeout)

#### Test Framework Features

- 🧪 **Mock Objects**: VS Code API mocks, workspace mocks, configuration mocks
- 📊 **Code Coverage**: Configurable thresholds (70% lines, 70% functions, 60% branches)
- 🎯 **Test Utilities**: Random data generation, assertion helpers, async utilities
- 🔧 **Custom Assertions**: Promise rejection testing, range validation, object property checking
- 📈 **Performance Testing**: Timing validation and resource usage monitoring

#### Test Configuration

Tests are configured via `test-config.json` with customizable timeouts, coverage thresholds, and environment settings. The framework includes:

- Centralized test configuration
- Automatic VS Code test environment setup
- Mock object creation utilities
- Enhanced assertion helpers
- Custom test reporting

#### Writing Tests

Example test structure:

```typescript
import { AutoPrompterTestFramework } from '../test-framework';
const { TestUtils, TestAssertions } = AutoPrompterTestFramework;

suite('My Test Suite', () => {
    let mockConfig: any;
    
    setup(() => {
        mockConfig = TestUtils.createMockConfiguration({
            'autoprompter.enabled': true,
            'autoprompter.promptText': 'Test prompt'
        });
    });
    
    test('should handle configuration correctly', async () => {
        const config = await loadConfiguration();
        TestAssertions.assertValidConfiguration(config);
        TestAssertions.assertHasProperties(config, ['promptText', 'enabled']);
    });
});
```

### Available Scripts

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Compile in watch mode (rebuilds on changes)
- `npm test` - Run test suite
- `npm run lint` - Run ESLint for code quality
- `npm run package` - Create VSIX package for distribution

### Building for Development

```bash
# Install dependencies
npm install

# Compile in watch mode (auto-recompiles on changes)
npm run watch

# In VS Code: Press F5 to launch Extension Development Host
# In Cursor: Use Command Palette > Developer: Reload Window
```

### Debugging

#### Development Debugging

1. **Set breakpoints** in TypeScript source files
2. **Press `F5`** in VS Code to start debugging
3. **Use Debug Console** to inspect variables and execution flow

#### Runtime Debugging & Error Monitoring

When using the installed extension, you can monitor its operation and debug issues:

##### 1. VS Code Developer Console

The primary way to see AutoPrompter errors and debug information:

**How to Access:**
- **VS Code**: `Help` → `Toggle Developer Tools` → `Console` tab
- **Cursor**: `View` → `Toggle Developer Tools` → `Console` tab
- **Keyboard Shortcut**: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)

**What to Look For:**
```javascript
// AutoPrompter log messages start with "AutoPrompter:"
AutoPrompter: View initialized successfully with workspace info
AutoPrompter: Received webview message: TOGGLE_AUTOMATION
AutoPrompter: Configuration saved successfully

// Error messages
AutoPrompter: Failed to initialize view: Error message here
AutoPrompter: Error handling webview message: Error details
```

##### 2. Extension Output Channel

AutoPrompter writes to its own output channel:

**How to Access:**
1. Open the **Output** panel: `View` → `Output` (or `Ctrl+Shift+U`)
2. Select **"AutoPrompter"** from the dropdown menu
3. Monitor real-time logs and error messages

##### 3. VS Code Extension Host Log

For deeper debugging of extension lifecycle issues:

**How to Access:**
1. Open **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run: `Developer: Show Logs...`
3. Select **"Extension Host"**
4. Look for AutoPrompter-related messages

##### 4. Common Debug Scenarios

**Extension Not Loading:**
```bash
# Check if extension is activated
# In Developer Console, look for:
"AutoPrompter extension is now active!"
"AutoPrompter extension activated successfully"

# If missing, check for activation errors:
"Failed to activate extension autoprompter"
```

**Sidebar Not Appearing:**
```bash
# Check webview initialization
# In Developer Console, look for:
"AutoPrompter: Resolving webview view"
"AutoPrompter: Setting webview HTML content"
"AutoPrompter: Webview view resolved successfully"
```

**Configuration Issues:**
```bash
# Check configuration loading/saving
# In Developer Console, look for:
"Loaded configuration: { promptText: '...', source: 'Workspace' }"
"Configuration saved successfully: { scope: 'Workspace Folder' }"

# Configuration errors:
"Failed to load configuration, using defaults"
"Configuration validation failed"
```

**GitHub Copilot Integration Issues:**
```bash
# Check chat integration
# In Developer Console, look for:
"Attempting to send message to GitHub Copilot Chat"
"Successfully sent prompt to GitHub Copilot Chat"

# Integration errors:
"GitHub Copilot Chat extension not found"
"Failed to send message to GitHub Copilot Chat"
```

##### 5. Enable Verbose Logging

For more detailed debugging information:

1. Open VS Code/Cursor Settings (`Ctrl+,`)
2. Search for "log level"
3. Set **"Log Level"** to **"Trace"** or **"Debug"**
4. Restart VS Code/Cursor
5. Check the logs again for more detailed information

##### 6. Debugging Workspace Configuration

To debug workspace-specific configuration issues:

```bash
# In Developer Console, check for:
"Loaded configuration: { source: 'Workspace' }"  # Using workspace settings
"Loaded configuration: { source: 'Global' }"     # Using global settings
"Loaded configuration: { source: 'Default' }"    # Using defaults

# Workspace info:
"AutoPrompter: View initialized successfully with workspace info: {
  workspaceSettings: true,
  workspaceName: 'MyProject'
}"
```

##### 7. Network/Performance Issues

Monitor extension performance:

```bash
# In Developer Console, look for timing information:
"AutoPrompter: Configuration loaded in 45ms"
"AutoPrompter: Webview initialized in 120ms"

# Performance warnings:
"AutoPrompter: Slow operation detected"
"AutoPrompter: Configuration save took longer than expected"
```

##### 8. Collecting Debug Information

When reporting issues, collect this information:

1. **Extension Version**: Check in Extensions panel
2. **VS Code/Cursor Version**: `Help` → `About`
3. **Console Logs**: Copy relevant error messages from Developer Console
4. **Extension Output**: Copy logs from AutoPrompter output channel
5. **Configuration**: Share your workspace `.vscode/settings.json` (remove sensitive data)
6. **System Info**: OS version, Node.js version (`node --version`)

**Example Debug Report:**
```
Extension Version: AutoPrompter v1.0.0
VS Code Version: 1.95.0
OS: Windows 10 / macOS 14.0 / Ubuntu 22.04

Error from Developer Console:
AutoPrompter: Failed to initialize view: TypeError: Cannot read property 'getConfiguration' of undefined

Steps to Reproduce:
1. Open workspace
2. Click AutoPrompter sidebar
3. Error appears in console
```

## Configuration

AutoPrompter uses **workspace-specific configuration**, meaning each project has its own independent settings. Configure AutoPrompter through VS Code/Cursor settings:

- `autoprompter.promptText`: The prompt text to send to GitHub Copilot (default: "Please review the current code and provide suggestions for improvement.") - **Workspace-specific**
- `autoprompter.minimalIntervalMs`: Minimal interval between prompts in milliseconds (default: 60000, range: 1000-600000) - **Workspace-specific**
- `autoprompter.enabled`: Whether automation is enabled (default: false) - **Workspace-specific**

#### Workspace Configuration

The extension provides workspace-specific configuration that allows each project to have its own AutoPrompter settings. The sidebar displays workspace information to help you understand your current configuration:

**Workspace Settings Section:**
- **Project Name**: Shows the name of your current workspace/project
- **Settings Location**: Indicates where your AutoPrompter settings are stored:
  - `Global Settings`: Using your global VS Code settings (no project-specific configuration)
  - `.vscode/settings.json`: Project has its own settings stored locally
- **Has Project Settings**: Shows whether this project has its own AutoPrompter configuration:
  - `Yes` (green): This project has project-specific settings
  - `No` (yellow): This project uses your global settings

**Workspace Management Tools:**
- **Copy Global Settings**: Copies your global AutoPrompter settings to this workspace
- **Reset to Defaults**: Resets this workspace's settings to default values

**Configuration Priority:**
1. **Workspace Folder Settings** (highest priority) - `.vscode/settings.json` in project
2. **Global User Settings** (fallback) - Your personal VS Code settings
3. **Default Values** (fallback) - Extension defaults

### Configuration Examples

#### Via Settings UI
1. Open VS Code/Cursor Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "AutoPrompter"
3. Configure the settings directly in the UI

#### Via settings.json
```json
{
    "autoprompter.promptText": "Please review this code for performance optimizations and suggest improvements.",
    "autoprompter.minimalIntervalMs": 120000,
    "autoprompter.enabled": true
}
```

#### Recommended Configurations

**For Code Review Focus:**
```json
{
    "autoprompter.promptText": "Please review the current code and provide suggestions for improvement, focusing on readability, maintainability, and best practices.",
    "autoprompter.minimalIntervalMs": 60000
}
```

**For Performance Focus:**
```json
{
    "autoprompter.promptText": "Please analyze this code for performance optimization opportunities, including algorithm efficiency, memory usage, and resource utilization.",
    "autoprompter.minimalIntervalMs": 90000
}
```

**For Security Focus:**
```json
{
    "autoprompter.promptText": "Please review this code for potential security vulnerabilities and suggest security best practices.",
    "autoprompter.minimalIntervalMs": 120000
}
```

## Troubleshooting

### Common Issues

**Extension not appearing in extensions list:**
- Ensure the VSIX file was installed correctly
- Restart the IDE completely
- Check VS Code/Cursor logs for error messages

**GitHub Copilot integration not working:**
- Ensure GitHub Copilot extension is installed and active
- Sign in to GitHub Copilot if required
- Prompts are automatically inserted and submitted to the chat interface
- If automatic insertion fails, check the VS Code Developer Console for error messages

**Build errors:**
- Ensure Node.js version 14+ is installed
- Delete `node_modules` and run `npm install` again
- Check for TypeScript compilation errors with `npm run compile`

**Permission errors during installation:**
- On macOS/Linux, you may need to use `sudo` for global npm installs
- Ensure you have write permissions to the extensions directory

**Runtime errors or unexpected behavior:**
- Check the [Debugging section](#debugging) for detailed troubleshooting steps
- Monitor the VS Code Developer Console for error messages (see debugging guide)
- Review the AutoPrompter output channel for detailed logs
- Enable verbose logging for more detailed information

### Getting Help

If you encounter issues:
1. **First**: Follow the comprehensive [Debugging section](#debugging) to identify the issue
2. **Check logs**: Review the VS Code Developer Console and AutoPrompter output channel
3. **Collect information**: Gather debug information as outlined in the debugging guide
4. **Common issues**: Check the [troubleshooting section](#troubleshooting) for known solutions
5. **Development**: Try building and installing in development mode for additional debugging

## Architecture

The extension follows Clean Architecture principles with:

- **Domain Layer**: Pure business logic (entities, use cases, domain services)
- **Application Layer**: Application-specific business rules and orchestration
- **Infrastructure Layer**: External concerns (VS Code API, file system, storage)
- **Presentation Layer**: User interface components and command handlers

## License

MIT
