import { PromptScheduler, AISessionMonitor, PromptTemplate, RenderedPrompt } from '../domain';
import { AITarget } from '../domain/types';
import { 
    ExecutionResult, 
    CodeContext,
    IPromptDeliveryService, 
    IConfigurationService,
    ICodeContextService,
    ITemplateSelectionService
} from './interfaces';

/**
 * AutomatedPromptingUseCase
 * 
 * Orchestrates the automated prompting workflow by:
 * 1. Checking if conditions are met for prompt execution
 * 2. Gathering current code context
 * 3. Selecting appropriate prompt template
 * 4. Rendering the prompt with context
 * 5. Delivering the prompt to the AI system
 */
export class AutomatedPromptingUseCase {
    constructor(
        private readonly promptScheduler: PromptScheduler,
        private readonly sessionMonitor: AISessionMonitor,
        private readonly deliveryService: IPromptDeliveryService,
        private readonly configService: IConfigurationService,
        private readonly codeContextService: ICodeContextService,
        private readonly templateSelectionService: ITemplateSelectionService
    ) {}

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


            // Gather code context
            const context = await this.gatherCodeContext();
            if (!context) {
                return ExecutionResult.skipped('No code context available');
            }

            // Select appropriate template for the context
            const template = await this.selectTemplate();
            if (!template) {
                return ExecutionResult.skipped('No suitable template found');
            }

            // Render the prompt with context
            const prompt = await this.renderPrompt(template, context);

            // Determine target AI system
            const target = await this.determineTarget();

            // Send the prompt to AI
            const deliveryResult = await this.deliveryService.sendToAI(prompt, target);

            if (deliveryResult.success) {
                return ExecutionResult.success(
                    `Successfully sent prompt using template "${template.name}"`,
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

        // Check if scheduler allows execution
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
     * Selects the best prompt template for the given context
     * @param context Current code context
     * @returns Selected prompt template or null if none suitable
     */
    private async selectTemplate(): Promise<PromptTemplate | null> {
        try {
            return await this.templateSelectionService.selectBestTemplate();
        } catch (error) {
            console.warn('Failed to select template:', error);
            return null;
        }
    }

    /**
     * Renders a prompt template with the given context
     * @param template The prompt template to render
     * @param context The code context to use for rendering
     * @returns Rendered prompt ready for delivery
     */
    private async renderPrompt(template: PromptTemplate, context: CodeContext): Promise<RenderedPrompt> {
        // Create a render context from the code context
        const renderContext = {
            getValue: (variableName: string): string | number | boolean | undefined => {
                switch (variableName) {
                    case 'fileName':
                        return context.currentFile ? context.currentFile.split('/').pop() : undefined;
                    case 'filePath':
                        return context.currentFile;
                    case 'language':
                        return context.currentLanguage;
                    case 'selectedText':
                        return context.selectedText;
                    case 'workspaceRoot':
                        return context.workspaceRoot;
                    case 'gitBranch':
                        return context.gitBranch;
                    case 'projectType':
                        return context.projectType;
                    case 'cursorLine':
                        return context.cursorPosition?.line;
                    case 'cursorCharacter':
                        return context.cursorPosition?.character;
                    default:
                        return undefined;
                }
            },
            hasValue: (variableName: string): boolean => {
                return renderContext.getValue(variableName) !== undefined;
            }
        };

        return template.render(renderContext);
    }

    /**
     * Determines the target AI system for prompt delivery
     * @returns Target AI system identifier
     */
    private async determineTarget(): Promise<AITarget> {
        // For now, default to GitHub Copilot
        // This could be made configurable in the future
        return AITarget.GitHub;
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
                this.canExecutePrompt = originalCanExecute;
                return result;
            } catch (error) {
                this.canExecutePrompt = originalCanExecute;
                throw error;
            }
        }

        return this.executeAutomatedPrompting();
    }

    /**
     * Gets the current execution status
     * @returns Status information about the automated prompting system
     */
    async getExecutionStatus(): Promise<{
        canExecute: boolean;
        automationEnabled: boolean;
        schedulerReady: boolean;
        sessionAvailable: boolean;
        lastExecution?: Date;
    }> {
        const automationEnabled = await this.configService.isAutomationEnabled();
        const schedulerReady = this.promptScheduler.canExecute();
        const sessionAvailable = this.sessionMonitor.isAvailableForPrompt();

        return {
            canExecute: automationEnabled && schedulerReady && sessionAvailable,
            automationEnabled,
            schedulerReady,
            sessionAvailable
        };
    }
}
