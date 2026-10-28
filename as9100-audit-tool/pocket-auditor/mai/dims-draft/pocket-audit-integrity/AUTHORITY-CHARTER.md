# Pocket Audit Integrity (pocket-audit-integrity) Authority Charter — DRAFT

## Purpose
Evaluates Pocket Auditor audit, checklist item, finding and evidence records for recorded completeness: evidence support, requirement traceability, sampling against plan, justification of exclusions, and coverage of regulatory-authority requirements before close-out. It evaluates recorded data only. It makes no quality judgment and no decisions.

## What It Reads
audit, audit_item, audit_finding, audit_evidence snapshots (fields listed in manifest.json), including host-computed derived flags frozen into the snapshot.

## What It Writes
Only the M-AI tables (mai_assessments, mai_events, mai_error_log, mai_rule_registry). Never a host table.

## What It Can NEVER Do
Classify, raise, edit, close or delete a finding; approve or issue a report; change audit or item status; alter requirement content; communicate externally; alter its own rules or authority scope. The only governed decision it can request is HOLD on report issuance (Authority Profile AP-PA-REPORT-HOLD), executed and overridable by the host.

## Known Limitations
Cannot verify that evidence is genuine or sufficient in substance, that the auditor's judgment is correct, or that a sample was representative. Derived flags depend on the host snapshot builder being correct (covered by host tests).

## Governing Rules
PA-001..PA-010 are record-level ADVISE rules. PA-101..PA-106 are audit-level report-gate rules whose consequence is a HOLD decision on report issuance (Authority Profile AP-PA-REPORT-HOLD, `mai/authority/`).

GENERATED from rules/*.json at approval time. Do not hand-edit.

## How It Works
Host event → immutable hashed snapshot → deterministic rule evaluation → System-Detected Condition → human Confirm/Dismiss → immutable ledger. Changed records supersede; nothing is deleted.

## Intended Use
Early warning for auditors and lead auditors. Humans make all decisions.

## Approval
Status: DRAFT — proposed by the drafter; rule content, severities and wording require Brian R. Olea's content authority before approval. approvedBy: (pending Brian R. Olea). effectiveDate: (real date at approval).
