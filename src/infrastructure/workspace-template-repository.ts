import * as vscode from 'vscode';
import { PromptTemplate, TemplateVariable } from '../domain/value-objects';
import { TemplateId, PromptCategory } from '../domain/types';
import { 
    ITemplateRepository,
    TemplateMetadata
} from '../application/template-repository-interface';

/**
 * Serializable template data for storage
 */
interface SerializableTemplate {
    id: string;
    name: string;
    content: string;
    category: string;
    variables: Array<{
        name: string;
        type: 'string' | 'number' | 'boolean';
        defaultValue: string | number | boolean;
        description?: string;
    }>;
}

/**
 * VS Code workspace-based template repository implementation
 */
export class WorkspaceTemplateRepository implements ITemplateRepository {

    // ITemplateSelectionService implementation
    async selectBestTemplate(): Promise<PromptTemplate | null> {
        // For now, just return the first available template as a stub
        const templates = await this.findAll();
        return templates.length > 0 ? templates[0] : null;
    }

    async getAvailableTemplates(): Promise<PromptTemplate[]> {
        return this.findAll();
    }
    private static readonly TEMPLATES_CONFIG_KEY = 'autoprompter.templates';
    private static readonly METADATA_CONFIG_KEY = 'autoprompter.templateMetadata';
    
    private templates: Map<TemplateId, PromptTemplate> = new Map();
    private metadata: Map<TemplateId, TemplateMetadata> = new Map();
    private isInitialized: boolean = false;

    constructor() {
        this.initializeBuiltInTemplates();
    }

    /**
     * Initializes the repository by loading data from workspace configuration
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        await this.loadFromWorkspace();
        this.isInitialized = true;
    }

    async findById(id: TemplateId): Promise<PromptTemplate | null> {
        await this.ensureInitialized();
        return this.templates.get(id) || null;
    }



    async findAll(): Promise<PromptTemplate[]> {
        await this.ensureInitialized();
        return Array.from(this.templates.values());
    }



    async save(template: PromptTemplate): Promise<void> {
        await this.ensureInitialized();
        
        const existingMetadata = this.metadata.get(template.id);
        const now = new Date();
        
        this.templates.set(template.id, template);
        
        // Update or create metadata
        const metadata: TemplateMetadata = {
            id: template.id,
            createdAt: existingMetadata?.createdAt || now,
            updatedAt: now,
            version: (existingMetadata?.version || 0) + 1,
            author: existingMetadata?.author,
            description: existingMetadata?.description,
            tags: existingMetadata?.tags || [],
            isBuiltIn: existingMetadata?.isBuiltIn || false,
            usageCount: existingMetadata?.usageCount || 0,
            lastUsed: existingMetadata?.lastUsed
        };
        
        this.metadata.set(template.id, metadata);
        
        await this.saveToWorkspace();
    }

    async deleteById(id: TemplateId): Promise<boolean> {
        await this.ensureInitialized();
        
        const templateMetadata = this.metadata.get(id);
        if (templateMetadata?.isBuiltIn) {
            throw new Error('Cannot delete built-in templates');
        }
        
        const deleted = this.templates.delete(id);
        if (deleted) {
            this.metadata.delete(id);
            await this.saveToWorkspace();
        }
        
        return deleted;
    }

    async exists(id: TemplateId): Promise<boolean> {
        await this.ensureInitialized();
        return this.templates.has(id);
    }















    async resetToDefaults(): Promise<void> {
        // Clear existing data
        this.templates.clear();
        this.metadata.clear();
        
        // Reinitialize with built-in templates
        this.initializeBuiltInTemplates();
        
        await this.saveToWorkspace();
    }

    /**
     * Initializes built-in templates
     */
    private initializeBuiltInTemplates(): void {
        const builtInTemplates = this.createBuiltInTemplates();
        
        for (const template of builtInTemplates) {
            this.templates.set(template.id, template);
            
            const metadata: TemplateMetadata = {
                id: template.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1,
                author: 'AutoPrompter',
                description: `Built-in template for ${template.category}`,
                tags: [template.category, 'built-in'],
                isBuiltIn: true,
                usageCount: 0
            };
            
            this.metadata.set(template.id, metadata);
        }
    }

