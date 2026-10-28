import { PDFDocument } from 'pdf-lib';
// Require the library entry directly (pdf-parse's index.js has a debug harness
// that reads a bundled sample file when module.parent is falsy — which happens
// under test runners — and would throw on import).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (b: Buffer) => Promise<{ text: string }>;
import { FIELD_REGISTRY } from './field-registry';
import { patternMatch } from './patterns';

// Deterministic extraction from an uploaded PDF: (1) fillable AcroForm field reads,
// (2) format-known identifier pattern matching over the text layer. No inference.

export type ExtractionMethod = 'form_field_read' | 'pattern_match';

export interface ExtractedField {
  fieldKey: string;
  value: string;
  method: ExtractionMethod;
  citation: string;
}

// normalized field-name → canonical fieldKey (matches our own fillable templates
// and any form whose field names align with the registry).
const NAME_LOOKUP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const spec of Object.values(FIELD_REGISTRY)) {
    m[norm(spec.fieldKey)] = spec.fieldKey;
    m[norm(spec.column)] = spec.fieldKey;
  }
  return m;
})();

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function extractFromPdf(buffer: Buffer): Promise<ExtractedField[]> {
  const found = new Map<string, ExtractedField>();

  // 1. Fillable form fields (structured read — not inference).
  try {
    const doc = await PDFDocument.load(buffer, { updateMetadata: false });
    const form = doc.getForm();
    for (const field of form.getFields()) {
      const key = NAME_LOOKUP[norm(field.getName())];
      if (!key) continue;
      let value: string | null = null;
      const type = field.constructor.name;
      if (type === 'PDFTextField') value = (field as any).getText?.() ?? null;
      else if (type === 'PDFCheckBox') value = (field as any).isChecked?.() ? 'true' : 'false';
      else if (type === 'PDFDropdown' || type === 'PDFRadioGroup') value = (field as any).getSelected?.()?.[0] ?? null;
      if (value != null && String(value).trim() !== '') {
        found.set(key, { fieldKey: key, value: String(value).trim(), method: 'form_field_read', citation: `form_field:${field.getName()}` });
      }
    }
  } catch {
    // Not a form / unreadable form — fall through to text patterns.
  }

  // 2. Text-layer pattern matching for format-known identifiers.
  try {
    const { text } = await pdfParse(buffer);
    for (const pm of patternMatch(text)) {
      if (!found.has(pm.fieldKey)) {
        found.set(pm.fieldKey, { fieldKey: pm.fieldKey, value: pm.value, method: 'pattern_match', citation: pm.citation });
      }
    }
  } catch {
    // No text layer — nothing more to extract deterministically.
  }

  return [...found.values()];
}
