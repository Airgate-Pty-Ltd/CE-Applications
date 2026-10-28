/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { parseCsv } from '../csv';

describe('parseCsv', () => {
  test('parses quoted commas, escaped quotes, CRLF, BOM, and embedded newlines', () => {
    const rows = parseCsv('\uFEFFemail,courseTitle,notes\r\nlearner@example.com,"Human Factors, Initial","said ""yes""\nand continued"\r\n');
    expect(rows).toEqual([
      ['email', 'courseTitle', 'notes'],
      ['learner@example.com', 'Human Factors, Initial', 'said "yes"\nand continued'],
    ]);
  });

  test('fails closed on unterminated data and row limits', () => {
    expect(() => parseCsv('email\n"broken')).toThrow('unterminated');
    expect(() => parseCsv('email\na\nb', { maxRows: 2 })).toThrow('data-row limit');
  });
});
