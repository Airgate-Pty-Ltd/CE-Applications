#!/usr/bin/env node
/**
 * ONE-TIME BOOTSTRAP (provenance record). Created the first library pack from the prototype's five demonstration
 * obligations and added the authored audit intelligence required by the canonical schema. After running, the generated
 * JSON in packs/ is the single source of truth; the prototype now CONSUMES it. Do not re-run over an edited pack.
 * All authored content is AI-assisted draft: sourceVerification PENDING, technicalApproval PENDING.
 */
'use strict';
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', '..', 'packs', 'as9100d-demo.library.json');
if (fs.existsSync(out) && !process.argv.includes('--force')) { console.error('pack exists; refusing to overwrite (use --force only deliberately)'); process.exit(2); }
const Data = require('../../../2026-10-11-audit-toolkit-app/src/synthetic-data.js');

const ADD = {
  'OB-8.5.2': {
    interpretation: 'Where traceability is required, outputs are uniquely identified and the organization keeps the records that let each delivered output be traced back through production to the material and process history that justify its conformity.',
    expectedControl: 'A defined identification scheme carried through production; records linking delivered lot or serial to operations and to material and process certifications; retrieval without reconstruction by the auditee.',
    auditQuestions: [
      'Show how a lot identifier is assigned and where it first appears. What changes at each stage (kitting, machining, treatment, inspection, packing) and how is the link preserved when an identifier changes?',
      'Choose a shipped lot and trace it backwards: shipment, traveler, each operation record, material certification. Which identifier ties each hop and who can retrieve it without help?',
      'Where product is split, merged, reworked or scrapped, how is traceability kept for the remaining and the new quantities?',
      'How is the material certification tied to the specific heat or lot used and not only to the part number? Show a case where two heats of one alloy were in stock.',
      'How long are traceability records retained, where, and what happens when a record for a delivered lot cannot be found?'],
    interviewQuestions: ['(Stores / production control) How is product labelled when it leaves kitting, and what do you do when a label is damaged or missing?', '(Quality) The last time a customer asked for a trace, how long did it take and what was hard to find?', '(Operator) If you split a batch at your station, what do you record and where?'],
    processRelationships: ['Production control', 'Receiving inspection and material control', 'Nonconforming product control', 'Shipping and records retention'],
    riskConsiderations: ['Escape and recall scope depend on trace accuracy', 'Split or mixed-heat lots weaken the chain', 'A weak cert-to-lot link lets unapproved material pass unnoticed'],
    alternativeValidImplementations: ['Barcode or MES-based identification instead of a paper traveler', 'Serial-level traceability replacing lot-level where product is serialized', 'Supplier-held records, if retention and on-demand retrieval are demonstrated'],
    concepts: ['CONCEPT-TRACEABILITY'], applicabilityNote: 'Applies where traceability is a requirement of the organization’s products or contracts; confirm against contracts and the scope of manufacture.' },
  'OB-7.1.5.2-a': {
    interpretation: 'Equipment used to verify product conformity is calibrated or verified at specified intervals, or before use, against standards traceable to national or international references.',
    expectedControl: 'A calibration register with defined intervals; controlled status so out-of-interval equipment is not used; certificates showing traceable calibration; a response when equipment is found out of tolerance.',
    auditQuestions: [
      'How are calibration intervals set for each equipment type, and on what evidence are they reviewed?',
      'Compare the register due dates with today. For anything past due, what is its status and where is it physically?',
      'For equipment that went past due during the review period, show the usage records for the overdue window. Was it used?',
      'How is calibration status shown at the point of use and what actually stops use when it lapses?',
      'Show a certificate: which reference standard is cited, what is the traceability statement, and were as-found results recorded and reviewed?',
      'The last time equipment was found out of tolerance, what review of previously measured product was done and what was the outcome?'],
    interviewQuestions: ['(Calibration coordinator) How are you reminded of due dates, and what happens when that system is unavailable?', '(Operator) How do you know this tool is in date before you use it?', '(Supervisor) If a tool is overdue and the job is urgent, what happens?'],
    processRelationships: ['Calibration control', 'Production and inspection', 'Purchasing (external calibration laboratories)', 'Nonconforming product control'],
    riskConsiderations: ['Product accepted on unreliable measurement', 'Undetected drift between calibrations', 'Dependence on one person or one reminder system'],
    alternativeValidImplementations: ['Verification against a master before each use instead of interval calibration, if defined and recorded', 'Interval adjustment based on documented history', 'Calibration in-house against traceable standards, or by a customer-approved laboratory'],
    concepts: ['CONCEPT-MEASUREMENT-TRACEABILITY'], applicabilityNote: 'Applies wherever monitoring or measuring equipment is used to provide evidence of product conformity.' },
  'OB-8.4.2-d': {
    interpretation: 'The organization determines and performs the verification needed to be confident that what an external provider supplies meets requirements, and keeps evidence that it was performed.',
    expectedControl: 'Defined verification per provider and product; performed on each receipt as defined; records retained where the organization controls them.',
    auditQuestions: [
      'What verification is defined for this provider’s output and where is that decision recorded?',
      'For the lots received this period, show the verification record for each. Where a record is missing, how do you know the verification happened?',
      'Where verification relies on the provider’s own system or portal, how does the organization retain and retrieve that evidence?',
      'How does verification differ between low-risk and high-risk supplies, and who decided?',
      'What happens to a lot when verification cannot be completed before it is needed in production?'],
    interviewQuestions: ['(Receiving inspector) Walk me through receiving the last anodize lot. What do you check and where do you record it?', '(Purchasing) How do you confirm the provider’s certificate belongs to this lot?', '(Quality manager) How would you detect that a lot was released without its verification?'],
    processRelationships: ['Purchasing and supplier approval', 'Receiving inspection', 'Production release', 'Nonconforming product control'],
    riskConsiderations: ['Unverified special-process output enters production', 'Evidence held only outside the organization’s retention control', 'Release pressure bypasses verification'],
    alternativeValidImplementations: ['Provider certificate review plus periodic source or in-process verification', 'Electronic receiving with certificate attached in the organization’s own system', 'Reduced verification for a provider with a demonstrated record and a documented rationale'],
    concepts: ['CONCEPT-EXTERNAL-PROVIDER-VERIFICATION'], applicabilityNote: 'Applies where externally provided processes, products or services are used; scope the sample to the provider and output type in question.' },
  'OB-7.2-c': {
    interpretation: 'Where the organization takes action to acquire necessary competence, it evaluates whether the action was effective.',
    expectedControl: 'A defined method and criteria for judging effectiveness, applied after the action, with results recorded and acted on when unsatisfactory.',
    auditQuestions: [
      'How does the organization decide that a training or other competence action worked? Where is the method and the pass standard defined?',
      'For these completed actions, show the evaluation that followed. Who judged it, against what criteria, and when?',
      'Show a case where the result was unsatisfactory. What happened to the person’s authorization and what did the organization do next?',
      'How is the evaluation result linked to the person and the original action so it can be retrieved?',
      'Where no formal form exists, what other mechanism produces the same assurance and how do you know it is applied every time?'],
    interviewQuestions: ['(Supervisor) How do you decide someone can work unsupervised after training?', '(Employee) What did you have to demonstrate before you were signed off?', '(Training coordinator) How do you find out that a training action did not work?'],
    processRelationships: ['Human resources and training', 'Production and inspection supervision', 'Authorization and qualification records'],
    riskConsiderations: ['Completion mistaken for competence', 'Independent work authorized before evaluation', 'Criteria for “effective” left to individual judgement'],
    alternativeValidImplementations: ['A qualification gate in the production system that blocks authorization until observed assessments pass', 'Supervisor observation against written criteria with a signed record', 'Post-training performance measures (for example first-pass yield) with defined thresholds'],
    concepts: ['CONCEPT-COMPETENCE-EFFECTIVENESS'], applicabilityNote: 'Applies where competence actions are taken for persons whose work affects conformity of the product or the management system.' },
  'OB-8.5.1.2': {
    interpretation: 'Where output cannot be fully verified by later inspection, the process is validated, equipment and personnel are qualified, and the process is kept in control and revalidated when needed.',
    expectedControl: 'Defined approval criteria; current equipment qualification; qualified personnel; records and defined triggers for revalidation.',
    auditQuestions: [
      'Which processes does the organization treat as special and on what basis? Show the list and who maintains it.',
      'For the selected process, show the approval criteria and the record that the process met them.',
      'Show the current equipment qualification (for example a furnace survey): date, result, who performed it, next due date.',
      'Show how personnel qualification is established, recorded and kept current, including expiry.',
      'What changes trigger revalidation (equipment controller change, relocation, parameter change) and show a time it happened.'],
    interviewQuestions: ['(Process lead) When was the equipment last qualified and where is that record?', '(Operator) What stops you running the process if your qualification has lapsed?', '(Engineering) What would make you revalidate this process?'],
    processRelationships: ['Special process operation', 'Equipment maintenance and calibration', 'Training and qualification', 'Engineering change control'],
    riskConsiderations: ['Latent defects not detectable by inspection', 'Lapsed equipment qualification', 'Unrevalidated process after a change'],
    alternativeValidImplementations: ['Outsourcing to an accredited provider with the organization controlling the approval and verification', 'Customer-specific special-process approval used as the qualification basis, if recorded'],
    concepts: ['CONCEPT-SPECIAL-PROCESS-CONTROL'], applicabilityNote: 'Applies only where the organization performs or controls special processes within scope; justify non-applicability if none exist.' }
};

