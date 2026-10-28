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
export class VeraClauseMatcher {
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
    static normalizeClauseRef(rawRef) {
        if (!rawRef || typeof rawRef !== 'string') {
            return {
                normalized: '',
                mainClause: '',
                fullReference: ''
            };
        }
        // Clean up the input
        let cleaned = rawRef.trim();
        // Remove common prefixes
        cleaned = cleaned.replace(/^(clause|section|requirement|req|part)\s+/i, '');
        // Remove trailing punctuation
        cleaned = cleaned.replace(/[.,;:]+$/, '');
        // Handle lettered subclauses like "21.137(n)" or "21.137 n"
        const letteredMatch = cleaned.match(/^(\d+(?:\.\d+)*)\s*[\(]?([a-z])[\)]?$/i);
        if (letteredMatch) {
            const mainClause = letteredMatch[1];
            const letter = letteredMatch[2].toLowerCase();
            return {
                normalized: `${mainClause}(${letter})`,
                mainClause,
                letter,
                fullReference: cleaned
            };
        }
        // Handle numbered subclauses like "8.7.1" or "8.7.2.3"
        const parts = cleaned.split('.');
        if (parts.length === 0) {
            return {
                normalized: cleaned,
                mainClause: cleaned,
                fullReference: cleaned
            };
        }
        // Remove trailing zeros (e.g., "8.7.0" → "8.7")
        const filteredParts = parts.filter((part, index) => {
            if (index === parts.length - 1 && part === '0') {
                return false;
            }
            return true;
        });
        const mainClause = filteredParts.slice(0, 2).join('.');
        const normalized = filteredParts.join('.');
        const result = {
            normalized,
            mainClause,
            fullReference: cleaned
        };
        // If there are more than 2 parts, it's a subclause
        if (filteredParts.length > 2) {
            result.subClause = normalized;
        }
        // Determine parent clause (one level up)
        if (filteredParts.length > 2) {
            result.parentClause = filteredParts.slice(0, filteredParts.length - 1).join('.');
        }
        else if (filteredParts.length === 2) {
            // Parent of "8.7" would be "8" (section level)
            result.parentClause = filteredParts[0];
        }
        return result;
    }
    /**
     * Extract all clause references from text
     */
    static extractClauseReferences(text) {
        if (!text)
            return [];
        // Pattern for clause references: numbers with dots, optionally with letters
        const patterns = [
            /\b(\d+\.\d+(?:\.\d+)*)\s*\(([a-z])\)/gi, // "8.7(a)"
            /\b(\d+\.\d+(?:\.\d+)*)\s+([a-z])\b/gi, // "8.7 a"
            /\b(\d+\.\d+(?:\.\d+)*)\b/g, // "8.7" or "8.7.1"
            /(?:clause|section|requirement)\s+(\d+\.\d+(?:\.\d+)*)/gi // "Clause 8.7"
        ];
        const found = new Set();
        const results = [];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const ref = match[1] || match[0];
                if (!found.has(ref)) {
                    found.add(ref);
                    const normalized = this.normalizeClauseRef(ref);
                    if (normalized.normalized) {
                        results.push(normalized);
                    }
                }
            }
        }
        return results;
    }
    /**
     * Build SQL WHERE clause for matching clause references
     * Returns SQL pattern and parameters for flexible matching
     */
    static buildClauseMatchQuery(normalized) {
        const patterns = [];
        const params = [];
        // Exact match
        patterns.push('clause_reference = $' + (params.length + 1));
        params.push(normalized.normalized);
        // Main clause match (e.g., "8.7" matches "8.7", "8.7.1", "8.7.2")
        if (normalized.mainClause && normalized.mainClause !== normalized.normalized) {
            patterns.push('clause_reference LIKE $' + (params.length + 1));
            params.push(`${normalized.mainClause}.%`);
            patterns.push('clause_reference = $' + (params.length + 1));
            params.push(normalized.mainClause);
        }
        // Subclause match (if we have a subclause, also match parent)
        if (normalized.subClause) {
            patterns.push('clause_reference LIKE $' + (params.length + 1));
            params.push(`${normalized.subClause}%`);
        }
        // Lettered clause match
        if (normalized.letter) {
            // Match "21.137(n)", "21.137 n", "21.137n"
            const letterPatterns = [
                `${normalized.mainClause}(${normalized.letter})`,
                `${normalized.mainClause} ${normalized.letter}`,
                `${normalized.mainClause}${normalized.letter}`
            ];
            for (const pattern of letterPatterns) {
                patterns.push('clause_reference ILIKE $' + (params.length + 1));
                params.push(`%${pattern}%`);
            }
        }
        // Parent clause match (for hierarchical queries)
        if (normalized.parentClause && normalized.parentClause !== normalized.mainClause) {
            patterns.push('clause_reference LIKE $' + (params.length + 1));
            params.push(`${normalized.parentClause}.%`);
        }
        return { patterns, params };
    }
    /**
     * Check if two clause references are related (parent/child or same)
     */
    static areRelated(clause1, clause2) {
        const norm1 = this.normalizeClauseRef(clause1);
        const norm2 = this.normalizeClauseRef(clause2);
        // Exact match
        if (norm1.normalized === norm2.normalized) {
            return true;
        }
        // One is parent of the other
        if (norm1.mainClause === norm2.normalized || norm2.mainClause === norm1.normalized) {
            return true;
        }
        // Same main clause
        if (norm1.mainClause === norm2.mainClause) {
            return true;
        }
        // One is subclause of the other
        if (norm1.subClause && norm2.mainClause && norm1.subClause.startsWith(norm2.mainClause)) {
            return true;
        }
        if (norm2.subClause && norm1.mainClause && norm2.subClause.startsWith(norm1.mainClause)) {
            return true;
        }
        return false;
    }
    /**
     * Get clause hierarchy (all related clauses)
     */
    static getClauseHierarchy(clauseRef) {
        const normalized = this.normalizeClauseRef(clauseRef);
        return {
            main: normalized.mainClause,
            parent: normalized.parentClause,
            children: [], // Would need DB query to populate
            siblings: [] // Would need DB query to populate
        };
    }
}
//# sourceMappingURL=VeraClauseMatcher.js.map