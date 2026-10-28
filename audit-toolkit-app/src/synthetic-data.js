/**
 * Synthetic aerospace audit data for the Conform-Edge Audit Toolkit prototype.
 *
 * EVERYTHING HERE IS SYNTHETIC. The organization, people, records, dates and part numbers do not exist.
 * No standard text is reproduced: intents, attributes, steps and Should Be statements are
 * Conform-Edge authored paraphrase. Clause designators are catalogued in CLAUSE_INDEX, whose
 * verification status is UNVERIFIED-SAMPLE until a human technical review against the licensed
 * edition is recorded (release gate).
 *
 * The world (records the auditor can open, people the auditor can ask) is deliberately designed so
 * that the six acceptance scenarios A-F arise from evidence, not from scripted verdicts:
 *   A  OB-8.5.2        Conforming
 *   B  OB-8.4.2-d      Potential nonconformity (fact unverified -> held)
 *   C  OB-7.1.5.2-a    Substantiated nonconformity -> Should Be / As Found NCR
 *   D  (NCR builder)   Incorrect citation blocked (parent clause / wrong paragraph / invalid designator)
 *   E  OB-7.2-c        Alternative compliant method -> no false finding
 *   F  OB-8.5.1.2      Insufficient evidence -> uncertainty preserved
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SyntheticData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STAMPS = {
    pack: 'as9100d-demo 0.3.0 (library content pack; 5 demonstration obligations; NOT-RELEASABLE)',
    packNote: 'Framework fixture + prototype obligations. Not a validated comprehensive audit pack.',
    resolver: 'resolver 1.0.0 sha256:7a438949640c62fa996348a2762f9989cb65bb82bfda19781ce278b1c219709d',
    scheme: 'AS9100-series certification audit (classification aid; certification-body scheme governs)',
    followUpProvider: 'ENGINEERING-STUB deterministic-rules 0.2.0 (not an intelligence service)'
  };

  const ORG = {
    id: 'ORG-MPA', name: 'Meridian Precision Aerostructures', synthetic: true,
    site: 'Plant 2, Building C', activities: ['manufacture', 'distribute'],
    description: 'Machines, treats and assembles aluminium and titanium structural brackets for commercial airframes.',
    priorFindings: [{ ref: 'NCR-2026-003', clause: '8.4.2', note: 'Supplier re-evaluation overdue (surveillance 2026-03). A lead for investigation, not evidence of a current nonconformity.' }]
  };

  const AUDITOR = {
    name: 'A. Reyes', role: 'Lead Auditor (synthetic profile)',
    authorizations: [{ scheme: 'AS9100D', authId: 'AUTH-SYN-0042', validTo: '2027-03-31' }]
  };

  const AUDIT = { id: 'AUD-2026-114', type: 'Surveillance audit', standard: 'AS9100D', edition: 'Rev D (2016)', date: '2026-10-14' };

  /* Sample reference index — UNVERIFIED. Structure from authoring knowledge; must be confirmed against the licensed edition. */
  /* ---------------- Consumption of the Requirement Intelligence Library ----------------
     The Toolkit keeps NO copy of the checklist content. Obligations and the clause hierarchy come from an approved content
     pack (library manifest verified on load). If the pack fails verification the Toolkit refuses to start. */
  const GLOBAL = typeof self !== 'undefined' ? self : this;
  const IS_NODE = typeof module === 'object' && module.exports;
  const RIL = IS_NODE ? require('../vendor/ril/library.js') : GLOBAL.RIL;
  const CONTENT = IS_NODE ? require('../vendor/ril/as9100d-demo@0.3.0.contentpack.json') : (GLOBAL.RIL_PACKS || {})['as9100d-demo'];
  if (!RIL || !CONTENT) throw new Error('Requirement Intelligence Library content pack is not available');
  const PACKV = RIL.verifyPack(CONTENT.pack, CONTENT.manifest);
  if (!PACKV.ok) throw new Error('Content pack failed verification: ' + PACKV.reasons.join('; '));
  const LIB = CONTENT.pack, MANIFEST = CONTENT.manifest;

  /* hierarchy -> the index shape used by citation verification */
  const CLAUSE_INDEX = (function () {
    const clauses = {}, nodes = {}; LIB.hierarchy.forEach(n => { nodes[n.ref] = n; });
    LIB.hierarchy.forEach(n => {
      if (/\(/.test(n.ref)) return;                         // paragraph/subdivision nodes are folded into their clause
      const e = { title: n.title };
      const kids = (n.children || []).filter(c => !/\(/.test(c)), paras = (n.children || []).filter(c => /^[^()]+\([a-z]\)$/.test(c));
      if (kids.length) e.children = kids;
      if (paras.length) { e.paragraphs = paras.map(c => /\(([a-z])\)$/.exec(c)[1]); const subs = {}; paras.forEach(c => { const sn = (nodes[c].children || []); if (sn.length) subs[/\(([a-z])\)$/.exec(c)[1]] = sn.map(x => /\((\d+)\)$/.exec(x)[1]); }); if (Object.keys(subs).length) e.subs = subs; }
      else e.paragraphs = null;
      if (n.titleVerification) e.verification = n.titleVerification;
      clauses[n.ref] = e;
    });
    return { source: LIB.standard.id, edition: LIB.edition.label,
      verification: { status: 'UNVERIFIED-SAMPLE', note: 'Hierarchy catalogued from authoring knowledge; technical review against the licensed edition is a required release gate.' }, clauses };
  })();

  /* library record -> runtime obligation shape used by the audit logic */
  const OBLIGATIONS = LIB.obligations.map(r => ({
    id: r.obligationId, ref: r.clauseRef, process: r.processes[0], label: r.title, appliesWhen: r.applicability.conditions,
    intent: r.intent, objective: r.objective, method: r.method,
    attributes: r.aspects.map(a => ({ id: a.id, text: a.text, required: a.required })), steps: r.verificationActivities, evidenceExpected: r.expectedEvidence,
    sampling: { population: r.sampling.population, guidance: r.sampling.guidance }, minSample: r.sampling.minSample, weaknesses: r.commonFailureIndicators,
    related: r.relatedRequirements, rebuttalChecks: r.rebuttalChecks, shouldBe: r.shouldBe, shouldBeTerms: r.shouldBeTerms, record: r
  }));

  /* ---------------- The world: records and people the auditor can examine ---------------- */
  const act = (o) => Object.assign({ type: 'record', verified: true, links: [], listedFor: [] }, o);
  const L = (ob, attr, effect, extra) => Object.assign({ ob, attr, effect }, extra || {});

  const ACTIONS = [];
  const POP = {}; // obId -> [action ids that are population members]

  /* ===== A — OB-8.5.2: six shipped lots; all trace. LOT-26-0431 also reveals a tool-use fact relevant to calibration (evidence reuse). ===== */
  const lots = [
    ['LOT-26-0412', '2026-09-08', 'Bracket BR-2041', 'T-88101', 'MC-7075-4471'],
    ['LOT-26-0419', '2026-09-10', 'Bracket BR-2041', 'T-88109', 'MC-7075-4471'],
    ['LOT-26-0425', '2026-09-12', 'Fitting FT-0312', 'T-88117', 'MC-6061-3320'],
    ['LOT-26-0431', '2026-09-18', 'Bracket BR-2077', 'T-88213', 'MC-7075-4502'],
    ['LOT-26-0438', '2026-09-22', 'Fitting FT-0312', 'T-88226', 'MC-6061-3321'],
    ['LOT-26-0446', '2026-09-26', 'Bracket BR-2041', 'T-88240', 'MC-7075-4502']
  ];
  POP['OB-8.5.2'] = [];
  lots.forEach(([id, ship, part, trav, cert]) => {
    const isTool = id === 'LOT-26-0431';
    POP['OB-8.5.2'].push(id);
    ACTIONS.push(act({
      id, popOf: 'OB-8.5.2', listedFor: ['OB-8.5.2'], title: id + ' — ' + part, ref: id, date: ship,
      text: 'Reverse trace from shipment ' + ship + ': lot ' + id + ' → traveler ' + trav + ' (all operations signed, lot identifier on every operation) → material certification ' + cert + ' (heat/lot matches traveler). Retrieved by production control in under two minutes.' +
        (isTool ? ' Operation 40 (torque) on traveler ' + trav + ' records tool TW-0417 and execution date 2026-09-17.' : ''),
      links: [L('OB-8.5.2', 'T1', 'supports'), L('OB-8.5.2', 'T2', 'supports'), L('OB-8.5.2', 'T3', 'supports')]
        .concat(isTool ? [L('OB-7.1.5.2-a', 'C2', 'contradicts', { note: 'Traveler shows TW-0417 used on 2026-09-17; register due date 2026-08-31.' })] : []),
      leadsTo: isTool ? ['CAL-TW-0417'] : undefined,
      leadWhy: isTool ? 'Traveler ' + trav + ' operation 40 records torque wrench TW-0417 on 2026-09-17. Check that tool’s calibration status for that date.' : undefined
    }));
  });
  ACTIONS.push(act({
    id: 'INT-STORES', type: 'interview', listedFor: ['OB-8.5.2'], title: 'Interview — Production control lead', ref: 'Interview, Prod. control lead', date: '2026-10-14',
    text: 'Describes lot identifier carried on the traveler from kitting to shipping; confirms travelers are scanned into the MES and retained by lot.',
    links: [L('OB-8.5.2', 'T1', 'supports'), L('OB-8.5.2', 'T3', 'supports')]
  }));

  /* ===== C — OB-7.1.5.2-a ===== */
  const gauges = [
    ['CAL-MIC-0211', 'Micrometer MIC-0211', '2026-05-12', '2026-11-12', 'Inspection'],
    ['CAL-CAL-0087', 'Caliper CAL-0087', '2026-07-03', '2027-01-03', 'Inspection'],
    ['CAL-CMM-0002', 'CMM probe set CMM-0002', '2026-08-20', '2027-02-20', 'Inspection'],
    ['CAL-TW-0417', 'Torque wrench TW-0417', '2026-02-28', '2026-08-31', 'Line 3'],
    ['CAL-TW-0422', 'Torque wrench TW-0422', '2026-06-15', '2026-12-15', 'Line 3'],
    ['CAL-GAG-0540', 'Thread gauge set GAG-0540', '2026-04-02', '2026-10-02', 'Inspection']
  ];
  POP['OB-7.1.5.2-a'] = [];
  gauges.forEach(([id, label, last, due, loc]) => {
    const overdue = id === 'CAL-TW-0417';
    const dueButOk = id === 'CAL-GAG-0540'; // due 2026-10-02 < audit date: also past due on audit date but no usage in the overdue period
    POP['OB-7.1.5.2-a'].push(id);
    ACTIONS.push(act({
      id, popOf: 'OB-7.1.5.2-a', listedFor: ['OB-7.1.5.2-a'], title: label + ' — register & certificate', ref: id, date: last,
      text: label + ' (' + loc + '): last calibrated ' + last + ', 6-month interval, due ' + due + '. Certificate issued by an accredited calibration laboratory; certificate states traceability to national references. Register status: ' + (overdue || dueButOk ? 'ACTIVE (not updated)' : 'IN CAL') + '.' +
        (overdue ? ' Due date has passed.' : '') + (dueButOk ? ' Due date passed on 2026-10-02; tool sent for recalibration 2026-10-05 and out of service since (tag observed).' : ''),
      flag: overdue ? 'overdue' : undefined,
      links: [L('OB-7.1.5.2-a', 'C1', 'supports'), L('OB-7.1.5.2-a', 'C3', 'supports')]
        .concat(overdue ? [] : [L('OB-7.1.5.2-a', 'C2', 'supports')]),
      leadsTo: overdue ? ['WO-88213-OP40'] : undefined,
      leadWhy: overdue ? 'Register shows TW-0417 past its due date. A past-due register entry is only a finding if the tool was used. Check usage records for the overdue period.' : undefined
    }));
  });
  ACTIONS.push(act({
    id: 'WO-88213-OP40', listedFor: ['OB-7.1.5.2-a'], title: 'Work order WO-88213, operation 40 tool log', ref: 'WO-88213 op 40', date: '2026-09-17',
    text: 'Operation 40 (fastener torque, bracket BR-2077) executed 2026-09-17 by operator badge 1182. Tool log records torque wrench TW-0417 and the as-measured torque values. Calibration due date for TW-0417 was 2026-08-31 — 17 days before use.',
    links: [L('OB-7.1.5.2-a', 'C2', 'contradicts')]
  }));
  ACTIONS.push(act({
    id: 'DEV-LOG', listedFor: ['OB-7.1.5.2-a'], title: 'Deviation / calibration-extension log search', ref: 'Deviation log 2026-07-01 → 2026-10-14', date: '2026-10-14',
    text: 'Log searched for 2026-07-01 to 2026-10-14. No extension or deviation entry exists for TW-0417 or any torque wrench.',
    rebuttal: { ob: 'OB-7.1.5.2-a', check: 'RB-1' }, links: []
  }));
  ACTIONS.push(act({
    id: 'QP-7.1.5', type: 'document', listedFor: ['OB-7.1.5.2-a'], title: 'Procedure QP-7.1.5 Rev C — calibration control', ref: 'QP-7.1.5 Rev C §4.3', date: '2026-10-14',
    text: 'Section 4.3 requires equipment past its due date to be removed from service and tagged; it provides no grace period or extension mechanism other than the deviation process.',
    rebuttal: { ob: 'OB-7.1.5.2-a', check: 'RB-2' }, links: []
  }));
  ACTIONS.push(act({
    id: 'OBS-TW-0417-TAG', type: 'observation', listedFor: ['OB-7.1.5.2-a'], title: 'Observation — TW-0417 status at point of use', ref: 'Observation Line 3 tool cart', date: '2026-10-14',
    text: 'TW-0417 observed on the Line 3 open tool cart on 2026-10-14 with a calibration label showing due 2026-08-31 and no out-of-service tag. (The tool was sent to the laboratory 2026-09-22 and returned 2026-09-24; label not yet replaced.)',
    rebuttal: { ob: 'OB-7.1.5.2-a', check: 'RB-3' }, links: []
  }));
  ACTIONS.push(act({
    id: 'CAL-TW-0417-B', listedFor: ['OB-7.1.5.2-a'], title: 'TW-0417 laboratory certificate 2026-09-24', ref: 'CAL cert TW-0417 2026-09-24', date: '2026-09-24',
    text: 'Post-lapse calibration 2026-09-24: as-found readings within tolerance. This reduces the likely product impact; it does not cure use outside the interval on 2026-09-17.',
    links: []
  }));
  ACTIONS.push(act({
    id: 'INT-CALCOORD', type: 'interview', listedFor: ['OB-7.1.5.2-a'], title: 'Interview — Calibration coordinator', ref: 'Interview, Calibration coordinator', date: '2026-10-14',
    text: 'States the TW-0417 reminder did not generate because the reminder queue was backlogged after a system change; confirms no one checked the due date before the 2026-09-17 use.',
    links: [L('OB-7.1.5.2-a', 'C2', 'contradicts')]
  }));

  /* ===== B — OB-8.4.2-d ===== */
  const rcv = [
    ['RCV-26-0829', '2026-08-29', true], ['RCV-26-0903', '2026-09-03', false], ['RCV-26-0915', '2026-09-15', true], ['RCV-26-0922', '2026-09-22', true], ['RCV-26-0930', '2026-09-30', true]
  ];
  POP['OB-8.4.2-d'] = [];
  rcv.forEach(([id, d, hasCoc]) => {
    POP['OB-8.4.2-d'].push(id);
    ACTIONS.push(act({
      id, popOf: 'OB-8.4.2-d', listedFor: ['OB-8.4.2-d'], title: id + ' — anodize receipt', ref: id, date: d,
      text: hasCoc
        ? 'Receiving file for lot received ' + d + ': certificate of conformity from the anodize provider on file; receiving inspector initials and date show it was reviewed against the purchase order at receipt.'
        : 'Receiving file for lot received ' + d + ' contains no certificate of conformity. The "CoC reviewed" field reads "see portal". The receiving clerk states the certificate was reviewed in the supplier portal at the time; the portal record has not been produced.',
      links: hasCoc
        ? [L('OB-8.4.2-d', 'S2', 'supports'), L('OB-8.4.2-d', 'S3', 'supports')]
        : [L('OB-8.4.2-d', 'S2', 'contradicts', { open: true, key: 'K-0903', question: 'Was the certificate reviewed for RCV-26-0903 (portal record not produced)?' })],
      openQuestion: hasCoc ? undefined : 'Was the certificate reviewed for RCV-26-0903 (portal record not produced)?'
    }));
  });
  ACTIONS.push(act({
    id: 'SUP-ENTRY', type: 'document', listedFor: ['OB-8.4.2-d'], title: 'Approved supplier entry — anodize provider', ref: 'ASL-ANO-02', date: '2026-10-14',
    text: 'Approved supplier list entry for the anodize provider defines receiving verification as certificate review against the purchase order for every lot.',
    links: [L('OB-8.4.2-d', 'S1', 'supports')]
  }));
  ACTIONS.push(act({
    id: 'PORTAL-REQ', listedFor: ['OB-8.4.2-d'], followFor: true, title: 'Request supplier-portal record for RCV-26-0903', ref: 'Portal record request', date: '2026-10-14',
    text: 'Quality Manager will retrieve the portal record. Not available at this time; auditee has until end of audit day. Pending.',
    links: [L('OB-8.4.2-d', 'S2', 'neutral')]
  }));
  ACTIONS.push(act({
    id: 'ALT-RCV', listedFor: ['OB-8.4.2-d'], title: 'Other verification evidence for RCV-26-0903', ref: 'Packing slip / test report check', date: '2026-10-14',
    text: 'Packing slip lists the provider’s lot number only; no test report or source inspection accompanies the lot.',
    rebuttal: { ob: 'OB-8.4.2-d', check: 'RB-1' }, links: []
  }));
  // Prototype review aids: outcomes of the pending portal request (hidden from the normal action list)
  ACTIONS.push(act({
    id: 'SIM-PORTAL-A', simulated: true, listedFor: ['OB-8.4.2-d'], resolvesKey: 'K-0903', title: 'SIMULATE: portal record shows review on receipt', ref: 'Portal audit trail RCV-26-0903', date: '2026-10-14',
    text: 'Portal audit trail shows the certificate was opened and approved by the receiving inspector on 2026-09-04, the day after receipt. (Record is outside the organization’s retention control — an observation, not a nonconformity.)',
    links: [L('OB-8.4.2-d', 'S2', 'supports', { resolves: 'K-0903' })]
  }));
  ACTIONS.push(act({
    id: 'SIM-PORTAL-B', simulated: true, listedFor: ['OB-8.4.2-d'], resolvesKey: 'K-0903', title: 'SIMULATE: portal shows no review event', ref: 'Portal audit trail RCV-26-0903', date: '2026-10-14',
    text: 'Portal audit trail shows the certificate was uploaded by the provider on 2026-09-10, seven days after receipt, and was never opened by anyone at the organization. The lot was released to production on 2026-09-05.',
    links: [L('OB-8.4.2-d', 'S2', 'contradicts', { resolves: 'K-0903' })]
  }));

  /* ===== E — OB-7.2-c: no "effectiveness evaluation form" exists; the organization uses an MES qualification gate ===== */
  const trs = [
    ['TR-2026-011', '2026-08-30', 'Inspection technician', 'pass'],
    ['TR-2026-014', '2026-09-14', 'Production operator', 'retrain'],
    ['TR-2026-016', '2026-09-02', 'Inspection technician', 'pass'],
    ['TR-2026-019', '2026-09-21', 'Production operator', 'pass'],
    ['TR-2026-022', '2026-09-28', 'Planner', 'pass']
  ];
  POP['OB-7.2-c'] = [];
  trs.forEach(([id, d, who, outcome]) => {
    POP['OB-7.2-c'].push(id);
    ACTIONS.push(act({ id, popOf: 'OB-7.2-c', listedFor: ['OB-7.2-c'], title: id + ' — ' + who, ref: id, date: d, text: '', links: [] }));
  });
  // texts and links are set explicitly below
  const trText = {
    'TR-2026-011': 'Inspection technician: training completed 2026-08-30. MES qualification gate record: three observed-task assessments against WI-QUAL-12 criteria, all passed by 2026-09-12; supervisor sign-off 2026-09-12; independent task authorization issued only after sign-off.',
    'TR-2026-014': 'Production operator: training completed 2026-09-14. MES gate: first observed-task assessment (2026-09-18) FAILED criterion 3; MES blocked independent authorization; retraining assigned; reassessment passed 2026-09-29; sign-off recorded.',
    'TR-2026-016': 'Inspection technician: training completed 2026-09-02. MES gate: three observed-task assessments passed by 2026-09-16 against WI-QUAL-12; supervisor sign-off 2026-09-16.',
    'TR-2026-019': 'Production operator: training completed 2026-09-21. MES gate: three observed-task assessments passed by 2026-10-02 against WI-QUAL-12; sign-off 2026-10-02.',
    'TR-2026-022': 'Planner: training completed 2026-09-28. Role has no observed-task gate; MES records manager confirmation of capability against the planning competence matrix 2026-10-05.'
  };
  trs.forEach(([id, , , outcome]) => {
    const a = ACTIONS.find(x => x.id === id);
    a.text = trText[id];
    const planner = id === 'TR-2026-022';
    a.links = planner
      ? [L('OB-7.2-c', 'P2', 'supports'), L('OB-7.2-c', 'P3', 'supports')]
      : [L('OB-7.2-c', 'P1', 'supports'), L('OB-7.2-c', 'P2', 'supports'), L('OB-7.2-c', 'P3', 'supports')]
          .concat(outcome === 'retrain' ? [L('OB-7.2-c', 'P4', 'supports')] : []);
  });
  ACTIONS.push(act({
    id: 'FORM-SEARCH', listedFor: ['OB-7.2-c'], title: 'Search for a "training effectiveness evaluation" form', ref: 'Document control search', date: '2026-10-14',
    text: 'No controlled form with that title exists. The training coordinator explains the organization retired such a form in 2024 and determines effectiveness through the MES qualification gate instead.',
    formAbsent: true, altMethod: true, obRef: 'OB-7.2-c',
    links: [L('OB-7.2-c', 'P1', 'neutral')]
  }));
  ACTIONS.push(act({
    id: 'WI-QUAL-12', type: 'document', listedFor: ['OB-7.2-c'], title: 'Work instruction WI-QUAL-12 Rev B — qualification gate', ref: 'WI-QUAL-12 Rev B', date: '2026-10-14',
    text: 'Defines the observed-task assessment criteria per role, the pass standard, who may assess, that failure blocks independent authorization, and that results are recorded in the MES against the training action and the person.',
    altMethod: true, rebuttal: { ob: 'OB-7.2-c', check: 'RB-1' },
    links: [L('OB-7.2-c', 'P1', 'supports'), L('OB-7.2-c', 'P4', 'supports')]
  }));
  ACTIONS.push(act({
    id: 'INT-SUPV', type: 'interview', listedFor: ['OB-7.2-c'], title: 'Interview — Production supervisor', ref: 'Interview, Prod. supervisor', date: '2026-10-14',
    text: 'Explains the gate, gives the TR-2026-014 example unprompted, and shows where the assessment result is entered.',
    altMethod: true,
    links: [L('OB-7.2-c', 'P2', 'supports')]
  }));

  /* ===== F — OB-8.5.1.2: thin, partly inaccessible evidence ===== */
  POP['OB-8.5.1.2'] = [];
  ACTIONS.push(act({
    id: 'HT-SPEC', type: 'document', listedFor: ['OB-8.5.1.2'], title: 'Heat-treat process approval HT-SPEC-07', ref: 'HT-SPEC-07 Rev D', date: '2026-10-14',
    text: 'Process specification with documented review and approval criteria, approved by engineering and quality 2025-11-18.',
    links: [L('OB-8.5.1.2', 'V1', 'supports')]
  }));
  ACTIONS.push(act({
    id: 'SURVEY-REQ', listedFor: ['OB-8.5.1.2'], title: 'Request furnace F-3 survey record', ref: 'Furnace F-3 survey request', date: '2026-10-14',
    text: 'The survey report is held by the contracted laboratory; the custodian is away until 2026-10-21 and the file could not be produced during the audit. Evidence not available.',
    links: [L('OB-8.5.1.2', 'V2', 'neutral')]
  }));
  ACTIONS.push(act({
    id: 'PERS-MATRIX', type: 'document', listedFor: ['OB-8.5.1.2'], title: 'Heat-treat personnel qualification matrix', ref: 'QUAL-MATRIX-HT', date: '2026-10-14',
    text: 'Matrix lists three qualified operators with qualification dates; supervisor signature present.',
    links: [L('OB-8.5.1.2', 'V3', 'supports')]
  }));
  ACTIONS.push(act({
    id: 'INT-HTLEAD', type: 'interview', listedFor: ['OB-8.5.1.2'], title: 'Interview — Heat-treat lead', ref: 'Interview, Heat-treat lead', date: '2026-10-14',
    text: 'States furnace surveys are performed quarterly and the last survey was "in August". Cannot show a record. Revalidation after the 2026 furnace controller change: "I think engineering did something".',
    links: [L('OB-8.5.1.2', 'V2', 'supports'), L('OB-8.5.1.2', 'V4', 'supports')]
  }));

  const world = { actions: ACTIONS, populations: POP };

  /* Owner directive 2026-10-11: titles of 8.5.1.1 / 8.5.1.2 / 8.5.1.3 independently checked. Title-level only: paragraph structure and
     interpretation are NOT covered by that check. Everything else in the index remains unverified. */
  ['8.5.1.1', '8.5.1.2', '8.5.1.3'].forEach(k => { CLAUSE_INDEX.clauses[k].verification = { status: 'TITLE-CHECKED-BY-OWNER', scope: 'title only', by: 'Brian Olea (owner directive)', date: '2026-10-11' }; });

  /* Source-verification record (one entry per obligation). Clause hierarchy and authored interpretation are reviewed SEPARATELY.
     All PENDING: no human review against the controlled edition has been recorded. */
  const PACK_VERSION = '0.2.0-proto'; // verification-record schema version used by the app; library content version is MANIFEST.contentVersion
  const pend = () => ({ result: 'PENDING', reviewer: null, reviewDate: null, evidenceRef: null, notes: '' });
  const VERIFICATION = OBLIGATIONS.map(ob => ({
    packVersion: PACK_VERSION, sourceEdition: CLAUSE_INDEX.source + ' ' + CLAUSE_INDEX.edition, clauseRef: ob.ref, obligationId: ob.id,
    source: { identity: 'SAE AS9100D (' + CLAUSE_INDEX.source + ')', edition: CLAUSE_INDEX.edition, controlledCopyId: null },
    authoredBy: 'AI-assisted draft (Claude) — not self-approvable',
    clauseHierarchy: pend(),          // exact hierarchy through the lettered/numbered subdivision, against the controlled copy
    interpretation: pend(),           // the independently authored requirement interpretation (intent, aspects, Should Be paraphrase)
    intendedOutcome: pend(),          // the intended outcome the obligation is meant to achieve
    applicability: Object.assign(pend(), { conditions: ob.appliesWhen }),
    finalApproval: { status: 'PENDING', approver: null, date: null, evidenceRef: null },
    note: ob.ref === '8.5.1.2' ? 'Title of 8.5.1.2 checked by owner 2026-10-11 (directive); obligation interpretation and any paragraph structure not yet reviewed.' : ''
  }));

  const SCENARIOS = [
    { key: 'A', title: 'Conforming', ob: 'OB-8.5.2', path: 'Open Identification & traceability. Draw or select at least 3 shipped lots and review each trace. Every attribute is supported → "Requirement demonstrated" becomes available.' },
    { key: 'B', title: 'Potential nonconformity', ob: 'OB-8.4.2-d', path: 'Review all five receipts. RCV-26-0903 has no certificate in the file. The system holds it as potential; try to record a nonconformity and it is refused. Request the portal record, then use the review-aid buttons to resolve it either way.' },
    { key: 'C', title: 'Substantiated nonconformity', ob: 'OB-7.1.5.2-a', path: 'Review the register for TW-0417, follow the suggested lead to the work order, then evaluate the alternative explanations. Develop the NCR and complete every gate.' },
    { key: 'D', title: 'Incorrect citation', ob: 'OB-7.1.5.2-a', path: 'In the NCR builder, try citing 7.1.5.2 (no paragraph), 7.1.5.2(b) (wrong paragraph) and 7.1.5.2(e) (does not exist). Each is refused for a different reason.' },
    { key: 'E', title: 'Alternative compliant method', ob: 'OB-7.2-c', path: 'No "effectiveness evaluation" form exists. Review the records and the work instruction: the intent is met by a different mechanism. A nonconformity cannot be recorded or an NCR issued.' },
    { key: 'F', title: 'Insufficient evidence', ob: 'OB-8.5.1.2', path: 'Only part of the evidence is available. The system will not allow "demonstrated" or "nonconformity"; record "Insufficient objective evidence" and it carries into the report as a limitation.' }
  ];

  return { STAMPS, ORG, AUDITOR, AUDIT, CLAUSE_INDEX, OBLIGATIONS, world, SCENARIOS, VERIFICATION, PACK_VERSION, LIB, MANIFEST, RIL };
});
