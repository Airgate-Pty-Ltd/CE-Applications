# Derived snapshot fields — pocket-audit-integrity (DRAFT)

The host snapshot builder computes these as **facts** from host records and freezes them into the snapshot before hashing. They are counts, sets, and comparisons of stored values — not judgments. All judgment (whether a condition fires, whether to HOLD) stays in M-AI rules. Trade-off, recorded: the kernel's approved operator grammar has no field-to-field comparison or aggregation, so the host supplies these facts. Adding kernel operators instead would require Brian's approval and a kernel change.

"Open finding" = `status` not in (`CLOSED`, `ACCEPTED`) and `voided_at` is null.
"Regulatory" = requirement `source_type` in (`REGULATION`, `AD`, `REGULATORY_PROGRAM`) — authority levels 1, 2, 3a. Guidance (3b) is excluded.

| Entity | Field | Type | Formula |
|---|---|---|---|
| audit_item | `sample_count_below_min` | boolean | `sample_count < sampling_min` |
| audit_item | `has_not_met_dimension` | boolean | any of documented, implemented, effective = `NOT_MET` |
| audit_item | `linked_finding_count` | integer | count of non-voided findings with `audit_item_id` = item |
| audit_finding | `item_all_dimensions_unknown` | boolean | parent item documented = implemented = effective = `UNKNOWN` |
| audit_finding | `prior_open_finding_on_same_requirement` | boolean | exists open finding from a **different, earlier** audit of the same auditee sharing ≥1 requirement id |
| audit_finding | `cites_only_guidance` | boolean | every cited requirement has `source_type = GUIDANCE` |
| audit_evidence | `hash_mismatch` | boolean | `sha256_server` not null and ≠ `sha256_device` |
| audit | `regulatory_items_not_started` | uuid[] | ids of plan items with status `NOT_STARTED` and ≥1 regulatory requirement, excluding items descoped with justification |
| audit | `findings_without_evidence_ids` | uuid[] | non-voided findings with empty `evidence_ids` |
| audit | `findings_without_requirement_ids` | uuid[] | non-voided findings with empty `requirement_ids` |
| audit | `findings_incomplete_statement_ids` | uuid[] | non-voided findings with trimmed statement length < 20 |
| audit | `findings_on_unknown_items_ids` | uuid[] | non-voided findings whose item has all three dimensions `UNKNOWN` |
| audit | `evidence_hash_mismatch_ids` | uuid[] | evidence on this audit with `hash_mismatch = true` |

Arrays are sorted ascending before hashing (canonical snapshot).

## Re-emission triggers (prevents stale conditions)

The kernel supersedes only when the same record is re-evaluated, so the host re-emits events for dependent records:

| When this changes | Also emit |
|---|---|
| Item dimensions change | `audit.finding.updated` for every non-voided finding on the item |
| Finding created, voided, or its item changes | `audit.item.assessed` for the item |
| Evidence hash verified | `audit.finding.updated` for findings citing that evidence |
| Any prior audit finding closes/accepts | `audit.finding.updated` for open findings on later audits of the same auditee citing a shared requirement |

## Operator semantics (verified in kernel source 2026-09-27: `kernel/src/rules-engine.ts`)
`is_empty`: null/undefined → true; string → trimmed length 0; array → length 0. `length_gte`/`length_lt`: string or array only (numbers raise an evaluation error). Claude Code must re-confirm these against the pinned kernel version at M0 and state the expected result of every `*-MISSING-001` test.
