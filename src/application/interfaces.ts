import { PromptTemplate, RenderedPrompt, TimeInterval } from '../domain';
import { TemplateId, AITarget } from '../domain/types';

// Re-export template repository interfaces
export * from './template-repository-interface';

/**
 * Result of a prompt delivery operation
 */
export interface DeliveryResult {
    success: boolean;
    message?: string;
    error?: Error;
    timestamp: Date;
}

/**
 * Result of an automated prompting execution
 */
export class ExecutionResult {
    constructor(
        public readonly success: boolean,
        public readonly message: string,
        public readonly deliveryResult?: DeliveryResult,
        public readonly timestamp: Date = new Date()
    ) {}

    static success(message: string, deliveryResult?: DeliveryResult): ExecutionResult {
        return new ExecutionResult(true, message, deliveryResult);
    }

    static failed(message: string, error?: Error): ExecutionResult {
        return new ExecutionResult(false, message, error ? {
            success: false,
            error,
            timestamp: new Date()
        } : undefined);
    }

    static skipped(reason: string = 'Execution conditions not met'): ExecutionResult {
        return new ExecutionResult(false, `Skipped: ${reason}`);
    }
}

/**
 * Code context information for prompt generation
 */
export interface CodeContext {
    currentFile?: string;
    currentLanguage?: string;
    selectedText?: string;
    cursorPosition?: {
        line: number;
        character: number;
    };
    workspaceRoot?: string;
    openFiles?: string[];
    gitBranch?: string;
    projectType?: string;
}

/**
 * Service interface for prompt delivery to AI systems
 */
export interface IPromptDeliveryService {
    sendToAI(prompt: RenderedPrompt, target: AITarget): Promise<DeliveryResult>;
}

/**
 * Service interface for configuration management
 */
export interface IConfigurationService {
    getPromptText(): Promise<string>;
    setPromptText(promptText: string): Promise<void>;
    getMinimalInterval(): Promise<TimeInterval>;
    setMinimalInterval(interval: TimeInterval): Promise<void>;
    isAutomationEnabled(): Promise<boolean>;
    setAutomationEnabled(enabled: boolean): Promise<void>;
}

/**
 * Service interface for code context analysis
 */
export interface ICodeContextService {
    getCurrentContext(): Promise<CodeContext>;
    analyzeCodeForPrompting(): Promise<{
        relevantContext: CodeContext;
        suggestedPromptEnhancements: string[];
    }>;
}

/**
 * Service interface for template selection
 */
export interface ITemplateSelectionService {
    selectBestTemplate(): Promise<PromptTemplate | null>;
    getAvailableTemplates(): Promise<PromptTemplate[]>;
}

/**
 * Simple prompt rendering result for text-based prompts
 */
export interface SimplePrompt {
    content: string;
    timestamp: Date;
    context?: CodeContext;
}
