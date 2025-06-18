import * as vscode from 'vscode';
import { RenderedPrompt } from '../domain';
import { AITarget } from '../domain/types';
import { IPromptDeliveryService, DeliveryResult } from '../application/interfaces';
import { 
    IChatProvider, 
    ChatResponse, 
    UnsupportedTargetError, 
    ChatProviderUnavailableError,
    ChatProviderConfig 
} from './chat-interfaces';
import { GitHubCopilotIntegration } from './github-copilot-integration';

/**
 * Cursor Chat Integration (Placeholder)
 * 
 * This is a placeholder implementation for Cursor IDE integration.
 * The actual implementation would depend on Cursor's extension API.
 */
class CursorChatIntegration implements IChatProvider {
    constructor(private readonly config: ChatProviderConfig = {}) {}

    getName(): string {
        return 'Cursor Chat';
    }

    async sendMessage(prompt: string): Promise<ChatResponse> {
        // This is a placeholder implementation
        // Real implementation would depend on Cursor's API
        return {
            success: false,
            error: 'Cursor Chat integration not yet implemented',
            timestamp: new Date(),
            metadata: {
                provider: 'cursor',
                promptLength: prompt.length
            }
        };
    }

    async isAvailable(): Promise<boolean> {
        // Check if running in Cursor IDE
        // This would need to be implemented based on Cursor's environment detection
        return false;
    }
}

/**
 * VS Code Chat Integration Service
 * 
 * Main service for integrating with AI chat systems through VS Code.
 * Manages multiple chat providers and routes prompts to appropriate targets.
 */
export class VSCodeChatIntegration implements IPromptDeliveryService {
    private readonly providers: Map<AITarget, IChatProvider>;
    private readonly config: ChatProviderConfig;

    constructor(config: ChatProviderConfig = {}) {
        this.config = {
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            ...config
        };

        // Initialize chat providers
        this.providers = new Map();
        this.providers.set(AITarget.GitHub, new GitHubCopilotIntegration(this.config));
        this.providers.set(AITarget.Cursor, new CursorChatIntegration(this.config));
    }

    /**
     * Sends a rendered prompt to the specified AI target
     * @param prompt The rendered prompt to send
     * @param target The target AI system
     * @returns DeliveryResult indicating success or failure
     */
    async sendToAI(prompt: RenderedPrompt, target: AITarget): Promise<DeliveryResult> {
        try {
            const provider = this.getChatProvider(target);
            
            // Check if provider is available
            const isAvailable = await provider.isAvailable();
            if (!isAvailable) {
                return {
                    success: false,
                    message: `${provider.getName()} is not available`,
                    error: new ChatProviderUnavailableError(`${provider.getName()} not available`),
                    timestamp: new Date()
                };
            }

            // Send the prompt with retry logic
            const chatResponse = await this.sendWithRetry(provider, prompt.content);

            return {
                success: chatResponse.success,
                message: chatResponse.success 
                    ? `Successfully sent prompt to ${provider.getName()}`
                    : `Failed to send prompt to ${provider.getName()}: ${chatResponse.error}`,
                error: chatResponse.error ? new Error(chatResponse.error) : undefined,
                timestamp: new Date()
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
                success: false,
                message: `Failed to send prompt to ${target}: ${errorMessage}`,
                error: error instanceof Error ? error : new Error(errorMessage),
                timestamp: new Date()
            };
        }
    }

    /**
     * Gets the appropriate chat provider for the target
     * @param target The AI target
     * @returns IChatProvider instance
     */
    private getChatProvider(target: AITarget): IChatProvider {
        const provider = this.providers.get(target);
        if (!provider) {
            throw new UnsupportedTargetError(target);
        }
        return provider;
    }

    /**
     * Sends a message with retry logic
     * @param provider The chat provider to use
     * @param message The message to send
     * @returns ChatResponse
     */
    private async sendWithRetry(provider: IChatProvider, message: string): Promise<ChatResponse> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= (this.config.retryAttempts ?? 3); attempt++) {
            try {
                const response = await this.sendWithTimeout(provider, message);
                
                if (response.success) {
                    return response;
                }
                
                lastError = new Error(response.error || 'Unknown error');
                
                // Don't retry on the last attempt
                if (attempt < (this.config.retryAttempts ?? 3)) {
                    await this.delay(this.config.retryDelay ?? 1000);
                }
                
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                // Don't retry on the last attempt
                if (attempt < (this.config.retryAttempts ?? 3)) {
                    await this.delay(this.config.retryDelay ?? 1000);
                }
            }
        }

        return {
            success: false,
            error: lastError?.message || 'Failed after all retry attempts',
            timestamp: new Date()
        };
    }

    /**
     * Sends a message with timeout
     * @param provider The chat provider to use
     * @param message The message to send
     * @returns ChatResponse
     */
    private async sendWithTimeout(provider: IChatProvider, message: string): Promise<ChatResponse> {
        const timeout = this.config.timeout ?? 30000;
        
        return Promise.race([
            provider.sendMessage(message),
            new Promise<ChatResponse>((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error(`Timeout after ${timeout}ms`));
                }, timeout);
            })
        ]);
    }

    /**
     * Delays execution for the specified duration
     * @param ms Milliseconds to delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Gets the status of all chat providers
     * @returns Status information for each provider
     */
    async getProvidersStatus(): Promise<Array<{
        target: AITarget;
        name: string;
        available: boolean;
        error?: string;
    }>> {
        const status = [];
        
        for (const [target, provider] of this.providers) {
            try {
                const available = await provider.isAvailable();
                status.push({
                    target,
                    name: provider.getName(),
                    available
                });
            } catch (error) {
                status.push({
                    target,
                    name: provider.getName(),
                    available: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        
        return status;
    }

    /**
     * Gets the preferred AI target based on availability
     * @returns The preferred AI target or null if none available
     */
    async getPreferredTarget(): Promise<AITarget | null> {
        const status = await this.getProvidersStatus();
        
        // Prefer GitHub Copilot if available
        const githubStatus = status.find(s => s.target === AITarget.GitHub);
        if (githubStatus?.available) {
            return AITarget.GitHub;
        }
        
        // Fall back to Cursor if available
        const cursorStatus = status.find(s => s.target === AITarget.Cursor);
        if (cursorStatus?.available) {
            return AITarget.Cursor;
        }
        
        return null;
    }

    /**
     * Tests connectivity to a specific target
     * @param target The target to test
     * @returns Test result
     */
    async testConnection(target: AITarget): Promise<{
        success: boolean;
        message: string;
        responseTime?: number;
    }> {
        const startTime = Date.now();
        
        try {
            const provider = this.getChatProvider(target);
            const isAvailable = await provider.isAvailable();
            
            if (!isAvailable) {
                return {
                    success: false,
                    message: `${provider.getName()} is not available`
                };
            }

            // Send a test message
            const testPrompt = 'Test connection from AutoPrompter extension';
            const response = await provider.sendMessage(testPrompt);
            const responseTime = Date.now() - startTime;

            return {
                success: response.success,
                message: response.success 
                    ? `Successfully connected to ${provider.getName()}`
                    : `Connection test failed: ${response.error}`,
                responseTime
            };

        } catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                success: false,
                message: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`,
                responseTime
            };
        }
    }
}
