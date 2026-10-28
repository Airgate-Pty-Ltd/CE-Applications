# Pocket Auditor — handover report v8, 2026-10-08

Written against `CLAUDE-DIRECTIVE-CANONICAL-CHECKLIST-AUDIT-WORKFLOW-2026-10-08.md` and the owner's instruction to author the lettered rows in controlled batches.

Status: **prototype. Draft wording. Nothing approved.** Question and evidence wording is written from the private licensed text and has not yet been checked line by line by a reviewer.

## 1. Result

| Standard | Lettered rows (exact, licensed) | Authored (question, evidence, N/A, finding link) | Pending |
|---|---|---|---|
| AS9100D | 294 | 294 | 0 |
| AS9110C | 309 | 309 | 0 |
| **Total** | **603** | **603** | **0** |

Earlier I said 609. The correct count is 603. The difference is 6 rows (10.3(a)–(c) in each standard) that were taken from Annex A. Those are informative annex letters, not sub-paragraphs of clause 10.3, and they are removed.

Clause rows (in scope, clauses 4–10, subclauses included): AS9100D 100 and AS9110C 106. The clause rows carry authored wording from the earlier pass, and the top-level clauses 4–10 are group headings.

## 2. Batches (controlled, authored from the private licensed copy)

| File | Standard | Covers | Rows |
|---|---|---|---|
| `content/checklists/lettered/AS9100D-batch-01.json` | AS9100D | 4.2 to 6.2.2(a) | 59 |
| `AS9100D-batch-02.json` | AS9100D | 6.2.2(b) to 8.1(f) | 59 |
| `AS9100D-batch-03.json` | AS9100D | 8.1(g) to 8.3.6(b) | 63 |
| `AS9100D-batch-04.json` | AS9100D | 8.3.6(c) to 8.6(b) | 67 |
| `AS9100D-batch-05.json` | AS9100D | 8.7.1 to 10.2.2(b) | 50 |
| `AS9110C-batch-01.json` | AS9110C | 4.2 to 6.2.1(g) | 60 |
| `AS9110C-batch-02.json` | AS9110C | 6.2.2(a) to 7.5.3.1(b) | 54 |
| `AS9110C-batch-03.json` | AS9110C | 7.5.3.2(a) to 8.3.4(f) | 63 |
| `AS9110C-batch-04.json` | AS9110C | 8.3.5(a) to 8.5.5(f) | 69 |
| `AS9110C-batch-05.json` | AS9110C | 8.6(a) to 10.2.2(b) | 58 |

Each batch row has: `ref`, `question` (specific to that sub-paragraph), and `evidence` (prompts the auditor can ask for). N/A handling and finding linkage are applied to every row by `content/complete_rows.py` (see §4).

## 3. Working method and checks

- Private extracts of each lettered sub-paragraph: `licensed-private/lettered-AS9100D.md` and `lettered-AS9110C.md` (read locally; not copied into any output).
- Merge: `content/checklists/lettered/merge_lettered.py`. It refuses to write if any batch row has a duplicate reference, a missing required field, an empty evidence list, or a reference that is not a lettered row of the canonical checklist. Nothing is written on refusal.
- Coverage: a row is AUTHORED only if it has a non-empty question and evidence. Rows with no batch entry are counted as PENDING, never complete.

## 4. Pipeline (run in this order by `tests/run_checks.py`)

1. `content/reconcile_canonical.py`: rebuilds lettered rows from the licensed clause bodies, stopping at the notes and annexes. Idempotent.
2. `content/complete_rows.py`: adds source locator, N/A handling and finding link to every row. Idempotent.
3. `content/checklists/lettered/merge_lettered.py`: merges the authored batches, with the checks in §3.

## 5. Defects found and fixed in this pass

- **Annex letters attributed to clause 10.3.** The clause body for 10.3 ran on into Annex A. The reconcile now stops each clause body at "11. NOTES" or "ANNEX A"–"ANNEX E". 6 rows removed.
- **Pattern written with control characters.** An earlier patch wrote the word-boundary escape as a backspace character, so the cut did not match. Rewrote `reconcile_canonical.py` in full. Verified by rerunning and checking 10.3 is gone.
- **Reconcile was not idempotent.** Fixed earlier; re-verified.
- **Tests wrote to the system temp folder.** Fixed earlier; all tests use `tests\_scratch` inside this folder, removed after each run.

## 6. Real output

```
python -I -m unittest discover -s tests -p "test_*.py"
Ran 125 tests ... OK

python -I tests/run_checks.py
RESULT: ALL CHECKS PASS   (17 steps)
```

Merge (from the check run): `AS9100D: lettered total 294, authored 294, pending 0` and `AS9110C: lettered total 309, authored 309, pending 0`.

Tests added in this pass (`tests/test_lettered.py`, 9 tests): full coverage of the canonical lettered rows for both standards; every authored row has a question and evidence; no row has an invented parent clause; refusal on duplicate reference, missing question, empty evidence, and unknown reference; no result returned when a merge is refused.

## 7. What is not done, and what it means

- **Wording is draft.** It is written from the licensed text but has not been reviewed line by line against the standard by a reviewer. Reviewers should check especially the maintenance-specific rows in AS9110C clause 8 and 10.2.
- **Evidence prompts are prompts, not standard text.** They are Conform-Edge wording.
- **No approval.** Nothing is approved. The checklists are not an approved audit package.
- **Capture screens, findings UI, report package, CAR linkage into snapshots:** still not built (see v7).
- **Other standards:** FAA, EASA, UK, CAAC are extracts only. No authored checklists for them.
- **MX AFAC RAC 145:** no approved source.

## 8. Files changed (this pass)

New: `content/checklists/lettered/AS9100D-batch-01.json` to `05`; `content/checklists/lettered/AS9110C-batch-01.json` to `05`; `content/checklists/lettered/merge_lettered.py`; `content/complete_rows.py` (earlier pass); `tests/test_lettered.py`; `licensed-private/lettered-AS9110C.md`, `lettered-AS9110C.json`, `lettered-AS9100D.md`, `lettered-AS9100D.json`; `HANDOVER-REPORT-2026-10-08-v8.md`.

Changed: `content/reconcile_canonical.py` (rewritten; annex cut), `content/checklists/AS9100D.json` and `AS9110C.json` (lettered rows with authored wording), `content/reconciliation/AS9100D-reconciliation.json` and `AS9110C-reconciliation.json` (regenerated), `MIKE-AUDITS-MODULE-HANDOFF-CANONICAL.md` (lettered-row status), `tests/run_checks.py` (merge step added).

## 9. Confirmation

Every write in this pass was inside `Builds\2026-09-27-pocket-auditor`, including the test scratch folder, which is removed after each run. No licensed standard was moved or copied out of `licensed-private\`. No QMS repository, RI-M365 folder, AI-Team record or other product was written to.
