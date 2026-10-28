# Pocket Auditor — handover report v14, 2026-10-08

Status: **prototype. Checklists remain DRAFT until line-by-line reviewer approval. Nothing approved. Not ready for third-party audit use.**
Scope: full reconciliation of the AS9100D and AS9110C checklists against the licensed sources, and of the 122 FAA QSA rows against the workbook. Exceptions-only report. Tests that fail on invalid checklist data. Owner decisions isolated. No commit or PR.

## 1. Result

- `python -I content/qa/reconcile_checklists.py` → **8,170 checks. Blocking 0. Warnings 4. Owner decisions 2.**
- `python -I -m unittest discover -s tests -p "test_*.py"` → **348 tests OK** (was 328).
- `python -I tests/run_checks.py` → **ALL CHECKS PASS (18 steps)**. The reconciliation is now a blocking step: it exits non-zero on any blocking exception.
- Outputs: `content/qa/CHECKLIST-QA-EXCEPTIONS.md` (exceptions only), `content/qa/checklist-qa-result.json` (counts per check, all exceptions, the workbook text outside criteria).

## 2. What is checked

**AS9100D and AS9110C, every row**
- Reference exists in the licensed text: body clause, uppercase top-level heading (for example `5. LEADERSHIP`), or table-of-contents entry with dot leaders (for example `10.2`, which has no body heading).
- Parent row exists for every sub-level row.
- Locator names the clause, or the clause and item for lettered rows.
- Question and evidence present; no empty or blank evidence prompt; wording status AUTHORED.
- No question or evidence shares an 8-word run with the licensed text (verbatim licensed wording is not permitted).
- No question text duplicated across rows.

**AS9100D and AS9110C, lettered rows**
- Every licensed sub-paragraph has a row, and every row exists in the licensed text (omissions and inventions).
- Letters run a, b, c with no gap; no duplicate reference.

**AS9100D and AS9110C, coverage**
- Every audit-universe clause has a row.
- Every licensed clause in 4–10 is either in the universe or flagged as an owner decision.

**FAA QSA 1.0, all 122 imported rows (workbook read only)**
- Workbook hash equals the recorded import hash.
- Each row exists in the workbook, and its question equals the workbook cell.
- Every word of workbook text owned by a criterion (13,817 words) is inside the imported row. Condition text is a run of words in the workbook sheet.
- Workbook text outside the numbered criteria is listed and reported as an owner decision.

## 3. Defects found and fixed

1. **Twenty checklist rows copied 8-word runs from the licensed text.** Reworded in every file that holds them: lettered batch files, clause part files and the canonical checklist. 42 field changes. Log: `content/qa/wording-fixes.json`. Script: `content/qa/apply_wording_fixes.py`. The lettered rows were rebuilt with `merge_lettered.py` (AS9100D 294 and AS9110C 309 authored, pending 0).

2. **The reconciliation's own clause check was too narrow** (a fault in my checker, now fixed). It read clause body keys only. It now also reads uppercase top-level headings and table-of-contents entries, so clauses 5–10 and 10.2 are recognised. The fix was checked against invented references (7.2.2, 10.2.1.1, 8.6.1, 4.3.1): none are accepted.

3. **A checker title check produced noise and was removed.** Titles are Conform-Edge descriptors; for most rows the licensed text has no heading to compare. Titles are not checked against headings. Noted in the canonical handoff.

4. **Condition-text comparison was too strict** (a fault in my checker). Condition text spans workbook cells. It is now compared as a word sequence. This cleared 11 false alarms.

5. **The licensed lettered extracts were wrong, and I damaged them in the process. This is recorded in full.**
   - The extract listed six Annex A items under clause 10.3 (three per standard). The checklist was right to exclude them. The extract was the defect.
   - I then wrote an annex-boundary check that matched the first inline mention of "Annex A" in the licensed text rather than the Annex heading. It flagged 484 valid sub-paragraphs as annex text, and I removed them from `licensed-private/lettered-AS9100D.*` and `lettered-AS9110C.*`. That was an error. The licensed PDF and licensed text file were not touched.
   - I reversed it by regenerating both extracts from `clause-text-<std>.json`, using the reconciliation's own cut at the notes and annex markers (`content/qa/extract_lettered.py`). The script refuses to write unless the extract's references equal the checklist's lettered rows. Result: AS9100D 294, AS9110C 309, both equal to the checklist.
   - The faulty correction script and its log were deleted, and the annex classifier was removed from the checker. The extract-level WARN no longer applies.

## 4. Owner decisions (not defects)

1. **FAA workbook rows not imported.** The workbook has twelve system-description rows (1 and 2 for each of six elements). The import has eight: Software Quality Assurance, Manufacturing Processes, Manufacturing Controls and Supplier Control. Organizational Management and Design Control are missing their two each. The brief said six.
   - Option A: import all twelve. The baseline becomes 126 rows.
   - Option B: exclude all description rows from selection. The baseline becomes 114 criteria.
   - Either way, the "122" count changes. Please decide.

2. **Workbook text outside numbered criteria.** Fourteen cells are element-level text: element names, element comments and notes. Examples: "FAA-approved quality systems manuals or procedures manuals/handbooks…", "Engineering Processes that relate to Software QA and Compliance", "PAH supplier records by selecting a random sample…". Decide whether this text belongs in the checklist baseline.

## 5. Warnings (quality, not wrong)

- Page footers ("Downloaded from SAE International…") and replacement characters are present in the licensed text extracts. They are removed for comparison only. Cosmetic.

## 6. Limits

- **Requirement-specific wording cannot be verified mechanically.** A term-overlap check flagged 34 questions, but most were fine: licensed text paraphrases what the question asks. The check was removed. Specificity remains a reviewer judgement.
- **Correctness against the standard** is not verified by this reconciliation. Structure, locators, verbatim use, duplicates and the workbook are verified. Wording correctness is the line-by-line reviewer approval, still pending.
- **Checklists stay DRAFT** until that approval.

## 7. Files

New: `content/qa/reconcile_checklists.py`, `content/qa/apply_wording_fixes.py`, `content/qa/extract_lettered.py`, `content/qa/CHECKLIST-QA-EXCEPTIONS.md`, `content/qa/checklist-qa-result.json`, `content/qa/wording-fixes.json`, `tests/test_checklist_qa.py`, this report.
Changed: `content/checklists/*.json` and `content/checklists/lettered/*.json` (wording in 20 rows), `content/checklists/AS9100D.json` and `AS9110C.json` (regenerated by merge), `licensed-private/lettered-AS9100D.json`, `licensed-private/lettered-AS9100D.md`, `licensed-private/lettered-AS9110C.json`, `licensed-private/lettered-AS9110C.md` (regenerated derived extracts, not the standards), `tests/run_checks.py` (reconciliation step added), `MIKE-AUDITS-MODULE-HANDOFF-CANONICAL.md` (§10).

## 8. Confirmation

All writes were inside `Builds\2026-09-27-pocket-auditor`, except the read-only open of the FAA workbook on OneDrive (hash verified; nothing written there). The licensed PDFs and licensed text files were not modified. No commit or PR was made. Mike's tools were not modified. No QMS repository, RI-M365 folder, AI-Team record or other product was written to.
