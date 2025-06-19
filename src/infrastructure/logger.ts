import * as vscode from 'vscode';

/**
 * Logging utility for AutoPrompter
 * Provides both console logging (for Developer Console) and output channel logging
 */
export class AutoPrompterLogger {
    private static instance: AutoPrompterLogger;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('AutoPrompter');
    }

    static getInstance(): AutoPrompterLogger {
        if (!AutoPrompterLogger.instance) {
            AutoPrompterLogger.instance = new AutoPrompterLogger();
        }
        return AutoPrompterLogger.instance;
    }

    /**
     * Log an informational message
     */
    info(message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const fullMessage = `[${timestamp}] INFO: ${message}`;
        this.outputChannel.appendLine(fullMessage);
        console.log(`AutoPrompter: ${message}`, ...args);
    }

    /**
     * Log a warning message
     */
    warn(message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const fullMessage = `[${timestamp}] WARN: ${message}`;
        this.outputChannel.appendLine(fullMessage);
        console.warn(`AutoPrompter: ${message}`, ...args);
    }

    /**
     * Log an error message
     */
    error(message: string, error?: Error, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const errorDetails = error ? ` - ${error.message}\n${error.stack}` : '';
        const fullMessage = `[${timestamp}] ERROR: ${message}${errorDetails}`;
        this.outputChannel.appendLine(fullMessage);
        console.error(`AutoPrompter: ${message}`, error, ...args);
    }

    /**
     * Log a debug message
     */
    debug(message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const fullMessage = `[${timestamp}] DEBUG: ${message}`;
        this.outputChannel.appendLine(fullMessage);
        console.log(`AutoPrompter: ${message}`, ...args);
    }

    /**
     * Show the output channel
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * Dispose of the logger resources
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}

// Global logger instance
export const logger = AutoPrompterLogger.getInstance(); 