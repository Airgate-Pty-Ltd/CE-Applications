import { Pool } from 'pg';
import AdmZip from 'adm-zip';
import { makePools, startApp, client, newTenant, type RunningApp } from './harness';

// Milestone C — completeness gate + the four DOCX generators.

let hostPool: Pool;
let kernelPool: Pool;
let app: RunningApp;

async function q(sql: string, params: unknown[] = []): Promise<any[]> {
  const { rows } = await hostPool.query(sql, params);
  return rows;
}

// All AC §8 fields present + consistent → no blocking, no warnings → DRAFTED.
function cleanCase(overrides: Record<string, unknown> = {}) {
  return {
    articleName: 'Bracket Assy',
    applicantLegalName: 'Acme Aerospace LLC',
    manufacturingAddress: '123 Aviation Way, Mesa AZ',
    faaSubmissionOffice: 'ACO Los Angeles',
    qmsManualNumber: 'QM-100', qmsManualRevision: 'C', qmsManualDate: '2026-01-15',
    signatoryName: 'Jane Preparer', signatoryTitle: 'Quality Engineer',
    markingSchemeRef: 'DWG-9000', icaDispositionStated: true, adImpactAddressed: true,
    approvalBasis: 'STC_IDENTICALITY', stcNumber: 'ST01234AT',
    ...overrides,
  };
}

async function downloadBytes(baseUrl: string, tenantId: string, docId: string): Promise<Buffer> {
  const res = await fetch(`${baseUrl}/api/documents/${docId}/download`, {
    headers: { 'x-tenant-id': tenantId, 'x-user-id': 'u', 'x-user-role': 'ADMIN' },
  });
  return Buffer.from(await res.arrayBuffer());
}

function docxText(buf: Buffer): string {
  const zip = new AdmZip(buf);
  return zip
    .getEntries()
    .filter((e) => e.entryName.endsWith('.xml'))
    .map((e) => e.getData().toString('utf8'))
    .join('\n');
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

describe('generation gate', () => {
  it('blocks generation while a BLOCKING condition is open (409)', async () => {
    const t = newTenant('genblock');
    const api = client(app.baseUrl, t);
    const { json } = await api.post('/api/cases', cleanCase({ applicantLegalName: undefined })); // BLOCKING
    const r = await api.post(`/api/cases/${json.id}/generate`, { type: 'APPLICATION_LETTER' });
    expect(r.status).toBe(409);
    expect(r.json.blocking.length).toBeGreaterThan(0);
    const rows = await q(`SELECT count(*)::int AS n FROM "GeneratedDocument" WHERE "caseId"=$1`, [json.id]);
    expect(rows[0].n).toBe(0); // nothing generated
  });
});

describe('generation output', () => {
  it('generates a DRAFTED application letter, watermarked, and downloadable', async () => {
    const t = newTenant('genok');
    const api = client(app.baseUrl, t);
    const { json } = await api.post('/api/cases', cleanCase());
    const r = await api.post(`/api/cases/${json.id}/generate`, { type: 'APPLICATION_LETTER' });
    expect(r.status).toBe(201);
    expect(r.json.submissionStatus).toBe('DRAFTED');
    expect(r.json.dataSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.json.regulatorySourceRevision).toContain('AC 21.303-4');

    const [row] = await q(`SELECT * FROM "GeneratedDocument" WHERE id=$1`, [r.json.id]);
    expect(row.submissionStatus).toBe('DRAFTED');
    expect(row.type).toBe('APPLICATION_LETTER');

    const bytes = await downloadBytes(app.baseUrl, t, r.json.id);
    expect(bytes.slice(0, 2).toString()).toBe('PK'); // valid docx (zip)
    const xml = docxText(bytes);
    expect(xml).toContain('NOT FOR FAA SUBMISSION'); // watermark present
    expect(xml).toContain('21.303(a)(4)'); // STC basis paragraph (mandatory content)
  });

  it('stamps DRAFTED_WITH_GAPS and inserts [CONFIRM: …] placeholders for a WARNING gap', async () => {
    const t = newTenant('genwarn');
    const api = client(app.baseUrl, t);
    // Missing marking scheme → PMA-COMPLETE-005 WARNING (not blocking).
    const { json } = await api.post('/api/cases', cleanCase({ markingSchemeRef: undefined }));
    const r = await api.post(`/api/cases/${json.id}/generate`, { type: 'APPLICATION_LETTER' });
    expect(r.status).toBe(201);
    expect(r.json.submissionStatus).toBe('DRAFTED_WITH_GAPS');
    const xml = docxText(await downloadBytes(app.baseUrl, t, r.json.id));
    expect(xml).toContain('[CONFIRM:'); // placeholder for the missing field
  });

  it('generates all four document types', async () => {
    const t = newTenant('genall');
    const api = client(app.baseUrl, t);
    const { json } = await api.post('/api/cases', cleanCase());
    for (const type of ['APPLICATION_LETTER', 'PMA_SUPPLEMENT', 'SUBMISSION_CHECKLIST', 'MANAGEMENT_REVIEW_PACK']) {
      const r = await api.post(`/api/cases/${json.id}/generate`, { type });
      expect(r.status).toBe(201);
      const bytes = await downloadBytes(app.baseUrl, t, r.json.id);
      expect(bytes.slice(0, 2).toString()).toBe('PK');
    }
    const list = await api.get(`/api/cases/${json.id}/documents`);
    expect(list.json.documents.length).toBe(4);
  });

  it('never states submission-ready — status is one of DRAFTED / DRAFTED_WITH_GAPS / BLOCKED', async () => {
    const t = newTenant('genstatus');
    const api = client(app.baseUrl, t);
    const { json } = await api.post('/api/cases', cleanCase());
    const r = await api.post(`/api/cases/${json.id}/generate`, { type: 'SUBMISSION_CHECKLIST' });
    expect(['DRAFTED', 'DRAFTED_WITH_GAPS', 'BLOCKED']).toContain(r.json.submissionStatus);
    const xml = docxText(await downloadBytes(app.baseUrl, t, r.json.id));
    expect(xml.toLowerCase()).not.toContain('ready for faa submission');
  });
});
