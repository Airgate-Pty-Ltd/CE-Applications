/**
 * Vera Gap Rules Service
 * 
 * Manages gap analysis rules per clause, including:
 * - Mandatory elements to check for
 * - Common misinterpretations
 * - Evidence examples for "fully met" vs "partially met" vs "not met"
 * 
 * Phase 19: Advanced Gap Analysis Engine Upgrade
 */

import { queryEdcatAI } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

export interface GapRule {
  id?: string;
  standardCode: string;
  clauseRef: string;
  mandatoryElements: string[];
  commonMisinterpretations: string[];
  evidenceExamples: {
    fullyMet: string[];
    partiallyMet: string[];
    notMet: string[];
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  hints?: string;
}

/**
 * Get gap rule for a clause
 */
export async function getGapRule(
  standardCode: string,
  clauseRef: string
): Promise<GapRule | null> {
  try {
    const result = await queryEdcatAI(`
      SELECT id, standard_code, clause_ref, rule_json, severity, hints
      FROM edcat.vera_gap_rules
      WHERE standard_code = $1 AND clause_ref = $2
      LIMIT 1
    `, [standardCode, clauseRef]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const ruleData = typeof row.rule_json === 'string' ? JSON.parse(row.rule_json) : row.rule_json;

    return {
      id: row.id,
      standardCode: row.standard_code,
      clauseRef: row.clause_ref,
      mandatoryElements: ruleData.mandatoryElements || [],
      commonMisinterpretations: ruleData.commonMisinterpretations || [],
      evidenceExamples: ruleData.evidenceExamples || {
        fullyMet: [],
        partiallyMet: [],
        notMet: []
      },
      severity: row.severity || 'medium',
      hints: row.hints || undefined
    };

  } catch (error: any) {
    console.error('[VeraGapRules] Error getting gap rule:', error.message);
    return null;
  }
}

/**
 * Save or update gap rule
 */
export async function saveGapRule(rule: GapRule): Promise<void> {
  try {
    const ruleJson = {
      mandatoryElements: rule.mandatoryElements,
      commonMisinterpretations: rule.commonMisinterpretations,
      evidenceExamples: rule.evidenceExamples
    };

    await queryEdcatAI(`
      INSERT INTO edcat.vera_gap_rules
      (id, standard_code, clause_ref, rule_json, severity, hints, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (standard_code, clause_ref) DO UPDATE SET
        rule_json = EXCLUDED.rule_json,
        severity = EXCLUDED.severity,
        hints = EXCLUDED.hints,
        updated_at = NOW()
    `, [
      rule.id || uuidv4(),
      rule.standardCode,
      rule.clauseRef,
      JSON.stringify(ruleJson),
      rule.severity,
      rule.hints || null
    ]);

    console.log(`[VeraGapRules] Saved gap rule for ${rule.standardCode} ${rule.clauseRef}`);

  } catch (error: any) {
    console.error('[VeraGapRules] Error saving gap rule:', error.message);
    throw error;
  }
}

/**
 * Get all gap rules for a standard
 */
export async function getGapRulesForStandard(standardCode: string): Promise<GapRule[]> {
  try {
    const result = await queryEdcatAI(`
      SELECT id, standard_code, clause_ref, rule_json, severity, hints
      FROM edcat.vera_gap_rules
      WHERE standard_code = $1
      ORDER BY clause_ref
    `, [standardCode]);

    return result.rows.map(row => {
      const ruleData = typeof row.rule_json === 'string' ? JSON.parse(row.rule_json) : row.rule_json;
      return {
        id: row.id,
        standardCode: row.standard_code,
        clauseRef: row.clause_ref,
        mandatoryElements: ruleData.mandatoryElements || [],
        commonMisinterpretations: ruleData.commonMisinterpretations || [],
        evidenceExamples: ruleData.evidenceExamples || {
          fullyMet: [],
          partiallyMet: [],
          notMet: []
        },
        severity: row.severity || 'medium',
        hints: row.hints || undefined
      };
    });

  } catch (error: any) {
    console.error('[VeraGapRules] Error getting gap rules:', error.message);
    return [];
  }
}

