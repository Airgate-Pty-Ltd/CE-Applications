/**
 * Document Drafting Engine
 * Auto-generates procedures, work instructions, forms from clauses
 */

import { Document, Paragraph, Table, TableRow, TableCell, HeadingLevel, AlignmentType, TextRun } from 'docx';
import { query } from '../database/connection.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentDraftingEngine {
  constructor() {
    this.outputDir = path.join(__dirname, '../../../generated-documents');
  }

  /**
   * Generate document from clause
   * @param {string} clauseId - Clause UUID
   * @param {string} documentType - 'procedure', 'workInstruction', 'form', 'policy'
   * @param {string} companyName - Company name for header
   * @returns {Promise<Object>} File info {fileName, filePath, format, type}
   */
  async generateDocument(clauseId, documentType, companyName = 'Your Organization') {
    const clause = await query(
      'SELECT * FROM parsed_clauses WHERE id = $1',
      [clauseId]
    );

    if (!clause.rows.length) {
      throw new Error('Clause not found');
    }

    const c = clause.rows[0];

    switch (documentType) {
      case 'procedure':
        return await this.generateProcedure(c, companyName);
      case 'workInstruction':
        return await this.generateWorkInstruction(c, companyName);
      case 'form':
        return await this.generateForm(c, companyName);
      case 'policy':
        return await this.generatePolicy(c, companyName);
      default:
        throw new Error(`Unknown document type: ${documentType}`);
    }
  }

  async generateProcedure(clause, companyName) {
    const sections = [];

    // Title
    sections.push(
      new Paragraph({
        text: `PROCEDURE: ${clause.clause_title || clause.clause_number}`,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Header info table
    sections.push(
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Organization:')] }),
              new TableCell({ children: [new Paragraph(companyName)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Clause Reference:')] }),
              new TableCell({ children: [new Paragraph(clause.clause_number)] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Document Status:')] }),
              new TableCell({ children: [new Paragraph('Draft - For Review')] })
            ]
          })
        ]
      })
    );

    sections.push(new Paragraph({ text: '' }));

    // 1. Purpose
    sections.push(
      new Paragraph({
        text: '1. PURPOSE',
        heading: HeadingLevel.HEADING_2
      })
    );

    sections.push(
      new Paragraph({
        text: clause.why_it_matters || `To satisfy the requirements of ${clause.clause_number}`,
        spacing: { after: 400 }
      })
    );

    // 2. Scope
    sections.push(
      new Paragraph({
        text: '2. SCOPE',
        heading: HeadingLevel.HEADING_2
      })
    );

    sections.push(
      new Paragraph({
        text: 'This procedure applies to all departments and personnel involved in [CUSTOMIZE]',
        spacing: { after: 400 }
      })
    );

    // 3. Requirements
    sections.push(
      new Paragraph({
        text: '3. REQUIREMENTS',
        heading: HeadingLevel.HEADING_2
      })
    );

    sections.push(
      new Paragraph({
        text: clause.clause_text.substring(0, 500),
        spacing: { after: 400 }
      })
    );

    // 4. Responsibilities
    sections.push(
      new Paragraph({
        text: '4. RESPONSIBILITIES',
        heading: HeadingLevel.HEADING_2
      })
    );

    sections.push(
      new Paragraph({
        text: 'Define who is responsible for each step [CUSTOMIZE]',
        spacing: { after: 400 }
      })
    );

    // 5. Procedure Steps
    sections.push(
      new Paragraph({
        text: '5. PROCEDURE',
        heading: HeadingLevel.HEADING_2
      })
    );

    sections.push(new Paragraph({ text: 'Step 1: [CUSTOMIZE] – [describe action]' }));
    sections.push(new Paragraph({ text: 'Step 2: [CUSTOMIZE] – [describe action]' }));
    sections.push(new Paragraph({ text: 'Step 3: [CUSTOMIZE] – [describe action]', spacing: { after: 400 } }));

    // 6. Evidence
    sections.push(
      new Paragraph({
        text: '6. EVIDENCE / RECORDS',
        heading: HeadingLevel.HEADING_2
      })
    );

    sections.push(new Paragraph({ text: 'Evidence that this procedure is followed:', spacing: { after: 200 } }));
    sections.push(new Paragraph({ text: '• Form [CUSTOMIZE]' }));
    sections.push(new Paragraph({ text: '• Record [CUSTOMIZE]' }));
    sections.push(new Paragraph({ text: '• System entry [CUSTOMIZE]', spacing: { after: 400 } }));

    // 7. References
    sections.push(
      new Paragraph({
        text: '7. REFERENCES',
        heading: HeadingLevel.HEADING_2
      })
    );

    sections.push(new Paragraph({ text: `• ${clause.authority_source || 'Standard'} – Clause ${clause.clause_number}` }));

    // 8. Approvals
    sections.push(
      new Paragraph({
        text: '8. APPROVALS',
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: true
      })
    );

    sections.push(
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Role')] }),
              new TableCell({ children: [new Paragraph('Name / Signature')] }),
              new TableCell({ children: [new Paragraph('Date')] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Quality Manager')] }),
              new TableCell({ children: [new Paragraph('_________________')] }),
              new TableCell({ children: [new Paragraph('_________________')] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Department Head')] }),
              new TableCell({ children: [new Paragraph('_________________')] }),
              new TableCell({ children: [new Paragraph('_________________')] })
            ]
          })
        ]
      })
    );

    const doc = new Document({ sections: [{ children: sections }] });

    const fileName = `PROC_${clause.clause_number.replace(/[\/\.]/g, '-')}_${companyName.replace(/\s+/g, '_')}.docx`;
    const filePath = path.join(this.outputDir, fileName);

    await fs.mkdir(this.outputDir, { recursive: true });
    const buffer = await doc.save();
    await fs.writeFile(filePath, buffer);

    return { fileName, filePath, format: 'docx', type: 'procedure' };
  }

  async generateWorkInstruction(clause, companyName) {
    // Similar structure but more operational/step-by-step
    return await this.generateProcedure(clause, companyName); // Simplified for now
  }

  async generateForm(clause, companyName) {
    // Form template with fields to collect evidence
    return await this.generateProcedure(clause, companyName); // Simplified for now
  }

  async generatePolicy(clause, companyName) {
    // Policy-level document (higher level than procedure)
    return await this.generateProcedure(clause, companyName); // Simplified for now
  }
}

export default DocumentDraftingEngine;