    /**
     * Creates the default built-in templates
     */
    private createBuiltInTemplates(): PromptTemplate[] {
        return [
            new PromptTemplate(
                'builtin-code-review',
                'Code Review Assistant',
                'Please review the following code and provide suggestions for improvement:\\n\\n{{code}}\\n\\nFocus on:\\n- Code quality and best practices\\n- Performance optimizations\\n- Security considerations\\n- Maintainability',
                PromptCategory.CodeReview,
                [
                    new TemplateVariable('code', 'string', '', 'The code to review')
                ]
            ),
            new PromptTemplate(
                'builtin-optimization',
                'Performance Optimization',
                'Analyze the following code for performance optimization opportunities:\\n\\n{{code}}\\n\\nConsider:\\n- Algorithm efficiency\\n- Memory usage\\n- Time complexity\\n- Resource utilization',
                PromptCategory.Optimization,
                [
                    new TemplateVariable('code', 'string', '', 'The code to optimize')
                ]
            ),
            new PromptTemplate(
                'builtin-documentation',
                'Documentation Generator',
                'Generate comprehensive documentation for the following code:\\n\\n{{code}}\\n\\nInclude:\\n- Function/class descriptions\\n- Parameter explanations\\n- Return value descriptions\\n- Usage examples',
                PromptCategory.Documentation,
                [
                    new TemplateVariable('code', 'string', '', 'The code to document')
                ]
            ),
            new PromptTemplate(
                'builtin-testing',
                'Test Case Generator',
                'Generate unit tests for the following code:\\n\\n{{code}}\\n\\nCreate tests that cover:\\n- Normal use cases\\n- Edge cases\\n- Error conditions\\n- Boundary conditions\\n\\nTest framework: {{framework}}',
                PromptCategory.Testing,
                [
                    new TemplateVariable('code', 'string', '', 'The code to test'),
                    new TemplateVariable('framework', 'string', 'Jest', 'Testing framework to use')
                ]
            ),
            new PromptTemplate(
                'builtin-debugging',
                'Debug Assistant',
                'Help debug the following code issue:\\n\\n**Code:**\\n{{code}}\\n\\n**Error/Issue:**\\n{{error}}\\n\\nPlease analyze and suggest solutions.',
                PromptCategory.Debugging,
                [
                    new TemplateVariable('code', 'string', '', 'The problematic code'),
                    new TemplateVariable('error', 'string', '', 'Error message or description of the issue')
                ]
            ),
            new PromptTemplate(
                'builtin-general',
                'General Code Assistant',
                'Help me with the following code-related question:\\n\\n{{question}}\\n\\n{{context}}',
                PromptCategory.General,
                [
                    new TemplateVariable('question', 'string', '', 'Your question or request'),
                    new TemplateVariable('context', 'string', '', 'Additional context (optional)')
                ]
            )
        ];
    }

    /**
     * Ensures the repository is initialized
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    /**
     * Loads templates and metadata from VS Code workspace configuration
     */
    private async loadFromWorkspace(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration();
            
            // Load templates
            const templatesData = config.get<SerializableTemplate[]>(WorkspaceTemplateRepository.TEMPLATES_CONFIG_KEY, []);
            for (const templateData of templatesData) {
                try {
                    const template = this.deserializeTemplate(templateData);
                    this.templates.set(template.id, template);
                } catch (error) {
                    console.error(`Failed to deserialize template ${templateData.id}:`, error);
                }
            }
            
            // Load metadata
            const metadataData = config.get<Record<string, TemplateMetadata>>(WorkspaceTemplateRepository.METADATA_CONFIG_KEY, {});
            for (const [id, metadata] of Object.entries(metadataData)) {
                this.metadata.set(id, {
                    ...metadata,
                    createdAt: new Date(metadata.createdAt),
                    updatedAt: new Date(metadata.updatedAt),
                    lastUsed: metadata.lastUsed ? new Date(metadata.lastUsed) : undefined
                });
            }
            
            console.log(`Loaded ${this.templates.size} templates from workspace configuration`);
        } catch (error) {
            console.error('Failed to load templates from workspace:', error);
        }
    }

    /**
     * Saves templates and metadata to VS Code workspace configuration
     */
    private async saveToWorkspace(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration();
            
            // Serialize templates
            const templatesData: SerializableTemplate[] = Array.from(this.templates.values()).map(template => 
                this.serializeTemplate(template)
            );
            
            // Serialize metadata
            const metadataData: Record<string, any> = {};
            for (const [id, metadata] of this.metadata) {
                metadataData[id] = {
                    ...metadata,
                    createdAt: metadata.createdAt.toISOString(),
                    updatedAt: metadata.updatedAt.toISOString(),
                    lastUsed: metadata.lastUsed?.toISOString()
                };
            }
            
            await config.update(WorkspaceTemplateRepository.TEMPLATES_CONFIG_KEY, templatesData, vscode.ConfigurationTarget.Workspace);
            await config.update(WorkspaceTemplateRepository.METADATA_CONFIG_KEY, metadataData, vscode.ConfigurationTarget.Workspace);
            
            console.log(`Saved ${this.templates.size} templates to workspace configuration`);
        } catch (error) {
            console.error('Failed to save templates to workspace:', error);
            throw error;
        }
    }

    /**
     * Serializes a template for storage
     */
    private serializeTemplate(template: PromptTemplate): SerializableTemplate {
        return {
            id: template.id,
            name: template.name,
            content: template.content,
            category: template.category,
            variables: template.variables.map(variable => ({
                name: variable.name,
                type: variable.type,
                defaultValue: variable.defaultValue,
                description: variable.description
            }))
        };
    }

    /**
     * Deserializes a template from storage
     */
    private deserializeTemplate(data: SerializableTemplate): PromptTemplate {
        const variables = data.variables.map(variableData => 
            new TemplateVariable(
                variableData.name,
                variableData.type as 'string' | 'number' | 'boolean',
                variableData.defaultValue,
                variableData.description
            )
        );
        
        return new PromptTemplate(
            data.id,
            data.name,
            data.content,
            data.category as PromptCategory,
            variables
        );
    }
}