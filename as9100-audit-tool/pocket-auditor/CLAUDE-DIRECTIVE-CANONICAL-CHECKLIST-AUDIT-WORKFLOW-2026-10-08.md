# Claude Directive — Canonical Checklists and Audit Workflow

Date: 2026-10-08

This file is the active implementation directive for the standalone Pocket Auditor. Do not modify m365-qms, CE-QMS-M365, Conform-Edge-QMS-git, RI-M365, or any existing QMS tool.

## Canonical checklist decision

Use these files as the canonical structured checklist set:

- `content/checklists/AS9100D.json` — 100 rows
- `content/checklists/AS9110C.json` — 106 rows

The GPT-generated `burrana-as9100d-checklist-clauses-4-10.json` and `burrana-as9110c-checklist-clauses-4-10.json` are supplementary source/difference material only. They are not checklist alternatives and must not be rendered as audit rows.

## Required implementation order

1. Verify every canonical row against the private licensed source. Add exact lettered subparagraph rows `(a)`, `(b)`, `(c)` only where present in the source. Never guess a reference or wording.
2. Add a machine-checkable source-to-row reconciliation report. Unresolved rows block approval.
3. Wire selected checklist clauses into the audit snapshot.
4. Add quality-manual-first applicability and N/A evidence, prior CAR review, objective evidence, interviews, sampling, photos, findings and report fields.
5. Make the prototype use the engine lock gate while clearly distinguishing draft demonstration from approved use.
6. Create or update `MIKE-AUDITS-MODULE-HANDOFF-CANONICAL.md` with the export contract and tested sample.

## Licensing

Licensed AS9100D/AS9110C text remains private to Burrana Inc. Do not copy it into public or external exports. External organizations must load their own licensed copies.

## Completion standard

Do implementation and tests. Do not return another decision list or ask which milestone to choose. Report exact files changed, test results, and the runnable prototype path.
