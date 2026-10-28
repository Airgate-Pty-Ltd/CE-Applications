/**
 * Vera Compliance Comparison Engine
 * Compare customer practices to standards and confirm compliance
 * Provides detailed assessments, gap identification, and remediation guidance
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import VeraClauseUnderstandingService from './VeraClauseUnderstandingService.js';
import VeraCustomerRequirementsService from './VeraCustomerRequirementsService.js';

const VeraComplianceComparisonEngine = {

  /**
   * Main method: Compare customer to standard and confirm compliance
   * "Is ACME compliant with AS9100D?"
   */
  async assessComplianceStatus(tenantId, standardId) {
    try {
      // Get all requirements for the standard
      const requirements = await queryEdcatAI(
        `SELECT id, clause_ref, requirement_text, requirement_type, confidence
         FROM parsed_requirements
         WHERE standard_id = $1
         ORDER BY clause_ref
         LIMIT 500`,
        [standardId]
      );

      if (!requirements.rows || requirements.rows.length === 0) {
        return { error: 'No requirements found for this standard' };
      }

      // Get customer procedures
      const procedures = await queryPostgres(
        `SELECT cp.id, cp.procedure_name, cp.procedure_text
         FROM customer_procedures cp
         JOIN customer_documents cd ON cp.document_id = cd.id
         WHERE cd.tenant_id = $1`,
        [tenantId]
      ).catch(() => ({ rows: [] }));

      // Compare each requirement
      const complianceMap = [];

      for (const req of requirements.rows.slice(0, 100)) { // Limit to first 100 for performance
        const assessment = await this.assessSingleRequirement(
          req,
          procedures.rows || [],
          tenantId,
          standardId
        );

        complianceMap.push(assessment);
      }

      // Calculate summary
      const summary = this.calculateComplianceSummary(complianceMap);

      return {
        standard_id: standardId,
        tenant_id: tenantId,
        assessment_date: new Date(),
        overall_compliance_status: summary.status,
        coverage_percent: summary.coverage,
        detailed_findings: complianceMap,
        compliance_summary: summary,
        audit_readiness: this.assessAuditReadiness(summary, complianceMap),
        action_items: this.generateActionItems(complianceMap)
      };
    } catch (error) {
      console.error('[VeraComplianceComparisonEngine] Error assessing compliance:', error);
      return { error: error.message };
    }
  },

  /**
   * Assess a single requirement against customer procedures
   */
  async assessSingleRequirement(requirement, procedures, tenantId, standardId) {
    try {
      let bestMatch = null;
      let bestConfidence = 0;

      // Find best matching procedure
      for (const proc of procedures) {
        const confidence = this.calculateMatchConfidence(requirement, proc);

        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = proc;
        }
      }

      let status;
      let detail;

      if (bestConfidence >= 0.75) {
        status = 'COMPLIANT';
        detail = `Requirement covered by: ${bestMatch.procedure_name}`;
      } else if (bestConfidence >= 0.50) {
        status = 'PARTIAL';
        detail = `Partial coverage in: ${bestMatch.procedure_name} (confidence: ${Math.round(bestConfidence * 100)}%)`;
      } else {
        status = 'GAP';
        detail = 'No procedure found to address this requirement';
      }

      // Get clause understanding
      const clauseInfo = await VeraClauseUnderstandingService.explainClause(
        standardId,
        requirement.clause_ref,
        tenantId
      ).catch(() => null);

      return {
        clause_ref: requirement.clause_ref,
        requirement_text: requirement.requirement_text,
        requirement_type: requirement.requirement_type,
        compliance_status: status,
        confidence: bestConfidence,
        detail: detail,
        covered_by: bestMatch ? bestMatch.procedure_name : null,
        clause_intent: clauseInfo?.intent,
        auditor_expectations: clauseInfo?.what_auditors_look_for,
        remediation: this.getRemediationGuidance(status, requirement, clauseInfo)
      };
    } catch (error) {
      console.error('[VeraComplianceComparisonEngine] Error assessing single requirement:', error);
      return {
        clause_ref: requirement.clause_ref,
        requirement_text: requirement.requirement_text,
        compliance_status: 'ERROR',
        detail: error.message
      };
    }
  },

  /**
   * Calculate match confidence between requirement and procedure
   */
  calculateMatchConfidence(requirement, procedure) {
    const reqText = (requirement.requirement_text || '').toLowerCase();
    const procName = (procedure.procedure_name || '').toLowerCase();
    const procText = (procedure.procedure_text || '').toLowerCase();

    let score = 0;

    // Keyword matching
    const keywords = ['process', 'procedure', 'documented', 'control', 'review', 'management'];
    keywords.forEach(kw => {
      if (reqText.includes(kw) && procText.includes(kw)) score += 0.1;
    });

    // Exact phrase matching
    const reqPhrases = reqText.split(' ').slice(0, 5).join(' ');
    if (procText.includes(reqPhrases)) score += 0.3;

    // Clause topic matching
    if (requirement.clause_ref && procName.includes(requirement.clause_ref.split('.')[0])) {
      score += 0.2;
    }

    // Normalize to 0-1
    return Math.min(score, 1.0);
  },

  /**
   * Calculate overall compliance summary
   */
  calculateComplianceSummary(complianceMap) {
    const compliant = complianceMap.filter(c => c.compliance_status === 'COMPLIANT').length;
    const partial = complianceMap.filter(c => c.compliance_status === 'PARTIAL').length;
    const gaps = complianceMap.filter(c => c.compliance_status === 'GAP').length;
    const total = complianceMap.length;

    if (total === 0) {
      return {
        status: 'UNKNOWN',
        coverage: 0,
        coverage_percent: 0,
        compliant_count: 0,
        partial_count: 0,
        gap_count: 0,
        total_requirements: 0
      };
    }

    const coverage = (compliant + partial * 0.5) / total;

    let status;
    if (coverage >= 0.9) status = 'COMPLIANT';
    else if (coverage >= 0.75) status = 'MOSTLY_COMPLIANT';
    else if (coverage >= 0.60) status = 'PARTIALLY_COMPLIANT';
    else status = 'NON_COMPLIANT';

    return {
      status,
      coverage,
      coverage_percent: Math.round(coverage * 100),
      compliant_count: compliant,
      partial_count: partial,
      gap_count: gaps,
      total_requirements: total
    };
  },

  /**
   * Assess audit readiness
   */
  assessAuditReadiness(summary, complianceMap) {
    const score = summary.coverage_percent;
    let readiness;

    if (score >= 95) readiness = 'AUDIT_READY';
    else if (score >= 85) readiness = 'MOSTLY_READY';
    else if (score >= 70) readiness = 'NEEDS_WORK';
    else readiness = 'NOT_READY';

    const highRiskGaps = complianceMap.filter(c => 
      c.compliance_status === 'GAP' && 
      (c.requirement_type === 'SHALL' || c.requirement_type === 'MUST')
    ).length;

    return {
      readiness,
      risk_level: highRiskGaps > 5 ? 'HIGH' : highRiskGaps > 0 ? 'MEDIUM' : 'LOW',
      critical_gaps: highRiskGaps,
      recommended_actions: this.getAuditReadinessActions(readiness, highRiskGaps)
    };
  },

  /**
   * Get audit readiness actions
   */
  getAuditReadinessActions(readiness, criticalGaps) {
    const actions = [];

    if (readiness === 'NOT_READY' || criticalGaps > 10) {
      actions.push('URGENT: Schedule QMS review with management');
      actions.push('URGENT: Create detailed gap remediation plan');
    }

    if (criticalGaps > 0) {
      actions.push(`CRITICAL: Address ${criticalGaps} mandatory requirements (SHALL/MUST)`);
    }

    if (readiness !== 'AUDIT_READY') {
      actions.push('Conduct internal audit against standard');
      actions.push('Document all procedures referenced in assessment');
    }

    if (readiness === 'AUDIT_READY') {
      actions.push('Ready for external audit');
      actions.push('Continue monitoring for compliance drift');
    }

    return actions;
  },

  /**
   * Generate remediation guidance for gaps
   */
  getRemediationGuidance(status, requirement, clauseInfo) {
    if (status === 'COMPLIANT') {
      return { action: 'MAINTAIN', guidance: 'Continue current implementation' };
    }

    if (status === 'PARTIAL') {
      return {
        action: 'ENHANCE',
        guidance: `Strengthen existing procedure to fully address: ${requirement.requirement_text}`,
        implementation_steps: [
          'Review current procedure against requirement',
          'Identify gaps in current implementation',
          'Update procedure to close gaps',
          'Train personnel on changes',
          'Implement and verify effectiveness'
        ]
      };
    }

    if (status === 'GAP') {
      return {
        action: 'CREATE',
        guidance: `Create new procedure to address: ${requirement.requirement_text}`,
        implementation_steps: [
          'Draft procedure using standard template',
          'Define responsibilities and authorities',
          'Establish records to demonstrate compliance',
          'Get management approval',
          'Train personnel',
          'Implement and audit for effectiveness'
        ],
        estimated_effort: 'Medium (1-2 weeks)'
      };
    }

    return { action: 'UNKNOWN', guidance: 'Unable to determine remediation' };
  },

  /**
   * Generate action items from assessment
   */
  generateActionItems(complianceMap) {
    const items = [];
    let priority = 1;

    // High priority: mandatory gaps
    const mandatoryGaps = complianceMap.filter(c => 
      c.compliance_status === 'GAP' && 
      (c.requirement_type === 'SHALL' || c.requirement_type === 'MUST')
    );

    mandatoryGaps.forEach(gap => {
      items.push({
        priority: priority++,
        clause: gap.clause_ref,
        action: 'CREATE_PROCEDURE',
        description: `Create procedure for ${gap.clause_ref}: ${(gap.requirement_text || '').substring(0, 100)}`,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        owner: 'Quality Manager'
      });
    });

    // Medium priority: partial compliance
    const partialCompliance = complianceMap.filter(c => 
      c.compliance_status === 'PARTIAL'
    );

    partialCompliance.forEach(partial => {
      items.push({
        priority: priority++,
        clause: partial.clause_ref,
        action: 'ENHANCE_PROCEDURE',
        description: `Enhance ${partial.covered_by} to fully cover ${partial.clause_ref}`,
        due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks
        owner: 'Process Owner'
      });
    });

    return items;
  }
};

export default VeraComplianceComparisonEngine;

