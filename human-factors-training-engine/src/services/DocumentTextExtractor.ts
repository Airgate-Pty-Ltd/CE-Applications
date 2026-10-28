/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import path from 'node:path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.csv', '.json']);
const BINARY_MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const MAX_EXTRACTED_CHARACTERS = 5_000_000;
const MAX_PDF_PAGES = 500;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_WORKSHEET_CELLS = 100_000;

type XmlValue = string | number | boolean | null | undefined | XmlNode | XmlValue[];
interface XmlNode { [key: string]: XmlValue }

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function xmlText(value: XmlValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(xmlText).join('');
  if (typeof value === 'object') {
    if ('#text' in value) return xmlText(value['#text']);
    if ('t' in value) return xmlText(value.t);
    if ('r' in value) return xmlText(value.r);
  }
  return '';
}

function guardExtractedText(text: string): string {
  const normalized = text.replace(/\u0000/g, '').trim();
  if (!normalized) throw new Error('Document contains no extractable text.');
  if (normalized.length > MAX_EXTRACTED_CHARACTERS) {
    throw new Error(`Extracted text exceeds the ${MAX_EXTRACTED_CHARACTERS}-character safety limit.`);
  }
  return normalized;
}

function neutralizeSpreadsheetFormula(value: string): string {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function extractXlsx(content: Buffer): string {
  let uncompressedBytes = 0;
  const archive = unzipSync(content, {
    filter(file) {
      uncompressedBytes += file.originalSize;
      if (uncompressedBytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
        throw new Error('Spreadsheet archive exceeds the uncompressed-size safety limit.');
      }
      return file.name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(file.name);
    },
  });
  const parser = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    maxNestedTags: 100,
  });
  const sharedDocument = archive['xl/sharedStrings.xml']
    ? parser.parse(Buffer.from(archive['xl/sharedStrings.xml']).toString('utf8')) as XmlNode
    : {};
  const sharedRoot = sharedDocument.sst as XmlNode | undefined;
  const sharedStrings = asArray(sharedRoot?.si).map((item) => xmlText(item));
  const worksheetNames = Object.keys(archive)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  if (worksheetNames.length > 50) throw new Error('Spreadsheet contains more than 50 worksheets.');

  let cellCount = 0;
  const sheets = worksheetNames.map((name, sheetIndex) => {
    const document = parser.parse(Buffer.from(archive[name]).toString('utf8')) as XmlNode;
    const worksheet = document.worksheet as XmlNode | undefined;
    const sheetData = worksheet?.sheetData as XmlNode | undefined;
    const rows = asArray(sheetData?.row).map((rowValue) => {
      const row = rowValue as XmlNode;
      return asArray(row.c).map((cellValue) => {
        cellCount += 1;
        if (cellCount > MAX_WORKSHEET_CELLS) throw new Error('Spreadsheet exceeds the 100000-cell extraction limit.');
        const cell = cellValue as XmlNode;
        const type = typeof cell['@_t'] === 'string' ? cell['@_t'] : '';
        let value = type === 'inlineStr' ? xmlText(cell.is) : xmlText(cell.v);
        if (type === 's') value = sharedStrings[Number(value)] ?? '';
        return neutralizeSpreadsheetFormula(value).replace(/[\t\r\n]+/g, ' ');
      }).join('\t');
    }).filter(Boolean);
    return [`[Worksheet ${sheetIndex + 1}]`, ...rows].join('\n');
  });
  return sheets.join('\n\n');
}

async function assertFileSignature(extension: string, content: Buffer): Promise<string> {
  const isPdf = content.subarray(0, 5).toString('ascii') === '%PDF-';
  const isZip = content.length >= 4 && content[0] === 0x50 && content[1] === 0x4b
    && ((content[2] === 0x03 && content[3] === 0x04) || (content[2] === 0x05 && content[3] === 0x06));
  const archiveNames = isZip ? content.toString('latin1') : '';
  const detected = isPdf ? 'application/pdf'
    : isZip && archiveNames.includes('word/document.xml')
      ? BINARY_MIME_BY_EXTENSION['.docx']
      : isZip && archiveNames.includes('xl/workbook.xml')
        ? BINARY_MIME_BY_EXTENSION['.xlsx']
        : isZip ? 'application/zip' : null;
  if (extension in BINARY_MIME_BY_EXTENSION) {
    const expected = BINARY_MIME_BY_EXTENSION[extension];
    if (detected !== expected) {
      throw new Error(`File signature does not match ${extension}.`);
    }
    return expected;
  }
  if (!TEXT_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported file type ${extension || '(none)'}.`);
  }
  if (detected) throw new Error(`Text extension ${extension} contains binary ${detected} data.`);
  if (content.includes(0)) throw new Error(`Text extension ${extension} contains binary data.`);
  return extension === '.json' ? 'application/json'
    : extension === '.csv' ? 'text/csv'
      : 'text/plain';
}

export async function extractDocumentText(originalName: string, content: Buffer): Promise<{ text: string; mediaType: string }> {
  const extension = path.extname(originalName).toLowerCase();
  const mediaType = await assertFileSignature(extension, content);

  if (TEXT_EXTENSIONS.has(extension)) {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(content);
    if (extension === '.json') JSON.parse(text);
    return { text: guardExtractedText(text), mediaType };
  }
  if (extension === '.docx') {
    const result = await mammoth.extractRawText({ buffer: content });
    return { text: guardExtractedText(result.value), mediaType };
  }
  if (extension === '.xlsx') {
    return { text: guardExtractedText(extractXlsx(content)), mediaType };
  }

  const parser = new PDFParse({ data: new Uint8Array(content) });
  try {
    const info = await parser.getInfo();
    if (info.total > MAX_PDF_PAGES) throw new Error(`PDF exceeds the ${MAX_PDF_PAGES}-page extraction limit.`);
    const result = await parser.getText();
    return { text: guardExtractedText(result.text), mediaType };
  } finally {
    await parser.destroy();
  }
}

export const SUPPORTED_INGESTION_EXTENSIONS = [
  ...TEXT_EXTENSIONS,
  ...Object.keys(BINARY_MIME_BY_EXTENSION),
].sort();
