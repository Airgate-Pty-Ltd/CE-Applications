import { query } from '../database/connection.js';

class PredictiveRiskScoringEngine {
  async calculateRiskScore(customerId, assessmentId) {
    const assessment = await query('SELECT id, status FROM assessments WHERE id = $1 AND customer_id = $2', [assessmentId, customerId]);
    if (!assessment.rows.length) {
      throw new Error('Assessment not found');
    }

    const documents = await query('SELECT parse_status FROM documents WHERE assessment_id = $1', [assessmentId]);
    const totalDocs = documents.rows.length;
    const pendingDocs = documents.rows.filter((doc) => doc.parse_status !== 'complete').length;

    const baseRisk = totalDocs === 0 ? 30 : Math.min(100, (pendingDocs / totalDocs) * 100);
    const statusModifier = assessment.rows[0].status === 'completed' ? -20 : assessment.rows[0].status === 'draft' ? 10 : 0;
    const predictedRisk = Math.max(0, baseRisk + statusModifier);

    return {
      assessmentId,
      predictedRisk: parseFloat(predictedRisk.toFixed(2)),
      riskLevel: this.toRiskLevel(predictedRisk),
      factors: {
        totalDocuments: totalDocs,
        pendingDocuments: pendingDocs,
        completionStatus: assessment.rows[0].status
      }
    };
  }

  async detectAnomalies(customerId) {
    const assessments = await query('SELECT id FROM assessments WHERE customer_id = $1 LIMIT 5', [customerId]);
    const anomalies = [];
    for (const row of assessments.rows) {
      const score = await this.calculateRiskScore(customerId, row.id);
      if (score.predictedRisk > 80) {
        anomalies.push({ assessmentId: row.id, risk: score.predictedRisk, message: 'High predicted risk' });
      }
    }
    return anomalies;
  }

  toRiskLevel(score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Minimal';
  }
}

export default new PredictiveRiskScoringEngine();
