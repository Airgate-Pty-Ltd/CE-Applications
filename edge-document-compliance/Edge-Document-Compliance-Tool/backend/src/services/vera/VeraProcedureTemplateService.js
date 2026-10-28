/**
 * Vera Automatic Procedure Template Suggestions
 * Implements Vera's improvement: "Automatic procedure template suggestions"
 * Suggests procedure templates based on gaps, standards, and best practices
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';

class VeraProcedureTemplateService {
  /**
   * Suggest procedure templates based on gaps and standards
   * @param {string} tenantId - Tenant ID
   * @param {string} standardId - Standard ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Template suggestions
   */
  async suggestTemplates(tenantId, standardId, options = {}) {
    const {
      basedOnGaps = true,
      basedOnStandard = true,
      includeBestPractices = true,
      maxSuggestions = 10
    } = options;

    try {
      const suggestions = {
        standard_id: standardId,
        tenant_id: tenantId,
        suggested_at: new Date().toISOString(),
        templates: [],
        priority: {}
      };

      // 1. Get gaps that need procedures
      let gapBasedTemplates = [];
      if (basedOnGaps) {
        gapBasedTemplates = await this.getTemplatesFromGaps(tenantId, standardId);
      }

      // 2. Get standard-required procedures
      let standardBasedTemplates = [];
      if (basedOnStandard) {
        standardBasedTemplates = await this.getTemplatesFromStandard(standardId);
      }

      // 3. Get best practice templates
      let bestPracticeTemplates = [];
      if (includeBestPractices) {
        bestPracticeTemplates = await this.getBestPracticeTemplates(standardId);
      }

      // 4. Merge and prioritize
      suggestions.templates = this.mergeAndPrioritize(
        gapBasedTemplates,
        standardBasedTemplates,
        bestPracticeTemplates,
        maxSuggestions
      );

      // 5. Calculate priority scores
      suggestions.priority = this.calculatePriority(suggestions.templates);

      return {
        success: true,
        suggestions
      };
    } catch (error) {
      console.error('[VeraProcedureTemplateService] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get templates based on identified gaps
   */
  async getTemplatesFromGaps(tenantId, standardId) {
    try {
      const result = await queryPostgres(
        `SELECT DISTINCT ga.clause_ref, ga.gap_description, ga.gap_severity,
                pr.requirement_text, pr.clause_number
         FROM gap_analyses ga
         LEFT JOIN parsed_requirements pr ON pr.standard_id = ga.standard_id 
           AND pr.clause_number = ga.clause_ref
         WHERE ga.tenant_id = $1
         AND ga.standard_id = $2
         AND ga.status = 'completed'
         AND ga.compliance_status IN ('none', 'partial')
         AND ga.gap_severity IN ('critical', 'major')
         ORDER BY 
           CASE ga.gap_severity 
             WHEN 'critical' THEN 1 
             WHEN 'major' THEN 2 
             ELSE 3 
           END,
           ga.clause_ref
         LIMIT 20`,
        [tenantId, standardId]
      );

      return result.rows.map(row => ({
        type: 'gap_based',
        clause: row.clause_ref || row.clause_number,
        procedure_name: this.inferProcedureName(row.clause_ref, row.gap_description),
        description: row.gap_description,
        requirement_text: row.requirement_text,
        severity: row.gap_severity,
        priority: row.gap_severity === 'critical' ? 'high' : 'medium',
        template: this.generateTemplateForClause(row.clause_ref, row.requirement_text)
      }));
    } catch (error) {
      console.warn('[VeraProcedureTemplateService] Could not get gap-based templates:', error.message);
      return [];
    }
  }

  /**
   * Get templates based on standard requirements
   */
  async getTemplatesFromStandard(standardId) {
    try {
      // Get standard code
      const standardResult = await queryPostgres(
        `SELECT code FROM standards WHERE id = $1`,
        [standardId]
      );

      if (standardResult.rows.length === 0) return [];

      const standardCode = standardResult.rows[0].code.toUpperCase();

      // Common procedure requirements by standard
      const standardProcedures = {
        'AS9100': [
          { clause: '8.1.1', name: 'Risk Management Procedure' },
          { clause: '8.1.2', name: 'Configuration Management Procedure' },
          { clause: '8.1.4', name: 'Prevention of Counterfeit Parts Procedure' },
          { clause: '8.5.1', name: 'Control of Production and Service Provision' },
          { clause: '8.5.2', name: 'Identification and Traceability Procedure' },
          { clause: '8.5.3', name: 'Property Belonging to Customers or External Providers' },
          { clause: '8.5.4', name: 'Preservation Procedure' },
          { clause: '8.5.5', name: 'Post-Delivery Activities Procedure' },
          { clause: '8.5.6', name: 'Control of Changes Procedure' },
          { clause: '8.7', name: 'Control of Nonconforming Outputs Procedure' },
          { clause: '9.2', name: 'Internal Audit Procedure' },
          { clause: '10.2', name: 'Nonconformity and Corrective Action Procedure' }
        ],
        'ISO-9001': [
          { clause: '6.2', name: 'Quality Objectives Procedure' },
          { clause: '7.1.5', name: 'Monitoring and Measurement Resources Procedure' },
          { clause: '7.2', name: 'Competence Procedure' },
          { clause: '7.5', name: 'Documented Information Procedure' },
          { clause: '8.1', name: 'Operational Planning and Control Procedure' },
          { clause: '8.2', name: 'Requirements for Products and Services Procedure' },
          { clause: '8.3', name: 'Design and Development Procedure' },
          { clause: '8.4', name: 'Control of Externally Provided Processes, Products and Services Procedure' },
          { clause: '8.5', name: 'Production and Service Provision Procedure' },
          { clause: '8.7', name: 'Control of Nonconforming Outputs Procedure' },
          { clause: '9.2', name: 'Internal Audit Procedure' },
          { clause: '10.2', name: 'Nonconformity and Corrective Action Procedure' }
        ],
        'ISO-13485': [
          { clause: '4.2.3', name: 'Medical Device File Procedure' },
          { clause: '7.3', name: 'Design and Development Procedure' },
          { clause: '7.4', name: 'Purchasing Procedure' },
          { clause: '7.5', name: 'Production and Service Provision Procedure' },
          { clause: '7.6', name: 'Monitoring and Measurement of Equipment Procedure' },
          { clause: '8.2', name: 'Feedback and Complaint Handling Procedure' },
          { clause: '8.3', name: 'Control of Nonconforming Product Procedure' },
          { clause: '8.5', name: 'Corrective and Preventive Action Procedure' }
        ]
      };

      // Find matching standard
      let procedures = [];
      for (const [key, procs] of Object.entries(standardProcedures)) {
        if (standardCode.includes(key) || standardCode.startsWith(key)) {
          procedures = procs;
          break;
        }
      }

      // Get requirements for these clauses
      const clauseRefs = procedures.map(p => p.clause);
      if (clauseRefs.length === 0) return [];

      const placeholders = clauseRefs.map((_, i) => `$${i + 2}`).join(', ');
      const result = await queryPostgres(
        `SELECT clause_number, clause_ref, requirement_text
         FROM parsed_requirements
         WHERE standard_id = $1
         AND (clause_number = ANY(ARRAY[${placeholders}]) OR clause_ref = ANY(ARRAY[${placeholders}]))
         ORDER BY clause_number`,
        [standardId, ...clauseRefs]
      );

      // Map procedures to requirements
      return procedures.map(proc => {
        const req = result.rows.find(r => 
          r.clause_number === proc.clause || r.clause_ref === proc.clause
        );
        return {
          type: 'standard_required',
          clause: proc.clause,
          procedure_name: proc.name,
          description: `Required procedure for ${proc.clause}`,
          requirement_text: req?.requirement_text || '',
          priority: 'medium',
          template: this.generateTemplateForClause(proc.clause, req?.requirement_text || '')
        };
      });
    } catch (error) {
      console.warn('[VeraProcedureTemplateService] Could not get standard-based templates:', error.message);
      return [];
    }
  }

  /**
   * Get best practice templates
   */
  async getBestPracticeTemplates(standardId) {
    // Best practice procedures that are commonly needed
    const bestPractices = [
      {
        clause: '4.1',
        procedure_name: 'Context of the Organization Procedure',
        description: 'Understanding internal and external issues',
        priority: 'low'
      },
      {
        clause: '5.1',
        procedure_name: 'Leadership and Commitment Procedure',
        description: 'Management commitment and quality policy',
        priority: 'low'
      },
      {
        clause: '6.1',
        procedure_name: 'Actions to Address Risks and Opportunities Procedure',
        description: 'Risk-based thinking and opportunity management',
        priority: 'medium'
      }
    ];

    return bestPractices.map(bp => ({
      type: 'best_practice',
      clause: bp.clause,
      procedure_name: bp.procedure_name,
      description: bp.description,
      priority: bp.priority,
      template: this.generateGenericTemplate(bp.procedure_name, bp.clause)
    }));
  }

  /**
   * Infer procedure name from clause and gap description
   */
  inferProcedureName(clause, gapDescription) {
    const lowerDesc = (gapDescription || '').toLowerCase();
    
    // Common procedure name patterns
    if (lowerDesc.includes('document') || lowerDesc.includes('record')) {
      return `Documented Information Procedure (${clause})`;
    }
    if (lowerDesc.includes('audit') || lowerDesc.includes('internal audit')) {
      return `Internal Audit Procedure (${clause})`;
    }
    if (lowerDesc.includes('corrective') || lowerDesc.includes('nonconformity')) {
      return `Nonconformity and Corrective Action Procedure (${clause})`;
    }
    if (lowerDesc.includes('risk')) {
      return `Risk Management Procedure (${clause})`;
    }
    if (lowerDesc.includes('design') || lowerDesc.includes('development')) {
      return `Design and Development Procedure (${clause})`;
    }
    if (lowerDesc.includes('purchasing') || lowerDesc.includes('supplier')) {
      return `Purchasing Procedure (${clause})`;
    }
    if (lowerDesc.includes('production') || lowerDesc.includes('manufacturing')) {
      return `Production and Service Provision Procedure (${clause})`;
    }

    return `Procedure for ${clause}`;
  }

  /**
   * Generate template for a specific clause
   */
  generateTemplateForClause(clause, requirementText) {
    return {
      structure: [
        'Purpose',
        'Scope',
        'Definitions',
        'Responsibilities',
        'Procedure',
        'Records',
        'References'
      ],
      clause: clause,
      requirement_summary: requirementText?.substring(0, 200) || '',
      suggested_sections: this.getSuggestedSections(clause),
      notes: `This procedure addresses the requirements of clause ${clause}.`
    };
  }

  /**
   * Generate generic template
   */
  generateGenericTemplate(procedureName, clause) {
    return {
      structure: [
        'Purpose',
        'Scope',
        'Definitions',
        'Responsibilities',
        'Procedure',
        'Records',
        'References'
      ],
      clause: clause,
      procedure_name: procedureName,
      suggested_sections: this.getSuggestedSections(clause),
      notes: `Generic template for ${procedureName}. Customize based on your organization's needs.`
    };
  }

  /**
   * Get suggested sections based on clause
   */
  getSuggestedSections(clause) {
    const sectionMap = {
      '8.1': ['Planning', 'Risk Assessment', 'Control Measures', 'Monitoring'],
      '8.5': ['Process Controls', 'Equipment', 'Personnel', 'Environment', 'Verification'],
      '8.7': ['Identification', 'Segregation', 'Review', 'Disposition', 'Records'],
      '9.2': ['Audit Planning', 'Audit Execution', 'Audit Reporting', 'Follow-up'],
      '10.2': ['Nonconformity Identification', 'Root Cause Analysis', 'Corrective Action', 'Verification', 'Effectiveness Review']
    };

    // Find matching section pattern
    for (const [key, sections] of Object.entries(sectionMap)) {
      if (clause.startsWith(key)) {
        return sections;
      }
    }

    return ['General Requirements', 'Implementation', 'Monitoring', 'Improvement'];
  }

  /**
   * Merge and prioritize templates
   */
  mergeAndPrioritize(gapBased, standardBased, bestPractice, maxSuggestions) {
    const merged = new Map();

    // Add gap-based (highest priority)
    gapBased.forEach(template => {
      const key = template.clause;
      if (!merged.has(key) || merged.get(key).priority_score < template.priority_score) {
        merged.set(key, { ...template, priority_score: 3 });
      }
    });

    // Add standard-based (medium priority)
    standardBased.forEach(template => {
      const key = template.clause;
      if (!merged.has(key)) {
        merged.set(key, { ...template, priority_score: 2 });
      }
    });

    // Add best practice (lower priority, but still useful)
    bestPractice.forEach(template => {
      const key = template.clause;
      if (!merged.has(key)) {
        merged.set(key, { ...template, priority_score: 1 });
      }
    });

    // Convert to array and sort
    const templates = Array.from(merged.values())
      .sort((a, b) => {
        // Sort by priority score, then by clause number
        if (b.priority_score !== a.priority_score) {
          return b.priority_score - a.priority_score;
        }
        return (a.clause || '').localeCompare(b.clause || '');
      })
      .slice(0, maxSuggestions);

    return templates;
  }

  /**
   * Calculate priority metrics
   */
  calculatePriority(templates) {
    const priorityCounts = {
      high: 0,
      medium: 0,
      low: 0
    };

    templates.forEach(t => {
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority]++;
      }
    });

    return {
      total_suggestions: templates.length,
      high_priority: priorityCounts.high,
      medium_priority: priorityCounts.medium,
      low_priority: priorityCounts.low,
      recommended_action: priorityCounts.high > 0 
        ? 'Address high-priority templates first'
        : priorityCounts.medium > 0
        ? 'Review medium-priority templates'
        : 'Consider best practice templates'
    };
  }

  /**
   * Generate suggestion report
   */
  generateReport(suggestions) {
    if (!suggestions.success) {
      return `Template suggestion failed: ${suggestions.error}`;
    }

    const { templates, priority } = suggestions.suggestions;
    let report = `**Procedure Template Suggestions**\n\n`;

    if (priority) {
      report += `**Summary:**\n`;
      report += `• Total suggestions: ${priority.total_suggestions}\n`;
      report += `• High priority: ${priority.high_priority}\n`;
      report += `• Medium priority: ${priority.medium_priority}\n`;
      report += `• Low priority: ${priority.low_priority}\n\n`;
      report += `**Recommendation:** ${priority.recommended_action}\n\n`;
    }

    if (templates && templates.length > 0) {
      report += `**Suggested Procedures:**\n\n`;
      templates.forEach((template, idx) => {
        report += `${idx + 1}. **${template.procedure_name}** (Clause ${template.clause})\n`;
        report += `   Priority: ${template.priority.toUpperCase()}\n`;
        report += `   Type: ${template.type.replace('_', ' ')}\n`;
        if (template.description) {
          report += `   ${template.description}\n`;
        }
        if (template.template?.suggested_sections) {
          report += `   Suggested sections: ${template.template.suggested_sections.join(', ')}\n`;
        }
        report += `\n`;
      });
    } else {
      report += `No template suggestions at this time. All required procedures appear to be in place.\n`;
    }

    return report;
  }
}

export default new VeraProcedureTemplateService();

