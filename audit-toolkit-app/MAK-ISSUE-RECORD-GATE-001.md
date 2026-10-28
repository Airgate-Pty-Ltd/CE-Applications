# MAK Issue Record — Gate 001 quarantine does not re-run (trust-boundary defect)

**Record ID:** MAK-ISSUE-GATE-001-2026-10-11 · **Raised by:** Claude Code (Audit Toolkit workstream) · **Severity:** BLOCKER for live MAK integration
**Status:** OPEN — to be corrected only in MAK's governed development environment. **MAK was not modified in this workstream.**
**Evidence base:** `MAK-TEST-FAILURE-ANALYSIS.md` (runs on scratchpad copies; the real repo and `.mak` workspace were not touched).
**Repo state examined:** `Airgate-Pty-Ltd/MAK` HEAD `6cac29ee698d6d469c17b01c30dd41959dc8853d` + 11 uncommitted modified files + 2 untracked files (preserved).

## 1. Failing test
`tests/test_provenance_quarantine.py::test_gate_001_concepts_are_preserved_but_ineligible`

## 2. Reproduction conditions
| Configuration | Result |
|---|---|
| HEAD export (HEAD src + HEAD tests) | PASS |
| Working tree (uncommitted src + uncommitted tests) | **FAIL** |
| Uncommitted src + committed tests | **FAIL** |
Steps: `db.initialize()`; insert concept `lc006-audit-programme-oversight-purpose`; call `db._ensure_v12_tables(conn)` again; read the concept's `state`.

## 3. Observed behaviour
`AssertionError: assert 'ACTIVE' == 'QUARANTINED'` (test line 36).
Cause (determined): the uncommitted `src/mak/world/database.py` wraps the Gate 001 quarantine, fixture-contamination handling and confidence recompute in a one-time-migration guard, `if not (already_at_12 and already_at_12[0] >= '12')`, keyed on `metadata.governance_revision`. `initialize()` already writes revision `'12'`, so a later call skips the quarantine.
Aggravating observations (undetermined whether intended): (a) the guard compares **strings** (`'9' >= '12'` is true lexicographically); (b) `integrity.py:110` writes a **timestamp** into the same `governance_revision` key, and a timestamp string also compares `>= '12'`.

## 4. Expected behaviour
A concept that Gate 001 classifies as contaminated must be `QUARANTINED` (preserved but ineligible for retrieval) **whenever it exists**, regardless of when it was inserted, restored or imported, and regardless of migration history. Quarantine is a property of the data, not of the migration clock.

## 5. Potential trust-boundary consequences
| Area | Consequence |
|---|---|
| Source provenance | Concepts judged contaminated can re-enter the eligible set if inserted or restored after revision 12 (backup restore, import, sync). |
| Evidence integrity | An audit suggestion could rest on a concept that the governance rules say must be ineligible, with no signal to the user. |
| Audit reasoning | Recommendations would be built on beliefs derived from quarantined material. |
| Historical reproducibility | Quarantine state depends on migration history, so the same data can yield different eligibility on two databases. |
| Toolkit impact | Any MAK-derived suggestion consumed by the Audit Toolkit is untrustworthy until fixed. |
Separate observation: in the working tree 8 further failures exist in the **untracked** `tests/test_conversational_acceptance.py` (CA2, CA4, CA5 ×2, CA6, CA9, CA10, CA12). They are conversation-layer tests, not provenance, but CA10 (`test_no_invented_skill_names`) concerns fabrication and should be reviewed under the same fix.

## 6. Proposed corrective acceptance tests (for MAK's governed environment)
1. **Re-run idempotence:** inject a Gate 001 concept after every one of: fresh init, second init, simulated revision `'12'`, simulated revision `'9'`, simulated integrity-run timestamp value → each ends `QUARANTINED`.
2. **Restore path:** restore a database snapshot containing an ACTIVE Gate 001 concept → quarantined on first open.
3. **Revision comparison is numeric/typed:** revision `'9'` is not ≥ `'12'`; a timestamp in the revision key is rejected or stored in a different key.
4. **Retrieval exclusion:** quarantined concepts never appear in cognition/answer retrieval; a test asserts the answer text and the evidence list exclude them.
5. **Reproducibility:** two databases with identical rows but different migration histories produce identical eligibility sets.
6. **Provenance record:** each quarantine action records rule id, time, and prior state.
7. **Fabrication guard:** `test_no_invented_skill_names` passes and is part of the provenance gate.

## 7. Conditions to lift the blocker
All tests in §6 pass in MAK's CI on a clean checkout; the fix is committed and reviewed in MAK's governed repository; the Audit Toolkit then re-runs its integration tests against a pinned MAK commit. **Until then trusted MAK-derived audit conclusions are disabled** and the Audit Toolkit continues against the `audit-intelligence/0.1` contract with the labelled engineering stub.
