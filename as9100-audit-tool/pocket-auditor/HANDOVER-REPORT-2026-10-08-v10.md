# Pocket Auditor — handover report v10, 2026-10-08

Status: **prototype. Draft wording. Nothing approved. Not ready for third-party audit use.**
Scope of this pass: persist capture records into the audit snapshot, with IDs and hashes carried into reports and the export, reload and tamper tests, browser-safe evidence hashing, controlled consent and sampling values. Draft status retained. All writes stayed inside this product folder.

## 1. Result

- `python -I -m unittest discover -s tests -p "test_*.py"` → **218 tests OK** (was 178 at v9).
- `python -I tests/run_checks.py` → **ALL CHECKS PASS (17 steps)**.
- Browser check on the capture page: an evidence record saved as `EVD-0001`, the ledger verified, and the rules refused a recording with declined consent. The check ran against a scratch audit root, which was removed afterwards.

## 2. How capture records persist

```
capture page (browser) ──POST──► engine/pa_local_server.py (127.0.0.1)
                                   │ validates (engine rules, authoritative)
                                   ▼
                     audits/<audit_id>/ledger.jsonl   (append-only, hash-chained)
                                   │ verified on every read
                                   ▼
          audit snapshot (write-once) ──► report ──► export package (Mike)
```

- **Ledger** (`engine/pa_ledger.py`): one line per record. Each entry commits to the record hash and the previous entry hash. Edits, deletions, reordering and mid-file insertion are detected. A truncated tail is detected against the ledger head that a snapshot recorded.
- **IDs**: `EVD-`, `PHO-`, `INT-`, `SMP-`, `CAR-` followed by a four-digit sequence within the audit.
- **Local recorder** (`engine/pa_local_server.py`): the browser cannot write files, so the capture page posts each record here. Run it from the product folder with `python -I engine/pa_local_server.py`, then open `http://127.0.0.1:5173/prototype/capture.html`.
- **Snapshot** (`engine/pa_audit_record.py`, `audits_root=` argument): CARs and capture records are read from the verified ledger. The snapshot records the full records, their hashes, the ledger head and the ledger length. It is blocked if the ledger does not verify, if a sampling record cites evidence that is not in the ledger, or if any other blocker applies.
- **Report** (`engine/pa_report.py`): a `capture_index` with IDs and hashes and the ledger head. An evidence register is derived from the snapshot.
- **Export** (`pa_report.export_audit` → `pa_export.build_package`): IDs and hashes for evidence, interviews, sampling and CARs, the snapshot identity, and the findings. It carries checklist refs, requirement IDs, headings and locators only. It carries no licensed body text.

## 3. Controlled values (`engine/pa_vocab.py`)

| Value | Accepted | Status |
|---|---|---|
| Consent state | `NOTIFIED`, `CONSENT_RECORDED`, `CONSENT_DECLINED` | Confirmed by owner |
| Sampling result | `CONFORMING`, `NONCONFORMING` | Confirmed by owner |
| Evidence record type | `document_review`, `record_review`, `interview`, `observation` | Existing engine vocabulary (photos use the photo record) |
| Interview evidence class | `direct_statement`, `corroborated_statement`, `uncorroborated_statement` | Existing |

A recording still needs `CONSENT_RECORDED`. The JS mirror is in `prototype/capture-rules.js`, and `tests/test_capture_parity.py` checks that the two match.

## 4. Browser-safe evidence hashing

The photo is read in the browser and hashed with `crypto.subtle` (SHA-256). The file is not uploaded or copied. `tests/test_capture_parity.py::test_browser_hash_matches_python_hash_of_the_same_bytes` checks that the browser-side digest matches Python's `hashlib` on the same bytes.

## 5. Defects found in this pass

- **Export tamper test passed vacuously.** The first version of the test tampered with a field that the export does not contain, so nothing changed and the check passed. Fixed: the test now tampers with a field that is in the export and asserts that the bytes actually changed.
- **Parity constants test:** the photo required list changed meaning when the record gained `file_name` and `sha256`. Split into `PHOTO_REQUIRED` (the form fields) and `PHOTO_RECORD_REQUIRED` (what a saved record must carry). Both sides are checked.

## 6. Security posture of the local recorder

- Binds to 127.0.0.1 only.
- A request with an `Origin` header must come from this server (localhost or 127.0.0.1 on the same port). Requests without an `Origin` header are accepted, which covers local scripts.
- Static files only from `prototype/`, `content/checklists/` and `content/rows-*`. `licensed-private/`, `engine/`, `tests/` and `audits/` are never served. Paths are normalised before the check, and tests cover `..` and percent-encoded traversal.
- POST bodies are limited to 64 KB and must be JSON.
- No request log is written to disk.
- **Single user, no authentication.** This is acceptable for a local prototype. It is not a multi-user service and must not be exposed on a network.

## 7. What is not done

- **Checklist wording is still draft.** No reviewer has checked it line by line. The pack stays draft until that is done.
- **Consent and sampling vocabularies need owner confirmation.** They are proposals.
- **Mike's Audits module has not imported anything.** The export payload and package are produced and tested here. The import side is in Mike's module and is not built or tested by this product.
- **No SharePoint adapter.** Storage is the local ledger. The SharePoint decision is still open (`D-` decisions in `08-SHAREPOINT-SCOPE.md`).
- **Files are not stored.** Evidence records refuse a `file_path` field, so a file reference cannot be stored unverified. Photos are the only file-backed evidence, and they hold the browser-computed hash only. The image itself is not stored by Pocket Auditor.
- **Single-user recorder.** See §6.

## 8. Files

New: `engine/pa_vocab.py`, `engine/pa_ledger.py`, `engine/pa_local_server.py`, `tests/test_ledger.py`, `tests/test_persistence.py`, `tests/test_local_server.py`, this report.

Changed: `engine/pa_canonical.py` (consent and result vocabularies), `engine/pa_capture.py` (evidence and photo record validators), `engine/pa_audit_record.py` (ledger-backed snapshot, sampling cross-check), `engine/pa_report.py` (evidence register, capture index, export mapping), `prototype/capture-rules.js` (vocabularies, evidence, photo record), `prototype/capture.html` (saves through the recorder, evidence tab, ledger view), `tests/test_capture_parity.py` (rewritten), `tests/test_capture.py` unchanged, `MIKE-AUDITS-MODULE-HANDOFF-CANONICAL.md` (status).

## 9. Confirmation

All writes were inside `Builds\2026-09-27-pocket-auditor`. The test scratch folder `tests\_scratch` is removed after each run. No `audits/` folder was created by the test suite or the check runner. The browser-check recorder and its scratch data were removed, and the test server process was stopped. No licensed standard was moved, copied or exported. No QMS repository, RI-M365 folder, AI-Team record or other product was written to.
