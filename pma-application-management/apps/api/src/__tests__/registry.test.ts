import { Pool } from 'pg';
import { makePools, startApp, client, newTenant, type RunningApp } from './harness';

// Milestone D — self-repairing regulatory source registry. Deterministic; the
// system detects + proposes, a human (Admin) approves. Never auto-replaces a URL
// or auto-applies a change.

let hostPool: Pool;
let kernelPool: Pool;
let app: RunningApp;

// Controllable fetcher: a mutable store keyed by URL.
const store = new Map<string, { reachable: boolean; content?: string }>();
const fetcher = async (url: string) => store.get(url) ?? { reachable: false };
const resolver = () => 'https://proposed.example/fixed';

function cleanCase() {
  return {
    articleName: 'Bracket', applicantLegalName: 'Acme', manufacturingAddress: 'X', faaSubmissionOffice: 'ACO',
    qmsManualNumber: 'Q', qmsManualRevision: 'C', qmsManualDate: '2026-01-01', signatoryName: 'S', signatoryTitle: 'QE',
    markingSchemeRef: 'D', icaDispositionStated: true, adImpactAddressed: true,
  };
}

beforeAll(async () => {
  ({ hostPool, kernelPool } = makePools());
  app = await startApp({ hostPool, kernelPool, registry: { fetcher, resolver } });
});
afterAll(async () => {
  await app.close();
  await hostPool.end();
  await kernelPool.end();
});

describe('changed-source flow: freeze → block generation → Admin accepts → unfreeze', () => {
  it('detects a content change, freezes drafts, and clears on Admin acceptance', async () => {
    const t = newTenant('regchg');
    const admin = client(app.baseUrl, t, 'admin', 'ADMIN');
    const url = `https://faa.example/${t}/ac21303-4`;
    store.set(url, { reachable: true, content: 'AC 21.303-4 revision 3/21/14' });

    const { json: created } = await admin.post('/api/registry', { title: 'AC 21.303-4', canonicalUrl: url, category: 'AC' });
    // First check → OK (baseline hash).
    let check = await admin.post('/api/registry/check');
    expect(check.json.results.find((r: any) => r.id === created.id).result).toBe('OK');

    // Content changes on the FAA site → CHANGED + frozen.
    store.set(url, { reachable: true, content: 'AC 21.303-4 revision NEW 2026' });
    check = await admin.post('/api/registry/check');
    expect(check.json.results.find((r: any) => r.id === created.id).result).toBe('CHANGED');
    const [src] = (await admin.get('/api/registry')).json.sources.filter((s: any) => s.id === created.id);
    expect(src.status).toBe('CHANGED');
    expect(src.frozen).toBe(true);

    // Generation is frozen until an Admin reviews.
    const { json: caseRow } = await admin.post('/api/cases', cleanCase());
    const blocked = await admin.post(`/api/cases/${caseRow.id}/generate`, { type: 'APPLICATION_LETTER' });
    expect(blocked.status).toBe(409);

    // Admin accepts the change → unfreeze → generation works again.
    expect((await admin.post(`/api/registry/${created.id}/accept-change`)).status).toBe(200);
    const ok = await admin.post(`/api/cases/${caseRow.id}/generate`, { type: 'APPLICATION_LETTER' });
    expect(ok.status).toBe(201);
  });
});

describe('broken-source flow: propose fallback → Admin approves (never auto-replace)', () => {
  it('marks BROKEN with a proposed URL and applies it only on approval', async () => {
    const t = newTenant('regbrk');
    const admin = client(app.baseUrl, t, 'admin', 'ADMIN');
    const url = `https://faa.example/${t}/broken`;
    store.set(url, { reachable: true, content: 'ok baseline' });
    const { json: created } = await admin.post('/api/registry', { title: 'CFR 21.303', canonicalUrl: url, category: 'CFR_SECTION' });
    await admin.post('/api/registry/check'); // baseline OK

    // URL goes unreachable → BROKEN + proposed URL (not applied).
    store.set(url, { reachable: false });
    const check = await admin.post('/api/registry/check');
    expect(check.json.results.find((r: any) => r.id === created.id).result).toBe('BROKEN');
    let [src] = (await admin.get('/api/registry')).json.sources.filter((s: any) => s.id === created.id);
    expect(src.status).toBe('BROKEN');
    expect(src.proposedUrl).toBe('https://proposed.example/fixed');
    expect(src.canonicalUrl).toBe(url); // NOT auto-replaced

    // Approve → canonicalUrl replaced, back to OK.
    store.set('https://proposed.example/fixed', { reachable: true, content: 'repaired content' });
    expect((await admin.post(`/api/registry/${created.id}/approve-url`)).status).toBe(200);
    [src] = (await admin.get('/api/registry')).json.sources.filter((s: any) => s.id === created.id);
    expect(src.canonicalUrl).toBe('https://proposed.example/fixed');
    expect(src.status).toBe('OK');
  });
});

describe('roles + cross-tenant', () => {
  it('requires ADMIN to create/check and isolates tenants', async () => {
    const t = newTenant('regrole');
    const preparer = client(app.baseUrl, t, 'p', 'PREPARER');
    expect((await preparer.post('/api/registry', { title: 'x', canonicalUrl: 'https://y', category: 'AC' })).status).toBe(403);
    expect((await preparer.post('/api/registry/check')).status).toBe(403);

    const admin = client(app.baseUrl, t, 'a', 'ADMIN');
    await admin.post('/api/registry', { title: 'AC x', canonicalUrl: `https://faa.example/${t}/x`, category: 'AC' });
    const other = client(app.baseUrl, newTenant('regother'), 'a', 'ADMIN');
    expect((await other.get('/api/registry')).json.sources).toHaveLength(0);
  });
});
