/**
 * Synthetic data and glue for the revised Audit Toolkit prototype. EVERYTHING HERE IS SYNTHETIC.
 * Includes the preset standards library listing (status of each intended pack), auditor register, a sample program, a sample SCAR,
 * an imported audit-results record (as a field-execution product would export it) and the competency NCR scenario evaluator.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./audit-core.js'), require('./session.js'), require('./walkthrough.js'), require('./synthetic-data.js'), require('./scar-core.js'), require('./program-core.js'));
  else root.ToolkitData = factory(root.AuditCore, root.AuditSession, root.Walkthrough, root.SyntheticData, root.ScarBuilder, root.AuditProgram);
})(typeof self !== 'undefined' ? self : this, function (Core, AuditSession, Walkthrough, Data, Scar, Program) {
  'use strict';

  /* The intended first ten commercial packs (owner list, 2026-10-11). Editions are NOT asserted here: see STANDARDS-EDITION-VERIFICATION-REGISTER.md.
     Commercial content is gated by Product Governor approval and licensing. */
  const PRESET_LIBRARY = [
    { n: 1, id: 'ISO9001', name: 'ISO 9001 — Quality management systems', family: 'QMS' },
    { n: 2, id: 'AS9100D', name: 'AS9100 — Aerospace quality management systems', family: 'Aerospace', demo: true },
    { n: 3, id: 'AS9110', name: 'AS9110 — Aviation maintenance QMS', family: 'Aerospace' },
    { n: 4, id: 'AS9120', name: 'AS9120 — Aerospace distribution QMS', family: 'Aerospace' },
    { n: 5, id: 'ISO14001', name: 'ISO 14001 — Environmental management systems', family: 'Environment' },
    { n: 6, id: 'ISO27001', name: 'ISO/IEC 27001 — Information security management systems', family: 'Information security' },
    { n: 7, id: 'IATF16949', name: 'IATF 16949 — Automotive quality management systems', family: 'Automotive' },
    { n: 8, id: 'ISO13485', name: 'ISO 13485 — Medical device quality management systems', family: 'Medical devices' },
    { n: 9, id: 'ISO45001', name: 'ISO 45001 — Occupational health and safety management systems', family: 'OH&S' },
    { n: 10, id: 'ISO22000', name: 'ISO 22000 — Food safety management systems', family: 'Food safety' }
  ].map(s => Object.assign({ editionStatus: 'To be verified (see edition register)', contentStatus: s.demo ? 'Demonstration content: 5 deep obligations, index incomplete, unverified' : 'Not authored', licenceStatus: 'Not cleared', releaseStatus: 'NOT-RELEASABLE' }, s));
  const FUTURE_PACKS = ['FAA Part 21', 'FAA Part 145', 'EASA Part 21', 'EASA Part 145', 'Other civil aviation regulations', 'Additional ISO standards', 'Customer-specific requirements', 'Industry-specific standards', 'Specialized compliance frameworks'];
  const METHOD_REFERENCES = [{ id: 'ISO19011', name: 'ISO 19011 — Guidelines for auditing management systems', role: 'General audit methodology (informs the planning engine)' }, { id: 'AS9101', name: 'AS9101 — Aerospace audit requirements', role: 'Certification-scheme overlay (not a content pack)' }, { id: 'AS9104/1', name: 'AS9104/1 — Aerospace certification-body requirements', role: 'Certification-scheme overlay (not a content pack)' }];

  const AUDITORS = [
    { id: 'AU-01', name: 'A. Reyes', site: 'External', responsibleFor: [], competencies: [{ standard: 'AS9100D', lead: true, validTo: '2027-03-31' }] },
    { id: 'AU-02', name: 'J. Okafor', site: 'Plant 2', responsibleFor: ['Calibration & Measurement'], competencies: [{ standard: 'AS9100D', lead: false, validTo: '2027-01-31' }] },
    { id: 'AU-03', name: 'M. Lindqvist', site: 'External', responsibleFor: [], competencies: [{ standard: 'AS9100D', lead: true, validTo: '2026-12-31' }] },
    { id: 'AU-04', name: 'T. Haddad', site: 'External', responsibleFor: [], competencies: [{ standard: 'ISO9001', lead: true, validTo: '2027-06-30' }] }
  ];
  const ORG_PROFILE = { name: 'Meridian Precision Aerostructures', synthetic: true, site: 'Plant 2, Building C', activities: ['manufacture', 'distribute'] };
  const PROCESS_OWNERS = { 'Calibration & Measurement': 'Calibration coordinator', 'Production Control': 'Production manager', 'Purchasing & Receiving': 'Supply chain manager', 'Competence & Training': 'HR / training coordinator', 'Special Processes': 'Heat-treat lead' };

  function sampleProgram(pack) {
    const cur = Core.sha256 ? null : null; // (hash comes from the library manifest)
    const m = Data.RIL.buildManifest(pack);
    const p = Program.createProgram({ id: 'PRG-2026', name: 'Internal audit program 2026', org: { name: ORG_PROFILE.name, activities: ORG_PROFILE.activities.slice() }, standard: { id: 'AS9100D', edition: 'Rev D (2016)' },
      period: { start: '2026-01-01', end: '2026-12-31' }, sites: ['Plant 2, Building C'],
      processes: [{ id: 'Calibration & Measurement', name: 'Calibration & Measurement', owner: PROCESS_OWNERS['Calibration & Measurement'], risk: 4 }, { id: 'Production Control', name: 'Production Control', owner: PROCESS_OWNERS['Production Control'], risk: 3 }, { id: 'Purchasing & Receiving', name: 'Purchasing & Receiving', owner: PROCESS_OWNERS['Purchasing & Receiving'], risk: 4 }, { id: 'Competence & Training', name: 'Competence & Training', owner: PROCESS_OWNERS['Competence & Training'], risk: 2 }, { id: 'Special Processes', name: 'Special Processes', owner: PROCESS_OWNERS['Special Processes'], risk: 3 }],
      history: [{ processId: 'Purchasing & Receiving', date: '2026-03-12', findings: [{ obligationId: 'OB-8.4.2-d', ref: 'NCR-2026-003' }] }, { processId: 'Production Control', date: '2025-11-04', findings: [] }, { processId: 'Calibration & Measurement', date: '2026-01-20', findings: [] }] });
    Program.addAudit(p, { id: 'AUD-P01', site: 'Plant 2, Building C', type: 'Internal', plannedDate: '2026-03-12', status: 'Completed', lead: 'A. Reyes', processIds: ['Purchasing & Receiving', 'Production Control'], obligationIds: ['OB-8.4.2-d', 'OB-8.5.2'],
      results: { 'OB-8.5.2': { outcome: 'demonstrated', date: '2026-03-12', assessedHash: m.obligations['OB-8.5.2'] }, 'OB-8.4.2-d': { outcome: 'nc', date: '2026-03-12', assessedHash: m.obligations['OB-8.4.2-d'], closed: false } } });
    Program.addAudit(p, { id: 'AUD-P02', site: 'Plant 2, Building C', type: 'Internal', plannedDate: '2026-09-30', status: 'Planned', lead: 'M. Lindqvist', processIds: ['Calibration & Measurement'], obligationIds: ['OB-7.1.5.2-a'] });
    Program.justifyNA(p, 'OB-8.5.1.2', 'Heat treatment is performed only by an approved external provider; the organization controls approval and verification through its purchasing process. (Synthetic justification; the auditor must confirm.)', 'Quality manager', '2026-02-02');
    Program.pin(p, pack);
    return p;
  }

  const SAMPLE_SCAR_SOURCE = {
    supplierRef: 'SCAR-MPA-0412', customer: 'Northfield Aerospace (synthetic)', customerRef: 'SCAR-NF-2217', received: '2026-10-06', responseDue: '2026-10-27',
    subject: 'Torque verification on bracket BR-2077, lot LOT-26-0431',
    allegation: 'During a customer source inspection, the torque operation on lot LOT-26-0431 was found to have been performed with a torque wrench past its calibration due date. The customer asserts that all September lots are therefore suspect and that the supplier’s calibration control is ineffective.',
    items: ['Torque wrench used past calibration on lot LOT-26-0431', 'Other September lots may be affected', 'Calibration control is ineffective (customer assertion)'],
    requirements: [{ text: 'Measuring equipment used to verify product conformity is calibrated within its interval before use (supplier quality requirements flowed down by the customer purchase order).', source: 'contract' }, { text: 'AS9100D 7.1.5.2(a) (demonstration reference; designators unverified)', source: 'standard' }],
    assertions: ['Calibration control is ineffective', 'All September lots are suspect']
  };

  /** A synthetic "imported audit results" record, as a field-execution product would hand it over (12-step thread executed, NCR left in review). */
  function importedAudit() {
    const S = AuditSession.create({ id: 'AUD-IMP-2026-114' }); Walkthrough.steps.forEach(st => st.run(S)); return S;
  }
  const NCR_SCHEMES = [
    { id: 'major-minor', label: 'Major / Minor (certification-style)', classes: ['Major', 'Minor'], aid: 'Major: breakdown or absence of a required process, or a condition likely to affect conformity of delivered product. Minor: isolated lapse where the system otherwise functions. (Aid only; the governing scheme rules apply — to be verified per scheme.)' },
    { id: 'critical-major-minor', label: 'Critical / Major / Minor (supplier or customer style)', classes: ['Critical', 'Major', 'Minor'], aid: 'Scheme definitions differ between customers; use the customer’s documented definitions. (Aid only — to be verified.)' },
    { id: 'nc-observation', label: 'Nonconformity / Observation (internal)', classes: ['Nonconformity', 'Observation'], aid: 'Internal programme classification. An observation is not a nonconformity and does not need Should Be / As Found closure.' }
  ];

  /** Competency scoring for the free-text NCR item: runs the trainee's draft through the product's real issuance gates. */
  function ncrScenarioEval(item, ans) {
    const S = AuditSession.create({ id: 'AUD-COMP' }); const ob = 'OB-7.1.5.2-a';
    S.addToSample(ob, 'CAL-TW-0417'); ['WO-88213-OP40', 'DEV-LOG', 'QP-7.1.5', 'OBS-TW-0417-TAG'].forEach(i => S.perform(i)); S.conclude(ob, 'nc', 'scenario');
    const n = S.startNCR(ob); n.citation = ans.citation || ''; n.shouldBe = ans.shouldBe || ''; n.shouldBeAttested = true; n.asFound = ans.asFound || ''; n.statement = ans.statement || ''; n.class = 'Minor'; n.classRationale = 'scenario fixed for scoring';
    const want = ['citation', 'shouldbe', 'asfound']; // only gates that depend on the trainee's draft (evidence, applicability and alternatives are fixed by the scenario)
    const g = S.gates(n).filter(x => want.includes(x.id)); return { gatesPassed: g.filter(x => x.ok).length, gatesTotal: g.length, failed: g.filter(x => !x.ok).map(x => x.id + ': ' + x.msg) };
  }
  return { PRESET_LIBRARY, FUTURE_PACKS, METHOD_REFERENCES, AUDITORS, ORG_PROFILE, PROCESS_OWNERS, sampleProgram, SAMPLE_SCAR_SOURCE, importedAudit, NCR_SCHEMES, ncrScenarioEval };
});
