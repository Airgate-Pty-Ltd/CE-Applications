import { query } from '../database/connection.js';
import { PredictiveScore, AnalyticsSnapshot, AuditAnalytics } from '../models/index.js';

const FORECAST_WINDOWS = ['30d', '60d', '90d'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function classifyRisk(score) {
  if (score >= 85) return 'low';
  if (score >= 70) return 'moderate';
  return 'high';
}

function trendDelta(series) {
  if (series.length < 2) return 0;
  const first = series[0].total;
  const last = series[series.length - 1].total;
  if (!first) return last;
  return Number(((last - first) / first) * 100).toFixed(1);
}

async function logSnapshot(snapshot_type, metrics, { customer_id = null, assessment_id = null } = {}) {
  await AnalyticsSnapshot.record({ customer_id, assessment_id, snapshot_type, metrics });
}

class AnalyticsService {
  async getOverview() {
    const [assessmentByStatus, documentsByStatus, reportsByType] = await Promise.all([
      query(
        `SELECT status, COUNT(*)::int AS total
         FROM assessments
         GROUP BY status
         ORDER BY status`
      ),
      query(
        `SELECT parse_status, COUNT(*)::int AS total
         FROM documents
         GROUP BY parse_status
         ORDER BY parse_status`
      ),
      query(
        `SELECT report_type, COUNT(*)::int AS total
         FROM reports
         GROUP BY report_type
         ORDER BY report_type`
      )
    ]);

    const activityWindow = await query(
      `SELECT DATE(created_at) AS date, COUNT(*)::int AS total
       FROM assessments
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at)`
    );

    const averageScoreResult = await query(
      `SELECT COALESCE(AVG(predicted_score), 0)::numeric(5,2) AS avg_score
       FROM predictive_compliance_scores`
    );

    const recentAssessments = await query(
      `SELECT a.id,
              a.assessment_name,
              a.status,
              a.created_at,
              COALESCE(ps.predicted_score, 0)::numeric(5,2) AS predicted_score,
              ps.risk_level
       FROM assessments a
       LEFT JOIN LATERAL (
         SELECT predicted_score, risk_level
         FROM predictive_compliance_scores pcs
         WHERE pcs.assessment_id = a.id
         ORDER BY generated_at DESC
         LIMIT 1
       ) ps ON TRUE
       ORDER BY a.updated_at DESC
       LIMIT 5`
    );

    const overview = {
      assessments: assessmentByStatus.rows,
      documents: documentsByStatus.rows,
      reports: reportsByType.rows,
      activityTrend: activityWindow.rows,
      averageScore: Number(averageScoreResult.rows[0]?.avg_score ?? 0),
      recentAssessments: recentAssessments.rows
    };

    await logSnapshot('overview', overview);
    return overview;
  }

  async getTrend(days = 30) {
    const assessments = await query(
      `SELECT DATE(created_at) AS date, COUNT(*)::int AS total
       FROM assessments
       WHERE created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at)`
    );

    const documents = await query(
      `SELECT DATE(uploaded_at) AS date, COUNT(*)::int AS total
       FROM documents
       WHERE uploaded_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(uploaded_at)
       ORDER BY DATE(uploaded_at)`
    );

    const scoresByDay = await query(
      `SELECT DATE(generated_at) AS date, AVG(predicted_score)::numeric(5,2) AS total
       FROM predictive_compliance_scores
       WHERE generated_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(generated_at)
       ORDER BY DATE(generated_at)`
    );

    const payload = {
      assessments: assessments.rows,
      documents: documents.rows,
      predictive: scoresByDay.rows,
      assessmentChange: trendDelta(assessments.rows),
      documentChange: trendDelta(documents.rows),
      scoreChange: trendDelta(scoresByDay.rows)
    };

    await logSnapshot('trend', payload);
    return payload;
  }

  async generatePredictiveScores() {
    const assessments = await query(
      `SELECT a.id,
              a.customer_id,
              a.assessment_name,
              a.scope,
              a.status,
              a.updated_at,
              COUNT(DISTINCT d.id) AS total_docs,
              COUNT(DISTINCT d.id) FILTER (WHERE d.parse_status = 'complete') AS parsed_docs,
              COUNT(DISTINCT r.id) AS report_count,
              MAX(r.generated_at) AS last_report
       FROM assessments a
       LEFT JOIN documents d ON d.assessment_id = a.id
       LEFT JOIN reports r ON r.assessment_id = a.id
       GROUP BY a.id, a.customer_id
       ORDER BY a.updated_at DESC
       LIMIT 10`
    );

    const results = [];

    for (const assessment of assessments.rows) {
      const totalDocs = Number(assessment.total_docs || 0);
      const parsedDocs = Number(assessment.parsed_docs || 0);
      const coverage = totalDocs > 0 ? parsedDocs / totalDocs : 0.4;
      const reportFactor = clamp(Number(assessment.report_count || 0) / 3, 0, 1);
      const daysSinceUpdate = assessment.updated_at
        ? Math.min((Date.now() - new Date(assessment.updated_at).getTime()) / (1000 * 60 * 60 * 24), 180)
        : 90;
      const recencyFactor = 1 - Math.min(daysSinceUpdate / 120, 1);

      const baseScore = 55;
      const predictedBase = baseScore + coverage * 30 + reportFactor * 10 + recencyFactor * 5;
      const confidence = clamp(60 + coverage * 25 + (1 - recencyFactor) * 10, 50, 95);

      for (const window of FORECAST_WINDOWS) {
        const decay = window === '30d' ? 0 : window === '60d' ? 4 : 7;
        const windowScore = clamp(predictedBase - decay + reportFactor * 5, 10, 100);
        const risk = classifyRisk(windowScore);
        const drivers = {
          coverage: Number((coverage * 100).toFixed(1)),
          parsedDocuments: parsedDocs,
          totalDocuments: totalDocs,
          reportCount: Number(assessment.report_count || 0),
          daysSinceUpdate: Number(daysSinceUpdate.toFixed(0))
        };

        const scoreRecord = await PredictiveScore.upsert({
          assessment_id: assessment.id,
          forecast_period: window,
          predicted_score: Number(windowScore.toFixed(2)),
          confidence: Number(confidence.toFixed(2)),
          risk_level: risk,
          drivers
        });

        results.push({
          assessment_id: assessment.id,
          customer_id: assessment.customer_id,
          assessment_name: assessment.assessment_name,
          scope: assessment.scope,
          status: assessment.status,
          forecast_period: window,
          predicted_score: scoreRecord.predicted_score,
          confidence: scoreRecord.confidence,
          risk_level: risk,
          drivers
        });
      }
    }

    if (results.length) {
      await logSnapshot('predictive_scores', { total: results.length });
    }

    return results;
  }

  async getPredictiveScores() {
    const results = await this.generatePredictiveScores();
    const grouped = Object.values(
      results.reduce((acc, item) => {
        if (!acc[item.assessment_id]) {
          acc[item.assessment_id] = {
            assessment_id: item.assessment_id,
            assessment_name: item.assessment_name,
            scope: item.scope,
            status: item.status,
            customer_id: item.customer_id,
            windows: []
          };
        }
        acc[item.assessment_id].windows.push({
          forecast_period: item.forecast_period,
          predicted_score: item.predicted_score,
          confidence: item.confidence,
          risk_level: item.risk_level,
          drivers: item.drivers
        });
        return acc;
      }, {})
    );

    return { assessments: grouped };
  }

  async getForecast() {
    const predictiveRows = await PredictiveScore.listRecent(90);
    if (!predictiveRows.length) {
      return { forecasts: [] };
    }

    const grouped = predictiveRows.reduce((acc, row) => {
      if (!acc[row.assessment_id]) acc[row.assessment_id] = [];
      acc[row.assessment_id].push(row);
      return acc;
    }, {});

    const forecasts = Object.entries(grouped).map(([assessmentId, rows]) => {
      const ordered = rows.sort((a, b) => new Date(a.generated_at) - new Date(b.generated_at));
      const latest = ordered[ordered.length - 1];
      const earliest = ordered[0];
      const delta = latest.predicted_score - earliest.predicted_score;
      const direction = delta >= 0 ? 'improving' : 'declining';
      const recommendation =
        latest.risk_level === 'high'
          ? 'Accelerate remediation actions; schedule executive review.'
          : latest.risk_level === 'moderate'
          ? 'Monitor corrective actions and validate upcoming submissions.'
          : 'Maintain cadence; focus on sustaining evidence freshness.';

      return {
        assessment_id: assessmentId,
        latest_score: latest.predicted_score,
        risk_level: latest.risk_level,
        confidence: latest.confidence,
        direction,
        delta: Number(delta.toFixed(2)),
        recommendation,
        forecast_period: latest.forecast_period
      };
    });

    await logSnapshot('forecast', { total: forecasts.length });
    return { forecasts };
  }

  async getAuditInsights() {
    const recentEvents = await AuditAnalytics.recent(25);
    const actorMap = new Map();
    const actionMap = new Map();

    recentEvents.forEach((event) => {
      if (event.actor) {
        actorMap.set(event.actor, (actorMap.get(event.actor) || 0) + 1);
      }
      if (event.action) {
        actionMap.set(event.action, (actionMap.get(event.action) || 0) + 1);
      }
    });

    const topActors = Array.from(actorMap.entries())
      .map(([actor, total]) => ({ actor, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topActions = Array.from(actionMap.entries())
      .map(([action, total]) => ({ action, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const payload = {
      events: recentEvents,
      topActors,
      topActions
    };

    await logSnapshot('audit_insights', { totalEvents: recentEvents.length });
    return payload;
  }
}

export default new AnalyticsService();