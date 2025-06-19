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
            console.log(`Attempting to send message to GitHub Copilot: "${prompt.substring(0, 50)}..."`);
            
            // Check if GitHub Copilot Chat is available
            const isAvailable = await this.isAvailable();
            if (!isAvailable) {
                const errorMessage = 'GitHub Copilot extension is not installed, active, or available. Please install GitHub Copilot from the VS Code marketplace and sign in.';
                console.warn(errorMessage);
                throw new ChatProviderUnavailableError(errorMessage);
            }

            // Send the message through command API
            await this.sendThroughCommand(prompt);

            return {
                success: true,
                content: 'Message sent to GitHub Copilot Chat successfully',
                timestamp: new Date(),
                metadata: {
                    provider: 'github-copilot',
                    promptLength: prompt.length,
                    method: 'command-api'
                }
            };

        } catch (error) {
            console.error('GitHub Copilot integration error:', error);
            
            // Handle specific error types
            if (error instanceof ChatProviderUnavailableError) {
                return {
                    success: false,
                    error: error.message,
                    timestamp: new Date(),
                    metadata: {
                        provider: 'github-copilot',
                        promptLength: prompt.length,
                        errorType: 'unavailable'
                    }
                };
            }
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMessage,
                timestamp: new Date(),
                metadata: {
                    provider: 'github-copilot',
                    promptLength: prompt.length,
                    errorType: 'integration-error'
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
            // Check for GitHub Copilot extension (main extension)
            const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
            const copilotChatExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
            
            // We need at least one of these extensions to be available
            if (!copilotExtension && !copilotChatExtension) {
                console.log('Neither GitHub Copilot nor Copilot Chat extension found');
                return false;
            }

            // Try to activate the main Copilot extension if available
            if (copilotExtension && !copilotExtension.isActive) {
                try {
                    console.log('Activating GitHub Copilot extension...');
                    await copilotExtension.activate();
                    console.log('GitHub Copilot extension activated successfully');
                } catch (activationError) {
                    console.warn('Failed to activate GitHub Copilot extension:', activationError);
                    // Continue to check chat extension
                }
            }

            // Try to activate the Copilot Chat extension if available
            if (copilotChatExtension && !copilotChatExtension.isActive) {
                try {
                    console.log('Activating GitHub Copilot Chat extension...');
                    await copilotChatExtension.activate();
                    console.log('GitHub Copilot Chat extension activated successfully');
                } catch (activationError) {
                    console.warn('Failed to activate GitHub Copilot Chat extension:', activationError);
                }
            }

            // Check if at least one extension is now active
            const isCopilotActive = copilotExtension?.isActive ?? false;
            const isChatActive = copilotChatExtension?.isActive ?? false;
            
            const isAvailable = isCopilotActive || isChatActive;
            console.log(`GitHub Copilot availability check: Copilot=${isCopilotActive}, Chat=${isChatActive}, Overall=${isAvailable}`);
            
            return isAvailable;
            
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
            console.log('Attempting to send prompt through GitHub Copilot Chat commands...');
            
            // Method 1: Try to open Copilot Chat view using the correct command
            try {
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                console.log('Successfully focused Copilot Chat panel');
                
                // Wait a brief moment for the chat to load
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Copy the prompt to clipboard so user can paste it
                await vscode.env.clipboard.writeText(prompt);
                console.log('Prompt copied to clipboard');
                
                // Show information to user about pasting the prompt
                vscode.window.showInformationMessage(
                    'Prompt copied to clipboard. Paste it into GitHub Copilot Chat (Ctrl+V or Cmd+V).',
                    'OK'
                );
                
                return; // Success!
                
            } catch (chatFocusError) {
                console.warn('Failed to focus Copilot Chat panel:', chatFocusError);
            }
            
            // Method 2: Try alternative chat commands
            try {
                await vscode.commands.executeCommand('workbench.action.chat.open', { 
                    query: prompt 
                });
                console.log('Successfully opened chat with query');
                return; // Success!
                
            } catch (chatOpenError) {
                console.warn('Failed to open chat with query:', chatOpenError);
            }
            
            // Method 3: Try to focus any available chat view
            try {
                await vscode.commands.executeCommand('workbench.view.chat.focus');
                console.log('Successfully focused general chat view');
                
                // Copy prompt to clipboard
                await vscode.env.clipboard.writeText(prompt);
                
                vscode.window.showInformationMessage(
                    'Prompt copied to clipboard. Paste it into the Chat view.',
                    'OK'
                );
                
                return; // Success!
                
            } catch (generalChatError) {
                console.warn('Failed to focus general chat view:', generalChatError);
            }
            
            // Method 4: Last resort - just copy to clipboard and inform user
            await vscode.env.clipboard.writeText(prompt);
            
            const action = await vscode.window.showInformationMessage(
                'Could not automatically open GitHub Copilot Chat. The prompt has been copied to your clipboard.',
                'Open Chat Manually',
                'Dismiss'
            );
            
            if (action === 'Open Chat Manually') {
                // Try to open the command palette to help user find chat commands
                await vscode.commands.executeCommand('workbench.action.showCommands');
                vscode.window.showInformationMessage('Search for "Copilot" or "Chat" commands in the Command Palette.');
            }
            
        } catch (error) {
            console.error('Failed to send through command API:', error);
            
            // Don't show dialog in test environment
            const isTestEnvironment = process.env.NODE_ENV === 'test' || 
                                     process.env.VSCODE_PID !== undefined;
            
            if (!isTestEnvironment) {
                // Final fallback: Show an information message with the prompt
                const action = await vscode.window.showErrorMessage(
                    'Failed to send prompt to GitHub Copilot Chat. You can copy the prompt and paste it manually.',
                    'Copy to Clipboard',
                    'Dismiss'
                );
                
                if (action === 'Copy to Clipboard') {
                    await vscode.env.clipboard.writeText(prompt);
                    vscode.window.showInformationMessage('Prompt copied to clipboard. Paste it into GitHub Copilot Chat.');
                }
            }
            
            // Re-throw the error so the calling code knows the command failed
            throw new Error(`Failed to send prompt to GitHub Copilot Chat: ${error instanceof Error ? error.message : String(error)}`);
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
