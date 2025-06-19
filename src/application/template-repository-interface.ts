import { PromptTemplate } from '../domain/value-objects';
import { TemplateId, PromptCategory } from '../domain/types';

/**
 * Template search criteria for filtering templates
 */
export interface TemplateSearchCriteria {
    category?: PromptCategory;
    namePattern?: string;
    tags?: string[];
    isBuiltIn?: boolean;
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


/**
 * Repository interface for managing prompt templates
 */
export interface ITemplateRepository {
    /**
     * Finds a template by its ID
     */
    findById(id: TemplateId): Promise<PromptTemplate | null>;

    /**
     * Gets all templates
     */
    findAll(): Promise<PromptTemplate[]>;

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
     * Resets to default templates
     */
    resetToDefaults(): Promise<void>;
}
