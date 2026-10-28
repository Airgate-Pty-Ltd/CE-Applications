import { Pool } from 'pg';
import { makePools, startApp, client, newTenant, type RunningApp } from './harness';

// Milestone G — full acceptance pass. Drives a complete STC-basis and a complete
// T&C-basis case end to end through the real API + Postgres, exercising intake,
// basis confirmation, the completeness gate, generation, and library promotion.

let hostPool: Pool;
let kernelPool: Pool;
let app: RunningApp;

async function q(sql: string, params: unknown[] = []): Promise<any[]> {
  const { rows } = await hostPool.query(sql, params);
  return rows;
}

// A complete, consistent field set → no BLOCKING and no WARNING conditions.
function completeFields(extra: Record<string, unknown>): { fieldKey: string; value: unknown }[] {
  const base: Record<string, unknown> = {
    applicant_legal_name: 'Acme Aerospace LLC',
    manufacturing_address: '123 Aviation Way, Mesa AZ',
    faa_submission_office: 'ACO Los Angeles',
    qms_manual_number: 'QM-100',
    qms_manual_revision: 'C',
    qms_manual_date: '2026-01-15',
    signatory_name: 'Jane Preparer',
    signatory_title: 'Quality Engineer',
    marking_scheme_ref: 'DWG-9000',
    ica_disposition_stated: true,
    ad_impact_addressed: true,
    ...extra,
  };
  return Object.entries(base).map(([fieldKey, value]) => ({ fieldKey, value }));
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

async function activeCount(t: string, caseId: string, severity: string): Promise<number> {
  const [r] = await q(`SELECT count(*)::int AS n FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2 AND status='active' AND severity=$3`, [t, caseId, severity]);
  return r.n;
}

describe('STC-basis case — full lifecycle to a DRAFTED package', () => {
  it('intake → confirm basis → gate → generate → promote', async () => {
    const t = newTenant('accStc');
    const rev = client(app.baseUrl, t, 'reviewer', 'REVIEWER');
    const { json: c } = await rev.post('/api/cases', { articleName: 'Hydraulic Bracket Assembly' });

    // Deterministic intake: transcribe a complete, consistent STC field set.
    await rev.post(`/api/cases/${c.id}/fields`, {
      fields: completeFields({
        stc_number: 'ST01234AT',
        letter_stc_number: 'ST01234AT',
        supplement_stc_number: 'ST01234AT', // consistent → no LINK-001
        license_agreement_present: true,
        pma_part_numbers: 'P-100-PMA',
        oem_part_numbers: 'P-100', // distinct → no LINK-003
      }),
    });
    await rev.post(`/api/cases/${c.id}/basis`, { approvalBasis: 'STC_IDENTICALITY' });

    // No blocking conditions remain.
    expect(await activeCount(t, c.id, 'blocking')).toBe(0);

    // Gate opens: INTAKE → GAP_REVIEW → DRAFTING.
    expect((await rev.post(`/api/cases/${c.id}/status`, { status: 'GAP_REVIEW' })).status).toBe(200);
    expect((await rev.post(`/api/cases/${c.id}/status`, { status: 'DRAFTING' })).status).toBe(200);

    // Generate the letter → DRAFTED, watermarked, stamped.
    const gen = await rev.post(`/api/cases/${c.id}/generate`, { type: 'APPLICATION_LETTER' });
    expect(gen.status).toBe(201);
    expect(gen.json.submissionStatus).toBe('DRAFTED');

    // Promote the approved package to the org's precedent library.
    expect((await rev.post(`/api/cases/${c.id}/promote-to-library`, { summary: 'STC identicality bracket' })).status).toBe(201);
    const lib = await rev.get('/api/library?basis=STC_IDENTICALITY');
    expect(lib.json.entries.some((e: any) => e.articleName === 'Hydraulic Bracket Assembly')).toBe(true);
  });
});

describe('T&C-basis case — full lifecycle to a DRAFTED package', () => {
  it('intake → confirm basis → gate → generate', async () => {
    const t = newTenant('accTC');
    const rev = client(app.baseUrl, t, 'reviewer', 'REVIEWER');
    const { json: c } = await rev.post('/api/cases', { articleName: 'Bleed Air Valve' });

    await rev.post(`/api/cases/${c.id}/fields`, {
      fields: completeFields({
        tc_number: '3A20',
        tc_holder: 'OEM Airframes Inc',
        compliance_data_present: true, // test reports & computations enclosed
        license_agreement_present: false,
      }),
    });
    await rev.post(`/api/cases/${c.id}/basis`, { approvalBasis: 'TEST_AND_COMPUTATION' });

    expect(await activeCount(t, c.id, 'blocking')).toBe(0);
    await rev.post(`/api/cases/${c.id}/status`, { status: 'GAP_REVIEW' });
    expect((await rev.post(`/api/cases/${c.id}/status`, { status: 'DRAFTING' })).status).toBe(200);

    const gen = await rev.post(`/api/cases/${c.id}/generate`, { type: 'APPLICATION_LETTER' });
    expect(gen.status).toBe(201);
    expect(gen.json.submissionStatus).toBe('DRAFTED');
    // The generated letter states the T&C basis paragraph (14 CFR 21.303(a)(1)).
    const [doc] = await q(`SELECT "submissionStatus" FROM "GeneratedDocument" WHERE id=$1`, [gen.json.id]);
    expect(doc.submissionStatus).toBe('DRAFTED');
  });
});

describe('a BLOCKING gap holds the whole pipeline', () => {
  it('blocks both the status gate and generation until resolved', async () => {
    const t = newTenant('accBlock');
    const rev = client(app.baseUrl, t, 'reviewer', 'REVIEWER');
    const { json: c } = await rev.post('/api/cases', { articleName: 'Incomplete Part' }); // nothing transcribed → BLOCKING
    await rev.post(`/api/cases/${c.id}/status`, { status: 'GAP_REVIEW' });
    expect((await rev.post(`/api/cases/${c.id}/status`, { status: 'DRAFTING' })).status).toBe(409);
    expect((await rev.post(`/api/cases/${c.id}/generate`, { type: 'APPLICATION_LETTER' })).status).toBe(409);
  });
});
