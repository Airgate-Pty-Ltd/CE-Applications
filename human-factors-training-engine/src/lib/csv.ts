/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

export function parseCsv(input: string, limits: { maxRows?: number; maxColumns?: number } = {}): string[][] {
  const maxRows = limits.maxRows ?? 10_001;
  const maxColumns = limits.maxColumns ?? 100;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const source = input.replace(/^\uFEFF/, '');

  const finishField = () => {
    row.push(field.trim());
    field = '';
    if (row.length > maxColumns) throw new Error(`CSV exceeds the ${maxColumns}-column limit.`);
  };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value !== '')) rows.push(row);
    row = [];
    if (rows.length > maxRows) throw new Error(`CSV exceeds the ${maxRows - 1}-data-row limit.`);
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"' && field === '') quoted = true;
    else if (character === ',') finishField();
    else if (character === '\n') finishRow();
    else if (character !== '\r') field += character;
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  if (field !== '' || row.length > 0) finishRow();
  return rows;
}
