# Pocket Auditor — handover report v11, 2026-10-08

Status: **prototype. Draft wording. Nothing approved. Not ready for third-party audit use.**
Scope: FAA QSA criterion selection, publication and Start Audit, inside Pocket Auditor only. No commit or PR made.

## 1. Result

- `python -I -m unittest discover -s tests -p "test_*.py"` → **266 tests OK** (was 218 at v10).
- `python -I tests/run_checks.py` → **ALL CHECKS PASS (17 steps)**.
- Browser check of `prototype/qsa.html` against a scratch audit folder: publish with nothing selected refused; select per element and by single criterion; publish version 1 with 11 criteria; Start Audit returned version 1 with 11 criteria, still 11 after the draft was cleared.

## 2. Workflow as built

| Requirement | Where | Test |
|---|---|---|
| Use the imported 122-criterion checklist | `content/faa-qsa/faa-qsa-audit-checklist-1.0.json` via `pa_qsa.load_checklist` | `SourceTests` (count, unique IDs, trimmed sheets, hash carried) |
| Group and filter by system element | `pa_qsa.elements`, `filter_criteria`; `qsa.html` element list and text filter | `SourceTests`; browser check |
| Select individual criteria | `apply_action("select"/"clear")` | `SelectionTests` |
| Select all / clear all | `select_all` / `clear_all`, globally or per element | `SelectionTests` |
| Select across several elements | IDs from different sheets in one selection | `test_selection_across_several_elements` |
| Refuse publication when nothing is selected | `publish()` raises "nothing selected"; endpoint returns 422; no file or ledger entry written | `test_publication_refused_when_nothing_is_selected`, endpoint test |
| Publish a write-once snapshot with only the selected criteria | `publish()` writes `audits/<id>/qsa/published-vN.json` via `write_snapshot` | `test_publication_contains_only_the_selected_criteria` |
| Preserve reference, sheet, source hash, applicability, evidence, assessment, finding | `_snapshot_criterion` keeps each field; file and workbook hashes stored in the snapshot | `test_publication_preserves_…` (field-by-field against source) |
| Start Audit uses the published selection | `start_audit()` reads the latest `qsa_publication` ledger entry, checks the file hash, returns the published criteria | `StartAuditTests`; endpoint test |
| Additional criteria remain separately marked and sourced | `origin: ADDED_BY_AUDITOR`, `source_sheet: ADDITIONAL`, mandatory `source_citation`; ID prefix keeps them apart from source rows | `AdditionTests`, `test_publication_includes_additions_marked_and_sourced` |
| Selection, publication, reload, tamper tests | `tests/test_qsa.py`, `tests/test_qsa_endpoints.py` | see §3 |

## 3. Tests added (48 across both files: 37 in test_qsa.py, 11 in test_qsa_endpoints.py)

- **Selection:** single, multi-element, all and none per element, global all and none, unknown IDs refused, empty selection refused, unknown element refused.
- **Additions:** marked and sourced, source and question required, label format enforced so it cannot take a source reference such as `101`, duplicate label refused.
- **Draft:** reload from disk; draft is not in the ledger.
- **Publication:** refused when empty (no snapshot, no ledger entry); only selected criteria in the file; fields preserved against source; hash recorded in the ledger and matching the file; each publication a new version, earlier files unchanged.
- **Start Audit:** reloads the published selection; later draft changes do not change it; refused before publication; refused on an edited file; refused on a missing file; refused on an edited ledger; a changed source checklist is flagged rather than silently used.
- **Endpoints:** criteria view without condition text; select and select-all; refused actions; additions; empty publish refused; Start Audit before and after publication; cross-origin write refused and nothing written; tampered published file refused at Start Audit.

## 4. Decisions I made (please confirm)

1. **Criterion identity is (source sheet, criteria_ref).** The reference alone repeats: each system element has its own "1" and "2" rows (System Element Description and Standardized Audit Criteria). The IDs are `REG:FAA QSA 1.0:<sheet>:<ref>`.
2. **The 6 description rows are in the 122 and are selectable.** I did not drop them, because you specified 122. Tell me if they should be excluded from selection.
3. **The trailing space in "PRODUCT AUDIT " is trimmed** for grouping and IDs. The source value is not changed.
4. **Publication is recorded in the capture ledger** (`qsa_publication`, prefix `QSP`), so the hash chain covers the selection and a truncated or edited ledger is caught at Start Audit.
5. **A changed source checklist is flagged at Start Audit, not refused.** The audit uses the published copy, which is self-contained. Say if you want it refused instead.
6. **Export excludes question, procedure, comments and condition text.** The export section carries references, sheet, source hash, applicability, assessment, status, finding and evidence IDs, and the citation for additions. The source is `BURRANA_PRIVATE_SOURCE`, so text does not leave the local machine.
7. **The local recorder shows the QSA questions to the local user.** This is the same local-only posture as before. It is not an authentication model.

## 5. Not done

- **Assessment and finding fields are preserved as they were at publication.** Recording assessments against the published criteria is a later step; the snapshot is not a working record.
- **Question wording and Burrana licence terms are not reviewed here.** Whether a Burrana-owned workbook can be used in Pocket Auditor is an owner decision.
- **Mike's Audits module** has not imported the QSA section.
- **SharePoint adapter, authentication for any non-local deployment, and line-by-line checklist approval** remain open, as in v10.

## 6. Files

New: `engine/pa_qsa.py`, `prototype/qsa.html`, `tests/test_qsa.py`, `tests/test_qsa_endpoints.py`, this report.
Changed: `engine/pa_ledger.py` (`qsa_publication` validator), `engine/pa_vocab.py` (`QSP` prefix), `engine/pa_local_server.py` (QSA endpoints, body-error status fixed to 400), `MIKE-AUDITS-MODULE-HANDOFF-CANONICAL.md`.

## 7. Confirmation

All writes were inside `Builds\2026-09-27-pocket-auditor`. Test scratch is removed after each run, and the browser-check recorder and its scratch data were removed. No `audits/` folder was created in the product folder. The source workbook on OneDrive was not opened or changed. No licensed standard was moved or copied. No commit or PR was made. No QMS repository, RI-M365 folder, AI-Team record or other product was written to.
