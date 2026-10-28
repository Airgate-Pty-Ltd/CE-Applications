import { Pool } from 'pg';
import { PDFDocument } from 'pdf-lib';
import { makePools, startApp, client, newTenant, type RunningApp } from './harness';
import { extractStcNumbers, extractTcNumbers, patternMatch } from '../host/intake/patterns';

// Milestone B — deterministic document intake: fillable-form reads, format-known
// pattern matching, and guided transcription. No LLM anywhere.

let hostPool: Pool;
let kernelPool: Pool;
let app: RunningApp;

async function q(sql: string, params: unknown[] = []): Promise<any[]> {
  const { rows } = await hostPool.query(sql, params);
  return rows;
}

async function makeFormPdf(fields: Record<string, string>): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 500]);
  const form = doc.getForm();
  let y = 450;
  for (const [name, val] of Object.entries(fields)) {
    const tf = form.createTextField(name);
    tf.setText(val);
    tf.addToPage(page, { x: 50, y, width: 300, height: 18 });
    y -= 30;
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

async function uploadEvidence(
  baseUrl: string,
  tenantId: string,
  caseId: string,
  type: string,
  buffer: Buffer,
  fileName = 'doc.pdf',
): Promise<{ status: number; json: any }> {
  const fd = new FormData();
  fd.append('type', type);
  fd.append('file', new Blob([buffer], { type: 'application/pdf' }), fileName);
  const res = await fetch(`${baseUrl}/api/cases/${caseId}/evidence`, {
    method: 'POST',
    headers: { 'x-tenant-id': tenantId, 'x-user-id': 'u', 'x-user-role': 'ADMIN' },
    body: fd,
  });
  return { status: res.status, json: (await res.json()) as any };
}

function gappyCase(overrides: Record<string, unknown> = {}) {
  return {
    articleName: 'Bracket',
    manufacturingAddress: '123 Aviation Way',
    faaSubmissionOffice: 'ACO Los Angeles',
    qmsManualNumber: 'QM-1', qmsManualRevision: 'C', qmsManualDate: '2026-01-01',
    signatoryName: 'Jane', signatoryTitle: 'QE', markingSchemeRef: 'DWG-1',
    icaDispositionStated: true, adImpactAddressed: true,
    ...overrides,
  };
}

beforeAll(async () => {
  ({ hostPool, kernelPool } = makePools());
  app = await startApp({ hostPool, kernelPool });
});
afterAll(async () => {
  await app.close();
  await hostPool.end();
  await kernelPool.end();
});

describe('fillable-form field reads', () => {
  it('reads AcroForm fields as CONFIRMED form_field_read and materializes onto the case', async () => {
    const t = newTenant('form');
    const api = client(app.baseUrl, t);
    const { json: created } = await api.post('/api/cases', gappyCase()); // applicant missing → BLOCKING
    const blockingBefore = await api.get(`/api/cases/${created.id}/assessments`);
    expect(blockingBefore.json.conditions.some((c: any) => c.ruleId === 'PMA-COMPLETE-001')).toBe(true);

    const pdf = await makeFormPdf({ applicant_legal_name: 'Acme Aerospace LLC', stc_number: 'ST01234AT' });
    const up = await uploadEvidence(app.baseUrl, t, created.id, 'STC', pdf);
    expect(up.status).toBe(201);
    const applicant = up.json.extracted.find((e: any) => e.fieldKey === 'applicant_legal_name');
    expect(applicant.method).toBe('form_field_read');

    // Materialized onto the case column…
    const [c] = await q('SELECT "applicantLegalName","stcNumber" FROM "PmaCase" WHERE id=$1', [created.id]);
    expect(c.applicantLegalName).toBe('Acme Aerospace LLC');
    expect(c.stcNumber).toBe('ST01234AT');
    // …provenance recorded…
    const [df] = await q(`SELECT * FROM "DataField" WHERE "caseId"=$1 AND "fieldKey"='applicant_legal_name'`, [created.id]);
    expect(df.state).toBe('CONFIRMED');
    expect(df.method).toBe('form_field_read');
    // …and the BLOCKING condition cleared after re-assessment.
    const after = await api.get(`/api/cases/${created.id}/assessments`);
    expect(after.json.conditions.some((c: any) => c.ruleId === 'PMA-COMPLETE-001')).toBe(false);
  });
});

// Deterministic format-known identifier extraction (unit level — no PDF parser).
// A value is accepted only if it matches a known FAA format; anything else is
// left for guided human transcription (spec §6). The extract pipeline that wires
// this to real uploaded PDFs is proven end-to-end by the form-field test above.
describe('format-known pattern matching (deterministic)', () => {
  it('extracts STC numbers only in the ST/SA #####XX format', () => {
    expect(extractStcNumbers('covered by STC ST05678SE issued')).toEqual(['ST05678SE']);
    expect(extractStcNumbers('SA01234AT-D applies')).toEqual(['SA01234AT-D']);
    expect(extractStcNumbers('no identifier here')).toEqual([]);
  });
  it('extracts TC numbers distinct from STC matches', () => {
    expect(extractTcNumbers('Type Certificate 3A20 for the model')).toContain('3A20');
  });
  it('patternMatch returns the first STC and TC as typed fields', () => {
    const m = patternMatch('STC ST05678SE under TC 3A20');
    expect(m.find((x) => x.fieldKey === 'stc_number')?.value).toBe('ST05678SE');
    expect(m.find((x) => x.fieldKey === 'tc_number')?.value).toBe('3A20');
  });
  it('does not accept malformed identifiers', () => {
    expect(patternMatch('reference ABC123 and XY-99')).toHaveLength(0);
  });
});

describe('guided transcription', () => {
  it('writes preparer_transcribed fields and re-assesses', async () => {
    const t = newTenant('guided');
    const api = client(app.baseUrl, t);
    // QMS missing → BLOCKING PMA-COMPLETE-008
    const { json: created } = await api.post('/api/cases', gappyCase({ qmsManualNumber: undefined, qmsManualRevision: undefined, qmsManualDate: undefined }));
    const before = await api.get(`/api/cases/${created.id}/assessments`);
    expect(before.json.conditions.some((c: any) => c.ruleId === 'PMA-COMPLETE-008')).toBe(true);

    const r = await api.post(`/api/cases/${created.id}/fields`, {
      fields: [
        { fieldKey: 'qms_manual_number', value: 'QM-9000' },
        { fieldKey: 'qms_manual_revision', value: 'D' },
        { fieldKey: 'qms_manual_date', value: '2026-03-01' },
      ],
    });
    expect(r.status).toBe(200);
    expect(r.json.written).toBe(3);
    const [df] = await q(`SELECT method FROM "DataField" WHERE "caseId"=$1 AND "fieldKey"='qms_manual_number'`, [created.id]);
    expect(df.method).toBe('preparer_transcribed');
    const after = await api.get(`/api/cases/${created.id}/assessments`);
    expect(after.json.conditions.some((c: any) => c.ruleId === 'PMA-COMPLETE-008')).toBe(false);
  });

  it('rejects an empty fields payload and unknown field keys are ignored', async () => {
    const t = newTenant('guided2');
    const api = client(app.baseUrl, t);
    const { json: created } = await api.post('/api/cases', gappyCase());
    expect((await api.post(`/api/cases/${created.id}/fields`, { fields: [] })).status).toBe(400);
    const r = await api.post(`/api/cases/${created.id}/fields`, { fields: [{ fieldKey: 'not_a_field', value: 'x' }] });
    expect(r.json.written).toBe(0);
  });
});

describe('array fields (part numbers) + cross-tenant isolation', () => {
  it('writes part-number arrays and denies cross-tenant field access', async () => {
    const tA = newTenant('arrA');
    const tB = newTenant('arrB');
    const apiA = client(app.baseUrl, tA);
    const { json: created } = await apiA.post('/api/cases', gappyCase());
    await apiA.post(`/api/cases/${created.id}/fields`, {
      fields: [
        { fieldKey: 'pma_part_numbers', value: 'P-100,P-200' },
        { fieldKey: 'oem_part_numbers', value: ['100', '200'] },
      ],
    });
    const [c] = await q('SELECT "pmaPartNumbers","oemPartNumbers" FROM "PmaCase" WHERE id=$1', [created.id]);
    expect(c.pmaPartNumbers).toEqual(['P-100', 'P-200']);
    expect(c.oemPartNumbers).toEqual(['100', '200']);

    // Tenant B cannot see A's fields.
    const apiB = client(app.baseUrl, tB);
    const bView = await apiB.get(`/api/cases/${created.id}/fields`);
    expect(bView.json.fields).toHaveLength(0);
  });
});
