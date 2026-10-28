/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { DefenseDossierOutput } from '@/services/DefenseDossier';
import { versionStamp } from './versionStamp';

/**
 * Printable HTML rendering of a DefenseDossierOutput (WP-1 §"Formats": "JSON (canonical) +
 * printable HTML (browser print-to-PDF acceptable this phase; native PDF may be deferred
 * with a log entry" — deferred, see DECISIONS.md D-025). Browser print-to-PDF is the
 * intended path to a PDF artifact this phase, not a server-side PDF library.
 */
function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function sectionHeader(title: string, populated: boolean, note?: string): string {
  const badge = populated
    ? '<span class="badge populated">Populated</span>'
    : '<span class="badge absent">Owner-Pending / Not Populated</span>';
  const noteHtml = note ? `<p class="section-note">${esc(note)}</p>` : '';
  return `<h2>${esc(title)} ${badge}</h2>${noteHtml}`;
}

export function renderDossierHtml(dossier: DefenseDossierOutput): string {
  const s = dossier.sections;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(dossier.title)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 900px; margin: 2rem auto; color: #111; line-height: 1.5; }
  h1 { border-bottom: 3px solid #111; padding-bottom: 0.5rem; }
  h2 { margin-top: 2rem; border-bottom: 1px solid #999; padding-bottom: 0.25rem; }
  .badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 3px; font-weight: bold; }
  .badge.populated { background: #d4edda; color: #155724; }
  .badge.absent { background: #fff3cd; color: #856404; }
  .section-note { font-style: italic; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }
  th, td { border: 1px solid #ccc; padding: 0.4rem; text-align: left; font-size: 0.9rem; }
  th { background: #f0f0f0; }
  .attestation { background: #f8f9fa; border: 1px solid #ccc; padding: 1rem; margin-top: 2rem; font-family: monospace; font-size: 0.8rem; word-break: break-all; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #999; font-size: 0.75rem; color: #666; text-align: center; }
  @media print { body { margin: 0.5in; } }
</style>
</head>
<body>
<h1>${esc(dossier.title)}</h1>
<p>Scope: <strong>${esc(dossier.scope.type)}</strong> — generated ${esc(dossier.generatedAt)}</p>

${sectionHeader(s.requirementMapping.title, s.requirementMapping.populated, s.requirementMapping.note)}
${
  s.requirementMapping.populated
    ? s.requirementMapping.data.packs
        .map(
          (p) => `<h3>${esc(p.name)} v${p.version} (${esc(p.regulatoryFramework)})</h3>
<table><tr><th>Clause</th><th>Title</th><th>Mapped Atoms</th></tr>
${p.clauses.map((c) => `<tr><td>${esc(c.clauseNumber)}</td><td>${esc(c.clauseTitle)}</td><td>${c.mappedAtomIds.length}</td></tr>`).join('')}
</table>`
        )
        .join('')
    : ''
}

${sectionHeader(s.curriculumMapping.title, s.curriculumMapping.populated, s.curriculumMapping.note)}
<table><tr><th>Title</th><th>Objective</th><th>Rev</th><th>Format</th><th>Status</th></tr>
${s.curriculumMapping.data.atoms.map((a) => `<tr><td>${esc(a.title)}</td><td>${esc(a.objective)}</td><td>${a.revision}</td><td>${esc(a.format)}</td><td>${esc(a.status)}</td></tr>`).join('')}
</table>

${sectionHeader(s.learnerEvidence.title, s.learnerEvidence.populated, s.learnerEvidence.note)}
${s.learnerEvidence.data.learners
  .map(
    (l) => `<h3>${esc(l.learnerName)}</h3>
<table><tr><th>Manifest Hash</th><th>Frozen At</th><th>Status</th><th>Completed</th><th>Passed</th></tr>
${l.assignments.map((a) => `<tr><td>${esc(a.manifestOutputHash)}</td><td>${esc(a.manifestFrozenAt)}</td><td>${esc(a.status)}</td><td>${esc(a.completedAt)}</td><td>${esc(a.passedAt)}</td></tr>`).join('')}
</table>`
  )
  .join('')}

${sectionHeader(s.recurrencyProof.title, s.recurrencyProof.populated, s.recurrencyProof.note)}
${s.recurrencyProof.data.events
  .map(
    (e) => `<h3>${esc(e.eventTitle)} (${esc(e.occurredAt)})</h3>
<p>Produced ${e.producedAtomIds.length} content item(s). Approvals: ${e.approvals.map((a) => `${esc(a.approvalType)}=${esc(a.decision)} by ${esc(a.decidedBy)}`).join('; ') || 'none recorded'}</p>`
  )
  .join('')}

${sectionHeader(s.effectivenessEvidence.title, s.effectivenessEvidence.populated, s.effectivenessEvidence.note)}
<table><tr><th>Level</th><th>Outcome Language</th><th>Collected By</th><th>Collected At</th></tr>
${s.effectivenessEvidence.data.records.map((r) => `<tr><td>${esc(r.level)}</td><td>${esc(r.outcomeLanguage)}</td><td>${esc(r.collectedBy)}</td><td>${esc(r.collectedAt)}</td></tr>`).join('')}
</table>

${sectionHeader(s.causalStatusHistory.title, s.causalStatusHistory.populated, s.causalStatusHistory.note)}
${s.causalStatusHistory.data.events
  .map(
    (e) => `<h3>${esc(e.eventTitle)} — current: ${esc(e.currentStatus)}</h3>
<table><tr><th>From</th><th>To</th><th>By</th><th>At</th></tr>
${e.history.map((h) => `<tr><td>${esc(h.fromStatus)}</td><td>${esc(h.toStatus)}</td><td>${esc(h.promotedBy)}</td><td>${esc(h.promotedAt)}</td></tr>`).join('')}
</table>`
  )
  .join('')}

${sectionHeader(s.kernelConditions.title, s.kernelConditions.populated, s.kernelConditions.note)}
<table><tr><th>Rule</th><th>Severity</th><th>Rationale</th><th>Status</th><th>Response</th></tr>
${s.kernelConditions.data.conditions.map((c) => `<tr><td>${esc(c.ruleId)}</td><td>${esc(c.severity)}</td><td>${esc(c.rationale)}</td><td>${esc(c.status)}</td><td>${esc(c.response)} by ${esc(c.respondedBy)}</td></tr>`).join('')}
</table>

${sectionHeader(s.contentBillOfMaterials.title, s.contentBillOfMaterials.populated, s.contentBillOfMaterials.note)}
<table><tr><th>Title</th><th>Rev</th><th>Status</th><th>License</th><th>Owner</th><th>Approved By</th><th>Superseded By</th></tr>
${s.contentBillOfMaterials.data.items.map((i) => `<tr><td>${esc(i.title)}</td><td>${i.revision}</td><td>${esc(i.status)}</td><td>${esc(i.licenseClass)}</td><td>${esc(i.owner)}</td><td>${esc(i.approvedBy)}</td><td>${esc(i.replacementAtomId ?? '—')}</td></tr>`).join('')}
</table>

${sectionHeader(s.gapRegister.title, s.gapRegister.populated)}
<ul>${s.gapRegister.data.coverageGaps.length ? s.gapRegister.data.coverageGaps.map((g) => `<li>${esc(g)}</li>`).join('') : '<li>No coverage gaps identified.</li>'}</ul>

<div class="attestation">
  <strong>Integrity Attestation</strong><br/>
  Package Hash (SHA-256): ${esc(s.integrityAttestation.packageHash)}<br/>
  Audit-Log Chain: ${s.integrityAttestation.auditLogChainSegment.entryCount} entries, chain hash ${esc(s.integrityAttestation.auditLogChainSegment.chainHash)}<br/>
  Generated: ${esc(s.integrityAttestation.generatedAt)}
</div>

<footer>${esc(versionStamp())}</footer>
</body>
</html>`;
}
