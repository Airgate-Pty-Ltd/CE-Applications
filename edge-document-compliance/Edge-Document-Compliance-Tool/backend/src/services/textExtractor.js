/**
 * Text Extractor Service
 * Extracts text from PDF, Word, Excel, and TXT files
 */

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import XLSX from 'xlsx';

class TextExtractor {
  /**
   * Extract text from a file
   * @param {string} filePath - Full path to file
   * @returns {Promise<string>} Extracted text
   */
  async extractFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.pdf':
        return await this.extractFromPDF(filePath);
      case '.docx':
      case '.doc':
        return await this.extractFromWord(filePath);
      case '.xlsx':
      case '.xls':
        return await this.extractFromExcel(filePath);
      case '.txt':
        return fs.readFileSync(filePath, 'utf-8');
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  async extractFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text || '';
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  async extractFromWord(filePath) {
    try {
      const { value } = await mammoth.extractRawText({ path: filePath });
      return value || '';
    } catch (error) {
      throw new Error(`Word extraction failed: ${error.message}`);
    }
  }

  async extractFromExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      let text = '';

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        text += `\n=== Sheet: ${sheetName} ===\n`;
        text += csv;
      });

      return text || '';
    } catch (error) {
      throw new Error(`Excel extraction failed: ${error.message}`);
    }
  }
}

export default TextExtractor;

