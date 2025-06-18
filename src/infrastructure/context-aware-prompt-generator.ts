import { PromptTemplate, TemplateVariable, RenderContext, RenderedPrompt } from '../domain/value-objects';
import { CodeContext, ICodeContextService, ITemplateSelectionService } from '../application/interfaces';
import { TemplateId, PromptCategory } from '../domain/types';
import { CodeContextAnalyzer } from './code-context-analyzer';

/**
 * ContextAwarePromptGenerator
 * 
 * Generates contextually relevant prompts based on the current code environment,
 * user activity, and workspace state. Combines code analysis with template selection
 * to create intelligent, targeted prompts.
 */
export class ContextAwarePromptGenerator implements ICodeContextService, ITemplateSelectionService {
    private readonly codeAnalyzer: CodeContextAnalyzer;
    private defaultTemplates: PromptTemplate[] = [];

    constructor(codeAnalyzer?: CodeContextAnalyzer) {
        this.codeAnalyzer = codeAnalyzer || new CodeContextAnalyzer();
        this.initializeDefaultTemplates();
    }

    /**
     * Gets the current code context
     */
    async getCurrentContext(): Promise<CodeContext> {
        return this.codeAnalyzer.getCurrentContext();
    }

    /**
     * Analyzes code for prompting and returns context with suggested templates
     */
    async analyzeCodeForPrompting(): Promise<{
        relevantContext: CodeContext;
        suggestedTemplates: TemplateId[];
    }> {
        const context = await this.getCurrentContext();
        const suggestedTemplateIds = await this.getSuggestedTemplateIds(context);

        return {
            relevantContext: context,
            suggestedTemplates: suggestedTemplateIds
        };
    }

    /**
     * Selects the best template based on the current context
     */
    async selectBestTemplate(context: CodeContext): Promise<PromptTemplate | null> {
        const suggestedIds = await this.getSuggestedTemplateIds(context);
        
        if (suggestedIds.length === 0) {
            return this.getDefaultTemplate();
        }

        // Find the first available template from suggestions
        for (const templateId of suggestedIds) {
            const template = this.defaultTemplates.find(t => t.id === templateId);
            if (template) {
                return template;
            }
        }

        return this.getDefaultTemplate();
    }

    /**
     * Gets all available templates
     */
    async getAvailableTemplates(): Promise<PromptTemplate[]> {
        return [...this.defaultTemplates];
    }

    /**
     * Generates a context-aware prompt based on current code state
     */
    async generateContextAwarePrompt(customTemplate?: PromptTemplate): Promise<{
        template: PromptTemplate;
        renderedPrompt: string;
        context: CodeContext;
    }> {
        const context = await this.getCurrentContext();
        const template = customTemplate || await this.selectBestTemplate(context);
        
        if (!template) {
            throw new Error('No suitable template found for current context');
        }

        const renderedPrompt = await this.renderTemplateWithContext(template, context);

        return {
            template,
            renderedPrompt,
            context
        };
    }

    /**
     * Renders a template with the current context
     */
    private async renderTemplateWithContext(template: PromptTemplate, context: CodeContext): Promise<string> {
        const contextVariables = new Map<string, any>();

        // Map context to template variables
        contextVariables.set('currentFile', this.getFileName(context.currentFile));
        contextVariables.set('currentLanguage', context.currentLanguage || 'unknown');
        contextVariables.set('selectedText', context.selectedText || '');
        contextVariables.set('projectType', context.projectType || 'unknown');
        contextVariables.set('relativeFilePath', this.codeAnalyzer.getRelativeFilePath() || '');

        // Add surrounding code context
        const surroundingContext = await this.codeAnalyzer.getSurroundingCodeContext();
        contextVariables.set('functions', surroundingContext.functions.join(', '));
        contextVariables.set('classes', surroundingContext.classes.join(', '));
        contextVariables.set('imports', surroundingContext.imports.slice(0, 5).join(', '));

        // Add git context if available
        contextVariables.set('gitBranch', context.gitBranch || 'unknown');

        // Add timestamp
        contextVariables.set('timestamp', new Date().toISOString());

        // Create context object that implements RenderContext interface
        const renderContext: RenderContext = {
            getValue(variableName: string): string | number | boolean | undefined {
                return contextVariables.get(variableName);
            },
            hasValue(variableName: string): boolean {
                return contextVariables.has(variableName);
            }
        };

        const renderedPrompt = template.render(renderContext);
        return renderedPrompt.content;
    }

    /**
     * Gets suggested template IDs based on context
     */
    private async getSuggestedTemplateIds(context: CodeContext): Promise<TemplateId[]> {
        const analysis = await this.codeAnalyzer.analyzeCodeForPrompting();
        return analysis.suggestedTemplates;
    }

