# 06 — Decision Logic: Pocket Auditor

All logic below is deterministic host logic (Laravel services) unless marked M-AI or JudgmentProvider. Every function must be unit-tested with fixed inputs and produce identical output for identical inputs.

Sources: Enterprise Audit Intelligence Engine layers 2–8 (`engine-layers.md`, `checklist-structure.md`), Cross-Framework Intent Precedence guardrail, severity model, Interface Contracts IC-001 Pass 3 principle.

## 1. Authority levels and finding rules

| Level | Type | Can a finding rest on it alone? |
|---|---|---|
| 1 | Law / regulation | Yes |
| 2 | Airworthiness Directive | Yes |
| 3a | Order / regulatory program (e.g., MDSAP audit model, MAG) | Yes, where it binds the auditee |
| 3b | Guidance (AC, AMC/GM, FDA guidance) | **No.** Guidance never generates a finding alone; cited only to support a level 1–2 or 4–5 requirement |
| 4 | Customer contract requirement | Yes, when the contract binds the auditee |
| 5 | Certification standard | Yes when the auditee is certified or contractually bound (`mandate = CONTRACTUAL`); otherwise gap vs best practice → Observation/OFI only (`mandate = BEST_PRACTICE`) |
| 6 | Internal document | Yes (auditee's own requirement) |

`requirement_sources.source_type` ∈ `REGULATION | AD | REGULATORY_PROGRAM | GUIDANCE | CONTRACT | STANDARD | INTERNAL`. Per audit, each in-scope STANDARD source carries `mandate` = `CONTRACTUAL | BEST_PRACTICE` (asked in the planner).

## 2. Applicability (planner)

1. Collect APPROVED requirements for selected sources (plus descendants via `requirement_paths`) and selected processes/clauses.
2. For each requirement with `applicability_trigger_key`, ask the trigger question once per audit. Answer `NO` excludes all requirements with that trigger; justification text required (non-empty). Excluded requirements are listed in the plan snapshot with justification (EAIE Layer 2).
3. Requirements with `requirement_scope.applicability_type = EXCLUDED` for the audited site are excluded with the stored reason.
4. Requirements with no trigger are included.

Trigger keys for V1 (seeded; mapping to requirements is part of pack approval): `performs_design`, `special_processes`, `customer_property`, `product_release_authority`, `outsourced_processes`, `software_in_product`, `sterile_devices`, `distributes_only`, `maintenance_return_to_service`, `export_controlled`.

## 3. Checklist generation

Input: included requirement set R, approved relations E (MAPS_TO), audit mode (`PROCESS` default | `CLAUSE`), risk preset (`LIGHT` | `STANDARD` | `DEEP`, from Pocket Auditor skill).

1. **Group by intent.** Build connected components of R over APPROVED MAPS_TO edges. Each component = one checklist item. Requirements linked only by CONFLICTS_WITH are never merged.
2. **Governing requirement** per item (precedence guardrail):
   - Contains level 1–2 → governing = regulation(s). Regulations from **different** authorities are PARALLEL: never merged into one governing requirement; item keeps all, statement "All applicable regulatory authorities must be satisfied independently."
   - Only standards → governing = the superset standard (the one whose parent chain includes the others' clause via `base_sources`, e.g., AS9100D over ISO 9001); if equivalent, the first by authority level then source code.
   - Guidance never governing.
   - Contract and internal requirements stay as additional citations; if their intent differs from the group they must not have been linked (reviewer error → flagged in review UI).
3. **Intent statement** = governing requirement's intent. Additional requirements' intents shown as "Also requires:" lines when not identical text.
4. **Question** = governing requirement's `question_text` if present; else generated deterministically: `"How does the organization ensure " + lowercase-first(intent) + "? Show me."` (open question, never yes/no). Library Manager can edit the stored question.
5. **Risk level:** `HIGH` if any requirement has authority level 1–2, `catastrophic_flag = true`, or `enforcement_sensitivity = HIGH`; `LOW` if all requirements have `enforcement_sensitivity = LOW`; else `MEDIUM`. Prior open finding on any requirement in the item raises one level.
6. **Sampling:** HIGH 5 min / escalate "1 NC → double" / forward and reverse trace / 12 months; MEDIUM 3 / "2 NC → +50%" / either / 6 months; LOW 2 / "3 NC → +50%" / single / 6 months. Organization-size multiplier (auditee `headcount_band`; default 50–250 if unknown): <50 ×0.75, 50–250 ×1.0, 250–1000 ×1.25, >1000 ×1.5, rounded up.
7. **Evidence hierarchy:** from requirements' `expected_evidence`, deduplicated, ordered by evidence type rank (records → controlled documents → system data → observation → interview).
8. **Interview prompts:** union of requirements' `interview_prompts`; if none, three defaults by role (process owner, performer, verifier) built from intent.
9. **Prior findings:** findings from earlier audits of the same auditee citing any requirement in the item.
10. **Ordering:** `PROCESS` mode groups by `process_area` (from the governing requirement's clause family via a seeded clause→process map; editable); `CLAUSE` mode orders by governing source then clause (natural sort).
11. **Preset filter:** `LIGHT` keeps HIGH items plus up to 20 MEDIUM items per governing source, ranked by: prior open finding (yes first), then number of requirements merged (more first), then lowest authority level number, then governing requirement key (natural sort) (Pocket Auditor skill "Light Mode"); `STANDARD` keeps all; `DEEP` keeps all and adds related requirements one MAPS_TO hop outside scope as optional items.
12. Output items with sequential `item_no`; plan snapshot = canonical JSON (sorted keys) + SHA-256.

## 4. Crosswalk conflicts

A reviewer can mark a pair CONFLICTS_WITH. System records `precedence_note` by rule:
- R vs S: regulation governs outcome (R1); standard additions still required if compatible (R2); regulation mandatory beats standard "should" (R3); regulation silent → standard governs (R4).
- R vs R, different authorities: parallel, both required.
- Same level, same type: no automatic precedence — reviewer must write a resolution note before approval.
- Retention-type conflicts: "Use the longest period; flag for legal review" (EAIE example).

## 5. Evidence sufficiency (display + M-AI input)

Rank by type: RECORD 1, DOCUMENT 2, SYSTEM_DATA 3, OBSERVATION 4, INTERVIEW 5, VERBAL 6.
Score per item (first matching row wins): 3 = rank 1 present AND (rank 2 or 3) present AND (rank 4 or 5) present; 2 = at least two distinct types among ranks 1–5; 1 = exactly one type among ranks 1–5, or only VERBAL (6) items; 0 = no evidence. Shown on item card; not a pass/fail decision.

## 6. Assessment and findings

- Dimensions: Documented, Implemented, Effective ∈ `MET | PARTIAL | NOT_MET | UNKNOWN`. Not applicable is item-level (`na_selected` + justification), never a dimension value. JudgmentProvider mapping: `PARTIALLY_MET` ↔ `PARTIAL`, `MET` ↔ `MET`, `NOT_MET` ↔ `NOT_MET`, `UNKNOWN` ↔ `UNKNOWN`.
- `UNKNOWN` never creates or implies a nonconformity (PA-007 guards).
- A finding cannot be SUBMITTED if every cited requirement is GUIDANCE (3b); host validation rejects it and PA-009 flags drafts.
- Guard `keyword_absent_intent_met = true` → "Raise finding" requires explicit confirmation with a note ("finding despite intent met").
- Proposed classification guidance shown (auditor decides; lead classifies A3):
  - **Major NC**: required process/control absent; direct contradiction of a requirement; safety or regulatory-mandated control missing; systemic breakdown (severity model "Critical").
  - **Minor NC**: control exists but incomplete/inconsistent; would fail sampling (severity "High").
  - **Observation**: robustness/clarity weakness; or gap against a BEST_PRACTICE standard (§1).
  - **OFI**: improvement with no requirement unmet (severity "Low").
- Finding triad required before sync is allowed to mark it "ready for review": ≥1 requirement, ≥1 evidence, statement ≥ 20 characters (UX validation offline; PA-001..003 on server).

## 7. Report issuance

Host emits `audit.report.issue_requested` with the audit snapshot (derived fields in `mai/dims-draft/pocket-audit-integrity/DERIVED-FIELDS.md`) → sidecar evaluates PA-101..PA-106 → if the kernel returns a `GovernedDecision` HOLD (`hold:report-issuance`), the host executes it (03 §11). The host never decides a hold itself. Lead Auditor may override (A3) with justification ≥ 30 characters; override recorded on the report. If M-AI is unavailable: `evaluation_status = EVALUATION_PENDING`, banner "Determination Pending", and issuing requires an A3 "Issue without determination" acknowledgement with justification, recorded on the report (Constitution K.2).

## 8. JudgmentProvider use (online only)

- `evaluateRequirementIntent` for an item: IC-003 `requirement.text` = the org-private uploaded text of that requirement when the auditee's organization owns a licensed copy; otherwise `"[clause_ref] [title] — Intent: [intent]"` (never standard text from the shared library); `requirement.intent` = intent. Send evidence descriptions and document excerpts (never binary photos in V1). Result shown as "Semantic review" with MET/NOT_MET/PARTIALLY_MET/UNKNOWN, gaps, `keyword_absent_but_intent_met`, provider, model id, time. A0 only; cannot change assessment or finding.
- `evaluateEvidence` for a finding: adequacy of cited evidence.
- Queue; timeout → `PENDING_JUDGMENT` ("Semantic Review Pending").
- Every call writes a `provenance_records` row including the provider's `confidence` (Constitution J.2 requires it for JudgmentProvider results). Shown as "Provider confidence 0.82" beside the provider and model ID. This is allowed for JudgmentProvider; it is never shown for M-AI.

## 9. State machines (Domain Rationalization 5.4 / 5.5)

### Audit
| From → To | Trigger | Actor | Authority | Event |
|---|---|---|---|---|
| — → PLANNED | Create audit | Lead Auditor | A2 | `audit.audit.created` |
| PLANNED → SCHEDULED | Lock plan (snapshot) | Lead Auditor | A3 | `audit.plan.locked` |
| SCHEDULED → IN_PROGRESS | First accepted sync of an assessment or evidence, or "Start audit" | Auditor / Lead | A2 | `audit.audit.started` |
| IN_PROGRESS → FINDING_RESOLUTION | Close-out requested (coverage review) | Lead Auditor | A3 | `audit.closeout.requested` |
| FINDING_RESOLUTION → CLOSED | Report issued and all findings classified | Lead Auditor | A3 | `audit.report.issued`, `audit.audit.closed` |
| CLOSED → FINDING_RESOLUTION | Reopen with justification | Lead Auditor | A3 | `audit.audit.reopened` |

Plan changes after SCHEDULED create a new plan version (A3), never edit the locked snapshot.

### Finding
| From → To | Trigger | Actor | Authority |
|---|---|---|---|
| (device) → DRAFT | Accepted sync of an incomplete finding (triad missing) | Auditor | A2 |
| DRAFT → SUBMITTED | Triad complete and auditor submits | Auditor | A2 |
| SUBMITTED → OPEN | Classified (MAJOR_NC, MINOR_NC, OBSERVATION, OFI) | Lead Auditor | A3 |
| OPEN → RESPONSE_REQUIRED | Report issued; applies to MAJOR_NC and MINOR_NC only | System on issue | A1 (logged) |
| OPEN → ACCEPTED | Report issued; OBSERVATION and OFI need no response | System on issue | A1 (logged) |
| RESPONSE_REQUIRED → RESPONSE_RECEIVED | Auditee response recorded | Lead Auditor | A2 |
| RESPONSE_RECEIVED → VERIFIED / CONTESTED | Response evaluated | Lead Auditor | A3 |
| VERIFIED / ACCEPTED → CLOSED | Closure | Lead Auditor | A3 |
| any pre-OPEN → voided | Withdraw with reason | Auditor (own) / Lead | A2 |

Classification (SUBMITTED → OPEN) is never performed by sync, M-AI or JudgmentProvider.
