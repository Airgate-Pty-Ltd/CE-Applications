# Pocket Auditor — handover report v9, 2026-10-08

Status: **prototype. Draft wording. Nothing approved. Not ready for third-party audit use.**
Scope of this pass, as directed by the owner: CAR linkage into the write-once snapshot, then the findings model, then the report package, then the capture screens. All writes stayed inside this product folder.

## 1. Result

| Item | Module | Tests | Status |
|---|---|---|---|
| CAR review linked into the audit snapshot | `engine/pa_audit_record.py` | `tests/test_audit_record.py` (19) | Built and passing |
| Findings linked to snapshot, checklist row and evidence | `engine/pa_findings.py` | `tests/test_findings.py` (16) | Built and passing |
| Audit report package (data, draft-only) | `engine/pa_report.py` | `tests/test_report.py` (16) | Built and passing |
| Capture screens: CAR, interview, sampling, photo | `prototype/capture.html`, `prototype/capture-rules.js` | `tests/test_capture_parity.py` (2, uses Node) | Built; rules checked against the engine |
| Generic evidence capture screen | — | — | **Not built** (see §5) |

Full check: `python -I -m unittest discover -s tests -p "test_*.py"` → **178 tests OK** (was 125 at v8). `python -I tests/run_checks.py` → **ALL CHECKS PASS (17 steps)**.

## 2. CAR linkage (required cases)

Each required case has a test.

- **Active CAR**: state `ACTIVE`; recorded without blocking. Overdue active CAR carries `OVERDUE`.
- **Closed and effective**: `CLOSED_EFFECTIVE` only when the auditor result is `effective` *and* effectiveness evidence is cited.
- **Closed but ineffective**: `CLOSED_INEFFECTIVE`; `sampling_expansion_recommended` is true; the RECURRING OR INEFFECTIVE flag is raised.
- **Closed as effective without evidence**: `CLOSED_NOT_VERIFIED`, never treated as effective.
- **Missing CAR reference**: a nonconformity with no `car_id` blocks export. So does one citing a CAR that is not in the records, or a CAR whose requirement differs from the nonconformity's.
- **Snapshot immutability**: a second write of the same version raises `FileExistsError` and leaves the file unchanged. A new version leaves the earlier file untouched.
- **Source-hash preservation**: the snapshot records the reconciled licensed hash and the hash of the licensed file on disk. A changed or missing licensed file is a blocker. A tampered copy fails `verify_snapshot`.

Design choices to confirm:
- A snapshot with blockers is still written, marked `ready_for_export: false`, so the record of what was known is kept. The report refuses it.
- The full CAR record is kept in the snapshot, including problem statement and owner.
- Linked snapshots use the file suffix `-CAR`, so they sit beside the earlier rows-only snapshot without replacing it.

## 3. Defect fixed in this pass

- **`write_snapshot` hash did not match the file on Windows.** The temp file was opened in text mode, so `\n` became `\r\n` on disk, while the returned hash was computed on the LF bytes. Confirmed by a probe before the fix. Fixed with `newline=""`. Covered by `test_returned_hash_matches_bytes_on_disk`.
- **CAR records in the first draft of the snapshot dropped problem statement and owner.** Caught by the tamper test. Fixed: the full validated record is kept.

## 4. Findings and report rules

- A finding must cite a checklist row in the snapshot, and its requirement ID must be in the snapshot. Its evidence must be in the register. It must cite the snapshot's file hash.
- A nonconformity (MAJOR_NC, MINOR_NC) needs a CAR in the snapshot, and at least one record, controlled document or system-data item. **This evidence rule is my proposal, not an owner instruction. Please confirm or change it.**
- The lead classification is set once and is never overwritten. The proposed and lead classifications stay in separate fields. The proposer cannot classify their own finding.
- The report is refused, listing every problem, if the snapshot is not ready, any finding fails its checks, or any assessment is invalid. A conforming or nonconforming assessment needs evidence. A not-applicable assessment uses the quality-manual N/A validator. Duplicate assessments are refused.
- The report status is fixed at `DRAFT - NOT APPROVED FOR AUDIT USE`. Rows without an assessment are listed under `not_assessed` with a reason. Group headings are not listed.
- Reports are written write-once with the hash of the bytes on disk.

## 5. Capture screens

- `prototype/capture.html` has four tabs: CAR review, interview, sampling, photo. Each checks the record against the rules and shows either every error or the record with a copy button. Nothing is saved to browser storage.
- The photo is hashed in the browser with `crypto.subtle` and is not uploaded or copied.
- `prototype/capture-rules.js` mirrors `engine/pa_capture.py`, `pa_canonical.py` and `pa_governance.py`. `tests/test_capture_parity.py` runs 30 cases through Node and through Python and requires identical results, including message text, and identical required-field lists. 21 of the cases produce real errors or flags.
- In the browser I checked: an incomplete CAR lists every missing field; a closed-as-ineffective CAR shows both flags; a complete interview passes; no browser storage is used.
- **Not built:** a generic evidence screen. The Python rule for file-path evidence checks that the file exists on disk. A browser cannot make that check, so this needs a design decision before the screen is built.

## 6. What is not done

- Records from the capture screens are not yet written into the audit or the snapshot. There is no save path, by design, until the SharePoint or local store is decided.
- No reviewer has checked the authored wording line by line. Checklists are not approved.
- Interview consent-state and sampling-result values are free text or limited to CONFORMING/NONCONFORMING. The engine does not enumerate them, so the screens do not either. Confirm the vocabulary.
- Not in scope for this pass and still open: the 734-row GPT sets (supplementary only), FAA 21.137(c) extract check, UK 3-clause mismatch, CAAC translation, MX AFAC source, Burrana licensed copy location.

## 7. Files

New: `engine/pa_audit_record.py`, `engine/pa_findings.py`, `engine/pa_report.py`, `prototype/capture.html`, `prototype/capture-rules.js`, `tests/test_audit_record.py`, `tests/test_findings.py`, `tests/test_report.py`, `tests/test_capture_parity.py`, this report.

Changed: `engine/pa_engine.py` (write fix), `prototype/index.html` (one link to the capture screens), `tests/RUN-LOG.txt` (regenerated by the check run).

## 8. Confirmation

Every write was inside `Builds\2026-09-27-pocket-auditor`, including `tests\_scratch`, which is removed after each run. No licensed standard was moved, copied or exported. The local web server used for the browser check was stopped. No QMS repository, RI-M365 folder, AI-Team record or other product was written to. One stray log path in the temp folder was briefly named in a shell command; no file was created there.