const concepts = [
  { id: 'CONCEPT-TRACEABILITY', name: 'Identification and traceability', description: 'Outputs can be traced to the history that justifies their conformity.' },
  { id: 'CONCEPT-MEASUREMENT-TRACEABILITY', name: 'Measurement traceability and calibration', description: 'Measuring equipment is demonstrably accurate when used.' },
  { id: 'CONCEPT-EXTERNAL-PROVIDER-VERIFICATION', name: 'Verification of externally provided outputs', description: 'The organization verifies what it receives from others.' },
  { id: 'CONCEPT-COMPETENCE-EFFECTIVENESS', name: 'Competence and effectiveness of competence actions', description: 'Competence actions are shown to work.' },
  { id: 'CONCEPT-SPECIAL-PROCESS-CONTROL', name: 'Control of special processes', description: 'Processes whose output cannot be fully verified are validated and controlled.' }
].map(c => Object.assign(c, { crossStandard: [{ standard: 'ISO 9001', obligation: null, status: 'NOT-AUTHORIZED-YET', note: 'Shared intent only. Standard-specific obligations stay separate; no generic flattening.' }] }));

// hierarchy from the sample index (descriptor titles are Conform-Edge wording, not standard text)
const ix = Data.CLAUSE_INDEX.clauses; const hierarchy = [];
const parentOf = {}; Object.keys(ix).forEach(k => (ix[k].children || []).forEach(c => { parentOf[c] = k; }));
Object.keys(ix).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(k => {
  const e = ix[k]; const kids = (e.children || []).slice();
  const node = { ref: k, title: e.title, parent: parentOf[k] || null, children: kids, auditable: 'unknown', obligationIds: [] };
  if (e.paragraphs) {
    e.paragraphs.forEach(p => {
      const pr = k + '(' + p + ')'; kids.push(pr);
      const subs = (e.subs && e.subs[p]) || [];
      hierarchy.push({ ref: pr, title: 'paragraph (' + p + ')', parent: k, children: subs.map(s => pr + '(' + s + ')'), auditable: 'unknown', obligationIds: [] });
      subs.forEach(s => hierarchy.push({ ref: pr + '(' + s + ')', title: 'subdivision (' + s + ')', parent: pr, children: [], auditable: 'unknown', obligationIds: [] }));
    });
  }
  if (e.verification) node.titleVerification = e.verification;
  hierarchy.push(node);
});
const hx = {}; hierarchy.forEach(n => { hx[n.ref] = n; });

