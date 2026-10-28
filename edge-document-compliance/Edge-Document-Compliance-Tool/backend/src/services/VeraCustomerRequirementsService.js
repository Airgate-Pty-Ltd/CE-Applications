/**
 * Vera Customer Requirements Service
 * Index, retrieve, and understand customer-specific requirements
 * Provides customer profiles, procedure lookups, and compliance posture
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

const VeraCustomerRequirementsService = {

  /**
   * Load all customer requirements for a specific customer
   * "What are ACME's requirements?" → Full customer requirements profile
   */
  async loadCustomerProfile(tenantId, customerName) {
    try {
      // Get customer data from tenants table
      const customer = await queryPostgres(
        `SELECT * FROM tenants WHERE id = $1 OR name ILIKE $2 LIMIT 1`,
        [tenantId, `%${customerName || ''}%`]
      );

      if (!customer.rows || customer.rows.length === 0) {
        return null;
      }

      const customerData = customer.rows[0];
      const actualTenantId = customerData.id || tenantId;

      // Get all their documents
      const documents = await queryPostgres(
        `SELECT id, name, uploaded_at FROM customer_documents 
         WHERE tenant_id = $1
         ORDER BY uploaded_at DESC`,
        [actualTenantId]
      ).catch(() => ({ rows: [] }));

      // Get all extracted procedures (if table exists)
      const procedures = await queryPostgres(
        `SELECT DISTINCT cp.procedure_name, cp.procedure_text, cd.name as from_document
         FROM customer_procedures cp
         JOIN customer_documents cd ON cp.document_id = cd.id
         WHERE cd.tenant_id = $1
         ORDER BY cp.procedure_name`,
        [actualTenantId]
      ).catch(() => ({ rows: [] }));

      // Get any customer-specific requirements (uploaded as standards)
      const customReqs = await queryEdcatAI(
        `SELECT id, code, name FROM standards
         WHERE file_category = 'customer_requirements'
         ORDER BY uploaded_at DESC
         LIMIT 10`,
        []
      ).catch(() => ({ rows: [] }));

      // Get gap analysis history
      const gapHistory = await queryPostgres(
        `SELECT ga.id, ga.standard_id, s.code, ga.created_at, 
                ga.results
         FROM gap_analyses ga
         JOIN standards s ON ga.standard_id = s.id
         WHERE ga.tenant_id = $1
         ORDER BY ga.created_at DESC
         LIMIT 10`,
        [actualTenantId]
      ).catch(() => ({ rows: [] }));

      return {
        tenant_id: actualTenantId,
        customer_name: customerData.name || customerName,
        profile: {
          documents_uploaded: documents.rows.length,
          procedures_defined: procedures.rows.length,
          customer_specific_requirements: customReqs.rows.length,
          gap_analyses_completed: gapHistory.rows.length
        },
        documents: (documents.rows || []).map(d => ({
          id: d.id,
          name: d.name,
          uploaded_at: d.uploaded_at
        })),
        procedures: (procedures.rows || []).map(p => ({
          name: p.procedure_name,
          snippet: (p.procedure_text || '').substring(0, 200) + '...',
          from_document: p.from_document
        })),
        custom_requirements: (customReqs.rows || []).map(r => ({
          code: r.code,
          name: r.name,
          id: r.id
        })),
        recent_analyses: (gapHistory.rows || []).map(ga => ({
          standard: ga.code,
          analyzed_at: ga.created_at,
          gap_count: ga.results?.gap_count || 0,
          coverage: ga.results?.coverage || 0
        }))
      };
    } catch (error) {
      console.error('[VeraCustomerRequirementsService] Error loading customer profile:', error);
      return null;
    }
  },

  /**
   * Get all procedures for a specific area
   * "What are their change control procedures?"
   */
  async getProceduresByArea(tenantId, procedureArea) {
    try {
      const procedures = await queryPostgres(
        `SELECT cp.procedure_name, cp.procedure_text, cd.name as from_document,
                cp.extracted_at
         FROM customer_procedures cp
         JOIN customer_documents cd ON cp.document_id = cd.id
         WHERE cd.tenant_id = $1
         AND LOWER(cp.procedure_name) LIKE LOWER($2)
         ORDER BY cp.extracted_at DESC`,
        [tenantId, `%${procedureArea}%`]
      ).catch(() => ({ rows: [] }));

      return {
        procedure_area: procedureArea,
        found_count: procedures.rows.length,
        procedures: (procedures.rows || []).map(p => ({
          name: p.procedure_name,
          text: p.procedure_text,
          from_document: p.from_document,
          extracted_at: p.extracted_at
        }))
      };
    } catch (error) {
      console.error('[VeraCustomerRequirementsService] Error getting procedures by area:', error);
      return null;
    }
  },

  /**
   * Check if customer meets a specific requirement
   * "Does ACME have procedures for design control?"
   */
  async checkRequirementCoverage(tenantId, requirementText) {
    try {
      // Search procedures for keyword matches
      const matches = await queryPostgres(
        `SELECT cp.procedure_name, cp.procedure_text, cd.name as from_document,
                cp.confidence
         FROM customer_procedures cp
         JOIN customer_documents cd ON cp.document_id = cd.id
         WHERE cd.tenant_id = $1
         AND (
           LOWER(cp.procedure_name) LIKE $2
           OR LOWER(cp.procedure_text) LIKE $2
         )
         LIMIT 10`,
        [tenantId, `%${requirementText.toLowerCase().split(' ')[0]}%`]
      ).catch(() => ({ rows: [] }));

      if (!matches.rows || matches.rows.length === 0) {
        return {
          coverage_status: 'NOT_FOUND',
          message: `No procedures found matching "${requirementText}"`,
          procedures: [],
          recommendation: 'May indicate a gap—recommend creating procedure or verify alternative approach'
        };
      }

      return {
        coverage_status: 'FOUND',
        message: `Found ${matches.rows.length} procedure(s) potentially covering this requirement`,
        procedures: (matches.rows || []).map(m => ({
          name: m.procedure_name,
          match_confidence: m.confidence,
          from_document: m.from_document,
          snippet: (m.procedure_text || '').substring(0, 300) + '...'
        })),
        next_step: 'Review procedures to confirm coverage'
      };
    } catch (error) {
      console.error('[VeraCustomerRequirementsService] Error checking requirement coverage:', error);
      return { coverage_status: 'ERROR', message: error.message };
    }
  },

  /**
   * Get customer's compliance posture
   * Overall picture: What are they doing well? Where are the weak spots?
   */
  async getCompliancePosture(tenantId) {
    try {
      // Get recent gap analyses
      const analyses = await queryPostgres(
        `SELECT ga.standard_id, s.code, ga.results, ga.created_at
         FROM gap_analyses ga
         JOIN standards s ON ga.standard_id = s.id
         WHERE ga.tenant_id = $1
         AND ga.created_at > NOW() - INTERVAL '90 days'
         ORDER BY ga.created_at DESC
         LIMIT 5`,
        [tenantId]
      ).catch(() => ({ rows: [] }));

      // Calculate average coverage
      let totalCoverage = 0;
      let totalReqs = 0;

      const gapSummary = [];

      if (analyses.rows && analyses.rows.length > 0) {
        analyses.rows.forEach(row => {
          const results = row.results || {};
          const coverage = results.coverage || 0;
          const reqCount = results.total_requirements || 100;

          gapSummary.push({
            standard: row.code,
            coverage_percent: Math.round(coverage * 100),
            gap_count: results.gap_count || 0,
            analyzed_at: row.created_at
          });

          totalCoverage += coverage * reqCount;
          totalReqs += reqCount;
        });
      }

      const overallCoverage = totalReqs > 0 ? Math.round((totalCoverage / totalReqs) * 100) : 0;

      // Identify trends
      const trend = this.calculateTrend(gapSummary);

      return {
        overall_coverage_percent: overallCoverage,
        trend: trend,
        standards_assessed: gapSummary,
        compliance_rating: this.getRating(overallCoverage),
        strengths: await this.getStrengths(tenantId, gapSummary),
        areas_for_improvement: await this.getWeakAreas(tenantId, gapSummary),
        recommendations: this.getRecommendations(overallCoverage, trend)
      };
    } catch (error) {
      console.error('[VeraCustomerRequirementsService] Error getting compliance posture:', error);
      return null;
    }
  },

  /**
   * Calculate compliance trend
   */
  calculateTrend(gapSummary) {
    if (gapSummary.length < 2) return 'INSUFFICIENT_DATA';

    const recent = gapSummary[0].coverage_percent;
    const previous = gapSummary[1].coverage_percent;
    const change = recent - previous;

    if (change > 5) return 'IMPROVING';
    if (change < -5) return 'DECLINING';
    return 'STABLE';
  },

  /**
   * Get compliance rating
   */
  getRating(coverage) {
    if (coverage >= 90) return 'EXCELLENT';
    if (coverage >= 75) return 'GOOD';
    if (coverage >= 60) return 'FAIR';
    return 'NEEDS_IMPROVEMENT';
  },

  /**
   * Get strengths
   */
  async getStrengths(tenantId, gapSummary) {
    const strengths = [];

    for (const summary of gapSummary) {
      if (summary.coverage_percent >= 85) {
        strengths.push(`Strong coverage of ${summary.standard} (${summary.coverage_percent}%)`);
      }
    }

    return strengths.length > 0 ? strengths : ['Foundational compliance system in place'];
  },

  /**
   * Get weak areas
   */
  async getWeakAreas(tenantId, gapSummary) {
    const weakAreas = [];

    for (const summary of gapSummary) {
      if (summary.coverage_percent < 70) {
        weakAreas.push(`${summary.standard}: ${summary.gap_count} gaps identified`);
      }
    }

    return weakAreas.length > 0 ? weakAreas : [];
  },

  /**
   * Get recommendations
   */
  getRecommendations(coverage, trend) {
    const recommendations = [];

    if (coverage < 60) {
      recommendations.push('Priority: Address critical gaps in design control and documentation');
    } else if (coverage < 75) {
      recommendations.push('Priority: Close remaining gaps in traceability and supplier management');
    } else {
      recommendations.push('Continue improvement on refinements');
    }

    if (trend === 'DECLINING') {
      recommendations.push('Action: Review recent changes—something may have regressed');
    } else if (trend === 'IMPROVING') {
      recommendations.push('Good: Continue current improvement trajectory');
    }

    return recommendations;
  }
};

export default VeraCustomerRequirementsService;

