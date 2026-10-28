/**
 * CAPA System Service
 * Links gap findings to corrective & preventive actions with tracking
 */

import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

class CAPASystem {
  constructor() {}

  async generateCAPAFromGap(gapId, customerId, clauseId) {
    console.log(`[CAPA] Generating CAPA from gap ${gapId}...`);

    // Use clause + correlation matrix as gap context
    const gap = await query(
      `SELECT pc.id as clause_id,
              pc.clause_number,
              pc.clause_title,
              pc.clause_text,
              pc.common_gaps,
              pc.why_it_matters,
              pc.intent,
              ccm.compliance_status,
              ccm.gap_description,
              ccm.gap_severity
       FROM parsed_clauses pc
       LEFT JOIN clause_correlation_matrix ccm
         ON pc.id = ccm.clause_id AND ccm.tenant_id = $1
       WHERE pc.id = $2`,
      [customerId, clauseId]
    );

    if (!gap.rows.length) {
      throw new Error('Gap / clause not found');
    }

    const g = gap.rows[0];
    const capaId = uuidv4();
    const capaNumber = await this.generateCAPANumber();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO capa_records
       (id, capa_number, customer_id, gap_id, clause_id,
        title, description, root_cause, source_type,
        status, priority, due_date, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        capaId,
        capaNumber,
        customerId,
        gapId,
        clauseId,
        `Address Gap: ${g.clause_number} - ${g.clause_title}`,
        g.gap_description || g.common_gaps || 'Gap identified during compliance analysis',
        'Procedure/control not established or documented',
        'compliance_gap_analysis',
        'open',
        g.gap_severity || 'high',
        dueDate,
        'EDCAT_AI',
        new Date()
      ]
    );

    const action = await this.generateRecommendedAction(g);

    await query(
      `INSERT INTO capa_actions
       (id, capa_id, action_sequence, description, responsible_person,
        target_completion, action_type, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        uuidv4(),
        capaId,
        1,
        action.description,
        action.responsible || 'Quality Manager',
        action.targetDate,
        'corrective',
        'open',
        new Date()
      ]
    );

    await query(
      `INSERT INTO capa_effectiveness_checks
       (id, capa_id, planned_check_date, check_method, acceptance_criteria, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        uuidv4(),
        capaId,
        new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        'Document review + procedure confirmation',
        `${g.clause_number} control established and documented`,
        'pending',
        new Date()
      ]
    );

    console.log(`[CAPA] Created: ${capaNumber}`);

    return {
      capaId,
      capaNumber,
      status: 'open',
      dueDate
    };
  }

  async generateCAPANumber() {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM capa_records
       WHERE created_at > NOW() - INTERVAL '1 year'`
    );
    const year = new Date().getFullYear();
    const sequence = Number(result.rows[0].count || 0) + 1;
    return `CAPA-${year}-${String(sequence).padStart(4, '0')}`;
  }

  async generateRecommendedAction(gap) {
    const actions = {
      Policy: {
        description: `Create and approve policy document covering: ${gap.clause_title}. Policy must address: ${gap.why_it_matters || gap.intent || ''}`,
        responsible: 'Quality Manager',
        days: 14
      },
      Procedure: {
        description: `Document procedure for ${gap.clause_number}. Include steps, responsibilities, and evidence collection.`,
        responsible: 'Department Head + Quality Manager',
        days: 21
      },
      'Work Instruction': {
        description: `Create work instructions for operational steps required by ${gap.clause_number}.`,
        responsible: 'Department Head + Operator',
        days: 14
      },
      'Form/Record': {
        description: `Design form to collect evidence that ${gap.clause_number} is being followed.`,
        responsible: 'Quality Manager',
        days: 7
      },
      Training: {
        description: `Develop and deliver training on ${gap.clause_number}. All personnel must understand this control and their role.`,
        responsible: 'Training Coordinator',
        days: 21
      }
    };

    const type = gap.requirement_type || 'Procedure';
    const selected = actions[type] || actions.Procedure;

    return {
      description: selected.description,
      responsible: selected.responsible,
      targetDate: new Date(Date.now() + selected.days * 24 * 60 * 60 * 1000)
    };
  }

  async updateCAPAStatus(capaId, status, notes) {
    await query(
      `UPDATE capa_records
       SET status = $1, last_updated = NOW(), notes = COALESCE(notes,'') || $2
       WHERE id = $3`,
      [status, notes ? `\n${notes}` : '', capaId]
    );
  }

  async getCAPADashboard(customerId) {
    const allCAPAs = await query(
      `SELECT * FROM capa_records
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [customerId]
    );

    const byStatus = await query(
      `SELECT status, COUNT(*) as count
       FROM capa_records
       WHERE customer_id = $1
       GROUP BY status`,
      [customerId]
    );

    const overdue = await query(
      `SELECT *
       FROM capa_records
       WHERE customer_id = $1
         AND due_date IS NOT NULL
         AND due_date < NOW()
         AND status <> 'closed'
       ORDER BY due_date ASC`,
      [customerId]
    );

    const effectiveness = await query(
      `SELECT capa_id, status
       FROM capa_effectiveness_checks
       WHERE capa_id IN (SELECT id FROM capa_records WHERE customer_id = $1)
         AND status = 'failed'`,
      [customerId]
    );

    const avgClosureTime = await this.calculateAvgClosureTime(customerId);
    const effectivenessRate = await this.calculateEffectivenessRate(customerId);

    return {
      totalCAPAs: allCAPAs.rows.length,
      statusBreakdown: byStatus.rows,
      overdueCAPAs: overdue.rows,
      failedEffectivenessChecks: effectiveness.rows.length,
      efficiency: {
        avgClosureTime,
        effectivenessRate
      }
    };
  }

  async calculateAvgClosureTime(customerId) {
    const result = await query(
      `SELECT AVG(EXTRACT(DAY FROM closed_at - created_at)) as avg_days
       FROM capa_records
       WHERE customer_id = $1 AND status = 'closed' AND closed_at IS NOT NULL`,
      [customerId]
    );
    return Math.round(result.rows[0]?.avg_days || 0);
  }

  async calculateEffectivenessRate(customerId) {
    const result = await query(
      `SELECT
         (SELECT COUNT(*) FROM capa_effectiveness_checks cec
          JOIN capa_records cr ON cec.capa_id = cr.id
          WHERE cr.customer_id = $1 AND cec.status = 'passed') as passed,
         (SELECT COUNT(*) FROM capa_effectiveness_checks cec
          JOIN capa_records cr ON cec.capa_id = cr.id
          WHERE cr.customer_id = $1) as total`,
      [customerId]
    );
    const r = result.rows[0] || { passed: 0, total: 0 };
    if (!r.total) return 0;
    return Math.round((Number(r.passed) / Number(r.total)) * 100);
  }
}

export default CAPASystem;


