/**
 * Vera Quality Ontology Service
 *
 * Provides structured access to Quality concepts, tools, documents, processes, roles,
 * and their relationships. This gives Vera a "mental map" of Quality domain knowledge.
 */
export interface QualityConcept {
    id: string;
    name: string;
    category: string;
    description: string;
    aliases: string[];
    domainTags: string[];
    standardCodes: string[];
    examples?: string[];
}
export interface QualityConceptRelation {
    id: string;
    sourceConcept: QualityConcept;
    targetConcept: QualityConcept;
    relationType: string;
    metadata?: Record<string, any>;
}
/**
 * Get a concept by name
 */
export declare function getConceptByName(name: string): Promise<QualityConcept | null>;
/**
 * Find related concepts
 */
export declare function findRelatedConcepts(conceptName: string, relationType?: string): Promise<QualityConceptRelation[]>;
/**
 * Search concepts by keyword
 */
export declare function searchConcepts(keyword: string, category?: string): Promise<QualityConcept[]>;
/**
 * Get concepts by category
 */
export declare function getConceptsByCategory(category: string): Promise<QualityConcept[]>;
/**
 * Build ontology context for LLM prompts
 */
export declare function buildOntologyContext(conceptNames: string[]): Promise<string>;
//# sourceMappingURL=VeraQualityOntologyService.d.ts.map