import { query } from '../database/connection.js';

class ExecutiveIntelligenceService {
  async getExecutiveDashboard(customerId) {
    const [assessments, documents, reports] = await Promise.all([
      query('SELECT id, scope, status, created_at FROM assessments WHERE customer_id = $1 ORDER BY created_at DESC', [customerId]),
      query('SELECT id, assessment_id, parse_status, uploaded_at FROM documents WHERE customer_id = $1 ORDER BY uploaded_at DESC', [customerId]),
      query('SELECT id, report_type, generated_at FROM reports WHERE customer_id = $1 ORDER BY generated_at DESC', [customerId])
    ]);

    const totalAssessments = assessments.rows.length;
    const completedAssessments = assessments.rows.filter((row) => row.status === 'completed').length;
    const parsedDocuments = documents.rows.filter((row) => row.parse_status === 'complete').length;

    const score = totalAssessments === 0
      ? 75
      : Math.min(100, Math.round((parsedDocuments / Math.max(1, documents.rows.length)) * 50 + (completedAssessments / totalAssessments) * 50));

    return {
      overallCompliancePosture: {
        score,
        rating: this.scoreToRating(score),
        status: score >= 80 ? 'compliant' : score >= 60 ? 'needs_improvement' : 'at_risk'
      },
      keyMetrics: {
        totalAssessments,
        completedAssessments,
        documentsParsed: parsedDocuments,
        totalDocuments: documents.rows.length,
        reportsGenerated: reports.rows.length
      },
      riskHeatMap: this.buildHeatMap(assessments.rows, documents.rows),
      complianceTrend: this.buildTrend(assessments.rows),
      upcomingDeadlines: this.sampleDeadlines(),
      criticalAlerts: this.sampleAlerts(score),
      recommendations: this.sampleRecommendations(score),
      timestamp: new Date().toISOString()
    };
  }

  async generateBoardReport(customerId, period = 'quarterly') {
    const dashboard = await this.getExecutiveDashboard(customerId);

    return {
      title: `EDCAT Board Report (${period})`,
      generatedAt: new Date().toISOString(),
      executiveSummary: `Compliance posture is ${dashboard.overallCompliancePosture.rating} with overall score ${dashboard.overallCompliancePosture.score}.`,
      metrics: dashboard.keyMetrics,
      recommendations: dashboard.recommendations,
      alerts: dashboard.criticalAlerts
    };
  }

  scoreToRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Critical';
  }

  buildHeatMap(assessments, documents) {
    const byScope = new Map();

    assessments.forEach((assessment) => {
      const key = assessment.scope || 'General';
      if (!byScope.has(key)) {
        byScope.set(key, { assessments: 0, documents: 0, parsed: 0 });
      }
      const entry = byScope.get(key);
      entry.assessments += 1;
    });

    documents.forEach((doc) => {
      const key = doc.assessment_id ? doc.assessment_id : 'General';
      if (!byScope.has(key)) {
        byScope.set(key, { assessments: 0, documents: 0, parsed: 0 });
      }
      const entry = byScope.get(key);
      entry.documents += 1;
      if (doc.parse_status === 'complete') entry.parsed += 1;
    });

    return Array.from(byScope.entries()).map(([scope, value]) => ({
      department: scope,
      assessments: value.assessments,
      documents: value.documents,
      gaps: Math.max(0, value.documents - value.parsed),
      riskLevel: value.parsed / Math.max(1, value.documents) > 0.8 ? 'low' : 'high'
    }));
  }

  buildTrend(assessments) {
    const buckets = new Map();

    assessments.forEach((assessment) => {
      const month = new Date(assessment.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      buckets.set(month, (buckets.get(month) || 0) + 1);
    });

    return {
      data: Array.from(buckets.entries()).map(([month, total]) => ({ month, score: 100 - Math.max(0, 10 - total) }))
    };
  }

  sampleDeadlines() {
    return [
      { requirement: 'Quarterly compliance review', dueDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString(), priority: 'high', status: 'pending' },
      { requirement: 'Vendor risk assessment', dueDate: new Date(Date.now() + 21 * 86400000).toLocaleDateString(), priority: 'medium', status: 'scheduled' }
    ];
  }

  sampleAlerts(score) {
    if (score >= 70) return [];
    return [
      { message: 'Compliance score trending downward', severity: 'high', timestamp: new Date().toLocaleString() }
    ];
  }

  sampleRecommendations(score) {
    const recommendations = [];
    if (score < 80) {
      recommendations.push({ title: 'Increase monitoring cadence', description: 'Schedule weekly compliance stand-ups.', action: 'Add to action plan' });
    }
    if (score < 60) {
      recommendations.push({ title: 'Allocate remediation budget', description: 'Fund remediation initiatives for critical processes.', action: 'Discuss with finance' });
    }
    if (!recommendations.length) {
      recommendations.push({ title: 'Maintain current momentum', description: 'Compliance posture is healthy. Continue regular reviews.', action: 'Share win with leadership' });
    }
    return recommendations;
  }
}

export default new ExecutiveIntelligenceService();
