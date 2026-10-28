/**
 * Vera Clause Matcher
 *
 * Enhanced clause reference matching and normalization.
 * Handles variations like:
 * - "8.7" → matches "8.7", "8.7.1", "8.7.2", etc.
 * - "21.137(n)" → extracts main clause "21.137" and letter "n"
 * - "Clause 8.7" → normalizes to "8.7"
 * - "8.7.0" → normalizes to "8.7"
 *
 * 100% internal - no external dependencies.
 */
export interface NormalizedClause {
    normalized: string;
    mainClause: string;
    subClause?: string;
    letter?: string;
    parentClause?: string;
    fullReference: string;
}
export declare class VeraClauseMatcher {
    /**
     * Normalize clause reference to standard format
     *
     * Examples:
     * - "8.7" → { normalized: "8.7", mainClause: "8.7" }
     * - "Clause 8.7" → { normalized: "8.7", mainClause: "8.7" }
     * - "8.7.1" → { normalized: "8.7.1", mainClause: "8.7", subClause: "8.7.1" }
     * - "21.137(n)" → { normalized: "21.137(n)", mainClause: "21.137", letter: "n" }
     * - "8.7.0" → { normalized: "8.7", mainClause: "8.7" }
     */
    static normalizeClauseRef(rawRef: string): NormalizedClause;
    /**
     * Extract all clause references from text
     */
    static extractClauseReferences(text: string): NormalizedClause[];
    /**
     * Build SQL WHERE clause for matching clause references
     * Returns SQL pattern and parameters for flexible matching
     */
    static buildClauseMatchQuery(normalized: NormalizedClause): {
        patterns: string[];
        params: string[];
    };
    /**
     * Check if two clause references are related (parent/child or same)
     */
    static areRelated(clause1: string, clause2: string): boolean;
    /**
     * Get clause hierarchy (all related clauses)
     */
    static getClauseHierarchy(clauseRef: string): {
        main: string;
        parent?: string;
        children: string[];
        siblings: string[];
    };
}
//# sourceMappingURL=VeraClauseMatcher.d.ts.map