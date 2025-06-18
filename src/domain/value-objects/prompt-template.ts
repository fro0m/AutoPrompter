import { TemplateId, PromptCategory } from '../types';

/**
 * TemplateVariable Value Object
 * Represents a template variable with name, type, and default value
 */
export class TemplateVariable {
    constructor(
        public readonly name: string,
        public readonly type: 'string' | 'number' | 'boolean',
        public readonly defaultValue: string | number | boolean,
        public readonly description?: string
    ) {
        if (!name.trim()) {
            throw new Error('Template variable name cannot be empty');
        }
        this.validateDefaultValue();
    }

    private validateDefaultValue(): void {
        const actualType = typeof this.defaultValue;
        if (actualType !== this.type) {
            throw new Error(`Default value type '${actualType}' does not match declared type '${this.type}'`);
        }
    }

    equals(other: TemplateVariable): boolean {
        return this.name === other.name &&
               this.type === other.type &&
               this.defaultValue === other.defaultValue;
    }

    toString(): string {
        return `{{${this.name}}}`;
    }
}

/**
 * RenderContext Interface
 * Provides context values for template rendering
 */
export interface RenderContext {
    getValue(variableName: string): string | number | boolean | undefined;
    hasValue(variableName: string): boolean;
}

/**
 * RenderedPrompt Value Object
 * Represents a rendered prompt with content and metadata
 */
export class RenderedPrompt {
    constructor(
        public readonly content: string,
        public readonly templateId: TemplateId,
        public readonly renderedAt: Date = new Date()
    ) {
        if (!content.trim()) {
            throw new Error('Rendered prompt content cannot be empty');
        }
    }

    equals(other: RenderedPrompt): boolean {
        return this.content === other.content &&
               this.templateId === other.templateId;
    }

    toString(): string {
        return this.content;
    }
}

/**
 * PromptTemplate Value Object
 * Represents an immutable prompt template with rendering capabilities
 */
export class PromptTemplate {
    constructor(
        public readonly id: TemplateId,
        public readonly name: string,
        public readonly content: string,
        public readonly category: PromptCategory,
        public readonly variables: TemplateVariable[]
    ) {
        if (!name.trim()) {
            throw new Error('Template name cannot be empty');
        }
        if (!content.trim()) {
            throw new Error('Template content cannot be empty');
        }
        this.validateVariables();
    }

    private validateVariables(): void {
        const variableNames = new Set<string>();
        for (const variable of this.variables) {
            if (variableNames.has(variable.name)) {
                throw new Error(`Duplicate variable name: ${variable.name}`);
            }
            variableNames.add(variable.name);
        }
    }

    render(context: RenderContext): RenderedPrompt {
        let renderedContent = this.content;

        for (const variable of this.variables) {
            const value = context.getValue(variable.name) ?? variable.defaultValue;
            const stringValue = String(value);
            
            // Replace all occurrences of the variable placeholder
            const placeholder = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
            renderedContent = renderedContent.replace(placeholder, stringValue);
        }

        return new RenderedPrompt(renderedContent, this.id);
    }

    hasVariable(variableName: string): boolean {
        return this.variables.some(v => v.name === variableName);
    }

    getVariable(variableName: string): TemplateVariable | undefined {
        return this.variables.find(v => v.name === variableName);
    }

    getVariableNames(): string[] {
        return this.variables.map(v => v.name);
    }

    equals(other: PromptTemplate): boolean {
        return this.id === other.id &&
               this.name === other.name &&
               this.content === other.content &&
               this.category === other.category &&
               this.variables.length === other.variables.length &&
               this.variables.every((v, i) => v.equals(other.variables[i]));
    }

    toString(): string {
        return `${this.name} (${this.category})`;
    }
}
