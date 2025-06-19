import { PromptScheduler, AISessionMonitor, RenderedPrompt } from '../domain';
import { AITarget, TemplateId } from '../domain/types';
import { 
    ExecutionResult, 
    CodeContext,
    IPromptDeliveryService, 
    IConfigurationService,
    ICodeContextService,
    SimplePrompt
} from './interfaces';

/**
 * AutomatedPromptingUseCase
 * 
 * Orchestrates the automated prompting workflow by:
 * 1. Checking if conditions are met for prompt execution
 * 2. Gathering current code context
 * 3. Using the configured prompt text
 * 4. Delivering the prompt to the AI system (GitHub Copilot)
 */
export class AutomatedPromptingUseCase {
    constructor(
        private readonly promptScheduler: PromptScheduler,
        private readonly sessionMonitor: AISessionMonitor,
        private readonly deliveryService: IPromptDeliveryService,
        private readonly configService: IConfigurationService,
        private readonly codeContextService: ICodeContextService
    ) {
        // Set up idle trigger for immediate prompting
        this.sessionMonitor.onIdle((sessionId, idleDuration) => {
            this.onAIBecameIdle();
        });
    }

    /**
     * Called when AI session becomes idle - triggers immediate prompt if conditions are met
     */
    private async onAIBecameIdle(): Promise<void> {
        try {
            const automationEnabled = await this.configService.isAutomationEnabled();
            if (!automationEnabled) {
                return;
            }

            const promptText = await this.configService.getPromptText();
            if (!promptText.trim()) {
                return;
            }

            // Use the scheduler's triggerOnIdle to respect minimal interval
            this.promptScheduler.triggerOnIdle(
                promptText, 
                AITarget.GitHub, 
                async (scheduledPrompt) => {
                    await this.executeScheduledPrompt(scheduledPrompt);
                }
            );
        } catch (error) {
            console.error('Error handling AI idle state:', error);
        }
    }

    /**
     * Executes a scheduled prompt
     */
    private async executeScheduledPrompt(scheduledPrompt: any): Promise<void> {
        try {
            const result = await this.executeAutomatedPrompting();
            if (result.success) {
                console.log('Automated prompt executed successfully:', result.message);
            } else {
                console.warn('Automated prompt execution failed:', result.message);
            }
        } catch (error) {
            console.error('Error executing scheduled prompt:', error);
        }
    }

    /**
     * Executes the automated prompting workflow
     * @returns ExecutionResult indicating success, failure, or skip
     */
    async executeAutomatedPrompting(): Promise<ExecutionResult> {
        try {
            // Check if we can execute a prompt
            const canExecute = await this.canExecutePrompt();
            if (!canExecute) {
                return ExecutionResult.skipped('Cannot execute prompt: conditions not met');
            }

            // Get the configured prompt text
            const promptText = await this.getPromptText();
            if (!promptText) {
                return ExecutionResult.skipped('No prompt text configured');
            }

            // Gather code context (optional for context)
            const context = await this.gatherCodeContext();

            // Create simple prompt
            const prompt = this.createSimplePrompt(promptText, context);

            // Convert to rendered prompt for delivery service
            const renderedPrompt = this.convertToRenderedPrompt(prompt);

            // Send the prompt to GitHub Copilot
            const deliveryResult = await this.deliveryService.sendToAI(renderedPrompt, AITarget.GitHub);

            if (deliveryResult.success) {
                return ExecutionResult.success(
                    `Successfully sent prompt to AI chat`,
                    deliveryResult
                );
            } else {
                return ExecutionResult.failed(
                    `Failed to deliver prompt: ${deliveryResult.message}`,
                    deliveryResult.error
                );
            }

        } catch (error) {
            return ExecutionResult.failed(
                `Automated prompting failed: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Checks if a prompt can be executed now
     * @returns true if conditions are met for prompt execution
     */
    private async canExecutePrompt(): Promise<boolean> {
        // Check if automation is enabled
        const automationEnabled = await this.configService.isAutomationEnabled();
        if (!automationEnabled) {
            return false;
        }

        // Check if scheduler allows execution (respects minimal interval)
        const schedulerReady = this.promptScheduler.canExecute();
        if (!schedulerReady) {
            return false;
        }

        // Check if AI session is available
        const sessionAvailable = this.sessionMonitor.isAvailableForPrompt();
        if (!sessionAvailable) {
            return false;
        }

        return true;
    }

    /**
     * Gets the configured prompt text
     */
    private async getPromptText(): Promise<string | null> {
        try {
            const promptText = await this.configService.getPromptText();
            return promptText.trim() || null;
        } catch (error) {
            console.warn('Failed to get prompt text:', error);
            return null;
        }
    }

    /**
     * Gathers current code context for prompt generation
     * @returns CodeContext with current development state
     */
    private async gatherCodeContext(): Promise<CodeContext | null> {
        try {
            return await this.codeContextService.getCurrentContext();
        } catch (error) {
            console.warn('Failed to gather code context:', error);
            return null;
        }
    }

    /**
     * Creates a simple prompt with context
     */
    private createSimplePrompt(promptText: string, context: CodeContext | null): SimplePrompt {
        return {
            content: promptText,
            timestamp: new Date(),
            context: context || undefined
        };
    }

    /**
     * Converts SimplePrompt to RenderedPrompt for compatibility with delivery service
     */
    private convertToRenderedPrompt(prompt: SimplePrompt): RenderedPrompt {
        return new RenderedPrompt(
            prompt.content,
            'simple-text-prompt' as TemplateId // Use a default template ID for simple text prompts
        );
    }

    /**
     * Manually triggers prompt execution (for testing or immediate execution)
     * @param forceExecution If true, bypasses normal execution checks
     * @returns ExecutionResult
     */
    async executePromptNow(forceExecution: boolean = false): Promise<ExecutionResult> {
        if (forceExecution) {
            // Temporarily override canExecutePrompt for forced execution
            const originalCanExecute = this.canExecutePrompt;
            this.canExecutePrompt = async () => true;
            
            try {
                const result = await this.executeAutomatedPrompting();
                return result;
            } finally {
                // Restore original method
                this.canExecutePrompt = originalCanExecute;
            }
        } else {
            return await this.executeAutomatedPrompting();
        }
    }

    /**
     * Gets the current execution status and readiness
     * @returns Status information about prompt execution capability
     */
    async getExecutionStatus(): Promise<{
        canExecute: boolean;
        automationEnabled: boolean;
        schedulerReady: boolean;
        sessionAvailable: boolean;
        hasPromptText: boolean;
        lastExecution?: Date;
    }> {
        const automationEnabled = await this.configService.isAutomationEnabled();
        const schedulerReady = this.promptScheduler.canExecute();
        const sessionAvailable = this.sessionMonitor.isAvailableForPrompt();
        const promptText = await this.getPromptText();
        const hasPromptText = !!promptText;
        
        const canExecute = automationEnabled && schedulerReady && sessionAvailable && hasPromptText;
        
        return {
            canExecute,
            automationEnabled,
            schedulerReady,
            sessionAvailable,
            hasPromptText,
            // lastExecution would be available from scheduler events in real implementation
        };
    }
}
