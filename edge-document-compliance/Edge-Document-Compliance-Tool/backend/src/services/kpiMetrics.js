/**
 * KPI Metrics Service
 * Calculates core QMS KPIs
 */

import { query } from '../database/connection.js';

class KPIMetrics {
  async calculateQMSKPIs(customerId) {
    const [
      complianceCoverage,
      auditReadiness,
      capaEffectiveness,
      trainingCompleteness,
      documentStatus,
      riskScore
    ] = await Promise.all([
      this.getComplianceCoverage(customerId),
      this.getAuditReadiness(customerId),
      this.getCAPAEffectiveness(customerId),
      this.getTrainingCompleteness(customerId),
      this.getDocumentStatus(customerId),
      this.calculateRiskScore(customerId)
    ]);

    return {
      timestamp: new Date(),
      metrics: {
        complianceCoverage,
        auditReadiness,
        capa_effectiveness: capaEffectiveness,
        trainingCompleteness,
        documentStatus,
        riskScore
      },
      overallHealth: this.calculateHealth(
        complianceCoverage.percentage,
        auditReadiness.score,
        capaEffectiveness.rate,
        trainingCompleteness.percentage,
        riskScore.score
      )
    };
  }

  async getComplianceCoverage(customerId) {
    const result = await query(
      `SELECT
         SUM(total_requirements) as total,
         SUM(covered_requirements) as covered
       FROM gap_analyses
       WHERE customer_id = $1 AND analyzed_at > NOW() - INTERVAL '3 months'`,
      [customerId]
    );
    const r = result.rows[0] || { total: 0, covered: 0 };
    const total = Number(r.total || 0);
    const covered = Number(r.covered || 0);

    return {
      metric: 'Compliance Coverage',
      total,
      covered,
      percentage: total > 0 ? Math.round((covered / total) * 100) : 0,
      trend: 'stable',
      target: 95
    };
  }

  async getAuditReadiness(customerId) {
    const mockAudits = await query(
      `SELECT AVG(total_score) as avg_score
       FROM mock_audit_reports
       WHERE session_id IN (
         SELECT id FROM mock_audit_sessions
         WHERE customer_id = $1
           AND started_at > NOW() - INTERVAL '3 months'
       )`,
      [customerId]
    );
    const score = Math.round(Number(mockAudits.rows[0]?.avg_score || 0));
    return {
      metric: 'Audit Readiness',
      score,
      status: score >= 85 ? 'ready' : score >= 75 ? 'in_progress' : 'needs_work',
      target: 85
    };
  }

  async getCAPAEffectiveness(customerId) {
    const result = await query(
      `SELECT
         SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
         COUNT(*) as total
       FROM capa_records
       WHERE customer_id = $1
         AND created_at > NOW() - INTERVAL '6 months'`,
      [customerId]
    );
    const r = result.rows[0] || { closed: 0, total: 0 };
    const closed = Number(r.closed || 0);
    const total = Number(r.total || 0);
    const rate = total > 0 ? Math.round((closed / total) * 100) : 0;
    return {
      metric: 'CAPA Closure Rate',
      closed,
      total,
      rate,
      target: 80
    };
  }

  async getTrainingCompleteness(customerId) {
    const result = await query(
      `SELECT
         COUNT(DISTINCT ec.employee_id) as trained_employees,
         COUNT(DISTINCT e.id) as total_employees
       FROM employees e
       LEFT JOIN employee_competencies ec ON e.id = ec.employee_id
       WHERE e.customer_id = $1`,
      [customerId]
    );
    const r = result.rows[0] || { trained_employees: 0, total_employees: 0 };
    const total = Number(r.total_employees || 0);
    const trained = Number(r.trained_employees || 0);
    const percentage = total > 0 ? Math.round((trained / total) * 100) : 0;
    return {
      metric: 'Training Completion',
      trained,
      total,
      percentage,
      target: 100
    };
  }

  async getDocumentStatus(customerId) {
    const result = await query(
      `SELECT
         SUM(CASE WHEN status = 'effective' THEN 1 ELSE 0 END) as effective,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
         COUNT(*) as total
       FROM qms_documents
       WHERE customer_id = $1`,
      [customerId]
    );
    const r = result.rows[0] || { effective: 0, draft: 0, total: 0 };
    const effective = Number(r.effective || 0);
    const draft = Number(r.draft || 0);
    const total = Number(r.total || 0);
    return {
      metric: 'Document Management',
      effective,
      draft,
      total,
      percentage: total > 0 ? Math.round((effective / total) * 100) : 0,
      target: 95
    };
  }

  async calculateRiskScore(customerId) {
    const overdueCapa = await query(
      `SELECT COUNT(*) as count
       FROM capa_records
       WHERE customer_id = $1
         AND due_date IS NOT NULL
         AND due_date < NOW()
         AND status <> 'closed'`,
      [customerId]
    );
    const failedAudits = await query(
      `SELECT COUNT(*) as count
       FROM mock_audit_reports
       WHERE session_id IN (
         SELECT id FROM mock_audit_sessions WHERE customer_id = $1
       ) AND pass_fail = 'NEEDS WORK'`,
      [customerId]
    );
    const untrained = await query(
      `SELECT COUNT(*) as count
       FROM employees e
       LEFT JOIN employee_competencies ec ON e.id = ec.employee_id
       WHERE e.customer_id = $1 AND ec.id IS NULL`,
      [customerId]
    );
    const overdue = Number(overdueCapa.rows[0]?.count || 0);
    const failed = Number(failedAudits.rows[0]?.count || 0);
    const untrainedCount = Number(untrained.rows[0]?.count || 0);
    const riskPoints = overdue * 3 + failed * 2 + untrainedCount * 1;
    const score = Math.min(100, riskPoints);
    return {
      metric: 'Overall Risk Score',
      score,
      level: score > 20 ? 'high' : score > 10 ? 'medium' : 'low',
      issues: {
        overdueCapas: overdue,
        failedAudits: failed,
        untrainedPersonnel: untrainedCount
      }
    };
  }

  calculateHealth(coverage, readiness, capaRate, training, risk) {
    const weights = {
      coverage: 0.25,
      readiness: 0.25,
      capa: 0.2,
      training: 0.2,
      risk: 0.1
    };
    const score =
      (coverage || 0) * weights.coverage +
      (readiness || 0) * weights.readiness +
      (capaRate || 0) * weights.capa +
      (training || 0) * weights.training +
      ((100 - (risk || 0)) * weights.risk);
    const rounded = Math.round(score);
    return {
      score: rounded,
      status: rounded >= 85 ? 'excellent' : rounded >= 75 ? 'good' : rounded >= 60 ? 'fair' : 'poor'
    };
  }
}

export default KPIMetrics;


