import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';

/**
 * DocumentParser
 *
 * Minimal Hour 2 implementation that supports:
 *  - PDF parsing via pdf-parse
 *  - Plain text files via utf-8 read
 *  - DOCX fallback to plain text (using docx package is optional here)
 */
export default class DocumentParser {
  static async parse(filePath, documentType) {
    const ext = (documentType || path.extname(filePath).slice(1)).toLowerCase();

    switch (ext) {
      case 'pdf':
        return this.parsePdf(filePath);
      case 'txt':
        return this.parseText(filePath);
      case 'docx':
        return this.parseDocx(filePath);
      default:
        throw new Error(`Unsupported document type: ${ext}`);
    }
  }

  static async parsePdf(filePath) {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);

    return {
      text: data.text || '',
      pages: data.numpages || 0
    };
  }

  static async parseText(filePath) {
    const text = await fs.readFile(filePath, 'utf8');
    return {
      text,
      pages: 1
    };
  }

  static async parseDocx(filePath) {
    try {
      const { readFile } = await import('docx');
      const doc = await readFile(filePath);
      const text = doc.paragraphs?.map((p) => p.text).join('\n') || '';

      return {
        text,
        pages: doc.paragraphs?.length || 0
      };
    } catch (error) {
      throw new Error(`DOCX parsing requires optional dependency: ${error.message}`);
    }
  }

  static chunkText(text, options = {}) {
    const chunkSize = options.chunkSize || 1200;
    const overlap = options.overlap || 200;
    const words = text.split(/\s+/);
    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const slice = words.slice(i, i + chunkSize).join(' ').trim();
      if (slice.length) {
        chunks.push(slice);
      }
    }

    return chunks;
  }
}
