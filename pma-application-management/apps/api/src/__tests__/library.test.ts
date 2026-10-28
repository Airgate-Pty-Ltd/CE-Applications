import { Pool } from 'pg';
import { makePools, startApp, client, newTenant, type RunningApp } from './harness';

// Milestone E — approved document library: promote (explicit human action),
// search, and precedent pattern-matching (read-only; never auto-copied).

let hostPool: Pool;
let kernelPool: Pool;
let app: RunningApp;

beforeAll(async () => {
  ({ hostPool, kernelPool } = makePools());
  app = await startApp({ hostPool, kernelPool });
});
afterAll(async () => {
  await app.close();
  await hostPool.end();
  await kernelPool.end();
});

async function makeCase(api: any, articleName: string, basis?: string) {
  const { json } = await api.post('/api/cases', { articleName });
  if (basis) await api.post(`/api/cases/${json.id}/basis`, { approvalBasis: basis });
  return json.id;
}

describe('promote to library', () => {
  it('requires a confirmed basis, then promotes on explicit action (REVIEWER)', async () => {
    const t = newTenant('lib');
    const reviewer = client(app.baseUrl, t, 'r', 'REVIEWER');
    const id = await makeCase(reviewer, 'Fuel Pump Bracket');

    // No basis yet → cannot promote.
    const early = await reviewer.post(`/api/cases/${id}/promote-to-library`, {});
    expect(early.status).toBe(400);

    await reviewer.post(`/api/cases/${id}/basis`, { approvalBasis: 'STC_IDENTICALITY' });
    const promoted = await reviewer.post(`/api/cases/${id}/promote-to-library`, { summary: 'STC identicality bracket' });
    expect(promoted.status).toBe(201);

    // PREPARER cannot promote.
    const id2 = await makeCase(reviewer, 'Another Part', 'STC_IDENTICALITY');
    const preparer = client(app.baseUrl, t, 'p', 'PREPARER');
    expect((await preparer.post(`/api/cases/${id2}/promote-to-library`, {})).status).toBe(403);
  });
});

describe('search + precedents', () => {
  it('searches by basis and finds precedents by basis + article keywords', async () => {
    const t = newTenant('libsearch');
    const reviewer = client(app.baseUrl, t, 'r', 'REVIEWER');
    const bracketId = await makeCase(reviewer, 'Hydraulic Bracket Assembly', 'STC_IDENTICALITY');
    await reviewer.post(`/api/cases/${bracketId}/promote-to-library`, {});
    const valveId = await makeCase(reviewer, 'Bleed Valve', 'TEST_AND_COMPUTATION');
    await reviewer.post(`/api/cases/${valveId}/promote-to-library`, {});

    const byBasis = await reviewer.get('/api/library?basis=STC_IDENTICALITY');
    expect(byBasis.json.entries).toHaveLength(1);
    expect(byBasis.json.entries[0].articleName).toBe('Hydraulic Bracket Assembly');

    // A new STC bracket case → the promoted bracket is a precedent (basis + keyword).
    const newCase = await makeCase(reviewer, 'Bracket Support', 'STC_IDENTICALITY');
    const precedents = await reviewer.get(`/api/cases/${newCase}/precedents`);
    expect(precedents.json.precedents.length).toBeGreaterThan(0);
    expect(precedents.json.precedents[0].articleName).toBe('Hydraulic Bracket Assembly');
  });

  it('isolates tenants', async () => {
    const tA = newTenant('libA');
    const tB = newTenant('libB');
    const rA = client(app.baseUrl, tA, 'r', 'REVIEWER');
    const idA = await makeCase(rA, 'Tenant A Widget', 'STC_IDENTICALITY');
    await rA.post(`/api/cases/${idA}/promote-to-library`, {});
    const rB = client(app.baseUrl, tB, 'r', 'REVIEWER');
    expect((await rB.get('/api/library')).json.entries).toHaveLength(0);
  });
});
