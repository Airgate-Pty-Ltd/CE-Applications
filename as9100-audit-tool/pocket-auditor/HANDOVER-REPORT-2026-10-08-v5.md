# Pocket Auditor — handover report v5, 2026-10-08

Supersedes v4 for the checklist and export items. Earlier v4 items still stand except where noted.

## 1. Why the AS9100D and AS9110C checklists were not built earlier

I held them back on a misreading. The handoff rule says not to author requirement text from memory. It does not stop use of the licensed copies you own, which are in `licensed-private\`. The checklists are now built from those copies. Burrana Inc. is the licence owner, so the text stays private to Burrana.

## 2. What was built

- **Clause text extracted** from your licensed copies into `licensed-private\AS9100D-clauses-4-10.md` and `AS9110C-clauses-4-10.md` (UTF-8, private).
- **Checklists authored** from that text:
  - `content\checklists\AS9100D.json`: 100 items, one per clause in scope (clauses 4 to 10, with subclauses).
  - `content\checklists\AS9110C.json`: 106 items, one per clause in scope.
  - Each item has intent (paraphrase), an open question, evidence to request, and failure modes. Top-level clauses 5 to 10 are group headings, because the extract has no title text for them.
- **Coverage check:** every item is in the clause universe, nothing is missing, nothing is duplicated, and nothing is invented.
- **Invalid references dropped:** AS9100D 7.2.2 and 10.2.1.1 and AS9110C 7.2.2 are not in the licensed copies, so they are not in the checklists.
- **8.5.1.3 (AS9110C):** the licensed text reads "Production Process Verification (not applicable)". Under your audit rule this is not an automatic N/A. The item tells the auditor to find the quality-manual exclusion and its basis.
- **Prototype:** section 4 lists the authored draft items for AS9100D and AS9110C when ticked. The generate-checklist button stays disabled, because the content is not yet approved.
- **Export package and handoff for Mike:** `engine\pa_export.py`, `docs\MIKE-HANDOFF-PACKAGE.md`, and the sample export in `exports\SAMPLE-SYNTHETIC-package\`.

## 3. Real output

```
python -I -m unittest discover -s tests -p "test_*.py"
Ran 96 tests in ... OK
```

Coverage check (run directly):
```
AS9100D items 100 universe 100 duplicates [] missing from checklist [] not in universe []
AS9110C items 106 universe 106 duplicates [] missing from checklist [] not in universe []
```

Browser check (prototype, AS9110C ticked): 107 table rows (header plus 106 items); generate button disabled.

## 4. What is still open

- **These are drafts I authored from the licensed text.** I have not checked each item against the standard line by line. Errors are possible. Please spot-check, especially AS9110C clause 8 and the failure modes.
- **Approval:** nothing is approved (status "AUTHORED_DRAFT - awaiting reviewer approval"). Approval is what unlocks an approved audit package.
- **Top-level clause titles 5 to 10 (both standards)** are not in the extract. Left blank.
- **Intent for clause 4 and clause 5 group headings** is not written; they are group headings only.
- **Burrana storage:** the licensed copies are still in a Conform-Edge product folder. CLAUDE.md says Burrana material should be stored separately. Owner decision still open.
- **Other standards:** AS9120B is not in scope of this checklist. FAA, EASA, UK, CAAC are extracts only; no authored checklists yet.
- **MX AFAC RAC 145:** still unavailable.

## 5. Files changed this session

New: `content\checklists\AS9100D-part1.json`, `AS9100D-part2.json`, `AS9100D.json`, `AS9110C-part1.json`, `AS9110C-part2.json`, `AS9110C.json`; `licensed-private\AS9100D-clauses-4-10.md`, `AS9110C-clauses-4-10.md`, `clause-text-*.json`; `HANDOVER-REPORT-2026-10-08-v5.md`.

Changed: `engine\pa_engine.py` (authored-draft rendering), `tests\test_engine.py` (5 new tests), `prototype\index.html` (section 4 and checklist loader; default selection blank).

## 6. Confirmation

Writes stayed in the Pocket Auditor folder. No QMS repository or other product was modified.
