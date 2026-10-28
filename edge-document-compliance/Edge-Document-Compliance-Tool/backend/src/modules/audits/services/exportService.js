/**
 * Export Service
 * Handles audit export in multiple formats (JSON, XLSX, PDF)
 */

import ExcelJS from 'exceljs';
import { getAuditById, getAuditItems } from '../storage/auditRepository.js';
import { query } from '../../../database/connection.js';

/**
 * Export audit as JSON
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} - Audit data as JSON
 */
export async function exportAuditJSON(auditId, tenantId) {
  const audit = await getAuditById(auditId, tenantId);
  if (!audit) {
    throw new Error('Audit not found');
  }

  const items = await getAuditItems(auditId, tenantId);
  const responsesResult = await query(
    'SELECT * FROM audits.audit_responses WHERE audit_id = $1',
    [auditId]
  );
  const responses = responsesResult.rows;

  const evidenceResult = await query(
    'SELECT * FROM audits.audit_evidence WHERE audit_id = $1',
    [auditId]
  );
  const evidence = evidenceResult.rows;

  return {
    audit,
    items,
    responses,
    evidence,
    exportedAt: new Date().toISOString()
  };
}

/**
 * Export audit as XLSX
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Buffer>} - Excel file buffer
 */
export async function exportAuditXLSX(auditId, tenantId) {
  const audit = await getAuditById(auditId, tenantId);
  if (!audit) {
    throw new Error('Audit not found');
  }

  const items = await getAuditItems(auditId, tenantId);
  const responsesResult = await query(
    `SELECT ar.*, ai.requirement_ref, ai.question
     FROM audits.audit_responses ar
     JOIN audits.audit_items ai ON ar.audit_item_id = ai.id
     WHERE ar.audit_id = $1`,
    [auditId]
  );
  const responses = responsesResult.rows;
  const responseMap = new Map(responses.map(r => [r.audit_item_id, r]));

  const workbook = new ExcelJS.Workbook();

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Audit Title', audit.title]);
  summarySheet.addRow(['Status', audit.status]);
  summarySheet.addRow(['Created', new Date(audit.created_at).toLocaleDateString()]);
  if (audit.due_date) {
    summarySheet.addRow(['Due Date', new Date(audit.due_date).toLocaleDateString()]);
  }
  summarySheet.addRow(['Total Items', items.length]);
  summarySheet.addRow(['Responses', responses.length]);

  // Checklist sheet
  const checklistSheet = workbook.addWorksheet('Checklist');
  checklistSheet.columns = [
    { header: 'Section', key: 'section', width: 25 },
    { header: 'Reference', key: 'ref', width: 20 },
    { header: 'Requirement', key: 'requirement', width: 60 },
    { header: 'Question', key: 'question', width: 60 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Response', key: 'response', width: 60 }
  ];

  // Group items by section
  const sections = new Map();
  for (const item of items) {
    const section = item.grouping_section || 'Other';
    if (!sections.has(section)) {
      sections.set(section, []);
    }
    sections.get(section).push(item);
  }

  // Add rows grouped by section
  for (const [section, sectionItems] of sections.entries()) {
    checklistSheet.addRow({
      section: section,
      ref: '',
      requirement: '',
      question: '',
      status: '',
      response: ''
    });
    checklistSheet.lastRow.font = { bold: true };

    for (const item of sectionItems) {
      const response = responseMap.get(item.id);
      checklistSheet.addRow({
        section: '',
        ref: item.requirement_ref,
        requirement: item.requirement_text.substring(0, 500),
        question: item.question,
        status: response?.conformance_status || 'PENDING',
        response: response?.response_text || ''
      });
    }
  }

  // Format header row
  checklistSheet.getRow(1).font = { bold: true };
  checklistSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Export audit as PDF (stub - would use pdf-lib or similar)
 * @param {string} auditId - Audit ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Buffer>} - PDF file buffer
 */
export async function exportAuditPDF(auditId, tenantId) {
  // TODO: Implement PDF export using pdf-lib or similar
  // For now, return a placeholder
  throw new Error('PDF export not yet implemented. Use JSON or XLSX format.');
}
