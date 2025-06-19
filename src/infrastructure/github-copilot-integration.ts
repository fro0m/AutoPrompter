import * as vscode from 'vscode';
import { IChatProvider, ChatResponse, ChatProviderUnavailableError } from './chat-interfaces';

/**
 * GitHub Copilot Chat Integration
 * 
 * Integrates with GitHub Copilot Chat extension to send prompts
 * directly into the chat interface and submit them automatically
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

            // Send the message directly through VS Code chat API
            await this.sendDirectlyToChat(prompt);

            return {
                success: true,
                content: 'Message sent to GitHub Copilot Chat successfully',
                timestamp: new Date(),
                metadata: {
                    provider: 'github-copilot',
                    promptLength: prompt.length,
                    method: 'direct-chat-api'
                }
            };

        } catch (error) {
            console.error('Error sending message to GitHub Copilot:', error);
            
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
     * Sends prompt directly to chat interface using modern VS Code Chat API
     * @param prompt The prompt to send
     */
    private async sendDirectlyToChat(prompt: string): Promise<void> {
        try {
            console.log('Attempting to send prompt directly to GitHub Copilot Chat...');
            
            // Method 1: Try to open chat with query directly (modern approach)
            try {
                console.log('Trying workbench.action.chat.open with query...');
                await vscode.commands.executeCommand('workbench.action.chat.open', { 
                    query: prompt 
                });
                console.log('Successfully opened chat with query using workbench.action.chat.open');
                return; // Success!
                
            } catch (chatOpenError) {
                console.warn('Failed to open chat with query:', chatOpenError);
            }

            // Method 2: Try the new chat submission API (VS Code 1.95+)
            try {
                console.log('Trying workbench.action.chat.submit...');
                // First open the chat view
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                
                // Wait a moment for the chat to load
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Submit the prompt directly
                await vscode.commands.executeCommand('workbench.action.chat.submit', {
                    text: prompt
                });
                console.log('Successfully submitted prompt using workbench.action.chat.submit');
                return; // Success!
                
            } catch (submitError) {
                console.warn('Failed to submit chat directly:', submitError);
            }

            // Method 3: Try to use the chat input API
            try {
                console.log('Trying workbench.action.chat.sendToNewChat...');
                await vscode.commands.executeCommand('workbench.action.chat.sendToNewChat', {
                    message: prompt
                });
                console.log('Successfully sent to new chat using workbench.action.chat.sendToNewChat');
                return; // Success!
                
            } catch (newChatError) {
                console.warn('Failed to send to new chat:', newChatError);
            }

            // Method 4: Try focusing chat and inserting text programmatically
            try {
                console.log('Trying to focus chat and insert text...');
                
                // Focus the chat panel
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                
                // Wait for the chat to load
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try to insert text into the active input
                await vscode.commands.executeCommand('type', { text: prompt });
                
                // Wait a moment
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Submit by pressing Enter
                await vscode.commands.executeCommand('workbench.action.acceptSelectedSuggestion');
                
                console.log('Successfully inserted and submitted text to chat');
                return; // Success!
                
            } catch (insertError) {
                console.warn('Failed to insert text into chat:', insertError);
            }

            // Method 5: Try alternative chat commands
            try {
                console.log('Trying alternative chat focus commands...');
                
                // Try general chat focus
                await vscode.commands.executeCommand('workbench.view.chat.focus');
                
                // Wait for focus
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Type the text
                await vscode.commands.executeCommand('type', { text: prompt });
                
                // Wait and submit
                await new Promise(resolve => setTimeout(resolve, 200));
                await vscode.commands.executeCommand('workbench.action.chat.acceptInput');
                
                console.log('Successfully used alternative chat commands');
                return; // Success!
                
            } catch (altError) {
                console.warn('Failed to use alternative chat commands:', altError);
            }

            // Method 6: Last resort - try to simulate user input
            try {
                console.log('Trying to simulate user input...');
                
                // Focus any available chat view
                const chatCommands = [
                    'workbench.panel.chat.view.copilot.focus',
                    'workbench.view.chat.focus',
                    'workbench.action.chat.open'
                ];
                
                let chatFocused = false;
                for (const command of chatCommands) {
                    try {
                        await vscode.commands.executeCommand(command);
                        chatFocused = true;
                        console.log(`Successfully focused chat with command: ${command}`);
                        break;
                    } catch (focusError) {
                        console.warn(`Failed to focus chat with ${command}:`, focusError);
                    }
                }
                
                if (chatFocused) {
                    // Wait for the chat to be ready
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Type the prompt
                    await vscode.commands.executeCommand('type', { text: prompt });
                    
                    // Wait a moment
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Try different ways to submit
                    const submitCommands = [
                        'workbench.action.chat.acceptInput',
                        'workbench.action.acceptSelectedSuggestion',
                        'editor.action.insertLineAfter'  // This sends Enter
                    ];
                    
                    for (const submitCommand of submitCommands) {
                        try {
                            await vscode.commands.executeCommand(submitCommand);
                            console.log(`Successfully submitted with command: ${submitCommand}`);
                            return; // Success!
                        } catch (submitError) {
                            console.warn(`Failed to submit with ${submitCommand}:`, submitError);
                        }
                    }
                }
                
            } catch (simulateError) {
                console.warn('Failed to simulate user input:', simulateError);
            }
            
            // If all methods fail, throw an error
            throw new Error('All methods to send prompt directly to chat failed. The prompt could not be inserted and submitted automatically.');
            
        } catch (error) {
            console.error('Failed to send prompt directly to chat:', error);
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
