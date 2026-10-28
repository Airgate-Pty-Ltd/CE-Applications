# PMA Application Assessment (pma-application-assessment) Authority Charter

## Purpose
This DIM evaluates a recorded PMA_Case snapshot for (1) approval-basis signal and
(2) AC 21.303-4 §8 completeness and cross-document consistency. It evaluates
**recorded data completeness and consistency only.** It makes no PMA eligibility
determination, never classifies an approval basis on its own authority, and never
decides anything — it surfaces System-Detected Conditions for a human to confirm or
dismiss.

## What It Reads
Record types + fields (event types: pma_case.created, pma_case.updated, pma_case.closure_submitted):

- **pma_case**: stc_number, tc_number, tc_holder, license_agreement_present, compliance_data_present, applicant_legal_name, manufacturing_address, faa_submission_office, qms_manual_number, qms_manual_revision, qms_manual_date, marking_scheme_ref, ica_disposition_stated, ad_impact_addressed, signatory_name, signatory_title, pma_part_numbers, oem_part_numbers, letter_stc_number, supplement_stc_number, letter_model_eligibility, supplement_model_eligibility, stc_letter_supplement_mismatch, model_eligibility_letter_supplement_mismatch, pma_oem_part_number_collision

Cross-document consistency is evaluated through host-materialized same-record
boolean fields (e.g. `stc_letter_supplement_mismatch`) so every rule stays inside
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
| PMA-BASIS-001 | 1 | STC present and PMA production authorized (assist/license letter) signals an STC_IDENTICALITY basis. | INFO | 14 CFR 21.303(a)(4); AC 21-43 |
| PMA-BASIS-002 | 1 | TC present with a license/assist letter from the TC holder signals a TC_LICENSED basis. | INFO | 14 CFR 21.303(a)(2) |
| PMA-BASIS-003 | 1 | TC present, NO license, with identicality/comparison data signals an IDENTICALITY_NO_LICENSE basis (AC 21.303-4 §7c). | INFO | 14 CFR 21.303(a)(2); AC 21.303-4 §7c |
| PMA-BASIS-CONFLICT-001 | 1 | Both an STC number and a TC number are present — conflicting approval-basis signals that a human must resolve. | WARNING | AC 21.303-4 §7; 14 CFR 21.303 |
| PMA-COMPLETE-001 | 1 | The applicant's legal name is a mandatory element of the AC §8 application letter. | BLOCKING | AC 21.303-4 §8; 14 CFR 21.303 |
| PMA-COMPLETE-002 | 1 | The manufacturing facility address is needed to determine the correct FAA geographic submission office (AC §7a). | WARNING | AC 21.303-4 §7a |
| PMA-COMPLETE-003 | 1 | The FAA submission office must be confirmed by a human; it is never auto-assumed. | WARNING | AC 21.303-4 §7a; AC 21.303-4 Appendix F |
| PMA-COMPLETE-004 | 1 | The application letter must identify an authorized signatory (name and title). | WARNING | AC 21.303-4 §8 |
| PMA-COMPLETE-005 | 1 | A parts marking scheme (name/trademark, part number, FAA-PMA) must be described per AC §29 / 14 CFR 45.15. | WARNING | AC 21.303-4 §29; 14 CFR 45.15 |
| PMA-COMPLETE-006 | 1 | The application must state the ICA disposition for the PMA article (AC §28 / 14 CFR 21.50). | WARNING | AC 21.303-4 §28; 14 CFR 21.50 |
| PMA-COMPLETE-007 | 1 | The application must address Airworthiness Directive impact for the article (AC §22). | WARNING | AC 21.303-4 §22 |
| PMA-COMPLETE-008 | 1 | The QMS manual number, revision, and date are a mandatory AC §8 letter element. | BLOCKING | AC 21.303-4 §8; 14 CFR 21.137; 14 CFR 21.307 |
| PMA-LINK-001 | 1 | The STC number must match across the application letter and the supplement. | BLOCKING | AC 21.303-4 Appendix C |
| PMA-LINK-002 | 1 | Model eligibility should match across the application letter and the supplement. | WARNING | AC 21.303-4 Appendix C |
| PMA-LINK-003 | 1 | A PMA part number must be distinct from the TC/STC holder (OEM) part number (AC §29c / 14 CFR 45.15). | BLOCKING | AC 21.303-4 §29c; 14 CFR 45.15(a)(1) |

## How It Works
Event → immutable hashed snapshot → deterministic rule evaluation → active
System-Detected Condition → human Confirm / Dismiss → immutable ledger entry; when a
record changes, prior conditions are superseded and linked forward, and nothing is
deleted.

## Intended Use
Advisory checklist and early warning for the preparer and reviewer. Human authority
makes all decisions. Conditions never block any host action.
