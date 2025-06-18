import { RenderedPrompt } from '../domain';
import { AITarget } from '../domain/types';
import { DeliveryResult } from '../application/interfaces';

/**
 * Chat response from AI provider
 */
export interface ChatResponse {
    success: boolean;
    content?: string;
    error?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

/**
 * Interface for AI chat providers
 */
export interface IChatProvider {
    sendMessage(prompt: string): Promise<ChatResponse>;
    isAvailable(): Promise<boolean>;
    getName(): string;
}

/**
 * Error thrown when a chat provider is not available
 */
export class ChatProviderUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ChatProviderUnavailableError';
    }
}

/**
 * Error thrown when a target is not supported
 */
export class UnsupportedTargetError extends Error {
    constructor(target: AITarget) {
        super(`Unsupported AI target: ${target}`);
        this.name = 'UnsupportedTargetError';
    }
}

/**
 * Configuration for chat provider behavior
 */
export interface ChatProviderConfig {
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}
