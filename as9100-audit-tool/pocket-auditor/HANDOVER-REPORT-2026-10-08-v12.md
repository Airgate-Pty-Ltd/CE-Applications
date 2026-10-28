# Pocket Auditor — handover report v12, 2026-10-08

Status: **prototype. Draft wording. Nothing approved. Not ready for third-party audit use.**
Scope: record assessments and findings against the published FAA QSA criteria, then connect the QSA section to Mike's import contract (I-1, schema v1.0). Inside Pocket Auditor only. No commit or PR.

## 1. Result

- `python -I -m unittest discover -s tests -p "test_*.py"` → **314 tests OK** (was 266 at v11).
- `python -I tests/run_checks.py` → **ALL CHECKS PASS (17 steps)**.
- Browser check of `prototype/qsa.html` against a scratch audit folder: a published criterion was assessed with evidence; a finding was recorded; the proposer's own lead classification was refused; the lead classification was accepted; a second classification was refused.

## 2. What was built

| Item | Where |
|---|---|
| Assessments against published criteria; latest one is current; earlier ones stay in the ledger | `engine/pa_qsa_records.py` `record_assessment`, `status` |
| Findings linked to the criterion, evidence and (for nonconformities) a CAR | `record_finding` |
| Lead classification: separate from the proposal, set once, LEAD_AUDITOR only, never the proposer | `classify_finding` |
| Record rules (vocabulary, N/A reviewer, evidence IDs, NC needs CAR) | `engine/pa_qsa_rules.py` (no ledger import, so the ledger can validate with it) |
| Ledger record types `qsa_assessment` (QAS-), `qsa_finding` (QFN-), `qsa_finding_classification` (QCL-) | `engine/pa_ledger.py`, `engine/pa_vocab.py` |
| Snapshot can take CARs that link to published FAA criteria, and records the publication it was taken against | `engine/pa_audit_record.py` |
| Package for Mike's import, v1.0 keys, QSA section in the existing keys | `engine/pa_mike_export.py` |
| Endpoints: assessments, findings, classify, status | `engine/pa_local_server.py` |
| Screen: status table with assessment entry, finding form, lead classification form | `prototype/qsa.html` |

## 3. Mapping to Mike's import contract (docs/MIKE-HANDOFF-PACKAGE.md, schema v1.0)

- **No top-level key is added.** The QSA section goes into `checklist_items`, `assessments`, `findings`, `evidence`, `not_assessed`, `sources` and `snapshot.qsa_publication`.
- **Finding fields** follow the contract: `id`, `audit_id`, `checklist_item_ref` (the full criterion ID), `requirement_ids`, `statement`, `proposed_by`, `status`, `proposed_classification`, `evidence_ids`, `car_id`, and for a lead classification `lead_classification`, `lead_classified_by`, `lead_role`, `lead_classified_at`. `pa_export.check_package` validates them.
- **Evidence types** map to the contract vocabulary: `record_review` → `record`, `document_review` → `controlled_document`, `observation`, `interview`, photo → `photo_file`. The mapping applies to all evidence, not only QSA evidence.
- **Licence rule.** The FAA source is `ORG_PRIVATE_LICENSED` with owner Burrana Inc.
  - For Burrana Inc., the package carries the QSA section: identifiers, statuses, assessments, findings, evidence IDs and the source hash. The FAA source entry is included.
  - For any other recipient, the QSA section is left out. The source is listed in `sources_withheld_for_licence`. A CAR linked to an FAA criterion keeps its record, but its `linked_requirement` is replaced with `WITHHELD_FOR_LICENCE`.
- **Question, procedure, comments and condition text are never exported**, for any recipient.
- **Consistency rule.** Every evidence item a QSA item cites must be in the package evidence, which comes from the audit snapshot. If QSA work cites evidence recorded after the snapshot, the package is refused and a new snapshot must be taken.

## 4. Defects found in this pass

1. **The snapshot could not hold a CAR linked to a published FAA criterion.** The link check used only the clause rows, so such a CAR always blocked. Fixed: the snapshot now accepts the published criteria as link targets and records the publication version and hash.
2. **Snapshot evidence was exported with raw ledger vocabulary** (`record_review`) while the contract expects `record`. Fixed in `pa_report.export_audit`.
3. **A CAR linked to an FAA criterion leaked the FAA reference to other recipients** through `prior_car_reviews`. Fixed: redacted for non-owners.
4. **A malformed request body returned 422, not 400** after the endpoint rewrite. A test caught it; fixed with a separate bad-request type.
5. **A body that is valid JSON but not an object caused a server error.** Now refused with 400.
6. **A test assumed the package had exactly the 18 required keys.** It doesn't: `sources_withheld_for_licence` has always been produced by `pa_export.build_package` and is named in the contract, but it is not in `pa_export.PACKAGE_REQUIRED`. The test now records that. See §6.

## 5. Decisions to confirm

- **Assessment vocabulary** (proposal): applicability `APPLICABLE`, `NOT_APPLICABLE`, `UNDECIDED`; assessment `CONFORMING`, `NONCONFORMING`, `NOT_ASSESSED`, `NOT_APPLICABLE`. The workbook's `UNDECIDED` and `NOT_ASSESSED` are kept.
- **Nonconformity evidence rule:** a nonconformity needs a CAR in the ledger and record-review or document-review evidence. Interview and observation evidence is not enough. This is the same rule as the earlier finding model, applied to QSA.
- **Lead classifier identity** is a free-text name. There is no authentication, so "not the proposer" is a check on the name, not on the person.
- **Export is built by the engine, but not exposed by an endpoint.** The package is produced and verified by tests; a recorder endpoint for export is not added.

## 6. Open item for Mike (contract)

`sources_withheld_for_licence` is produced by the current package builder and named in the contract, but `pa_export.PACKAGE_REQUIRED` does not list it. Two options: add it to the required list in a v1.0 patch, or define it as optional in the contract. This needs agreement before Mike's import validates against the key list. I have not changed the package version.

## 7. Not done

- **Mike's import** is not implemented. The contract mapping is produced and tested here, but the import side is in Mike's module.
- **No sample QSA package** has been regenerated under `exports/`. The existing sample is still the earlier synthetic package.
- **Assessments and findings for real audit use** are unreviewed. The checklist wording still awaits line-by-line reviewer approval.
- **SharePoint adapter, authentication, and any non-local deployment** remain open.

## 8. Files

New: `engine/pa_qsa_rules.py`, `engine/pa_qsa_records.py`, `engine/pa_mike_export.py`, `tests/test_qsa_records.py`, `tests/test_mike_export.py`, this report.
Changed: `engine/pa_qsa.py` (none), `engine/pa_ledger.py` (three record types), `engine/pa_vocab.py` (prefixes), `engine/pa_audit_record.py` (QSA link targets and publication), `engine/pa_report.py` (contract evidence mapping), `engine/pa_local_server.py` (endpoints, body checks), `prototype/qsa.html` (status and forms), `tests/test_qsa_endpoints.py` (endpoint tests), `MIKE-AUDITS-MODULE-HANDOFF-CANONICAL.md`.

## 9. Confirmation

All writes were inside `Builds\2026-09-27-pocket-auditor`. The test scratch folder was removed after each run, and the browser-check recorder and its data were removed. No `audits/` folder was created in the product folder. The FAA source workbook on OneDrive was not opened or changed. No licensed standard was moved or copied. No commit or PR was made. No QMS repository, RI-M365 folder, AI-Team record or other product was written to.
