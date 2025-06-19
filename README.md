# AutoPrompter

AutoPrompter is a VS Code and Cursor IDE extension that intelligently automates AI assistant interactions by periodically sending customized prompts to GitHub Copilot Chat and Cursor Chat when the AI systems are idle or awaiting user input.

## Features

- **Automated Prompt Sending**: Core functionality to send prompts when AI is idle
- **Sidebar Configuration Panel**: Intuitive UI for managing all extension settings
- **Rate Limiting Controls**: Configurable minimum intervals to prevent spam
- **Pause/Resume Toggle**: Immediate control over automation behavior
- **Prompt Template Management**: Ability to customize and manage prompt content
- **AI Idle Detection**: Intelligent detection of when AI assistants are ready for input

## Prerequisites

Before building and installing the extension, ensure you have:

- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **VS Code** or **Cursor** IDE installed

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
2. **Look for the Sidebar**: You should see an AutoPrompter icon in the Activity Bar
3. **Open AutoPrompter Panel**: Click the icon to open the configuration sidebar
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

1. **Set breakpoints** in TypeScript source files
2. **Press `F5`** in VS Code to start debugging
3. **Use Debug Console** to inspect variables and execution flow

## Configuration

Configure AutoPrompter through VS Code/Cursor settings:

- `autoprompter.enabled`: Enable/disable the extension (default: false)
- `autoprompter.schedule.intervalMs`: Milliseconds between automated prompts (default: 300000)
- `autoprompter.schedule.isActive`: Whether scheduling is active (default: false)
- `autoprompter.maxDailyPrompts`: Maximum prompts per day (default: 50)
- `autoprompter.enabledTargets`: AI targets to use (default: ["github"])
- `autoprompter.templates`: Custom prompt templates array

## Troubleshooting

### Common Issues

**Extension not appearing in extensions list:**
- Ensure the VSIX file was installed correctly
- Restart the IDE completely
- Check VS Code/Cursor logs for error messages

**GitHub Copilot integration not working:**
- Ensure GitHub Copilot extension is installed and active
- Sign in to GitHub Copilot if required
- Check that the `github.copilot.chat.focus` command is available

**Build errors:**
- Ensure Node.js version 14+ is installed
- Delete `node_modules` and run `npm install` again
- Check for TypeScript compilation errors with `npm run compile`

**Permission errors during installation:**
- On macOS/Linux, you may need to use `sudo` for global npm installs
- Ensure you have write permissions to the extensions directory

### Getting Help

If you encounter issues:
1. Check the [troubleshooting section](#troubleshooting) above
2. Review the VS Code/Cursor developer console for error messages
3. Ensure all prerequisites are correctly installed
4. Try building and installing in development mode first

## Architecture

The extension follows Clean Architecture principles with:

- **Domain Layer**: Pure business logic (entities, use cases, domain services)
- **Application Layer**: Application-specific business rules and orchestration
- **Infrastructure Layer**: External concerns (VS Code API, file system, storage)
- **Presentation Layer**: User interface components and command handlers

## License

MIT
