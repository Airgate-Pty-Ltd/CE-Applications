import { Pool } from 'pg';
import { makePools, startApp, client, bearer, newTenant, type RunningApp } from './harness';

// Milestone A — host data layer, auth, org/user admin, case lifecycle + gates.

let hostPool: Pool;
let kernelPool: Pool;
let app: RunningApp;

async function q(sql: string, params: unknown[] = []): Promise<any[]> {
  const { rows } = await hostPool.query(sql, params);
  return rows;
}

// Everything present EXCEPT applicant legal name → exactly one BLOCKING condition
// (PMA-COMPLETE-001). QMS present so PMA-COMPLETE-008 does not also block.
function gappyCase(overrides: Record<string, unknown> = {}) {
  return {
    articleName: 'Bracket',
    manufacturingAddress: '123 Aviation Way',
    faaSubmissionOffice: 'ACO Los Angeles',
    qmsManualNumber: 'QM-1',
    qmsManualRevision: 'C',
    qmsManualDate: '2026-01-01',
    signatoryName: 'Jane',
    signatoryTitle: 'QE',
    markingSchemeRef: 'DWG-1',
    icaDispositionStated: true,
    adImpactAddressed: true,
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

describe('auth', () => {
  it('registers an org+admin, logs in, and rejects a bad password', async () => {
    const slug = `acme-${newTenant('s').slice(-8)}`;
    const reg = await bearer(app.baseUrl).post('/api/auth/register', {
      orgName: 'Acme Aero', slug, email: `admin@${slug}.com`, password: 'Sup3rSecret!', fullName: 'Ada Admin',
    });
    expect(reg.status).toBe(201);
    expect(reg.json.token).toBeTruthy();

    const me = await bearer(app.baseUrl, reg.json.token).get('/api/me');
    expect(me.status).toBe(200);
    expect(me.json.role).toBe('ADMIN');

    const login = await bearer(app.baseUrl).post('/api/auth/login', { email: `admin@${slug}.com`, password: 'Sup3rSecret!' });
    expect(login.status).toBe(200);
    expect(login.json.user.role).toBe('ADMIN');

    const bad = await bearer(app.baseUrl).post('/api/auth/login', { email: `admin@${slug}.com`, password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('rejects duplicate org slug', async () => {
    const slug = `dup-${newTenant('s').slice(-8)}`;
    const body = { orgName: 'X', slug, email: `a@${slug}.com`, password: 'pw12345678', fullName: 'A' };
    expect((await bearer(app.baseUrl).post('/api/auth/register', body)).status).toBe(201);
    expect((await bearer(app.baseUrl).post('/api/auth/register', body)).status).toBe(409);
  });
});

describe('submission office profile (tenant-specific, ADMIN only)', () => {
  it('ADMIN can set + read; PREPARER is denied', async () => {
    const t = newTenant('office');
    const admin = client(app.baseUrl, t, 'u1', 'ADMIN');
    const set = await admin.patch('/api/org/submission-office', { submissionOfficeName: 'ACO Los Angeles', submissionOfficeAddress: '123 St' });
    expect(set.status).toBe(200);

    const preparer = client(app.baseUrl, t, 'u2', 'PREPARER');
    const denied = await preparer.patch('/api/org/submission-office', { submissionOfficeName: 'Other' });
    expect(denied.status).toBe(403);
  });
});

describe('audit ledger', () => {
  it('records case creation with a content hash', async () => {
    const t = newTenant('audit');
    const api = client(app.baseUrl, t);
    const { json } = await api.post('/api/cases', gappyCase());
    const rows = await q(`SELECT * FROM "AuditLedger" WHERE "tenantId"=$1 AND "recordId"=$2 AND action='case_created'`, [t, json.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].contentHash).toMatch(/^[0-9a-f]{64}$/);

    const feed = await client(app.baseUrl, t, 'u', 'REVIEWER').get('/api/audit');
    expect(feed.json.entries.length).toBeGreaterThan(0);
  });
});

describe('case lifecycle + completeness gate', () => {
  it('blocks leaving GAP_REVIEW while a BLOCKING condition is open; allows after resolution', async () => {
    const t = newTenant('gate');
    const api = client(app.baseUrl, t, 'rev', 'REVIEWER');
    const { json } = await api.post('/api/cases', gappyCase());
    // move to GAP_REVIEW
    expect((await api.post(`/api/cases/${json.id}/status`, { status: 'GAP_REVIEW' })).status).toBe(200);
    // there is an active BLOCKING condition (applicant missing)
    const blocked = await api.post(`/api/cases/${json.id}/status`, { status: 'DRAFTING' });
    expect(blocked.status).toBe(409);
    expect(blocked.json.blocking).toBeGreaterThan(0);

    // resolve the blocking finding, then the gate opens
    const [a] = await q("SELECT id FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2 AND severity='blocking' AND status='active'", [t, json.id]);
    await api.post(`/api/assessments/${a.id}/respond`, { response: 'confirm' });
    const ok = await api.post(`/api/cases/${json.id}/status`, { status: 'DRAFTING' });
    expect(ok.status).toBe(200);
  });

  it('requires REVIEWER to move a case out of Drafting', async () => {
    const t = newTenant('role');
    const admin = client(app.baseUrl, t, 'rev', 'REVIEWER');
    const { json } = await admin.post('/api/cases', { articleName: 'Clean', applicantLegalName: 'Acme', manufacturingAddress: 'X', faaSubmissionOffice: 'ACO', qmsManualNumber: 'Q', qmsManualRevision: 'C', qmsManualDate: '2026-01-01', signatoryName: 'S', signatoryTitle: 'QE', markingSchemeRef: 'D', icaDispositionStated: true, adImpactAddressed: true });
    await admin.post(`/api/cases/${json.id}/status`, { status: 'GAP_REVIEW' });
    await admin.post(`/api/cases/${json.id}/status`, { status: 'DRAFTING' });

    const preparer = client(app.baseUrl, t, 'prep', 'PREPARER');
    const denied = await preparer.post(`/api/cases/${json.id}/status`, { status: 'UNDER_REVIEW' });
    expect(denied.status).toBe(403);
    const allowed = await admin.post(`/api/cases/${json.id}/status`, { status: 'UNDER_REVIEW' });
    expect(allowed.status).toBe(200);
  });

  it('confirms the approval basis (human decision)', async () => {
    const t = newTenant('basis');
    const api = client(app.baseUrl, t);
    const { json } = await api.post('/api/cases', gappyCase());
    const r = await api.post(`/api/cases/${json.id}/basis`, { approvalBasis: 'STC_IDENTICALITY' });
    expect(r.status).toBe(200);
    const [c] = await q('SELECT "approvalBasis","basisConfirmedByUserId" FROM "PmaCase" WHERE id=$1', [json.id]);
    expect(c.approvalBasis).toBe('STC_IDENTICALITY');
    expect(c.basisConfirmedByUserId).toBe('u-test');

    const badBasis = await api.post(`/api/cases/${json.id}/basis`, { approvalBasis: 'NOPE' });
    expect(badBasis.status).toBe(400);
  });
});
