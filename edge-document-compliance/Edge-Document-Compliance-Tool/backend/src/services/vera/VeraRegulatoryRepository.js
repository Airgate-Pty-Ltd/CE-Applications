/**
 * Vera Regulatory Repository
 *
 * Specialized repository for querying regulatory standards and clauses.
 * Handles FAA Part 21.137, CASA CASRS, EASA, UK CAA, FDA 21 CFR Part 11, etc.
 *
 * 100% internal - no external LLM calls.
 */
import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import { VeraClauseMatcher } from './VeraClauseMatcher.js';
import { VeraCacheService } from './VeraCacheService.js';
export class VeraRegulatoryRepository {
    /**
     * Find regulatory section text (e.g., FAA 21.137(n), CASA Part 145)
     */
    async findRegSectionText(standardCode, sectionRef) {
        const cacheKey = `reg:${standardCode}:${sectionRef}`;
        return VeraCacheService.getOrSet(cacheKey, async () => {
            try {
                const normalized = VeraClauseMatcher.normalizeClauseRef(sectionRef);
                // Try compliance_requirements first (structured data)
                const reqResult = await queryPostgres(`SELECT standard_code, clause_reference, requirement_text, metadata
           FROM public.compliance_requirements
           WHERE standard_code = $1
             AND (clause_reference = $2 
                  OR clause_reference LIKE $3
                  OR clause_reference ILIKE $4)
           ORDER BY 
             CASE 
               WHEN clause_reference = $2 THEN 1
               WHEN clause_reference LIKE $3 THEN 2
               ELSE 3
             END
           LIMIT 5`, [
                    standardCode,
                    sectionRef,
                    `${normalized.mainClause}%`,
                    `%${sectionRef}%`
                ]).catch(() => ({ rows: [] }));
                const sections = reqResult.rows.map((r) => ({
                    standardCode: r.standard_code,
                    sectionRef: r.clause_reference,
                    contentText: r.requirement_text || '',
                    metadata: r.metadata || {},
                    source: 'compliance_requirements'
                }));
                // Also check document_content_for_learning (ingested content)
                const docResult = await queryEdcatAI(`SELECT standard_code, content_text, metadata
           FROM edcat.document_content_for_learning
           WHERE standard_code = $1
             AND (content_text ILIKE $2 
                  OR content_text ILIKE $3
                  OR metadata->>'clause_reference' = $4)
           ORDER BY 
             CASE quality
               WHEN 'approved' THEN 1
               ELSE 2
             END,
             word_count DESC
           LIMIT 5`, [
                    standardCode,
                    `%${sectionRef}%`,
                    `%${normalized.mainClause}%`,
                    sectionRef
                ]).catch(() => ({ rows: [] }));
                for (const row of docResult.rows) {
                    sections.push({
                        standardCode: row.standard_code,
                        sectionRef: sectionRef,
                        contentText: row.content_text || '',
                        metadata: row.metadata || {},
                        source: 'document_content_for_learning'
                    });
                }
                return sections;
            }
            catch (error) {
                console.error('[VeraRegulatoryRepository] Error finding section:', error.message);
                return [];
            }
        }, 10 * 60 * 1000); // 10 minute cache
    }
    /**
     * Get all clauses for a regulatory standard
     */
    async getAllRegulatoryClauses(standardCode) {
        const cacheKey = `reg:clauses:${standardCode}`;
        return VeraCacheService.getOrSet(cacheKey, async () => {
            try {
                const result = await queryPostgres(`SELECT clause_reference, title, requirement_text
           FROM public.compliance_requirements
           WHERE standard_code = $1
           ORDER BY clause_reference
           LIMIT 100`, [standardCode]);
                return result.rows.map((r) => ({
                    reference: r.clause_reference,
                    title: r.title || r.clause_reference,
                    requirementText: r.requirement_text || ''
                }));
            }
            catch (error) {
                console.error('[VeraRegulatoryRepository] Error getting clauses:', error.message);
                return [];
            }
        }, 30 * 60 * 1000); // 30 minute cache
    }
    /**
     * Check if a regulatory standard is available
     */
    async isRegulatoryStandardAvailable(standardCode) {
        try {
            const result = await queryPostgres(`SELECT 1 FROM public.standards
         WHERE code = $1 AND sector = 'regulatory'
         LIMIT 1`, [standardCode]);
            return result.rows.length > 0;
        }
        catch (error) {
            return false;
        }
    }
}
//# sourceMappingURL=VeraRegulatoryRepository.js.map