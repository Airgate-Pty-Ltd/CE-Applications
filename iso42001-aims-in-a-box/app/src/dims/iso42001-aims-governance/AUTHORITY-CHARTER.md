# ISO/IEC 42001 AIMS Governance (iso42001-aims-governance) Authority Charter

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
- Fields: soa_entries(applicability, justification, control_ref, linked_treatment_id); risk_register(score, owner); risk_treatments(target_date, status, soa_control_ref); objectives(measurable_target); audit_findings(severity, linked_ncr_id); ncr_entries(due_date, status); competence_records(competence_review_due_date).
- Event types: soa.created, soa.updated, risk.created, risk.updated, risk_treatment.created, risk_treatment.updated, objective.created, objective.updated, audit_finding.created, audit_finding.updated, ncr.created, ncr.updated, competence.created, competence.updated.
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
- Rule-specific proxies and caveats are listed in each rule's `limitations` field
  (see rules/*.json) and are reproduced in the Governing Rules table below.

## Governing Rules
GENERATED from rules/*.json — do not hand-edit this table.

| Rule ID | Revision | Requirement | Severity | Clause(s) |
|---|---|---|---|---|
| AUDIT-001 | rev 1 | A major audit finding must be escalated to a linked NCR / corrective action. | major | 9.2, 10.2 |
| COMP-001 | rev 1 | A person's AI-competence record must be re-reviewed at least annually (competence_review_due_date = last_review_date + 365 days). | minor | 7.2 |
| NCR-001 | rev 1 | A nonconformity's corrective action due date must not pass while the NCR remains open. | major | 10.2 |
| OBJ-001 | rev 1 | An AIMS objective must have a measurable target so progress can be tracked. | minor | 6.2 |
| RISK-001 | rev 1 | A scored risk (likelihood x impact recorded) must have a named accountable owner. | major | 6.1.2 |
| RISK-002 | rev 1 | A risk treatment whose target date has passed must be closed, or the target date revised. | major | 6.1.3 |
| SOA-001 | rev 1 | A Statement of Applicability entry marked applicable must have at least one documented risk treatment linked to it via soa_control_ref. | major | 6.1.3 |
| SOA-002 | rev 1 | A Statement of Applicability entry marked applicable must have a stated justification for why the control applies. | minor | 6.1.3 |

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
*Generated 2026-07-11T03:41:15.088Z by scripts/generate-charter.js from 8 approved rule definitions.*
