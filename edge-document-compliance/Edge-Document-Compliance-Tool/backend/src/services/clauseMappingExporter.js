/**
 * Clause Cross-Mapping Exporter
 * Compares two standards and exports side-by-side clause mapping
 */

import ExcelJS from 'exceljs';
import { query } from '../database/connection.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ClauseMappingExporter {
  constructor() {
    this.outputDir = path.join(__dirname, '../../../reports');
  }

  /**
   * Compare two standards and export mapping
   * @param {string} standardId1 - First standard UUID
   * @param {string} standardId2 - Second standard UUID
   * @returns {Promise<Object>} File info {fileName, filePath, format}
   */
  async generateClauseMapping(standardId1, standardId2) {
    const standard1 = await this.getStandardClauses(standardId1);
    const standard2 = await this.getStandardClauses(standardId2);

    return await this.generateMappingExcel(standard1, standard2);
  }

  async getStandardClauses(standardId) {
    const result = await query(
      `SELECT id, standard_id, clause_number, clause_title, clause_text, intent
       FROM parsed_clauses
       WHERE standard_id = $1
       ORDER BY clause_number`,
      [standardId]
    );

    const standard = await query(
      'SELECT code, name FROM standards WHERE id = $1',
      [standardId]
    );

    return {
      meta: standard.rows[0],
      clauses: result.rows
    };
  }

  async generateMappingExcel(standard1, standard2) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Clause Mapping');

    // Headers
    sheet.columns = [
      { header: `${standard1.meta.code} Clause`, key: 'clause1', width: 15 },
      { header: `${standard1.meta.code} Title`, key: 'title1', width: 35 },
      { header: 'Mapping Type', key: 'mappingType', width: 12 },
      { header: `${standard2.meta.code} Clause`, key: 'clause2', width: 15 },
      { header: `${standard2.meta.code} Title`, key: 'title2', width: 35 }
    ];

    // Build mapping rows
    for (const clause1 of standard1.clauses) {
      const matches = this.findRelatedClauses(clause1, standard2.clauses);

      if (matches.exact) {
        sheet.addRow({
          clause1: clause1.clause_number,
          title1: clause1.clause_title,
          mappingType: 'Equivalent',
          clause2: matches.exact.clause_number,
          title2: matches.exact.clause_title
        });
      } else if (matches.partial && matches.partial.length > 0) {
        matches.partial.forEach(m => {
          sheet.addRow({
            clause1: clause1.clause_number,
            title1: clause1.clause_title,
            mappingType: 'Related',
            clause2: m.clause_number,
            title2: m.clause_title
          });
        });
      } else {
        sheet.addRow({
          clause1: clause1.clause_number,
          title1: clause1.clause_title,
          mappingType: 'No Match',
          clause2: '—',
          title2: '(No equivalent clause)'
        });
      }
    }

    // Apply formatting
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };

    const fileName = `clause_mapping_${standard1.meta.code}_vs_${standard2.meta.code}_${Date.now()}.xlsx`;
    const filePath = path.join(this.outputDir, fileName);

    await fs.mkdir(this.outputDir, { recursive: true });
    await workbook.xlsx.writeFile(filePath);

    return { fileName, filePath, format: 'xlsx' };
  }

  findRelatedClauses(clause, targetClauses) {
    // Try to find exact match by intent
    const exact = targetClauses.find(c =>
      this.calculateSimilarity(clause.intent || '', c.intent || '') > 0.85
    );

    if (exact) return { exact };

    // Find partial matches
    const partial = targetClauses.filter(c =>
      this.calculateSimilarity(clause.clause_text || '', c.clause_text || '') > 0.60
    ).slice(0, 2);

    return { partial: partial.length > 0 ? partial : null };
  }

  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = words1.size + words2.size - intersection;

    return union > 0 ? intersection / union : 0;
  }
}

export default ClauseMappingExporter;

