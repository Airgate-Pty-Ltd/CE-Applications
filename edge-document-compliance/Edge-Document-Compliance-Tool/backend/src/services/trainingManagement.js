/**
 * Training Management & Competency Tracking
 */

import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

class TrainingManagement {
  async createTrainingFromProcedure(procedureId, audience, customerId) {
    console.log(`[Training] Creating training for procedure ${procedureId}...`);

    const procedure = await query(
      `SELECT cp.id as procedure_id,
              cp.procedure_text,
              cd.customer_name
       FROM customer_procedures cp
       JOIN customer_documents cd ON cp.document_id = cd.id
       WHERE cp.id = $1`,
      [procedureId]
    );

    if (!procedure.rows.length) throw new Error('Procedure not found');
    const p = procedure.rows[0];

    const trainingUuid = uuidv4();
    const trainingId = await this.generateTrainingId();

    await query(
      `INSERT INTO training_records
       (id, training_id, customer_id, procedure_id, title, description,
        audience, required_roles, training_type, status, scheduled_date, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        trainingUuid,
        trainingId,
        customerId,
        procedureId,
        `Training: Procedure ${procedureId}`,
        `Personnel must understand: ${(p.procedure_text || '').substring(0, 200)}...`,
        audience || 'All Personnel',
        JSON.stringify(audience ? [audience] : ['All']),
        'compliance_requirement',
        'scheduled',
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        new Date()
      ]
    );

    return { trainingUuid, trainingId };
  }

  async recordTrainingCompletion(trainingUuid, employeeId, score, passed) {
    console.log(`[Training] Recording completion for training ${trainingUuid} employee ${employeeId}...`);

    await query(
      `INSERT INTO training_completions
       (id, training_id, employee_id, score, passed, completed_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        uuidv4(),
        trainingUuid,
        employeeId,
        score,
        passed,
        new Date(),
        new Date()
      ]
    );

    await this.updateCompetency(employeeId, trainingUuid, passed ? 'competent' : 'needs_review');
  }

  async updateCompetency(employeeId, trainingUuid, level) {
    const training = await query(
      'SELECT title FROM training_records WHERE id = $1',
      [trainingUuid]
    );

    const title = training.rows[0]?.title || 'Training';

    await query(
      `INSERT INTO employee_competencies
       (employee_id, training_id, skill_area, competency_level, verified_date, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (employee_id, training_id) DO UPDATE
       SET competency_level = EXCLUDED.competency_level,
           verified_date = EXCLUDED.verified_date`,
      [
        employeeId,
        trainingUuid,
        title,
        level,
        new Date(),
        new Date()
      ]
    );
  }

  async getCompetencyMatrix(customerId) {
    const matrix = await query(
      `SELECT
         emp.id as employee_uuid,
         emp.employee_id,
         emp.employee_name,
         emp.department,
         COUNT(DISTINCT ec.training_id) as trainings_completed,
         SUM(CASE WHEN ec.competency_level = 'competent' THEN 1 ELSE 0 END) as competent_count,
         SUM(CASE WHEN ec.competency_level = 'needs_review' THEN 1 ELSE 0 END) as needs_review_count
       FROM employees emp
       LEFT JOIN employee_competencies ec ON emp.id = ec.employee_id
       WHERE emp.customer_id = $1
       GROUP BY emp.id, emp.employee_id, emp.employee_name, emp.department
       ORDER BY emp.department, emp.employee_name`,
      [customerId]
    );

    return matrix.rows;
  }

  async identifyTrainingGaps(customerId, standardId) {
    const gaps = [];

    const required = await query(
      `SELECT DISTINCT pc.clause_number, pc.clause_title, pc.requirement_type
       FROM parsed_clauses pc
       WHERE pc.standard_id = $1`,
      [standardId]
    );

    const employees = await query(
      `SELECT id FROM employees WHERE customer_id = $1`,
      [customerId]
    );

    for (const emp of employees.rows) {
      for (const req of required.rows) {
        const hasTraining = await query(
          `SELECT COUNT(*) as count
           FROM employee_competencies ec
           JOIN training_records tr ON ec.training_id = tr.id
           WHERE ec.employee_id = $1 AND tr.title ILIKE $2`,
          [emp.id, `%${req.clause_number}%`]
        );

        if (Number(hasTraining.rows[0].count || 0) === 0) {
          gaps.push({
            employeeId: emp.id,
            requirement: req.clause_number,
            trainingNeeded: req.clause_title,
            priority: 'high'
          });
        }
      }
    }

    return gaps;
  }

  async generateTrainingId() {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM training_records
       WHERE created_at > NOW() - INTERVAL '1 year'`
    );
    const year = new Date().getFullYear();
    const seq = Number(result.rows[0].count || 0) + 1;
    return `TRN-${year}-${String(seq).padStart(4, '0')}`;
  }
}

export default TrainingManagement;


