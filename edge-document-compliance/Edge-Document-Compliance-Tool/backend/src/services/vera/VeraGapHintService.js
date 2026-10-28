/**
 * Vera Gap Hint Service
 *
 * Provides gap analysis hints and insights based on:
 * - Approved vs bad examples
 * - Previous gap analyses
 * - Common gap patterns
 * - Missing documentation
 *
 * 100% internal - no external LLM calls.
 */
import { queryPostgres } from '../../config/databases.js';
import { getApprovedExamplesForStandard, getBadExamplesForStandard, getLearningDocsByStandardCode } from './VeraLearningRepository.js';
export class VeraGapHintService {
    /**
     * Get gap hints for a standard/clause
     */
    static async getGapHints(params) {
        const { tenantId, standardCode, clauseRef, topic } = params;
        const hints = [];
        try {
            // Hint 1: Check for missing examples
            if (standardCode) {
                const [approved, bad, learningDocs] = await Promise.all([
                    getApprovedExamplesForStandard(standardCode, 5),
                    getBadExamplesForStandard(standardCode, 5),
                    getLearningDocsByStandardCode(standardCode, 10)
                ]);
                // Check if examples are sparse
                if (approved.length === 0 && bad.length === 0) {
                    hints.push({
                        type: 'missing_example',
                        severity: 'high',
                        standardCode,
                        clauseRef,
                        description: `No approved or bad examples found for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''}`,
                        recommendation: `Please upload at least one approved example and one bad example for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''} into your Examples/Approved and Examples/BAD folders, then run ingestion.`,
                        confidence: 0.9
                    });
                }
                else if (approved.length === 0) {
                    hints.push({
                        type: 'missing_example',
                        severity: 'medium',
                        standardCode,
                        clauseRef,
                        description: `No approved examples found for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''}`,
                        recommendation: `Please upload at least one approved example for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''} into your Examples/Approved folder.`,
                        confidence: 0.85
                    });
                }
                else if (bad.length === 0) {
                    hints.push({
                        type: 'missing_example',
                        severity: 'low',
                        standardCode,
                        clauseRef,
                        description: `No bad examples found for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''}`,
                        recommendation: `Consider uploading a bad example to help identify common mistakes for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''}.`,
                        confidence: 0.7
                    });
                }
                // Check if learning docs are sparse
                if (learningDocs.length === 0) {
                    hints.push({
                        type: 'missing_documentation',
                        severity: 'high',
                        standardCode,
                        clauseRef,
                        description: `No learning documents found for ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''}`,
                        recommendation: `Please upload the standard document or regulatory text for ${standardCode} into your Requirements/Standards or Requirements/Regulatory folder.`,
                        confidence: 0.9
                    });
                }
            }
            // Hint 2: Check previous gap analyses
            if (standardCode && tenantId) {
                const gapResult = await queryPostgres(`SELECT id, standard_code, clause_reference, gap_type, severity, status
           FROM public.gap_analyses
           WHERE customer_id = $1
             AND standard_code = $2
             ${clauseRef ? `AND clause_reference LIKE $3` : ''}
           ORDER BY created_at DESC
           LIMIT 5`, clauseRef
                    ? [tenantId, standardCode, `%${clauseRef}%`]
                    : [tenantId, standardCode]).catch(() => ({ rows: [] }));
                for (const gap of gapResult.rows) {
                    if (gap.status !== 'resolved') {
                        hints.push({
                            type: 'previous_gap',
                            severity: gap.severity || 'medium',
                            standardCode: gap.standard_code,
                            clauseRef: gap.clause_reference,
                            description: `Previous gap analysis identified: ${gap.gap_type || 'gap'} in ${gap.standard_code}${gap.clause_reference ? ` clause ${gap.clause_reference}` : ''}`,
                            recommendation: `Review and address the previously identified gap. Consider uploading updated procedures or documentation.`,
                            confidence: 0.8
                        });
                    }
                }
            }
            // Hint 3: Common gap patterns (based on bad examples)
            if (standardCode) {
                const badExamples = await getBadExamplesForStandard(standardCode, 10);
                if (badExamples.length > 0) {
                    // Analyze common patterns in bad examples
                    const commonIssues = this.analyzeBadExamplePatterns(badExamples);
                    if (commonIssues.length > 0) {
                        hints.push({
                            type: 'common_pattern',
                            severity: 'medium',
                            standardCode,
                            clauseRef,
                            description: `Common issues found in bad examples for ${standardCode}: ${commonIssues.slice(0, 3).join(', ')}`,
                            recommendation: `Ensure your procedures address: ${commonIssues.slice(0, 3).join(', ')}. Review approved examples for best practices.`,
                            confidence: 0.75
                        });
                    }
                }
            }
            // Sort by severity and confidence
            const severityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
            hints.sort((a, b) => {
                const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
                if (severityDiff !== 0)
                    return severityDiff;
                return b.confidence - a.confidence;
            });
            return hints;
        }
        catch (error) {
            console.error('[VeraGapHintService] Error getting gap hints:', error.message);
            return [];
        }
    }
    /**
     * Analyze bad examples to find common patterns
     */
    static analyzeBadExamplePatterns(badExamples) {
        const issues = [];
        const content = badExamples.map(e => e.content_text.toLowerCase()).join(' ');
        // Common gap patterns
        const patterns = [
            { pattern: /(?:missing|lack|no|absent)\s+(?:authority|approval|signature|review)/i, issue: 'Missing approval authority' },
            { pattern: /(?:missing|lack|no|absent)\s+(?:record|documentation|evidence)/i, issue: 'Missing records/documentation' },
            { pattern: /(?:missing|lack|no|absent)\s+(?:validation|verification|test)/i, issue: 'Missing validation/verification' },
            { pattern: /(?:missing|lack|no|absent)\s+(?:procedure|process|work instruction)/i, issue: 'Missing procedure definition' },
            { pattern: /(?:unclear|vague|ambiguous|not specified)/i, issue: 'Unclear requirements' },
            { pattern: /(?:incomplete|partial|not fully)/i, issue: 'Incomplete implementation' },
            { pattern: /(?:not traceable|no traceability)/i, issue: 'Lack of traceability' },
            { pattern: /(?:not controlled|no control)/i, issue: 'Lack of control' }
        ];
        for (const { pattern, issue } of patterns) {
            if (pattern.test(content) && !issues.includes(issue)) {
                issues.push(issue);
            }
        }
        return issues;
    }
    /**
     * Format gap hints as user-friendly text
     */
    static formatGapHints(hints) {
        if (hints.length === 0) {
            return '';
        }
        const parts = [];
        parts.push('\n**Gap Analysis Insights:**\n');
        for (const hint of hints.slice(0, 5)) { // Limit to top 5
            const severityEmoji = hint.severity === 'high' ? '🔴' : hint.severity === 'medium' ? '🟡' : '🟢';
            parts.push(`${severityEmoji} **${hint.description}**`);
            parts.push(`   → ${hint.recommendation}\n`);
        }
        return parts.join('\n');
    }
}
//# sourceMappingURL=VeraGapHintService.js.map