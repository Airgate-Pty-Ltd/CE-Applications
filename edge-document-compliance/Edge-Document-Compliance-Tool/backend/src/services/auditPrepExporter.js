/**
 * Audit Readiness Exporter
 * Generates audit checklist and highlights high-risk areas
 */

import { Document, Paragraph, Table, TableRow, TableCell, HeadingLevel, AlignmentType } from 'docx';
import { query } from '../database/connection.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AuditPrepExporter {
  constructor() {
    this.outputDir = path.join(__dirname, '../../../reports');
  }

  /**
   * Generate audit readiness checklist
   * @param {string} customerId - Tenant UUID
   * @param {string} standardId - Standard UUID
   * @returns {Promise<Object>} File info + metadata
   */
  async generateAuditReadinessChecklist(customerId, standardId) {
    const standard = await query(
      'SELECT * FROM standards WHERE id = $1',
      [standardId]
    );

    if (!standard.rows.length) {
      throw new Error('Standard not found');
    }

    const clauses = await query(
      `SELECT * FROM parsed_clauses WHERE standard_id = $1 ORDER BY clause_number`,
      [standardId]
    );

    // Identify high-risk clauses (most commonly gapped)
    const highRiskClauses = await query(
      `SELECT pc.clause_number, pc.clause_title, pc.common_gaps,
              COUNT(ccm.id) as gap_frequency
       FROM parsed_clauses pc
       LEFT JOIN clause_correlation_matrix ccm ON pc.id = ccm.clause_id
       WHERE pc.standard_id = $1 AND (ccm.compliance_status = 'none' OR ccm.compliance_status = 'partial')
       GROUP BY pc.clause_number, pc.clause_title, pc.common_gaps
       ORDER BY gap_frequency DESC
       LIMIT 10`,
      [standardId]
    );

    const sections = [];

    // Title
    sections.push(
      new Paragraph({
        text: 'AUDIT READINESS CHECKLIST',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // High-Risk Areas
    sections.push(
      new Paragraph({
        text: '🎯 HIGH-RISK CLAUSES (Focus Here)',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
      })
    );

    highRiskClauses.rows.forEach((clause, i) => {
      sections.push(
        new Paragraph({
          text: `${i + 1}. Clause ${clause.clause_number}: ${clause.clause_title}`,
          spacing: { after: 100 }
        })
      );

      sections.push(
        new Paragraph({
          text: `Common Gap: ${clause.common_gaps || 'N/A'}`,
          spacing: { after: 400 }
        })
      );
    });

    // Full Checklist
    sections.push(
      new Paragraph({
        text: 'ALL CLAUSE CHECKLIST',
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: true,
        spacing: { after: 200 }
      })
    );

    // Build checklist table
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('☐')] }),
          new TableCell({ children: [new Paragraph('Clause')] }),
          new TableCell({ children: [new Paragraph('Description')] }),
          new TableCell({ children: [new Paragraph('Evidence')] }),
          new TableCell({ children: [new Paragraph('Status')] })
        ]
      })
    ];

    clauses.rows.forEach(clause => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('☐')] }),
            new TableCell({ children: [new Paragraph(clause.clause_number)] }),
            new TableCell({ children: [new Paragraph(clause.clause_title || 'N/A')] }),
            new TableCell({ children: [new Paragraph('[document type]')] }),
            new TableCell({ children: [new Paragraph('[Ready/In Progress/Gap]')] })
          ]
        })
      );
    });

    sections.push(new Table({ rows: tableRows }));

    const doc = new Document({ sections: [{ children: sections }] });

    const fileName = `audit_readiness_${standard.rows[0].code}_${Date.now()}.docx`;
    const filePath = path.join(this.outputDir, fileName);

    await fs.mkdir(this.outputDir, { recursive: true });
    const buffer = await doc.save();
    await fs.writeFile(filePath, buffer);

    return {
      fileName,
      filePath,
      format: 'docx',
      overallReadiness: '65%', // Placeholder
      top10RiskClauses: highRiskClauses.rows
    };
  }
}

export default AuditPrepExporter;

