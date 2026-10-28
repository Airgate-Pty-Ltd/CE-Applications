/**
 * Edcat QMS Integration
 * Orchestrates end-to-end workflow from gaps → CAPA → procedures → training → KPIs
 */

import ClauseCorrelationEngine from './clauseCorrelationEngine.js';
import CAPASystem from './capaSystem.js';
import TrainingManagement from './trainingManagement.js';
import DocumentManagement from './documentManagement.js';
import KPIMetrics from './kpiMetrics.js';
import { query } from '../database/connection.js';

class EdcatQMSIntegration {
  constructor() {
    this.correlation = new ClauseCorrelationEngine();
    this.capa = new CAPASystem();
    this.training = new TrainingManagement();
    this.documents = new DocumentManagement();
    this.kpi = new KPIMetrics();
  }

  /**
   * Complete end-to-end remediation workflow
   */
  async executeCompleteRemediationWorkflow(customerId, standardId) {
    console.log('[QMS] Starting complete remediation workflow...');

    const matrix = await this.correlation.generateCorrelationMatrix(standardId, customerId);
    const gaps = matrix.correlations.filter(c => c.compliance_status !== 'full');

    const topGaps = gaps.slice(0, 10);
    const capas = [];
    const procedures = [];

    for (const gap of topGaps) {
      const capa = await this.capa.generateCAPAFromGap(
        null,
        customerId,
        gap.clause_id
      );
      capas.push(capa);

      const procedure = await this.documents.createDocument(
        customerId,
        `Procedure for ${gap.clause_number}`,
        `[Draft procedure template]\n${gap.clause_text || ''}`,
        'procedure',
        gap.clause_number
      );
      procedures.push(procedure);

      await this.training.createTrainingFromProcedure(
        null,
        'All Affected Personnel',
        customerId
      );
    }

    const kpis = await this.kpi.calculateQMSKPIs(customerId);

    return {
      workflow: 'complete_remediation',
      capasCreated: capas.length,
      proceduresCreated: procedures.length,
      trainingsCreated: procedures.length,
      nextSteps: [
        `Review ${capas.length} CAPA records and assign owners`,
        `Customize ${procedures.length} procedure templates`,
        `Schedule training for all affected personnel`,
        `Track CAPA closure and effectiveness`,
        `Monitor KPI dashboard for improvements`
      ],
      kpiBaseline: kpis.metrics
    };
  }

  /**
   * Generate audit trail for QMS activity
   */
  async generateAuditTrail(customerId, standardId) {
    const trail = {
      timestamp: new Date(),
      customerId,
      standardId,
      events: []
    };

    const analyses = await query(
      `SELECT * FROM gap_analyses
       WHERE customer_id = $1 AND standard_id = $2
       ORDER BY analyzed_at DESC`,
      [customerId, standardId]
    );
    trail.events.push(
      ...analyses.rows.map(a => ({
        type: 'gap_analysis',
        date: a.analyzed_at,
        details: `${a.covered_requirements}/${a.total_requirements} requirements covered`
      }))
    );

    const capas = await query(
      `SELECT * FROM capa_records WHERE customer_id = $1`,
      [customerId]
    );
    trail.events.push(
      ...capas.rows.map(c => ({
        type: 'capa_created',
        date: c.created_at,
        details: `CAPA ${c.capa_number}: ${c.title}`
      }))
    );

    const trainings = await query(
      `SELECT * FROM training_records WHERE customer_id = $1`,
      [customerId]
    );
    trail.events.push(
      ...trainings.rows.map(t => ({
        type: 'training_created',
        date: t.created_at,
        details: `Training: ${t.title}`
      }))
    );

    const docs = await query(
      `SELECT * FROM qms_documents WHERE customer_id = $1`,
      [customerId]
    );
    trail.events.push(
      ...docs.rows.map(d => ({
        type: 'document_released',
        date: d.released_at || d.created_at,
        details: `${d.doc_number} v${d.version}: ${d.title}`
      }))
    );

    trail.events.sort((a, b) => new Date(b.date) - new Date(a.date));

    return trail;
  }
}

export default EdcatQMSIntegration;


