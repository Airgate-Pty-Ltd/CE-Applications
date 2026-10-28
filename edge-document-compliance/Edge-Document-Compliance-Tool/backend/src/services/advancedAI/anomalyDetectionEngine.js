/**
 * Anomaly Detection Engine
 * Detects unusual patterns in gap analysis, training, CAPA, and audit scores
 */

import { query } from '../../database/connection.js';

class AnomalyDetectionEngine {
  constructor() {
    this.thresholds = {
      gapTrendIncrease: 0.15, // 15% increase in gaps
      trainingStall: 30, // 30 days without completion
      capaDelay: 7, // 7 days overdue
      auditScoreDecline: 0.10 // 10% decline in audit scores
    };
  }

  async detectAnomalies(customerId, lookbackDays = 90) {
    const anomalies = [];

    try {
      // 1. Gap Trend Analysis
      const gapAnomalies = await this.detectGapTrendAnomalies(customerId, lookbackDays);
      anomalies.push(...gapAnomalies);

      // 2. Training Stall Detection
      const trainingAnomalies = await this.detectTrainingStalls(customerId);
      anomalies.push(...trainingAnomalies);

      // 3. CAPA Delay Detection
      const capaAnomalies = await this.detectCAPADelays(customerId);
      anomalies.push(...capaAnomalies);

      // 4. Audit Score Decline
      const auditAnomalies = await this.detectAuditScoreDecline(customerId, lookbackDays);
      anomalies.push(...auditAnomalies);

      // Sort by severity
      anomalies.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
      });

