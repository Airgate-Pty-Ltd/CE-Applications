/**
 * Vera Advanced Gap Analysis Engine
 * 
 * Performs structured, deeply reasoned gap analysis using gap rules,
 * text analysis, and LLM classification. Produces auditor-quality gap reports.
 * 
 * Phase 19: Advanced Gap Analysis Engine Upgrade
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import { getGapRule } from './VeraGapRulesService.js';
import { callVeraLLM, isLLMConfigured } from './VeraLLMBridge.js';
import { formatTeachingResponse, generateTeachingResponse } from './VeraTeachingFormatter.js';

export interface GapAnalysisResult {
  clauseRef: string;
  coverageRating: number; // 0.0 to 1.0
  status: 'fully_met' | 'partially_met' | 'not_met';
  narrative: string;
  missingElements: string[];
  recommendedActions: string[];
  evidenceFound: string[];
  evidenceMissing: string[];
}

export interface GapAnalysisReport {
  standardCode: string;
  clauses: GapAnalysisResult[];
  overallCoverage: number;
  criticalGaps: number;
  summary: string;
}

/**
 * Perform advanced gap analysis
 */
export async function performAdvancedGapAnalysis(params: {
  standardCode: string;
  clauseRefs?: string[];
  targetDocuments?: Array<{ id: string; content: string; type: string }>;
  tenantId?: string;
}): Promise<GapAnalysisReport> {
  try {
    const {
      standardCode,
      clauseRefs,
      targetDocuments = [],
      tenantId = '00000000-0000-0000-0000-000000000000'
    } = params;

    console.log(`[VeraGapEngine] Analyzing gaps for ${standardCode}${clauseRefs ? ` clauses ${clauseRefs.join(', ')}` : ''}`);

    // Get clauses to analyze
    const clausesToAnalyze = clauseRefs || await getClausesForStandard(standardCode);

    const gapResults: GapAnalysisResult[] = [];

    // Analyze each clause
    for (const clauseRef of clausesToAnalyze) {
      const gapResult = await analyzeClauseGap(
        standardCode,
        clauseRef,
        targetDocuments,
        tenantId
      );
      gapResults.push(gapResult);
    }

    // Calculate overall metrics
    const overallCoverage = gapResults.length > 0
      ? gapResults.reduce((sum, r) => sum + r.coverageRating, 0) / gapResults.length
      : 0;

    const criticalGaps = gapResults.filter(r => r.status === 'not_met' && r.coverageRating < 0.3).length;

    // Generate summary
    const summary = generateGapSummary(gapResults, overallCoverage, criticalGaps);

    return {
      standardCode,
      clauses: gapResults,
      overallCoverage,
      criticalGaps,
      summary
    };

  } catch (error: any) {
    console.error('[VeraGapEngine] Error performing gap analysis:', error.message);
    throw error;
  }
}

/**
 * Analyze gap for a single clause
 */
async function analyzeClauseGap(
  standardCode: string,
  clauseRef: string,
  targetDocuments: Array<{ id: string; content: string; type: string }>,
  tenantId: string
): Promise<GapAnalysisResult> {
  try {
    // Get gap rule for this clause
    const gapRule = await getGapRule(standardCode, clauseRef);

    // Get requirement text
    const requirement = await getRequirementText(standardCode, clauseRef);

    // Analyze documents against requirement
    const documentText = targetDocuments.map(d => d.content).join('\n\n');

    // Use LLM to classify coverage if available
    let coverageRating = 0.5;
    let status: 'fully_met' | 'partially_met' | 'not_met' = 'partially_met';
    let narrative = '';
    let missingElements: string[] = [];
    let evidenceFound: string[] = [];
    let evidenceMissing: string[] = [];

    if (isLLMConfigured() && requirement) {
      const analysis = await analyzeWithLLM(
        requirement,
        documentText,
        gapRule,
        standardCode,
        clauseRef
      );
      coverageRating = analysis.coverageRating;
      status = analysis.status;
      narrative = analysis.narrative;
      missingElements = analysis.missingElements;
      evidenceFound = analysis.evidenceFound;
      evidenceMissing = analysis.evidenceMissing;
    } else {
      // Fallback: Use rule-based analysis
      const ruleAnalysis = analyzeWithRules(documentText, gapRule, requirement);
      coverageRating = ruleAnalysis.coverageRating;
      status = ruleAnalysis.status;
      narrative = ruleAnalysis.narrative;
      missingElements = ruleAnalysis.missingElements;
      evidenceFound = ruleAnalysis.evidenceFound;
      evidenceMissing = ruleAnalysis.evidenceMissing;
    }

    // Generate recommended actions
    const recommendedActions = generateRecommendedActions(
      status,
      missingElements,
      gapRule,
      standardCode,
      clauseRef
    );

    return {
      clauseRef,
      coverageRating,
      status,
      narrative,
      missingElements,
      recommendedActions,
      evidenceFound,
      evidenceMissing
    };

  } catch (error: any) {
    console.error(`[VeraGapEngine] Error analyzing clause ${clauseRef}:`, error.message);
    return {
      clauseRef,
      coverageRating: 0,
      status: 'not_met',
      narrative: `Error analyzing this clause: ${error.message}`,
      missingElements: [],
      recommendedActions: ['Review this clause manually'],
      evidenceFound: [],
      evidenceMissing: []
    };
  }
}

