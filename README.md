# AutoPrompter

AutoPrompter is a VS Code and Cursor IDE extension that intelligently automates AI assistant interactions by periodically sending customized prompts to GitHub Copilot Chat and Cursor Chat when the AI systems are idle or awaiting user input.

## Features

- **Automated Prompt Sending**: Core functionality to send prompts when AI is idle
- **Sidebar Configuration Panel**: Intuitive UI for managing all extension settings
- **Rate Limiting Controls**: Configurable minimum intervals to prevent spam
- **Pause/Resume Toggle**: Immediate control over automation behavior
- **Prompt Template Management**: Ability to customize and manage prompt content
- **AI Idle Detection**: Intelligent detection of when AI assistants are ready for input

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Open in VS Code and press `F5` to run the extension in a new Extension Development Host window

## Development

### Building

Use the provided build script:

```bash
./ai-toolkit-files/build.sh
```

### Testing

Run tests using:

```bash
./ai-toolkit-files/run_tests.sh
```

### Architecture

The extension follows Clean Architecture principles with:

- **Domain Layer**: Pure business logic (entities, use cases, domain services)
- **Application Layer**: Application-specific business rules and orchestration
- **Infrastructure Layer**: External concerns (VS Code API, file system, storage)
- **Presentation Layer**: User interface components and command handlers

## Configuration

Configure AutoPrompter through VS Code settings:

- `autoprompter.schedule.intervalMinutes`: Minimum minutes between automated prompts (default: 5)
- `autoprompter.templates`: Custom prompt templates array

## License

MIT
