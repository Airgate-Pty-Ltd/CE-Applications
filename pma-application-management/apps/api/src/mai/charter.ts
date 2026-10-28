import type { LoadedDim } from './kernel/registry';

// Generates a DIM's Authority Charter. The Governing Rules table is produced
// programmatically from the rule JSONs so it can never drift from the rules.

export function generateCharter(dim: LoadedDim): string {
  const m = dim.manifest;
  const readsList = Object.entries(m.readsFields)
    .map(([rt, fields]) => `- **${rt}**: ${fields.join(', ')}`)
    .join('\n');

  const rows = [...dim.rules]
    .sort((a, b) => a.ruleId.localeCompare(b.ruleId))
    .map(
      (r) =>
        `| ${r.ruleId} | ${r.revision} | ${escapePipes(r.description)} | ${r.gapClass} | ${r.clauseRefs.join('; ')} |`,
    )
    .join('\n');

  return `# PMA Application Assessment (${m.dimId}) Authority Charter

## Purpose
This DIM evaluates a recorded PMA_Case snapshot for (1) approval-basis signal and
(2) AC 21.303-4 §8 completeness and cross-document consistency. It evaluates
**recorded data completeness and consistency only.** It makes no PMA eligibility
determination, never classifies an approval basis on its own authority, and never
decides anything — it surfaces System-Detected Conditions for a human to confirm or
dismiss.

## What It Reads
Record types + fields (event types: ${m.subscribesTo.join(', ')}):

${readsList}

Cross-document consistency is evaluated through host-materialized same-record
boolean fields (e.g. \`stc_letter_supplement_mismatch\`) so every rule stays inside
the approved deterministic operator grammar.

## What It Writes
Only the M-AI tables (mai_assessments, mai_events, mai_error_log, mai_rule_registry).
It never modifies the PMA_Case or any other host table.

## What It Can NEVER Do
Approve, reject, close, disposition, or release a PMA application; classify or set the
approval basis; change case status or ownership; judge airworthiness or design
eligibility; mark anything "ready for FAA submission"; communicate externally; or
alter its own rules or authority scope. Conditions it raises never block a human from
proceeding.

## Known Limitations
- It cannot verify physical evidence (that an STC is genuine and effective, that parts
  are actually marked, that enclosed data truly demonstrates identicality).
- It cannot confirm that a recorded value is correct — only that it is present and, for
  linkage rules, internally consistent.
- It cannot determine the correct FAA submission office; it only flags when the office
  or the address needed to determine it is absent.
- It does not replace the qualified person who confirms the approval basis, supplies
  blocking-gap evidence, and signs and submits the package.

## Governing Rules
_Generated from the rule JSON files — do not hand-edit._

| Rule | Rev | Requirement | Gap Class | Clause references |
|------|-----|-------------|-----------|-------------------|
${rows}

## How It Works
Event → immutable hashed snapshot → deterministic rule evaluation → active
System-Detected Condition → human Confirm / Dismiss → immutable ledger entry; when a
record changes, prior conditions are superseded and linked forward, and nothing is
deleted.

## Intended Use
Advisory checklist and early warning for the preparer and reviewer. Human authority
makes all decisions. Conditions never block any host action.
`;
}

function escapePipes(s: string): string {
  return s.replace(/\|/g, '\\|');
}
