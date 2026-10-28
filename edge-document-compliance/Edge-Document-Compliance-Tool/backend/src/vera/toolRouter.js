/**
 * Tool Router
 * Routes tasks to appropriate analysis engines and tools
 */
// @ts-ignore - JavaScript module without types
import { queryPostgres } from '../config/databases.js';
/**
 * Route to standards parser
 */
export async function routeToStandardsParser(standardId, options = {}) {
    try {
        // Call internal parse API
        const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5000';
        const response = await fetch(`${baseUrl}/api/parse/standard/${standardId}${options.forceReparse ? '?force=true' : ''}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        return {
            success: result.success || false,
            data: result,
            reasoning: result.success
                ? `Parsed standard ${standardId} and extracted ${result.requirementsCount || 0} requirements.`
                : `Failed to parse standard: ${result.error || 'Unknown error'}`
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message,
            reasoning: `Error calling parse API: ${error.message}`
        };
    }
}
/**
 * Route to gap analysis engine
 */
export async function routeToGapAnalysis(standardId, documentIds, options = {}) {
    try {
        // Get requirements for the standard
        const requirementsResult = await queryPostgres(`SELECT id, clause_number, requirement_text, clause_title
       FROM public.parsed_requirements
       WHERE standard_id = $1 AND is_in_scope = true
       ORDER BY clause_number
       LIMIT 500`, [standardId]);
        if (requirementsResult.rows.length === 0) {
            return {
                success: false,
                error: 'No requirements found for this standard',
                reasoning: 'The standard must be parsed before gap analysis can be performed.'
            };
        }
        // Get documents (if customerId provided)
        let documents = [];
        if (options.customerId && documentIds.length > 0) {
            // Fetch documents from customer schema
            // Implementation depends on your document storage structure
        }
        // Perform gap analysis
        // This would call your actual gap analysis engine
        const gaps = []; // Placeholder - integrate with actual gap analysis engine
        return {
            success: true,
            data: {
                standardId,
                requirementsCount: requirementsResult.rows.length,
                documentsAnalyzed: documents.length,
                gapsFound: gaps.length,
                gaps
            },
            reasoning: `Analyzed ${requirementsResult.rows.length} requirements against ${documents.length} documents and found ${gaps.length} gaps.`
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message,
            reasoning: `Error performing gap analysis: ${error.message}`
        };
    }
}
/**
 * Route to requirement comparison engine
 */
export async function routeToRequirementCompare(requirementId1, requirementId2) {
    try {
        const [req1, req2] = await Promise.all([
            queryPostgres('SELECT * FROM public.parsed_requirements WHERE id = $1', [requirementId1]),
            queryPostgres('SELECT * FROM public.parsed_requirements WHERE id = $1', [requirementId2])
        ]);
        if (req1.rows.length === 0 || req2.rows.length === 0) {
            return {
                success: false,
                error: 'One or both requirements not found',
                reasoning: 'Cannot compare requirements that do not exist in the database.'
            };
        }
        const r1 = req1.rows[0];
        const r2 = req2.rows[0];
        // Simple comparison logic (can be enhanced)
        const similarities = {
            clauseStructure: r1.clause_number === r2.clause_number ? 1.0 : 0.0,
            textSimilarity: calculateTextSimilarity(r1.requirement_text, r2.requirement_text),
            keywordOverlap: calculateKeywordOverlap(r1.requirement_text, r2.requirement_text)
        };
        return {
            success: true,
            data: {
                requirement1: r1,
                requirement2: r2,
                similarities,
                differences: identifyDifferences(r1, r2)
            },
            reasoning: `Compared requirements ${requirementId1} and ${requirementId2}. Found ${Object.keys(similarities).length} similarity metrics.`
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message,
            reasoning: `Error comparing requirements: ${error.message}`
        };
    }
}
/**
 * Route to procedure comparison engine
 */
export async function routeToProcedureCompare(procedureId1, procedureId2) {
    try {
        // Similar to requirement compare but for procedures
        // Implementation depends on your procedure storage structure
        return {
            success: false,
            error: 'Not implemented',
            reasoning: 'Procedure comparison is not yet implemented.'
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message,
            reasoning: `Error comparing procedures: ${error.message}`
        };
    }
}
/**
 * Route to regulatory lookup engine
 */
export async function routeToRegulatoryLookup(regulatoryCode, partNumber) {
    try {
        // Check if regulation exists in database
        const standardResult = await queryPostgres(`SELECT * FROM public.standards
       WHERE code ILIKE $1 OR name ILIKE $2
       LIMIT 1`, [`%${regulatoryCode}%`, `%${regulatoryCode}%`]);
        if (standardResult.rows.length > 0) {
            const standard = standardResult.rows[0];
            return {
                success: true,
                data: {
                    found: true,
                    standard,
                    source: 'database'
                },
                reasoning: `Found ${regulatoryCode} in database with ${standard.total_requirements || 0} requirements.`
            };
        }
        // If not in database, trigger research
        return {
            success: false,
            error: 'Regulation not found in database',
            reasoning: `${regulatoryCode} is not in the database. Research functionality can be triggered to find it online.`
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message,
            reasoning: `Error looking up regulation: ${error.message}`
        };
    }
}
// Helper functions
function calculateTextSimilarity(text1, text2) {
    // Simple similarity calculation (can be enhanced with proper NLP)
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
}
function calculateKeywordOverlap(text1, text2) {
    const keywords = ['shall', 'must', 'should', 'require', 'ensure', 'establish', 'maintain'];
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const keywords1 = words1.filter(w => keywords.includes(w));
    const keywords2 = words2.filter(w => keywords.includes(w));
    const overlap = keywords1.filter(k => keywords2.includes(k));
    return keywords1.length > 0 ? overlap.length / keywords1.length : 0;
}
function identifyDifferences(req1, req2) {
    const differences = [];
    if (req1.clause_number !== req2.clause_number) {
        differences.push(`Clause numbers differ: ${req1.clause_number} vs ${req2.clause_number}`);
    }
    if (req1.requirement_text !== req2.requirement_text) {
        differences.push('Requirement text differs');
    }
    return differences;
}
export default {
    routeToStandardsParser,
    routeToGapAnalysis,
    routeToRequirementCompare,
    routeToProcedureCompare,
    routeToRegulatoryLookup
};
//# sourceMappingURL=toolRouter.js.map