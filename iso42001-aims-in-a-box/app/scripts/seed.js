'use strict';

/**
 * Demo seed data for the ISO/IEC 42001 AIMS Command Center.
 *
 * Every insert goes through the SAME code path a real API call would use
 * (direct DB insert + integration.emitEvent — the identical function the
 * Express routes call) so the seeded System-Detected Conditions are real
 * kernel output, not hand-authored demo rows. Deliberately includes at least
 * one record that fires EACH of the 8 approved rules, plus a couple of
 * "clean" records that do NOT fire anything, plus one deliberate
 * supersession (a major finding that gets an NCR added afterward, so the
 * AUDIT-001 condition is superseded live) to demonstrate Design Law 7.
 */

const crypto = require('crypto');
const { openDb, setup, getDbPath } = require('../src/db/init');
const { AimsIntegration } = require('../src/adapter/aims-adapter');

const TENANT = 'default';

function nowIso() {
  return new Date().toISOString();
}

function insert(db, table, row) {
  const cols = Object.keys(row);
  db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`).run(row);
}

async function seed() {
  // Ensure schema exists (idempotent).
  setup();
  const db = openDb(getDbPath());
  const integration = new AimsIntegration(db);

  const ts = nowIso();
  const id = () => crypto.randomUUID();

  // ---------------------------------------------------------------------
  // SoA entries — SOA-001 (missing treatment), SOA-002 (missing justification),
  // and one clean applicable control with both a treatment and justification.
  // ---------------------------------------------------------------------
  const soaNoTreatment = id();
  insert(db, 'soa_entries', {
    id: soaNoTreatment, tenant_id: TENANT, control_ref: 'A.6.2.2', control_title: 'AI system risk assessment process',
    applicability: 'applicable', justification: 'Required because we operate AI-based decision systems.',
    status: 'draft', owner: 'Priya Nair', created_at: ts, updated_at: ts
  });

  const soaNoJustification = id();
  insert(db, 'soa_entries', {
    id: soaNoJustification, tenant_id: TENANT, control_ref: 'A.6.2.4', control_title: 'AI system impact assessment',
    applicability: 'applicable', justification: '', status: 'draft', owner: 'Priya Nair', created_at: ts, updated_at: ts
  });

  // Treatment created BEFORE the clean SoA entry so its snapshot resolves the link.
  const cleanControlRef = 'A.6.2.6';
  insert(db, 'risk_treatments', {
    id: id(), tenant_id: TENANT, risk_id: null, soa_control_ref: cleanControlRef,
    description: 'Quarterly review of AI data quality controls implemented and evidenced in QMS-114.',
    target_date: '2026-12-01', status: 'open', owner: 'Priya Nair', created_at: ts, updated_at: ts
  });

  const soaClean = id();
  insert(db, 'soa_entries', {
    id: soaClean, tenant_id: TENANT, control_ref: cleanControlRef, control_title: 'Data quality for AI systems',
    applicability: 'applicable', justification: 'Data quality directly affects AI system reliability.',
    status: 'approved', owner: 'Priya Nair', created_at: ts, updated_at: ts
  });

  const soaNotApplicable = id();
  insert(db, 'soa_entries', {
    id: soaNotApplicable, tenant_id: TENANT, control_ref: 'A.6.2.8', control_title: 'Third-party AI component management',
    applicability: 'not_applicable', justification: 'No third-party AI components are used.',
    status: 'approved', owner: 'Priya Nair', created_at: ts, updated_at: ts
  });

  await integration.emitEvent({ tenantId: TENANT, eventType: 'soa.created', recordType: 'soa', recordId: soaNoTreatment, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'soa.created', recordType: 'soa', recordId: soaNoJustification, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'soa.created', recordType: 'soa', recordId: soaClean, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'soa.created', recordType: 'soa', recordId: soaNotApplicable, actor: 'seed' });

  // ---------------------------------------------------------------------
  // Risk register — RISK-001 (scored, no owner) + one clean scored+owned risk.
  // ---------------------------------------------------------------------
  const riskNoOwner = id();
  insert(db, 'risk_register', {
    id: riskNoOwner, tenant_id: TENANT, risk_ref: 'RISK-014', description: 'Model drift in the customer triage classifier degrades accuracy over time.',
    likelihood: 3, impact: 4, score: 12, owner: '', status: 'open', created_at: ts, updated_at: ts
  });

  const riskWithOwner = id();
  insert(db, 'risk_register', {
    id: riskWithOwner, tenant_id: TENANT, risk_ref: 'RISK-015', description: 'Training data for the triage classifier contains historical bias.',
    likelihood: 2, impact: 4, score: 8, owner: 'Priya Nair', status: 'open', created_at: ts, updated_at: ts
  });

  await integration.emitEvent({ tenantId: TENANT, eventType: 'risk.created', recordType: 'risk', recordId: riskNoOwner, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'risk.created', recordType: 'risk', recordId: riskWithOwner, actor: 'seed' });

  // ---------------------------------------------------------------------
  // Risk treatments — RISK-002 (overdue, still open) + one closed overdue (no fire).
  // ---------------------------------------------------------------------
  const treatmentOverdue = id();
  insert(db, 'risk_treatments', {
    id: treatmentOverdue, tenant_id: TENANT, risk_id: riskWithOwner, soa_control_ref: null,
    description: 'Re-balance training data set and retrain the triage classifier.',
    target_date: '2026-05-01', status: 'open', owner: 'Priya Nair', created_at: ts, updated_at: ts
  });

  const treatmentClosedOverdue = id();
  insert(db, 'risk_treatments', {
    id: treatmentClosedOverdue, tenant_id: TENANT, risk_id: riskNoOwner, soa_control_ref: null,
    description: 'Add automated drift-detection monitoring to the triage classifier pipeline.',
    target_date: '2026-04-01', status: 'closed', owner: 'Priya Nair', created_at: ts, updated_at: ts
  });

  await integration.emitEvent({ tenantId: TENANT, eventType: 'risk_treatment.created', recordType: 'risk_treatment', recordId: treatmentOverdue, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'risk_treatment.created', recordType: 'risk_treatment', recordId: treatmentClosedOverdue, actor: 'seed' });

  // ---------------------------------------------------------------------
  // Objectives — OBJ-001 (no measurable target) + one clean measurable objective.
  // ---------------------------------------------------------------------
  const objNoTarget = id();
  insert(db, 'objectives', {
    id: objNoTarget, tenant_id: TENANT, objective_text: 'Improve AI system fairness monitoring.',
    measurable_target: '', owner: 'Priya Nair', due_date: '2026-12-31', status: 'open', created_at: ts, updated_at: ts
  });

  const objWithTarget = id();
  insert(db, 'objectives', {
    id: objWithTarget, tenant_id: TENANT, objective_text: 'Reduce AI incident response time.',
    measurable_target: 'Median time-to-acknowledge AI incidents under 4 business hours by Q4 2026.',
    owner: 'Priya Nair', due_date: '2026-12-31', status: 'open', created_at: ts, updated_at: ts
  });

  await integration.emitEvent({ tenantId: TENANT, eventType: 'objective.created', recordType: 'objective', recordId: objNoTarget, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'objective.created', recordType: 'objective', recordId: objWithTarget, actor: 'seed' });

  // ---------------------------------------------------------------------
  // Audit findings — AUDIT-001 (major, unescalated), a minor finding (no
  // fire), and a major finding that gets escalated AFTER the fact to
  // demonstrate supersession (the active condition disappears once the NCR
  // is linked and the finding is re-evaluated).
  // ---------------------------------------------------------------------
  const findingUnescalated = id();
  insert(db, 'audit_findings', {
    id: findingUnescalated, tenant_id: TENANT, finding_ref: 'AF-2026-011', description: 'AI model change control was not documented for the Q2 triage classifier update.',
    severity: 'major', clause_ref: '8.1', status: 'open', created_at: ts, updated_at: ts
  });

  const findingMinor = id();
  insert(db, 'audit_findings', {
    id: findingMinor, tenant_id: TENANT, finding_ref: 'AF-2026-012', description: 'Model card template lacks a revision history table.',
    severity: 'minor', clause_ref: '7.5', status: 'open', created_at: ts, updated_at: ts
  });

  const findingToEscalate = id();
  insert(db, 'audit_findings', {
    id: findingToEscalate, tenant_id: TENANT, finding_ref: 'AF-2026-013', description: 'No documented AI competence review occurred for two data science staff in the last cycle.',
    severity: 'major', clause_ref: '7.2', status: 'open', created_at: ts, updated_at: ts
  });

  await integration.emitEvent({ tenantId: TENANT, eventType: 'audit_finding.created', recordType: 'audit_finding', recordId: findingUnescalated, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'audit_finding.created', recordType: 'audit_finding', recordId: findingMinor, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'audit_finding.created', recordType: 'audit_finding', recordId: findingToEscalate, actor: 'seed' });
  // -> at this point findingToEscalate has an active AUDIT-001 condition, same as findingUnescalated.

  // ---------------------------------------------------------------------
  // NCR entries — NCR-001 (overdue, open), one closed overdue (no fire), and
  // one linked to findingToEscalate (future due date, open) which both
  // resolves AUDIT-001 for that finding (once re-evaluated below) and does
  // not itself fire NCR-001.
  // ---------------------------------------------------------------------
  const ncrOverdue = id();
  insert(db, 'ncr_entries', {
    id: ncrOverdue, tenant_id: TENANT, ncr_ref: 'NCR-2026-004', description: 'Bias testing evidence missing for the triage classifier release.',
    corrective_action: 'Run bias test suite and attach evidence to release record.', due_date: '2026-06-01',
    status: 'open', linked_finding_id: null, created_at: ts, updated_at: ts
  });

  const ncrClosedOverdue = id();
  insert(db, 'ncr_entries', {
    id: ncrClosedOverdue, tenant_id: TENANT, ncr_ref: 'NCR-2026-005', description: 'Access control review overdue for the AI training data lake.',
    corrective_action: 'Access review completed and logged.', due_date: '2026-05-01',
    status: 'closed', linked_finding_id: null, created_at: ts, updated_at: ts
  });

  const ncrLinked = id();
  insert(db, 'ncr_entries', {
    id: ncrLinked, tenant_id: TENANT, ncr_ref: 'NCR-2026-006', description: 'AI competence review corrective action for two data science staff.',
    corrective_action: 'Schedule and complete AI-competence refresher training.', due_date: '2026-09-30',
    status: 'open', linked_finding_id: findingToEscalate, created_at: ts, updated_at: ts
  });

  await integration.emitEvent({ tenantId: TENANT, eventType: 'ncr.created', recordType: 'ncr', recordId: ncrOverdue, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'ncr.created', recordType: 'ncr', recordId: ncrClosedOverdue, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'ncr.created', recordType: 'ncr', recordId: ncrLinked, actor: 'seed' });

  // Re-evaluate findingToEscalate now that ncrLinked exists: the snapshot's
  // linked_ncr_id will resolve, AUDIT-001 will no longer fire, and the prior
  // active assessment for this record will be marked superseded — a live
  // demonstration of Design Law 7 (idempotency + supersession).
  db.prepare(`UPDATE audit_findings SET updated_at = ? WHERE id = ?`).run(nowIso(), findingToEscalate);
  await integration.emitEvent({ tenantId: TENANT, eventType: 'audit_finding.updated', recordType: 'audit_finding', recordId: findingToEscalate, actor: 'seed' });

  // ---------------------------------------------------------------------
  // Competence records — COMP-001 (stale review) + one current review.
  // ---------------------------------------------------------------------
  const competenceStale = id();
  const staleLastReview = '2024-01-15';
  const staleDue = new Date(new Date(staleLastReview).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  insert(db, 'competence_records', {
    id: competenceStale, tenant_id: TENANT, person_name: 'Daniel Osei', role: 'ML Engineer',
    last_review_date: staleLastReview, competence_review_due_date: staleDue, status: 'current', created_at: ts, updated_at: ts
  });

  const competenceCurrent = id();
  const currentLastReview = '2026-04-01';
  const currentDue = new Date(new Date(currentLastReview).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  insert(db, 'competence_records', {
    id: competenceCurrent, tenant_id: TENANT, person_name: 'Ines Alvarado', role: 'AI Governance Lead',
    last_review_date: currentLastReview, competence_review_due_date: currentDue, status: 'current', created_at: ts, updated_at: ts
  });

  await integration.emitEvent({ tenantId: TENANT, eventType: 'competence.created', recordType: 'competence', recordId: competenceStale, actor: 'seed' });
  await integration.emitEvent({ tenantId: TENANT, eventType: 'competence.created', recordType: 'competence', recordId: competenceCurrent, actor: 'seed' });

  // ---------------------------------------------------------------------
  const activeConditions = integration.getConditions(TENANT, { status: 'active' });
  const metrics = integration.getMetrics(TENANT);

  // eslint-disable-next-line no-console
  console.log(`[seed] Seed complete for tenant "${TENANT}".`);
  // eslint-disable-next-line no-console
  console.log(`[seed] Active System-Detected Conditions: ${activeConditions.length}`);
  for (const c of activeConditions) {
    // eslint-disable-next-line no-console
    console.log(`  - ${c.ruleId} (${c.severity}) on ${c.recordType}/${c.recordId}: ${c.findingText}`);
  }
  // eslint-disable-next-line no-console
  console.log('[seed] Metrics:', metrics);

  db.close();
}

if (require.main === module) {
  seed().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] FAILED', err);
    process.exit(1);
  });
}

module.exports = { seed };
