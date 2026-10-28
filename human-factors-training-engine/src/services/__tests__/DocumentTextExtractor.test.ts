/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { zipSync, strToU8 } from 'fflate';
import { jsPDF } from 'jspdf';
import { extractDocumentText } from '@/services/DocumentTextExtractor';
import { spawnSync } from 'node:child_process';

function docxFixture(text: string): Buffer {
  return Buffer.from(zipSync({
    '[Content_Types].xml': strToU8(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`),
    'word/document.xml': strToU8(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`),
  }));
}

function xlsxFixture(): Buffer {
  return Buffer.from(zipSync({
    '[Content_Types].xml': strToU8(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Roster" sheetId="1"/></sheets></workbook>`),
    'xl/sharedStrings.xml': strToU8(`<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>employee_id</t></si><si><t>=dangerous-formula</t></si></sst>`),
    'xl/worksheets/sheet1.xml': strToU8(`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>EMP-42</t></is></c><c r="B2"><v>7</v></c></row></sheetData></worksheet>`),
  }));
}

describe('document text extraction safety boundary', () => {
  test('extracts DOCX text after content-signature validation', async () => {
    const result = await extractDocumentText('training-note.docx', docxFixture('Controlled training note'));
    expect(result.mediaType).toContain('wordprocessingml');
    expect(result.text).toContain('Controlled training note');
  });

  test('extracts XLSX cell values without executing formulas and neutralizes formula-like text', async () => {
    const result = await extractDocumentText('roster.xlsx', xlsxFixture());
    expect(result.mediaType).toContain('spreadsheetml');
    expect(result.text).toContain('employee_id');
    expect(result.text).toContain('EMP-42');
    expect(result.text).toContain("'=dangerous-formula");
  });

  test('extracts PDF text and rejects an extension/signature mismatch', async () => {
    const pdf = new jsPDF();
    pdf.text('HF controlled source', 20, 20);
    const bytes = Buffer.from(pdf.output('arraybuffer'));
    await expect(extractDocumentText('source.txt', bytes)).rejects.toThrow('contains binary application/pdf');

    // pdfjs uses a native dynamic worker import that Jest's CommonJS VM cannot execute.
    // Run this one real-parser assertion in a normal Node+tsx child, matching production.
    const script = `
      import { jsPDF } from 'jspdf';
      import { extractDocumentText } from './src/services/DocumentTextExtractor.ts';
      const pdf = new jsPDF();
      pdf.text('HF controlled source', 20, 20);
      const result = await extractDocumentText('source.pdf', Buffer.from(pdf.output('arraybuffer')));
      process.stdout.write(result.text);
    `;
    const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30_000,
    });
    expect(child.stderr).toBe('');
    expect(child.status).toBe(0);
    expect(child.stdout).toContain('HF controlled source');
  });
});