const obligations = Data.OBLIGATIONS.map(o => {
  const a = ADD[o.id];
  const rec = {
    obligationId: o.id, standard: { id: 'AS9100D', name: 'Quality management systems — requirements for aviation, space and defense organizations', publisher: 'SAE International / IAQG' },
    edition: { label: Data.CLAUSE_INDEX.edition }, clauseRef: o.ref, title: o.label,
    interpretation: a.interpretation, intent: o.intent, expectedControl: a.expectedControl,
    applicability: { conditions: o.appliesWhen, note: a.applicabilityNote },
    objective: o.objective, method: o.method,
    verificationActivities: o.steps.slice(), auditQuestions: a.auditQuestions, interviewQuestions: a.interviewQuestions,
    expectedEvidence: o.evidenceExpected.slice(), sampling: { population: o.sampling.population, guidance: o.sampling.guidance, minSample: o.minSample },
    processes: [o.process], processRelationships: a.processRelationships, riskConsiderations: a.riskConsiderations,
    commonFailureIndicators: o.weaknesses.slice(), alternativeValidImplementations: a.alternativeValidImplementations,
    relatedRequirements: o.related.slice(),
    aspects: o.attributes.map(x => ({ id: x.id, text: x.text, required: x.required !== false })),
    rebuttalChecks: o.rebuttalChecks.slice(), shouldBe: o.shouldBe, shouldBeTerms: o.shouldBeTerms.slice(), concepts: a.concepts,
    sourceVerification: { status: 'PENDING', note: 'Clause hierarchy, interpretation, outcome and applicability not reviewed against the controlled source.' },
    technicalApproval: { status: 'PENDING', approver: null, date: null },
    authoredBy: 'AI-assisted draft (Claude) — not self-approvable', reviewers: [], contentVersion: '0.3.0'
  };
  hx[o.ref].auditable = 'yes'; hx[o.ref].obligationIds.push(o.id);
  return rec;
});

const pack = {
  schemaVersion: '1.0.0-rc.1', packId: 'as9100d-demo', contentVersion: '0.3.0',
  standard: { id: 'AS9100D', name: 'Quality management systems — requirements for aviation, space and defense organizations', publisher: 'SAE International / IAQG', licenceNote: 'Third-party standard: no source text is carried. Users must hold a licensed copy.' },
  edition: { label: Data.CLAUSE_INDEX.edition, verification: { status: 'UNVERIFIED', note: 'Edition status and any successor revision not yet verified against an official source (see STANDARDS-EDITION-VERIFICATION-REGISTER.md).' } },
  hierarchyVerification: { status: 'UNVERIFIED', note: 'Hierarchy catalogued from authoring knowledge. Owner independently checked only the titles of 8.5.1.1, 8.5.1.2, 8.5.1.3 (2026-10-11). Index is INCOMPLETE: most leaves are unclassified.' },
  licence: { authoredContentOwner: 'Conform-Edge Quality Consulting LLC (subject to entity verification)', sourceTextIncluded: false, publicDomain: false },
  concepts, hierarchy, obligations
};
fs.writeFileSync(out, JSON.stringify(pack, null, 2));
console.log('wrote ' + out + ' — ' + hierarchy.length + ' hierarchy nodes, ' + obligations.length + ' obligations');