    /**
     * Gets the default template for general use
     */
    private getDefaultTemplate(): PromptTemplate | null {
        return this.defaultTemplates.find(t => t.id === 'general-code-review') || 
               this.defaultTemplates[0] || null;
    }

    /**
     * Extracts filename from full path
     */
    private getFileName(filePath?: string): string {
        if (!filePath) {
            return 'unknown';
        }
        return filePath.split(/[/\\]/).pop() || 'unknown';
    }

    /**
     * Initializes default templates for different contexts
     */
    private initializeDefaultTemplates(): void {
        this.defaultTemplates = [
            // General code review template
            new PromptTemplate(
                'general-code-review',
                'General Code Review',
                `Please review the following code and provide suggestions for improvement:

**File:** {{currentFile}}
**Language:** {{currentLanguage}}
**Project Type:** {{projectType}}

{{#if selectedText}}
**Selected Code:**
\`\`\`{{currentLanguage}}
{{selectedText}}
\`\`\`
{{else}}
**Current File Context:**
- Functions: {{functions}}
- Classes: {{classes}}
- Imports: {{imports}}
{{/if}}

Please analyze this code and provide:
1. Code quality assessment
2. Potential improvements
3. Best practices recommendations
4. Security considerations (if applicable)
5. Performance optimization suggestions`,
                PromptCategory.CodeReview,
                [
                    new TemplateVariable('currentFile', 'string', 'unknown', 'Current file name'),
                    new TemplateVariable('currentLanguage', 'string', 'unknown', 'Programming language'),
                    new TemplateVariable('projectType', 'string', 'unknown', 'Project type'),
                    new TemplateVariable('selectedText', 'string', '', 'Selected code text'),
                    new TemplateVariable('functions', 'string', '', 'Functions in current file'),
                    new TemplateVariable('classes', 'string', '', 'Classes in current file'),
                    new TemplateVariable('imports', 'string', '', 'Import statements')
                ]
            ),

            // TypeScript specific template
            new PromptTemplate(
                'typescript-code-review',
                'TypeScript Code Review',
                `Please review this TypeScript code and provide detailed feedback:

**File:** {{currentFile}}
**Project:** {{projectType}}
**Git Branch:** {{gitBranch}}

{{#if selectedText}}
**Code to Review:**
\`\`\`typescript
{{selectedText}}
\`\`\`
{{else}}
**File Overview:**
- Functions: {{functions}}
- Classes: {{classes}}
- Imports: {{imports}}
{{/if}}

Focus on:
1. TypeScript best practices and type safety
2. Code organization and structure
3. Error handling patterns
4. Performance considerations
5. Testing recommendations
6. Documentation completeness`,
                PromptCategory.CodeReview,
                [
                    new TemplateVariable('currentFile', 'string', 'unknown', 'Current file name'),
                    new TemplateVariable('projectType', 'string', 'unknown', 'Project type'),
                    new TemplateVariable('gitBranch', 'string', 'unknown', 'Git branch'),
                    new TemplateVariable('selectedText', 'string', '', 'Selected code text'),
                    new TemplateVariable('functions', 'string', '', 'Functions in current file'),
                    new TemplateVariable('classes', 'string', '', 'Classes in current file'),
                    new TemplateVariable('imports', 'string', '', 'Import statements')
                ]
            ),

            // Code explanation template
            new PromptTemplate(
                'code-explanation',
                'Code Explanation',
                `Please explain the following code in detail:

**File:** {{currentFile}} ({{currentLanguage}})
**Context:** {{projectType}} project

\`\`\`{{currentLanguage}}
{{selectedText}}
\`\`\`

Please provide:
1. What this code does (high-level purpose)
2. Step-by-step breakdown of the logic
3. Key concepts and patterns used
4. Potential edge cases or considerations
5. How it fits into the larger codebase context`,
                PromptCategory.Documentation,
                [
                    new TemplateVariable('currentFile', 'string', 'unknown', 'Current file name'),
                    new TemplateVariable('currentLanguage', 'string', 'unknown', 'Programming language'),
                    new TemplateVariable('projectType', 'string', 'unknown', 'Project type'),
                    new TemplateVariable('selectedText', 'string', '', 'Selected code text')
                ]
            ),

            // Performance optimization template
            new PromptTemplate(
                'performance-optimization',
                'Performance Optimization',
                `Please analyze this code for performance optimization opportunities:

**File:** {{currentFile}}
**Language:** {{currentLanguage}}
**Project:** {{projectType}}

{{#if selectedText}}
**Code to Optimize:**
\`\`\`{{currentLanguage}}
{{selectedText}}
\`\`\`
{{else}}
**File Context:**
- Functions: {{functions}}
- Classes: {{classes}}
{{/if}}

Focus on:
1. Algorithmic complexity analysis
2. Memory usage optimization
3. I/O operation improvements
4. Caching opportunities
5. Concurrent/parallel processing potential
6. Framework-specific optimizations
7. Profiling recommendations`,
                PromptCategory.Optimization,
                [
                    new TemplateVariable('currentFile', 'string', 'unknown', 'Current file name'),
                    new TemplateVariable('currentLanguage', 'string', 'unknown', 'Programming language'),
                    new TemplateVariable('projectType', 'string', 'unknown', 'Project type'),
                    new TemplateVariable('selectedText', 'string', '', 'Selected code text'),
                    new TemplateVariable('functions', 'string', '', 'Functions in current file'),
                    new TemplateVariable('classes', 'string', '', 'Classes in current file')
                ]
            ),

            // Refactoring suggestions template
            new PromptTemplate(
                'refactoring-suggestions',
                'Refactoring Suggestions',
                `Please suggest refactoring improvements for this code:

**File:** {{currentFile}}
**Language:** {{currentLanguage}}
**Project Type:** {{projectType}}

{{#if selectedText}}
**Code to Refactor:**
\`\`\`{{currentLanguage}}
{{selectedText}}
\`\`\`
{{else}}
**File Overview:**
- Functions: {{functions}}
- Classes: {{classes}}
- Key Imports: {{imports}}
{{/if}}

Please suggest:
1. Code structure improvements
2. Design pattern applications
3. Method extraction opportunities
4. Variable/function naming improvements
5. Duplicate code elimination
6. Separation of concerns enhancements
7. SOLID principles application`,
                PromptCategory.General,
                [
                    new TemplateVariable('currentFile', 'string', 'unknown', 'Current file name'),
                    new TemplateVariable('currentLanguage', 'string', 'unknown', 'Programming language'),
                    new TemplateVariable('projectType', 'string', 'unknown', 'Project type'),
                    new TemplateVariable('selectedText', 'string', '', 'Selected code text'),
                    new TemplateVariable('functions', 'string', '', 'Functions in current file'),
                    new TemplateVariable('classes', 'string', '', 'Classes in current file'),
                    new TemplateVariable('imports', 'string', '', 'Import statements')
                ]
            ),

            // Documentation help template
            new PromptTemplate(
                'documentation-help',
                'Documentation Assistant',
                `Please help create comprehensive documentation for this code:

**File:** {{currentFile}}
**Language:** {{currentLanguage}}
**Project:** {{projectType}}

{{#if selectedText}}
**Code to Document:**
\`\`\`{{currentLanguage}}
{{selectedText}}
\`\`\`
{{else}}
**File Structure:**
- Functions: {{functions}}
- Classes: {{classes}}
{{/if}}

Please provide:
1. Clear description of functionality
2. Parameter and return value documentation
3. Usage examples
4. Integration notes
5. API documentation format
6. Inline comment suggestions
7. README section recommendations`,
                PromptCategory.Documentation,
                [
                    new TemplateVariable('currentFile', 'string', 'unknown', 'Current file name'),
                    new TemplateVariable('currentLanguage', 'string', 'unknown', 'Programming language'),
                    new TemplateVariable('projectType', 'string', 'unknown', 'Project type'),
                    new TemplateVariable('selectedText', 'string', '', 'Selected code text'),
                    new TemplateVariable('functions', 'string', '', 'Functions in current file'),
                    new TemplateVariable('classes', 'string', '', 'Classes in current file')
                ]
            )
        ];
    }

    /**
     * Adds a custom template to the available templates
     */
    addTemplate(template: PromptTemplate): void {
        const existingIndex = this.defaultTemplates.findIndex(t => t.id === template.id);
        if (existingIndex >= 0) {
            this.defaultTemplates[existingIndex] = template;
        } else {
            this.defaultTemplates.push(template);
        }
    }

    /**
     * Removes a template by ID
     */
    removeTemplate(templateId: TemplateId): boolean {
        const index = this.defaultTemplates.findIndex(t => t.id === templateId);
        if (index >= 0) {
            this.defaultTemplates.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Gets a template by ID
     */
    getTemplate(templateId: TemplateId): PromptTemplate | null {
        return this.defaultTemplates.find(t => t.id === templateId) || null;
    }

    /**
     * Updates the code analyzer instance
     */
    setCodeAnalyzer(analyzer: CodeContextAnalyzer): void {
        // This would be used for dependency injection in tests
    }
}
