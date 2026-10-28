import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';
import DocxReportBuilder from './DocxReportBuilder.js';

class ReportService {
  async generateExecutiveSummary(assessmentId, generatedBy = 'system') {
    const assessmentRes = await query('SELECT * FROM assessments WHERE id = $1', [assessmentId]);
    if (!assessmentRes.rows.length) {
      throw new Error('Assessment not found');
    }

    const assessment = assessmentRes.rows[0];
    const customerRes = await query('SELECT * FROM customers WHERE id = $1', [assessment.customer_id]);
    const customer = customerRes.rows[0];

    const documentRes = await query(
      'SELECT document_name, parse_status, last_parsed FROM documents WHERE assessment_id = $1',
      [assessmentId]
    );

    const summary = {
      assessmentName: assessment.assessment_name,
      customer: customer?.org_name || 'Unknown',
      status: assessment.status,
      documents: documentRes.rows
    };

    const docxPath = await DocxReportBuilder.generate(summary);

    const retention = new Date();
    retention.setFullYear(retention.getFullYear() + 10);

    const reportId = uuidv4();
    const insertReport = await query(
      `INSERT INTO reports (id, assessment_id, customer_id, report_type, report_title, generated_by, content, retention_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        reportId,
        assessmentId,
        assessment.customer_id,
        'executive_summary',
        `${assessment.assessment_name} - Executive Summary`,
        generatedBy,
        JSON.stringify(summary),
        retention
      ]
    );

    await query(
      `INSERT INTO report_files (id, report_id, file_format, file_path)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), reportId, 'docx', docxPath]
    );

    return insertReport.rows[0];
  }
}

export default new ReportService();