/**
 * Analyze with LLM
 */
async function analyzeWithLLM(
  requirement: string,
  documentText: string,
  gapRule: any,
  standardCode: string,
  clauseRef: string
): Promise<{
  coverageRating: number;
  status: 'fully_met' | 'partially_met' | 'not_met';
  narrative: string;
  missingElements: string[];
  evidenceFound: string[];
  evidenceMissing: string[];
}> {
  const systemPrompt = `You are a lead auditor performing gap analysis. Analyze whether the provided documents meet the requirement.

Requirement (${standardCode} ${clauseRef}):
${requirement}

${gapRule ? `Mandatory elements to check:\n${gapRule.mandatoryElements.map((e: string) => `- ${e}`).join('\n')}` : ''}

Document content:
${documentText.substring(0, 3000)}

Provide a JSON response:
{
  "coverageRating": 0.0-1.0,
  "status": "fully_met" | "partially_met" | "not_met",
  "narrative": "Clear explanation of what is present and what is missing",
  "missingElements": ["element1", "element2"],
  "evidenceFound": ["evidence1", "evidence2"],
  "evidenceMissing": ["missing1", "missing2"]
}`;

  const llmResponse = await callVeraLLM({
    systemPrompt,
    contextBlocks: [],
    userMessage: `Analyze gap for ${standardCode} ${clauseRef}`,
    intent: 'gap_analysis',
    tenantId: '00000000-0000-0000-0000-000000000000'
  });

  if (!llmResponse || !llmResponse.answer) {
    throw new Error('LLM analysis failed');
  }

  // Parse JSON
  let jsonText = llmResponse.answer;
  const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  const analysis = JSON.parse(jsonText.trim());

  return {
    coverageRating: Math.max(0, Math.min(1, parseFloat(analysis.coverageRating || 0.5))),
    status: analysis.status || 'partially_met',
    narrative: analysis.narrative || '',
    missingElements: Array.isArray(analysis.missingElements) ? analysis.missingElements : [],
    evidenceFound: Array.isArray(analysis.evidenceFound) ? analysis.evidenceFound : [],
    evidenceMissing: Array.isArray(analysis.evidenceMissing) ? analysis.evidenceMissing : []
  };
}

/**
 * Analyze with rules (fallback)
 */
