'use strict';

/**
 * Generates dims/iso42001-aims-governance/AUTHORITY-CHARTER.md from the rule
 * JSON files, per references/authority-charter-template.md. The "Governing
 * Rules" table is built programmatically from the rule files so it cannot
 * drift from the actual approved rules. Run via `npm run charter` whenever a
 * rule is added, revised, or re-approved.
 */

const fs = require('fs');
const path = require('path');

const DIM_DIR = path.join(__dirname, '..', 'src', 'dims', 'iso42001-aims-governance');
const RULES_DIR = path.join(DIM_DIR, 'rules');
const MANIFEST_PATH = path.join(DIM_DIR, 'manifest.json');
const OUT_PATH = path.join(DIM_DIR, 'AUTHORITY-CHARTER.md');

function loadRules() {
  return fs.readdirSync(RULES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(RULES_DIR, f), 'utf-8')));
}

function buildCharter() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const rules = loadRules();

  const tableRows = rules.map((r) => (
    `| ${r.ruleId} | rev ${r.revision} | ${r.description} | ${r.severity} | ${r.clauseRefs.join(', ')} |`
  )).join('\n');

  return `# ISO/IEC 42001 AIMS Governance (${manifest.dimId}) Authority Charter

## Purpose
This DIM evaluates whether an organization's AI Management System records (Statement
of Applicability entries, risk register, risk treatments, objectives, audit findings,
NCRs, and competence records) are complete, correctly linked, and current against the
requirements the organization approved in the governing rule table below. It evaluates
recorded data completeness / conformance / timeliness only — it makes no quality
judgment and no decisions about the organization's actual AI governance maturity.

## What It Reads
- Record types: soa_entries, risk_register, risk_treatments, objectives,
  audit_findings, ncr_entries, competence_records.
- Fields: ${Object.entries(manifest.readsFields).map(([k, v]) => `${k}(${v.join(', ')})`).join('; ')}.
- Event types: ${manifest.subscribesTo.join(', ')}.
- Record links: risk_treatments.soa_control_ref -> soa_entries.control_ref;
  ncr_entries.linked_finding_id -> audit_findings.id.

## What It Writes
Only the M-AI tables (mai_assessments, mai_events, mai_error_log,
mai_rule_registry). It never modifies a host record or any host table.

## What It Can NEVER Do
Approve, reject, close, disposition, or release anything; change record status or
ownership; judge quality beyond recorded completeness; communicate externally;
alter its own rules or authority scope.

## Known Limitations
- Cannot verify physical evidence or that a corrective/preventive action actually
  occurred — only that the record fields required by these rules are present,
  linked, and within their stated dates.
- Cannot replace the designated quality authority's judgment on adequacy.
- Rule-specific proxies and caveats are listed in each rule's \`limitations\` field
  (see rules/*.json) and are reproduced in the Governing Rules table below.

## Governing Rules
GENERATED from rules/*.json — do not hand-edit this table.

| Rule ID | Revision | Requirement | Severity | Clause(s) |
|---|---|---|---|---|
${tableRows}

## How It Works
Event → immutable hashed snapshot → deterministic rule evaluation → active
System-Detected Condition → human Confirm / Dismiss (incorrect) / Dismiss (not
applicable) → immutable ledger entry; changed records supersede prior active
conditions, nothing is deleted.

## Intended Use
Advisory checklist and early warning for the quality team running the AI
Management System. Human authority makes all decisions. Conditions never block
any host action.

---
*Generated ${new Date().toISOString()} by scripts/generate-charter.js from ${rules.length} approved rule definitions.*
`;
}

function main() {
  const content = buildCharter();
  fs.writeFileSync(OUT_PATH, content, 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`[charter] Wrote ${OUT_PATH}`);
}

module.exports = { buildCharter };

if (require.main === module) {
  main();
}
