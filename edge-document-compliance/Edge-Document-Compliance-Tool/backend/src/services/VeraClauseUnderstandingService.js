/**
 * Vera Clause Understanding Service
 * Deep understanding of clause intent, not just text extraction
 * Provides semantic understanding, relationships, and practical guidance
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

const VeraClauseUnderstandingService = {

  /**
   * Get comprehensive understanding of a specific clause
   * "Tell me about clause 4.4.1" → Deep explanation with context
   */
  async explainClause(standardId, clauseRef, tenantId) {
    try {
      // Get the clause requirement from parsed_requirements
      const requirement = await queryEdcatAI(
        `SELECT * FROM parsed_requirements 
         WHERE standard_id = $1 AND clause_ref = $2
         LIMIT 1`,
        [standardId, clauseRef]
      );

      if (!requirement.rows || requirement.rows.length === 0) {
        return null;
      }

      const req = requirement.rows[0];

      // Get semantic understanding
      const semanticContext = await this.getSemanticContext(req, standardId);

      // Get related clauses
      const relatedClauses = await this.getRelatedClauses(standardId, clauseRef);

      // Get common gaps for this clause
      const commonGaps = await this.getCommonGapsForClause(standardId, clauseRef, tenantId);

      // Get real-world examples
      const examples = await this.getRealWorldExamples(standardId, clauseRef, tenantId);

      return {
        clause_ref: clauseRef,
        requirement_text: req.requirement_text,
        requirement_type: req.requirement_type,
        
        // SEMANTIC UNDERSTANDING
        intent: semanticContext.intent,
        why_it_matters: semanticContext.why_matters,
        what_auditors_look_for: semanticContext.auditor_perspective,
        common_misunderstandings: semanticContext.misconceptions,
        
        // RELATIONSHIPS
        related_clauses: relatedClauses,
        
        // PRACTICAL KNOWLEDGE
        common_gaps: commonGaps,
        examples_from_your_industry: examples,
        
        // IMPLEMENTATION GUIDANCE
        how_to_address: await this.getImplementationGuidance(req, standardId),
        
        confidence: req.confidence
      };
    } catch (error) {
      console.error('[VeraClauseUnderstandingService] Error explaining clause:', error);
      return null;
    }
  },

  /**
   * Get semantic understanding (not just text)
   */
  async getSemanticContext(requirement, standardId) {
    try {
      // Query semantic tags and ontology from clause blueprint
      const semantics = await queryEdcatAI(
        `SELECT 
           ontology_tags,
           label
         FROM edcat.ai_clause_blueprint
         WHERE standard_id = $1 AND clause_id = $2
         LIMIT 1`,
        [standardId, requirement.clause_ref]
      );

      if (semantics.rows && semantics.rows.length > 0) {
        const blueprint = semantics.rows[0];
        const tags = blueprint.ontology_tags || {};

        return {
          intent: tags.intent || this.inferIntent(requirement.requirement_text),
          why_matters: tags.risk_category || this.inferRiskCategory(requirement.requirement_text),
          auditor_perspective: tags.audit_focus || this.inferAuditorFocus(requirement.requirement_text),
          misconceptions: tags.common_misconceptions || []
        };
      }

      // Fallback: infer from text
      return {
        intent: this.inferIntent(requirement.requirement_text),
        why_matters: this.inferRiskCategory(requirement.requirement_text),
        auditor_perspective: this.inferAuditorFocus(requirement.requirement_text),
        misconceptions: []
      };
    } catch (error) {
      console.error('[VeraClauseUnderstandingService] Error getting semantic context:', error);
      return {
        intent: 'Quality requirement',
        why_matters: 'Operational control',
        auditor_perspective: 'Documentation and implementation',
        misconceptions: []
      };
    }
  },

  /**
   * Infer clause intent from text
   */
  inferIntent(requirementText) {
    if (!requirementText) return 'Quality requirement';
    const text = requirementText.toLowerCase();

    if (text.includes('document') || text.includes('record')) {
      return 'Maintain documented evidence';
    } else if (text.includes('review') || text.includes('audit')) {
      return 'Conduct systematic reviews';
    } else if (text.includes('identify') || text.includes('determine')) {
      return 'Assess and identify risks/needs';
    } else if (text.includes('control') || text.includes('manage')) {
      return 'Control and manage processes';
    } else if (text.includes('communicate') || text.includes('inform')) {
      return 'Communicate information';
    } else if (text.includes('monitor') || text.includes('measure')) {
      return 'Monitor and measure performance';
    } else if (text.includes('define') || text.includes('establish')) {
      return 'Establish and define procedures';
    } else if (text.includes('train') || text.includes('competent')) {
      return 'Ensure competence';
    } else {
      return 'Quality requirement';
    }
  },

  /**
   * Infer risk category
   */
  inferRiskCategory(requirementText) {
    if (!requirementText) return 'Quality System Operations';
    const text = requirementText.toLowerCase();

    if (text.includes('safety') || text.includes('hazard') || text.includes('risk')) {
      return 'Safety and Risk Management';
    } else if (text.includes('nonconform') || text.includes('defect') || text.includes('failure')) {
      return 'Quality Control and Defect Prevention';
    } else if (text.includes('configuration') || text.includes('change')) {
      return 'Configuration and Change Management';
    } else if (text.includes('supplier') || text.includes('procurement')) {
      return 'Supply Chain Control';
    } else if (text.includes('traceability') || text.includes('trace')) {
      return 'Traceability and Identification';
    } else if (text.includes('training') || text.includes('competence')) {
      return 'Personnel Competence';
    } else if (text.includes('management') && text.includes('review')) {
      return 'Management Responsibility';
    } else {
      return 'Quality System Operations';
    }
  },

  /**
   * Infer what auditors look for
   */
  inferAuditorFocus(requirementText) {
    if (!requirementText) return ['Procedure documented', 'Procedure followed', 'Evidence available'];
    const text = requirementText.toLowerCase();

    const auditorFocus = [];

    if (text.includes('document')) {
      auditorFocus.push('Documented procedures exist');
      auditorFocus.push('Procedures are current and approved');
    }

    if (text.includes('implement') || text.includes('maintain')) {
      auditorFocus.push('Procedures are actually followed');
      auditorFocus.push('Evidence of implementation available');
    }

    if (text.includes('review') || text.includes('audit')) {
      auditorFocus.push('Reviews documented and on schedule');
      auditorFocus.push('Follow-up on issues from reviews');
    }

    if (text.includes('record')) {
      auditorFocus.push('Records maintained and controlled');
      auditorFocus.push('Records show compliance');
    }

    return auditorFocus.length > 0 
      ? auditorFocus 
      : ['Procedure documented', 'Procedure followed', 'Evidence available'];
  },

  /**
   * Get related clauses
   */
  async getRelatedClauses(standardId, clauseRef) {
    try {
      // Get parent and child clauses from blueprint
      const related = await queryEdcatAI(
        `SELECT 
           clause_id, label, parent_clause_id
         FROM edcat.ai_clause_blueprint
         WHERE standard_id = $1 
         AND (
           parent_clause_id = $2 
           OR clause_id = (
             SELECT parent_clause_id FROM edcat.ai_clause_blueprint 
             WHERE clause_id = $2 AND standard_id = $1
             LIMIT 1
           )
         )
         LIMIT 10`,
        [standardId, clauseRef]
      );

      return (related.rows || []).map(row => ({
        clause: row.clause_id,
        label: row.label,
        relationship: row.parent_clause_id === clauseRef ? 'child' : 'parent'
      }));
    } catch (error) {
      console.error('[VeraClauseUnderstandingService] Error getting related clauses:', error);
      return [];
    }
  },

  /**
   * Get common gaps for this clause (from learning data)
   */
  async getCommonGapsForClause(standardId, clauseRef, tenantId) {
    try {
      // Try to get gaps from clause_correlation_matrix if it exists
      const gaps = await queryEdcatAI(
        `SELECT 
           gap_description,
           gap_severity,
           COUNT(*) as frequency
         FROM clause_correlation_matrix
         WHERE standard_id = $1 
         AND compliance_status = 'none'
         AND requirement_id IN (
           SELECT id FROM parsed_requirements 
           WHERE standard_id = $1 AND clause_ref = $2
         )
         GROUP BY gap_description, gap_severity
         ORDER BY frequency DESC
         LIMIT 5`,
        [standardId, clauseRef]
      ).catch(() => ({ rows: [] })); // Gracefully handle if table doesn't exist

      return (gaps.rows || []).map(row => ({
        description: row.gap_description,
        severity: row.gap_severity,
        frequency: row.frequency
      }));
    } catch (error) {
      console.error('[VeraClauseUnderstandingService] Error getting common gaps:', error);
      return [];
    }
  },

  /**
   * Get real-world examples from this tenant
   */
  async getRealWorldExamples(standardId, clauseRef, tenantId) {
    try {
      if (!tenantId) return [];

      const examples = await queryEdcatAI(
        `SELECT 
           evidence_text,
           compliance_status,
           (
             SELECT name FROM customer_documents 
             WHERE id = document_id
             LIMIT 1
           ) as document_name
         FROM clause_correlation_matrix
         WHERE standard_id = $1 
         AND compliance_status IN ('full', 'partial')
         AND requirement_id IN (
           SELECT id FROM parsed_requirements 
           WHERE standard_id = $1 AND clause_ref = $2
         )
         AND tenant_id = $3
         LIMIT 3`,
        [standardId, clauseRef, tenantId]
      ).catch(() => ({ rows: [] })); // Gracefully handle if table doesn't exist

      return (examples.rows || []).map(row => ({
        status: row.compliance_status,
        example: row.evidence_text,
        from_document: row.document_name
      }));
    } catch (error) {
      console.error('[VeraClauseUnderstandingService] Error getting real-world examples:', error);
      return [];
    }
  },

  /**
   * Get implementation guidance
   */
  async getImplementationGuidance(requirement, standardId) {
    try {
      const guidance = {
        step_1: 'Document the requirement in your QMS procedures',
        step_2: 'Assign responsibility and define roles',
        step_3: 'Establish records to demonstrate compliance',
        step_4: 'Train personnel on the requirement',
        step_5: 'Review and audit for effectiveness'
      };

      // Customize based on requirement type
      if (requirement.requirement_type === 'SHALL' || requirement.requirement_type === 'MUST') {
        guidance.criticality = 'Mandatory—auditor will verify';
      } else if (requirement.requirement_type === 'SHOULD') {
        guidance.criticality = 'Recommended—implement if applicable';
      }

      return guidance;
    } catch (error) {
      console.error('[VeraClauseUnderstandingService] Error getting implementation guidance:', error);
      return {};
    }
  },

  /**
   * Compare two clauses from different standards
   * "How does ISO 9001 4.4.1 compare to AS9100D 4.4.1?"
   */
  async compareClausesBetweenStandards(standard1Id, clause1Ref, standard2Id, clause2Ref) {
    try {
      const clause1 = await this.explainClause(standard1Id, clause1Ref, null);
      const clause2 = await this.explainClause(standard2Id, clause2Ref, null);

      if (!clause1 || !clause2) return null;

      return {
        standard1: {
          clause: clause1.clause_ref,
          text: clause1.requirement_text,
          intent: clause1.intent,
          focus: clause1.what_auditors_look_for
        },
        standard2: {
          clause: clause2.clause_ref,
          text: clause2.requirement_text,
          intent: clause2.intent,
          focus: clause2.what_auditors_look_for
        },
        similarities: this.findSimilarities(clause1, clause2),
        differences: this.findDifferences(clause1, clause2),
        alignment: this.assessAlignment(clause1, clause2)
      };
    } catch (error) {
      console.error('[VeraClauseUnderstandingService] Error comparing clauses:', error);
      return null;
    }
  },

  /**
   * Find similarities between two clauses
   */
  findSimilarities(clause1, clause2) {
    const similarities = [];

    if (clause1.intent === clause2.intent) {
      similarities.push('Both require: ' + clause1.intent);
    }

    if (clause1.why_it_matters === clause2.why_it_matters) {
      similarities.push('Same risk category: ' + clause1.why_it_matters);
    }

    // Check for keyword overlap
    const keywords1 = new Set((clause1.requirement_text || '').toLowerCase().split(' '));
    const keywords2 = new Set((clause2.requirement_text || '').toLowerCase().split(' '));
    const commonKeywords = [...keywords1].filter(kw => keywords2.has(kw) && kw.length > 3);

    if (commonKeywords.length > 5) {
      similarities.push(`Share ${commonKeywords.length} key concepts`);
    }

    return similarities;
  },

  /**
   * Find differences between two clauses
   */
  findDifferences(clause1, clause2) {
    const differences = [];

    if (clause1.intent !== clause2.intent) {
      differences.push(`${clause1.intent} vs ${clause2.intent}`);
    }

    if (clause1.why_it_matters !== clause2.why_it_matters) {
      differences.push(`Different risk focus: ${clause1.why_it_matters} vs ${clause2.why_it_matters}`);
    }

    // Check text similarity
    const text1Words = (clause1.requirement_text || '').toLowerCase().split(' ');
    const text2Words = (clause2.requirement_text || '').toLowerCase().split(' ');

    if (text1Words.length !== text2Words.length) {
      differences.push(`Different scope: ${text1Words.length} vs ${text2Words.length} key points`);
    }

    return differences;
  },

  /**
   * Assess overall alignment
   */
  assessAlignment(clause1, clause2) {
    if (clause1.intent === clause2.intent && 
        clause1.why_it_matters === clause2.why_it_matters) {
      return 'High alignment—essentially the same requirement';
    } else if (clause1.intent === clause2.intent) {
      return 'Good alignment—same intent, different emphasis';
    } else {
      return 'Partial alignment—different requirements';
    }
  }
};

export default VeraClauseUnderstandingService;