      return {
        totalAnomalies: anomalies.length,
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length,
        anomalies: anomalies
      };
    } catch (error) {
      console.error('[AnomalyDetection] Error detecting anomalies:', error);
      throw error;
    }
  }

  async detectGapTrendAnomalies(customerId, lookbackDays) {
    const anomalies = [];

    try {
      // Get gap counts over time
      const result = await query(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) as gap_count
         FROM clause_correlation_matrix
         WHERE tenant_id = $1 
           AND compliance_status IN ('none', 'partial')
           AND created_at >= NOW() - INTERVAL '${lookbackDays} days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 30`,
        [customerId]
      );

      if (result.rows.length < 2) return anomalies;

      // Calculate trend
      const recent = result.rows.slice(0, 7).reduce((sum, r) => sum + parseInt(r.gap_count), 0) / 7;
      const previous = result.rows.slice(7, 14).reduce((sum, r) => sum + parseInt(r.gap_count), 0) / 7;

      if (previous > 0) {
        const increase = (recent - previous) / previous;
        if (increase > this.thresholds.gapTrendIncrease) {
          anomalies.push({
            type: 'gap_trend_increase',
            severity: increase > 0.30 ? 'critical' : 'high',
            message: `Gap count increased by ${Math.round(increase * 100)}% over the last 7 days`,
            metric: {
              recent: Math.round(recent),
              previous: Math.round(previous),
              increase: Math.round(increase * 100)
            },
            recommendation: 'Review recent gap analysis results and prioritize remediation'
          });
        }
      }
    } catch (error) {
      console.error('[AnomalyDetection] Error in gap trend analysis:', error);
    }

    return anomalies;
  }

  async detectTrainingStalls(customerId) {
    const anomalies = [];

    try {
      const result = await query(
        `SELECT tr.id, tr.title, tr.scheduled_date, tr.status,
                COUNT(tc.id) as completion_count
         FROM training_records tr
         LEFT JOIN training_completions tc ON tr.id = tc.training_id
         WHERE tr.customer_id = $1
           AND tr.status = 'scheduled'
           AND tr.scheduled_date < NOW() - INTERVAL '${this.thresholds.trainingStall} days'
         GROUP BY tr.id, tr.title, tr.scheduled_date, tr.status
         HAVING COUNT(tc.id) = 0`,
        [customerId]
      );

      for (const row of result.rows) {
        const daysOverdue = Math.floor((new Date() - new Date(row.scheduled_date)) / (1000 * 60 * 60 * 24));
        anomalies.push({
          type: 'training_stall',
          severity: daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'high' : 'medium',
          message: `Training "${row.title}" scheduled ${daysOverdue} days ago with no completions`,
          metric: {
            trainingId: row.id,
            scheduledDate: row.scheduled_date,
            daysOverdue: daysOverdue
          },
          recommendation: 'Reschedule or cancel stalled training sessions'
        });
      }
    } catch (error) {
      console.error('[AnomalyDetection] Error in training stall detection:', error);
    }

    return anomalies;
  }

  async detectCAPADelays(customerId) {
    const anomalies = [];

    try {
      const result = await query(
        `SELECT id, capa_number, title, due_date, status
         FROM capa_records
         WHERE customer_id = $1
           AND status != 'closed'
           AND due_date < NOW() - INTERVAL '${this.thresholds.capaDelay} days'`,
        [customerId]
      );

      for (const row of result.rows) {
        const daysOverdue = Math.floor((new Date() - new Date(row.due_date)) / (1000 * 60 * 60 * 24));
        anomalies.push({
          type: 'capa_delay',
          severity: daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'high' : 'medium',
          message: `CAPA ${row.capa_number} is ${daysOverdue} days overdue`,
          metric: {
            capaId: row.id,
            capaNumber: row.capa_number,
            dueDate: row.due_date,
            daysOverdue: daysOverdue
          },
          recommendation: 'Escalate overdue CAPAs and update target completion dates'
        });
      }
    } catch (error) {
      console.error('[AnomalyDetection] Error in CAPA delay detection:', error);
    }

    return anomalies;
  }

  async detectAuditScoreDecline(customerId, lookbackDays) {
    const anomalies = [];

    try {
      // This would require an audit_scores table or similar
      // For now, we'll use a placeholder that checks if audit data exists
      const result = await query(
        `SELECT id, score, audit_date
         FROM mock_audit_reports
         WHERE tenant_id = $1
           AND audit_date >= NOW() - INTERVAL '${lookbackDays} days'
         ORDER BY audit_date DESC
         LIMIT 10`,
        [customerId]
      );

      if (result.rows.length < 2) return anomalies;

      // Calculate average scores
      const recent = result.rows.slice(0, 3).reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0) / 3;
      const previous = result.rows.slice(3, 6).reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0) / 3;

      if (previous > 0) {
        const decline = (previous - recent) / previous;
        if (decline > this.thresholds.auditScoreDecline) {
          anomalies.push({
            type: 'audit_score_decline',
            severity: decline > 0.20 ? 'critical' : 'high',
            message: `Audit scores declined by ${Math.round(decline * 100)}%`,
            metric: {
              recent: Math.round(recent),
              previous: Math.round(previous),
              decline: Math.round(decline * 100)
            },
            recommendation: 'Review audit findings and implement corrective actions'
          });
        }
      }
    } catch (error) {
      // Table might not exist yet, ignore
      console.log('[AnomalyDetection] Audit score table not available');
    }

    return anomalies;
  }

  async predictFutureGaps(customerId, standardId, horizonDays = 90) {
    try {
      // Get historical gap data
      const result = await query(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) as gap_count,
           AVG(CASE WHEN compliance_status = 'none' THEN 1 ELSE 0 END) as gap_rate
         FROM clause_correlation_matrix
         WHERE tenant_id = $1 AND standard_id = $2
           AND created_at >= NOW() - INTERVAL '180 days'
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [customerId, standardId]
      );

      if (result.rows.length < 7) {
        return {
          predictions: [],
          confidence: 'low',
          message: 'Insufficient historical data for predictions'
        };
      }

      // Simple linear trend prediction
      const predictions = [];
      const recentTrend = this.calculateTrend(result.rows.slice(-7));

      for (let i = 30; i <= horizonDays; i += 30) {
        const predictedGaps = Math.max(0, Math.round(recentTrend * i));
        predictions.push({
          horizonDays: i,
          predictedGaps: predictedGaps,
          confidence: 'medium'
        });
      }

      return {
        predictions: predictions,
        confidence: 'medium',
        trend: recentTrend > 0 ? 'increasing' : recentTrend < 0 ? 'decreasing' : 'stable'
      };
    } catch (error) {
      console.error('[AnomalyDetection] Error predicting gaps:', error);
      throw error;
    }
  }

  calculateTrend(dataPoints) {
    if (dataPoints.length < 2) return 0;
    const first = parseFloat(dataPoints[0].gap_count || 0);
    const last = parseFloat(dataPoints[dataPoints.length - 1].gap_count || 0);
    return (last - first) / dataPoints.length;
  }
}

export default AnomalyDetectionEngine;

