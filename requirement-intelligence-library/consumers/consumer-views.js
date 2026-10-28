/**
 * Reference consumer projections over the SAME canonical record. These are the library's published interface for its consumers;
 * neither product keeps its own copy of a checklist. Each projection is pinned to the pack hash and the obligation content hash,
 * so a consumer can always prove which approved content it used, and a library update can never alter it silently.
 *
 *   toolkitPlanningView   → Audit Toolkit: planning, checklists, program coverage, NCR Should Be
 *   fieldExecutionView    → Pocket Auditor: field prompts, evidence expectations, sampling, alternative-explanation checks
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { let L; try { L = require('../src/library.js'); } catch (e) { L = require('./library.js'); } module.exports = factory(L); }
  else root.RILConsumers = factory(root.RIL);
})(typeof self !== 'undefined' ? self : this, function (RIL) {
  'use strict';
  const pin = (rec, manifest) => ({ packId: manifest.packId, contentVersion: manifest.contentVersion, packHash: manifest.packHash, obligationHash: manifest.obligations[rec.obligationId], release: manifest.release.status });
  function toolkitPlanningView(rec, manifest) {
    return { obligationId: rec.obligationId, citation: rec.standard.id + ' ' + rec.edition.label + ' ' + rec.clauseRef, title: rec.title, interpretation: rec.interpretation, intent: rec.intent,
      expectedControl: rec.expectedControl, applicability: rec.applicability, verificationActivities: rec.verificationActivities, auditQuestions: rec.auditQuestions, interviewQuestions: rec.interviewQuestions,
      expectedEvidence: rec.expectedEvidence, sampling: rec.sampling, processRelationships: rec.processRelationships, riskConsiderations: rec.riskConsiderations,
      alternativeValidImplementations: rec.alternativeValidImplementations, relatedRequirements: rec.relatedRequirements, shouldBe: rec.shouldBe, pin: pin(rec, manifest) };
  }
  function fieldExecutionView(rec, manifest) {
    return { obligationId: rec.obligationId, citation: rec.standard.id + ' ' + rec.edition.label + ' ' + rec.clauseRef, title: rec.title,
      prompts: { ask: rec.auditQuestions, interview: rec.interviewQuestions }, aspects: rec.aspects, evidenceToCollect: rec.expectedEvidence,
      sampling: rec.sampling, failureIndicators: rec.commonFailureIndicators, alternativesToConsider: rec.alternativeValidImplementations, rebuttalChecks: rec.rebuttalChecks,
      pin: pin(rec, manifest) };
  }
  return { toolkitPlanningView, fieldExecutionView };
});
