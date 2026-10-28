/**
 * Vera Knowledge Graph Service
 *
 * Manages relationships between standards, clauses, and requirements.
 * Enables cross-standard reasoning and relationship queries.
 *
 * 100% internal - no external LLM calls.
 */
export interface KnowledgeRelationship {
    id: string;
    sourceType: 'standard' | 'clause' | 'requirement';
    sourceId?: string;
    sourceCode: string;
    targetType: 'standard' | 'clause' | 'requirement';
    targetId?: string;
    targetCode: string;
    relationshipType: 'similar_to' | 'derived_from' | 'supersedes' | 'references' | 'conflicts_with' | 'related_to' | 'maps_to';
    confidence: number;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}
export declare class VeraKnowledgeGraph {
    /**
     * Get related standards for a given standard
     */
    static getRelatedStandards(standardCode: string, minConfidence?: number): Promise<KnowledgeRelationship[]>;
    /**
     * Get related clauses for a standard/clause
     */
    static getRelatedClauses(standardCode: string, clauseRef: string, minConfidence?: number): Promise<KnowledgeRelationship[]>;
    /**
     * Add a relationship
     */
    static addRelationship(params: {
        sourceCode: string;
        targetCode: string;
        sourceType: 'standard' | 'clause' | 'requirement';
        targetType: 'standard' | 'clause' | 'requirement';
        relationshipType: KnowledgeRelationship['relationshipType'];
        confidence?: number;
        metadata?: any;
        sourceId?: string;
        targetId?: string;
    }): Promise<string>;
    /**
     * Seed initial relationships (known truths)
     */
    static seedInitialRelationships(): Promise<void>;
    /**
     * Find all relationships for a code (both as source and target)
     */
    static findAllRelationships(code: string): Promise<{
        asSource: KnowledgeRelationship[];
        asTarget: KnowledgeRelationship[];
    }>;
    /**
     * Map database rows to Relationship objects
     */
    private static mapRowsToRelationships;
    /**
     * Infer relationships from document content (heuristic)
     */
    static inferRelationshipsFromContent(standardCode: string, content: string): Promise<void>;
}
//# sourceMappingURL=VeraKnowledgeGraph.d.ts.map