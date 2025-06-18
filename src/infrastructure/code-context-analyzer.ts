import * as vscode from 'vscode';
import { CodeContext } from '../application/interfaces';
import * as path from 'path';

/**
 * CodeContextAnalyzer
 * 
 * Analyzes the current VS Code workspace and active editor to provide
 * contextual information for prompt generation.
 */
export class CodeContextAnalyzer {
    
    /**
     * Gets the current code context from VS Code
     */
    async getCurrentContext(): Promise<CodeContext> {
        const context: CodeContext = {};

        // Get active editor information
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            context.currentFile = activeEditor.document.fileName;
            context.currentLanguage = activeEditor.document.languageId;
            
            // Get selected text if any
            const selection = activeEditor.selection;
            if (!selection.isEmpty) {
                context.selectedText = activeEditor.document.getText(selection);
            }
            
            // Get cursor position
            context.cursorPosition = {
                line: selection.active.line,
                character: selection.active.character
            };
        }

        // Get workspace information
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            context.workspaceRoot = workspaceFolders[0].uri.fsPath;
        }

        // Get all open files
        context.openFiles = vscode.workspace.textDocuments
            .filter(doc => !doc.isUntitled)
            .map(doc => doc.fileName);

        // Try to get git branch information
        try {
            context.gitBranch = await this.getGitBranch();
        } catch (error) {
            // Git info is optional, continue without it
            console.debug('Failed to get git branch:', error);
        }

        // Detect project type based on files in workspace
        context.projectType = await this.detectProjectType();

        return context;
    }

    /**
     * Analyzes code context and suggests relevant templates
     */
    async analyzeCodeForPrompting(): Promise<{
        relevantContext: CodeContext;
        suggestedTemplates: string[];
    }> {
        const context = await this.getCurrentContext();
        const suggestedTemplates = this.suggestTemplatesForContext(context);

        return {
            relevantContext: context,
            suggestedTemplates
        };
    }

    /**
     * Gets the current git branch name
     */
    private async getGitBranch(): Promise<string | undefined> {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (gitExtension && gitExtension.isActive) {
            const git = gitExtension.exports.getAPI(1);
            const repositories = git.repositories;
            
            if (repositories.length > 0) {
                const repo = repositories[0];
                return repo.state.HEAD?.name;
            }
        }
        return undefined;
    }

    /**
     * Detects the project type based on workspace files
     */
    private async detectProjectType(): Promise<string | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;

        // Check for common project files
        const projectIndicators = [
            { files: ['package.json'], type: 'node' },
            { files: ['tsconfig.json'], type: 'typescript' },
            { files: ['pom.xml'], type: 'java-maven' },
            { files: ['build.gradle', 'build.gradle.kts'], type: 'java-gradle' },
            { files: ['requirements.txt', 'setup.py', 'pyproject.toml'], type: 'python' },
            { files: ['Cargo.toml'], type: 'rust' },
            { files: ['go.mod'], type: 'go' },
            { files: ['composer.json'], type: 'php' },
            { files: ['Gemfile'], type: 'ruby' },
            { files: ['*.csproj', '*.sln'], type: 'dotnet' }
        ];

        for (const indicator of projectIndicators) {
            for (const file of indicator.files) {
                try {
                    const filePath = path.join(rootPath, file);
                    const fileUri = vscode.Uri.file(filePath);
                    await vscode.workspace.fs.stat(fileUri);
                    return indicator.type;
                } catch {
                    // File doesn't exist, continue checking
                }
            }
        }

        return 'unknown';
    }

    /**
     * Suggests templates based on the current context
     */
    private suggestTemplatesForContext(context: CodeContext): string[] {
        const suggestions: string[] = [];

        // Suggest based on language
        if (context.currentLanguage) {
            switch (context.currentLanguage) {
                case 'typescript':
                case 'javascript':
                    suggestions.push('typescript-code-review', 'javascript-optimization');
                    break;
                case 'python':
                    suggestions.push('python-code-review', 'python-optimization');
                    break;
                case 'java':
                    suggestions.push('java-code-review', 'java-best-practices');
                    break;
                case 'csharp':
                    suggestions.push('csharp-code-review', 'dotnet-optimization');
                    break;
                case 'rust':
                    suggestions.push('rust-code-review', 'rust-safety');
                    break;
                case 'go':
                    suggestions.push('go-code-review', 'go-performance');
                    break;
                default:
                    suggestions.push('general-code-review');
            }
        }

        // Suggest based on selected text
        if (context.selectedText) {
            if (context.selectedText.length > 500) {
                suggestions.push('large-code-review', 'refactoring-suggestions');
            } else {
                suggestions.push('code-explanation', 'quick-improvement');
            }
        }

        // Suggest based on project type
        if (context.projectType) {
            switch (context.projectType) {
                case 'node':
                case 'typescript':
                    suggestions.push('node-best-practices', 'dependency-analysis');
                    break;
                case 'python':
                    suggestions.push('python-standards', 'performance-optimization');
                    break;
                case 'java-maven':
                case 'java-gradle':
                    suggestions.push('java-architecture', 'build-optimization');
                    break;
                case 'rust':
                    suggestions.push('rust-performance', 'memory-safety');
                    break;
                case 'go':
                    suggestions.push('go-idioms', 'concurrency-review');
                    break;
            }
        }

        // Default suggestions if no specific context
        if (suggestions.length === 0) {
            suggestions.push('general-code-review', 'documentation-help');
        }

        // Remove duplicates and limit to top 5
        return [...new Set(suggestions)].slice(0, 5);
    }

    /**
     * Gets the current file's relative path within the workspace
     */
    getRelativeFilePath(): string | undefined {
        const activeEditor = vscode.window.activeTextEditor;
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!activeEditor || !workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }

        const filePath = activeEditor.document.fileName;
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        
        if (filePath.startsWith(workspaceRoot)) {
            return path.relative(workspaceRoot, filePath);
        }
        
        return path.basename(filePath);
    }

    /**
     * Gets context about surrounding code (functions, classes, etc.)
     */
    async getSurroundingCodeContext(): Promise<{
        functions: string[];
        classes: string[];
        imports: string[];
    }> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return { functions: [], classes: [], imports: [] };
        }

        const document = activeEditor.document;
        const text = document.getText();
        const language = document.languageId;

        // Simple regex-based parsing for common languages
        const context = {
            functions: this.extractFunctions(text, language),
            classes: this.extractClasses(text, language),
            imports: this.extractImports(text, language)
        };

        return context;
    }

    /**
     * Extracts function definitions from code
     */
    private extractFunctions(text: string, language: string): string[] {
        const functions: string[] = [];
        let regex: RegExp;

        switch (language) {
            case 'typescript':
            case 'javascript':
                regex = /(?:function\s+|const\s+|let\s+|var\s+)(\w+)\s*(?:=\s*(?:async\s+)?function|\(|=\s*\()/g;
                break;
            case 'python':
                regex = /def\s+(\w+)\s*\(/g;
                break;
            case 'java':
            case 'csharp':
                regex = /(?:public|private|protected|static)?\s*(?:async\s+)?(?:\w+\s+)*(\w+)\s*\(/g;
                break;
            case 'rust':
                regex = /fn\s+(\w+)\s*\(/g;
                break;
            case 'go':
                regex = /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/g;
                break;
            default:
                return functions;
        }

        let match;
        while ((match = regex.exec(text)) !== null && functions.length < 10) {
            functions.push(match[1]);
        }

        return functions;
    }

    /**
     * Extracts class definitions from code
     */
    private extractClasses(text: string, language: string): string[] {
        const classes: string[] = [];
        let regex: RegExp;

        switch (language) {
            case 'typescript':
            case 'javascript':
                regex = /class\s+(\w+)/g;
                break;
            case 'python':
                regex = /class\s+(\w+)/g;
                break;
            case 'java':
            case 'csharp':
                regex = /(?:public|private|protected)?\s*class\s+(\w+)/g;
                break;
            case 'rust':
                regex = /(?:struct|enum)\s+(\w+)/g;
                break;
            case 'go':
                regex = /type\s+(\w+)\s+struct/g;
                break;
            default:
                return classes;
        }

        let match;
        while ((match = regex.exec(text)) !== null && classes.length < 10) {
            classes.push(match[1]);
        }

        return classes;
    }

    /**
     * Extracts import statements from code
     */
    private extractImports(text: string, language: string): string[] {
        const imports: string[] = [];
        let regex: RegExp;

        switch (language) {
            case 'typescript':
            case 'javascript':
                regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
                break;
            case 'python':
                regex = /(?:import\s+(\w+)|from\s+(\w+)\s+import)/g;
                break;
            case 'java':
                regex = /import\s+([^;]+);/g;
                break;
            case 'csharp':
                regex = /using\s+([^;]+);/g;
                break;
            case 'rust':
                regex = /use\s+([^;]+);/g;
                break;
            case 'go':
                regex = /import\s+.*?"([^"]+)"/g;
                break;
            default:
                return imports;
        }

        let match;
        while ((match = regex.exec(text)) !== null && imports.length < 10) {
            const importName = match[1] || match[2];
            if (importName) {
                imports.push(importName.trim());
            }
        }

        return imports;
    }
}
