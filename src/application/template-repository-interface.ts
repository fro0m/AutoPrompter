import { PromptTemplate } from '../domain/value-objects';
import { TemplateId, PromptCategory } from '../domain/types';

/**
 * Template search criteria for filtering templates
 */
export interface TemplateSearchCriteria {
    category?: PromptCategory;
    name?: string;
    contentContains?: string;
    tags?: string[];
}

/**
 * Template metadata for additional information
 */
export interface TemplateMetadata {
    id: TemplateId;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    author?: string;
    description?: string;
    tags: string[];
    isBuiltIn: boolean;
    usageCount: number;
    lastUsed?: Date;
}

/**
 * Template statistics for analytics
 */
export interface TemplateStats {
    totalTemplates: number;
    templatesByCategory: Map<PromptCategory, number>;
    mostUsedTemplates: Array<{ template: PromptTemplate; usageCount: number }>;
    recentlyUsedTemplates: Array<{ template: PromptTemplate; lastUsed: Date }>;
}

/**
 * Repository interface for managing prompt templates
 */
export interface ITemplateRepository {
    /**
     * Finds a template by its ID
     */
    findById(id: TemplateId): Promise<PromptTemplate | null>;

    /**
     * Finds all templates matching the search criteria
     */
    findByCriteria(criteria: TemplateSearchCriteria): Promise<PromptTemplate[]>;

    /**
     * Gets all templates
     */
    findAll(): Promise<PromptTemplate[]>;

    /**
     * Gets templates by category
     */
    findByCategory(category: PromptCategory): Promise<PromptTemplate[]>;

    /**
     * Saves a template (create or update)
     */
    save(template: PromptTemplate): Promise<void>;

    /**
     * Deletes a template by ID
     */
    deleteById(id: TemplateId): Promise<boolean>;

    /**
     * Checks if a template exists
     */
    exists(id: TemplateId): Promise<boolean>;

    /**
     * Gets template metadata
     */
    getMetadata(id: TemplateId): Promise<TemplateMetadata | null>;

    /**
     * Updates template metadata
     */
    updateMetadata(id: TemplateId, metadata: Partial<TemplateMetadata>): Promise<void>;

    /**
     * Records template usage for analytics
     */
    recordUsage(id: TemplateId): Promise<void>;

    /**
     * Gets template statistics
     */
    getStatistics(): Promise<TemplateStats>;

    /**
     * Exports all templates
     */
    exportTemplates(): Promise<Array<{ template: PromptTemplate; metadata: TemplateMetadata }>>;

    /**
     * Imports templates
     */
    importTemplates(data: Array<{ template: PromptTemplate; metadata?: Partial<TemplateMetadata> }>): Promise<void>;

    /**
     * Gets built-in templates
     */
    getBuiltInTemplates(): Promise<PromptTemplate[]>;

    /**
     * Resets to default templates
     */
    resetToDefaults(): Promise<void>;
}
