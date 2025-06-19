import * as vscode from 'vscode';
import { IChatProvider, ChatResponse, ChatProviderUnavailableError } from './chat-interfaces';

/**
 * GitHub Copilot Chat Integration
 * 
 * Integrates with GitHub Copilot Chat extension to send prompts
 * and receive responses through VS Code's extension API
 */
export class GitHubCopilotIntegration implements IChatProvider {
    constructor() {
    }

    getName(): string {
        return 'GitHub Copilot Chat';
    }

    /**
     * Sends a message to GitHub Copilot Chat
     * @param prompt The prompt to send to Copilot
     * @returns ChatResponse with the result
     */
    async sendMessage(prompt: string): Promise<ChatResponse> {
        try {
            // Check if GitHub Copilot Chat is available
            const isAvailable = await this.isAvailable();
            if (!isAvailable) {
                throw new ChatProviderUnavailableError('GitHub Copilot Chat extension is not available or active');
            }

            // Get the GitHub Copilot Chat extension
            const copilotExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
            if (!copilotExtension) {
                throw new ChatProviderUnavailableError('GitHub Copilot Chat extension not found');
            }

            // Activate the extension if not already active
            if (!copilotExtension.isActive) {
                await copilotExtension.activate();
            }

            // For now, we'll use VS Code's command API to send the message
            // This is a simplified implementation that opens the chat and sets the message
            await this.sendThroughCommand(prompt);

            return {
                success: true,
                content: 'Message sent to GitHub Copilot Chat',
                timestamp: new Date(),
                metadata: {
                    provider: 'github-copilot',
                    promptLength: prompt.length
                }
            };

        } catch (error) {
            console.error('GitHub Copilot integration error:', error);
            
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
                metadata: {
                    provider: 'github-copilot',
                    promptLength: prompt.length
                }
            };
        }
    }

    /**
     * Checks if GitHub Copilot Chat is available
     * @returns true if available, false otherwise
     */
    async isAvailable(): Promise<boolean> {
        try {
            const copilotExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
            if (!copilotExtension) {
                return false;
            }

            // Check if the extension is installed and can be activated
            if (!copilotExtension.isActive) {
                try {
                    await copilotExtension.activate();
                } catch (error) {
                    console.warn('Failed to activate GitHub Copilot Chat:', error);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.warn('Error checking GitHub Copilot availability:', error);
            return false;
        }
    }

    /**
     * Sends prompt through VS Code command API
     * @param prompt The prompt to send
     */
    private async sendThroughCommand(prompt: string): Promise<void> {
        try {
            // Try to use the official GitHub Copilot Chat commands
            // This is a simplified implementation - in a real scenario, we might need
            // to use the proper Copilot Chat API when it becomes available
            
            // First, try to focus the chat view
            await vscode.commands.executeCommand('github.copilot.chat.focus');
            
            // Wait a brief moment for the chat to load
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try to send the message via clipboard and paste
            // This is a workaround until proper API is available
            await vscode.env.clipboard.writeText(prompt);
            
            // Execute paste command in the chat
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            
        } catch (error) {
            console.warn('Failed to send through command API:', error);
            
            // Don't show dialog in test environment (check if we're in extension host test)
            const isTestEnvironment = process.env.NODE_ENV === 'test' || 
                                     process.env.VSCODE_PID !== undefined;
            
            if (!isTestEnvironment) {
                // Fallback: Show an information message with the prompt
                const action = await vscode.window.showInformationMessage(
                    'AutoPrompter wants to send a prompt to GitHub Copilot Chat',
                    'Copy to Clipboard',
                    'Dismiss'
                );
                
                if (action === 'Copy to Clipboard') {
                    await vscode.env.clipboard.writeText(prompt);
                    vscode.window.showInformationMessage('Prompt copied to clipboard. Paste it into GitHub Copilot Chat.');
                }
            }
            
            // Re-throw the error so the calling code knows the command failed
            throw error;
        }
    }



    /**
     * Gets information about the current Copilot Chat state
     */
    async getChatInfo(): Promise<{
        isInstalled: boolean;
        isActive: boolean;
        version?: string;
    }> {
        const copilotExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
        
        return {
            isInstalled: !!copilotExtension,
            isActive: copilotExtension?.isActive ?? false,
            version: copilotExtension?.packageJSON?.version
        };
    }
}
