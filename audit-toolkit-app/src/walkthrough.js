/**
 * Guided audit thread: "Process audit — traceability into calibration control" (synthetic).
 * Each step performs REAL session operations (the same ones the UI buttons call) and carries the
 * auditor's reasoning. Running every step ends in a drafted NCR awaiting auditor approval, so the
 * reviewer finishes by making the approval decision. Nothing here is scripted verdicts: conclusions
 * are recorded through Session.conclude and fail if the evidence does not support them.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./audit-core.js'), require('./synthetic-data.js'));
  else root.Walkthrough = factory(root.AuditCore, root.SyntheticData);
})(typeof self !== 'undefined' ? self : this, function (Core, Data) {
  'use strict';
  const T = 'OB-8.5.2', C = 'OB-7.1.5.2-a';
  const DEMO_SEED = 'AUD-2026-114/OB-8.5.2/demo-2'; // chosen so the demonstration sample includes lot 0431 — disclosed in the narration

  const steps = [
    { id: 1, screen: 'plan', title: 'Plan: confirm scope and note leads',
      why: 'A competent auditor starts from scope, not from the checklist. The organization machines and distributes, so traceability (8.5.2) and calibration control (7.1.5.2(a)) both apply. The prior finding on supplier re-evaluation is a lead for the purchasing process, not evidence about today.',
      run: S => { S.setActivities(['manufacture', 'distribute']); } },
    { id: 2, screen: 'card', ob: T, title: 'Traceability: define the population and draw a sample',
      why: 'Reverse traces start from what was shipped. Six lots shipped last quarter; a seeded sample of three is drawn so another auditor could reproduce it. (For this demonstration the seed was chosen so the sample includes lot 0431 — a real seed would not be.)',
      run: S => { S.audit.samples[T] = { ids: [], method: 'seeded', seed: DEMO_SEED, populationSize: 6 }; Core.drawSample(S.population(T).map(x => x.id), 3, DEMO_SEED).forEach(id => S.addToSample(T, id, 'seeded', DEMO_SEED)); } },
    { id: 3, screen: 'card', ob: T, title: 'Traceability: interview the production-control lead',
      why: 'The interview explains how identification is meant to work, so the records can be tested against the described method. An interview alone would never be enough to conclude.',
      run: S => { S.perform('INT-STORES'); } },
    { id: 4, screen: 'card', ob: T, title: 'Traceability: conclude conformity — and note the by-product',
      why: 'Three lots traced end to end with matching identifiers and retrievable cert records. Every aspect is supported by verified, corroborated evidence, so "demonstrated" is permitted. While tracing lot 0431 the traveler showed an operation performed with torque wrench TW-0417. That is not a traceability issue, but it is a lead for calibration control; the same evidence item is linked there, not copied.',
      run: S => { const r = S.conclude(T, 'demonstrated', 'Three sampled lots traced to material certification; EV-LOT-26-0419, -0431, -0438 and interview EV-INT-STORES.'); if (!r.ok) throw new Error(r.reasons[0]); } },
    { id: 5, screen: 'card', ob: C, title: 'Calibration: sample the register, weighting product-acceptance equipment',
      why: 'Select equipment from the Line 3 / Inspection register, including the torque wrench that surfaced from the trace. Each register entry shows interval, due date and certificate traceability. TW-0417 is past its due date.',
      run: S => { ['CAL-MIC-0211', 'CAL-CMM-0002', 'CAL-TW-0422', 'CAL-TW-0417'].forEach(id => S.addToSample(C, id)); } },
    { id: 6, screen: 'card', ob: C, title: 'Calibration: a past-due register entry is a discrepancy only if the tool was used',
      why: 'The register entry is not itself a finding. The assessment is still "more evidence needed" because use during the overdue period is not yet shown. The follow-up points at the work order tool log.',
      run: S => { /* no new evidence: deliberately shows the held state */ } },
    { id: 7, screen: 'card', ob: C, title: 'Calibration: follow the lead — the work order tool log',
      why: 'Operation 40 of work order 88213 used TW-0417 on 2026-09-17, 17 days after its due date. This is a potential discrepancy. The system will still not allow a nonconformity: alternative explanations are outstanding.',
      run: S => { S.perform('WO-88213-OP40'); const r = S.conclude(C, 'nc', ''); if (r.ok) throw new Error('NC should have been refused at this point'); S.conclude(C, 'pending', 'TW-0417 used 2026-09-17 after due date 2026-08-31 (EV-WO-88213-OP40); alternative explanations being evaluated.'); } },
    { id: 8, screen: 'card', ob: C, title: 'Calibration: test the alternative explanations',
      why: 'Was there an authorized extension? Does the procedure allow a grace period? Was the tool identifiable as out of calibration at the point of use? Each is a record, procedure or observation, not an assumption. The post-lapse certificate (as-found within tolerance) reduces product-impact risk but does not cure use outside the interval.',
      run: S => { ['DEV-LOG', 'QP-7.1.5', 'OBS-TW-0417-TAG', 'CAL-TW-0417-B'].forEach(id => S.perform(id)); } },
    { id: 9, screen: 'card', ob: C, title: 'Calibration: interview the calibration coordinator for cause',
      why: 'The interview gives the cause (reminder queue backlog, no one checked the due date). It corroborates the records; it is not the basis of the finding.',
      run: S => { S.perform('INT-CALCOORD'); } },
    { id: 10, screen: 'card', ob: C, title: 'Calibration: evidence-supported assessment and conclusion',
      why: 'Verified records show use outside the calibration interval; no extension, no grace period, no status identification at the point of use. The assessment now supports a nonconformity and the auditor records it.',
      run: S => { const r = S.conclude(C, 'nc', 'EV-WO-88213-OP40 and EV-CAL-TW-0417 show use of TW-0417 on 2026-09-17, 17 days after due date; no extension (EV-DEV-LOG), no grace period (EV-QP-7.1.5).'); if (!r.ok) throw new Error(r.reasons[0]); } },
    { id: 11, screen: 'ncr', ob: C, title: 'NCR: cite the exact governing paragraph and write Should Be / As Found',
      why: 'The reference is 7.1.5.2(a) — not the parent clause, not (b) or (c). Should Be is a paraphrase of the verified obligation; As Found states date, work order, tool, due date and record identifiers; the statement of nonconformity explains the difference; the auditor attests the Should Be against the licensed text.',
      run: S => {
        const n = S.startNCR(C);
        n.citation = '7.1.5.2(a)'; n.shouldBeAttested = true;
        n.asFound = 'On 2026-09-17, torque wrench TW-0417 was used for fastener torque on work order WO-88213, operation 40 (EV-WO-88213-OP40, lot LOT-26-0431), 17 days after its calibration due date of 2026-08-31 (EV-CAL-TW-0417). The deviation log held no extension (EV-DEV-LOG) and procedure QP-7.1.5 Rev C section 4.3 allows no grace period (EV-QP-7.1.5). The coordinator confirmed no one checked the due date (EV-INT-CALCOORD).';
        n.statement = 'The requirement is that equipment used to verify product conformity is calibrated within its specified interval before use. TW-0417 was used 17 days outside its interval, so the requirement was not met for operation 40 of WO-88213; the post-lapse as-found result (EV-CAL-TW-0417-B) reduces product risk but does not remove the nonconformity.';
        n.class = 'Minor'; n.classRationale = 'Isolated lapse; as-found within tolerance; calibration system otherwise functioning on the other sampled equipment.';
      } },
    { id: 12, screen: 'ncr', ob: C, title: 'NCR: submit for auditor review (you decide the approval)',
      why: 'The ten issuance gates are checked in the logic layer. Submit moves the NCR to auditor review. Approval is left to you: use "Approve and issue NCR" if you accept the finding, or return it to draft or discard it.',
      run: S => { const n = S.startNCR(C); const r = S.submitNCR(n); if (!r.ok) throw new Error('NCR gates failed: ' + r.gates.filter(g => !g.ok).map(g => g.msg).join(' | ')); } }
  ];
  return { steps, DEMO_SEED };
});
