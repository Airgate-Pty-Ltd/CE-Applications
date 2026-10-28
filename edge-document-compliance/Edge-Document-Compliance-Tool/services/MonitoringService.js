import { query } from '../database/connection.js';
import { SystemMetricsSnapshotModel, SystemAlertModel } from '../models/index.js';

class MonitoringService {
  async recordSnapshot() {
    const [[customers], [assessments], [documents], [reports]] = await Promise.all([
      query('SELECT COUNT(*)::int AS total FROM customers'),
      query('SELECT COUNT(*)::int AS total FROM assessments'),
      query("SELECT COUNT(*)::int AS total FROM documents WHERE parse_status = 'complete'"),
      query('SELECT COUNT(*)::int AS total FROM reports')
    ]);

    const snapshot = {
      customers: Number(customers.total || 0),
      assessments: Number(assessments.total || 0),
      parsedDocuments: Number(documents.total || 0),
      reports: Number(reports.total || 0)
    };

    await Promise.all(
      Object.entries(snapshot).map(([key, value]) => SystemMetricsSnapshotModel.insert(key, value))
    );

    if (snapshot.parsedDocuments === 0 && snapshot.assessments > 0) {
      await SystemAlertModel.create({
        alert_type: 'documents_unparsed',
        severity: 'high',
        message: 'Assessments exist with no parsed documents.',
        context: snapshot
      });
    }

    return snapshot;
  }

  async latestMetrics() {
    return SystemMetricsSnapshotModel.latest();
  }

  async latestAlerts(limit = 10) {
    return SystemAlertModel.latest(limit);
  }
}

export default new MonitoringService();
