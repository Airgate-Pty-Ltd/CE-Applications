import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';
import {
  CustomReportTemplateModel,
  CustomReportModel,
  AuditAnalytics
} from '../models/index.js';
import IntegrationService from './IntegrationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_OUTPUT_DIR = process.env.REPORT_OUTPUT_DIR
  ? path.isAbsolute(process.env.REPORT_OUTPUT_DIR)
    ? process.env.REPORT_OUTPUT_DIR
    : path.join(process.cwd(), process.env.REPORT_OUTPUT_DIR)
  : path.join(__dirname, '..', 'reports');

async function ensureOutputDir() {
  await fs.mkdir(REPORT_OUTPUT_DIR, { recursive: true });
}

class ReportBuilderService {
  async listTemplates() {
    return CustomReportTemplateModel.list();
  }

  async createTemplate({ name, description, sections, created_by }) {
    if (!name) throw new Error('Template name required');
    if (!Array.isArray(sections) || !sections.length) {
      throw new Error('At least one section is required');
    }
    return CustomReportTemplateModel.create({ name, description, sections, created_by });
  }

  async generateCustomReport({ template_id, assessment_id, parameters = {}, generated_by = 'system' }) {
    await ensureOutputDir();
    const template = await query('SELECT * FROM custom_report_templates WHERE id = $1', [template_id]).then((res) => res.rows[0]);
    if (!template) throw new Error('Template not found');
    const assessment = assessment_id
      ? await query('SELECT * FROM assessments WHERE id = $1', [assessment_id]).then((res) => res.rows[0])
      : null;

    const reportPayload = {
      template_id,
      assessment_id,
      sections: template.sections,
      parameters,
      generated_at: new Date().toISOString(),
      assessment
    };

    const fileName = `${uuidv4()}-custom-report.json`;
    const filePath = path.join(REPORT_OUTPUT_DIR, fileName);
    await fs.writeFile(filePath, JSON.stringify(reportPayload, null, 2), 'utf8');

    const report = await CustomReportModel.create({
      template_id,
      assessment_id,
      title: template.name,
      parameters,
      generated_by,
      file_path: filePath
    });

    await query(
      `INSERT INTO report_files (id, report_id, file_format, file_path)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), report.id, 'json', filePath]
    );

    await AuditAnalytics.log({
      assessment_id,
      action: 'custom_report_generated',
      details: { template_id, report_id: report.id }
    });

    await IntegrationService.dispatchEvent('report.generated', {
      report_id: report.id,
      template_id,
      assessment_id,
      generated_by,
      file_path: filePath
    });

    return report;
  }

  async listReports(limit = 50) {
    return CustomReportModel.list(limit);
  }
}

export default new ReportBuilderService();