function analyzeWithRules(
  documentText: string,
  gapRule: any,
  requirement: string | null
): {
  coverageRating: number;
  status: 'fully_met' | 'partially_met' | 'not_met';
  narrative: string;
  missingElements: string[];
  evidenceFound: string[];
  evidenceMissing: string[];
} {
  const lowerDoc = documentText.toLowerCase();
  let foundCount = 0;
  const evidenceFound: string[] = [];
  const evidenceMissing: string[] = [];

  if (gapRule) {
    for (const element of gapRule.mandatoryElements) {
      if (lowerDoc.includes(element.toLowerCase())) {
        foundCount++;
        evidenceFound.push(element);
      } else {
        evidenceMissing.push(element);
      }
    }
  }

  const totalElements = gapRule?.mandatoryElements.length || 1;
  const coverageRating = totalElements > 0 ? foundCount / totalElements : 0.5;

  let status: 'fully_met' | 'partially_met' | 'not_met';
  if (coverageRating >= 0.8) {
    status = 'fully_met';
  } else if (coverageRating >= 0.4) {
    status = 'partially_met';
  } else {
    status = 'not_met';
  }

  const narrative = gapRule
    ? `Found ${foundCount} of ${totalElements} mandatory elements. ${evidenceMissing.length > 0 ? `Missing: ${evidenceMissing.join(', ')}` : 'All elements present.'}`
    : `Analyzed document against requirement. Coverage: ${(coverageRating * 100).toFixed(0)}%`;

  return {
    coverageRating,
    status,
    narrative,
    missingElements: evidenceMissing,
    evidenceFound,
    evidenceMissing
  };
}

/**
 * Get requirement text
 */
async function getRequirementText(standardCode: string, clauseRef: string): Promise<string | null> {
  try {
    const result = await queryPostgres(`
      SELECT requirement_text
      FROM public.parsed_requirements pr
      JOIN public.standards s ON pr.standard_id = s.standard_id
      WHERE s.code = $1 AND pr.clause_number = $2
      LIMIT 1
    `, [standardCode, clauseRef]);

    return result.rows.length > 0 ? result.rows[0].requirement_text : null;

  } catch (error: any) {
    console.error('[VeraGapEngine] Error getting requirement:', error.message);
    return null;
  }
}

/**
 * Get clauses for standard
 */
async function getClausesForStandard(standardCode: string): Promise<string[]> {
  try {
    const result = await queryPostgres(`
      SELECT DISTINCT clause_number
      FROM public.parsed_requirements pr
      JOIN public.standards s ON pr.standard_id = s.standard_id
      WHERE s.code = $1
      ORDER BY clause_number
      LIMIT 50
    `, [standardCode]);

    return result.rows.map(row => row.clause_number);

  } catch (error: any) {
    console.error('[VeraGapEngine] Error getting clauses:', error.message);
    return [];
  }
}

/**
 * Generate recommended actions
 */
function generateRecommendedActions(
  status: 'fully_met' | 'partially_met' | 'not_met',
  missingElements: string[],
  gapRule: any,
  standardCode: string,
  clauseRef: string
): string[] {
  const actions: string[] = [];

  if (status === 'not_met') {
    actions.push(`Develop and document procedures to address ${standardCode} ${clauseRef}`);
    if (missingElements.length > 0) {
      actions.push(`Specifically address: ${missingElements.slice(0, 3).join(', ')}`);
    }
    actions.push(`Train personnel on ${clauseRef} requirements`);
  } else if (status === 'partially_met') {
    actions.push(`Strengthen existing procedures for ${clauseRef}`);
    if (missingElements.length > 0) {
      actions.push(`Add missing elements: ${missingElements.slice(0, 2).join(', ')}`);
    }
    actions.push(`Review and update documentation`);
  } else {
    actions.push(`Maintain current implementation`);
    actions.push(`Periodically review for continued effectiveness`);
  }

  if (gapRule?.hints) {
    actions.push(gapRule.hints);
  }

  return actions;
}

/**
 * Generate gap summary
 */
function generateGapSummary(
  results: GapAnalysisResult[],
  overallCoverage: number,
  criticalGaps: number
): string {
  const fullyMet = results.filter(r => r.status === 'fully_met').length;
  const partiallyMet = results.filter(r => r.status === 'partially_met').length;
  const notMet = results.filter(r => r.status === 'not_met').length;

  return `Gap Analysis Summary:
- Overall Coverage: ${(overallCoverage * 100).toFixed(0)}%
- Fully Met: ${fullyMet} clauses
- Partially Met: ${partiallyMet} clauses
- Not Met: ${notMet} clauses
- Critical Gaps: ${criticalGaps} clauses

${criticalGaps > 0 ? `⚠️  ${criticalGaps} critical gap(s) require immediate attention.` : '✅ No critical gaps identified.'}`;
}

