# Conform-Edge Pocket Auditor

Standalone audit-source, evidence, findings, snapshot, and export framework for the Conform-Edge Audits module.

This folder is the canonical handoff location for Mike’s implementation. It is intentionally separate from existing QMS tools. Do not modify `m365-qms`, `CE-QMS-M365`, RI-M365, or unrelated repository code.

## What this provides

- Source-governed checklist ingestion and selection.
- AS9100D and AS9110C clause/subclause/lettered requirement data.
- FAA QSA checklist baseline and criterion selection.
- Regulator-source adapters and customer-provided checklist ingestion contract.
- Quality-manual-first applicability and N/A controls.
- CAR review, evidence, photos, interviews, sampling, findings, and report models.
- Append-only, hash-chained audit ledger and write-once snapshots.
- Versioned Mike export contract with source hashes and withheld-source rules.

## Canonical source rules

The structured AS checklists under `content/checklists/` are canonical. The large paragraph extraction files are supplementary source material and must not be rendered as checklist rows.

The FAA QSA source is under `content/faa-qsa/`. The complete FAA workbook baseline must preserve every reference-bearing row and system-element context. Customer uploads are separate governed sources and must never overwrite licensed or regulator sources.

Licensed Burrana standards may remain in `licensed-private/` for the private owner repository. They must be withheld from external/customer packages unless the recipient is authorized by the source owner.

## Prototype

The canonical prototype is served from the Pocket Auditor folder on port 5173. Start it from this folder:

```bash
python engine/pa_local_server.py 5173
```

Then open `http://127.0.0.1:5173/prototype/index.html`. Every step writes to the audit ledger in `audits/<audit reference>/`; nothing is kept only in the browser.

The page follows five steps, and each one states what it needs, what is still missing, and the next action. The progress strip and the next-action bar come from `GET /api/audits/<id>/progress` (`engine/pa_progress.py`).

1. **Setup**: audit details, independence, schedule, location, sponsor and permissions. Saved once.
2. **Scope & Criteria**: select clauses and criteria from any source, grouped by clause. "+ subclauses" selects a clause and its subclauses after showing the count. Publishing the scope is write-once.
3. **Planning (quality manual first)**: record the quality manual by its SHA-256 (the file stays in the browser), propose exclusions against the published scope, review them, and complete the manual review. The audit cannot start until planning is complete.
4. **Conduct**: start the audit, assess each criterion with evidence IDs, and raise findings or CARs from the criterion's card (see below). Mark the audit conducted only when every criterion is assessed.
5. **Review & Report**: readiness checks, lead classification of findings, CAR list, a write-once snapshot, the report summary, and the Mike export for each recipient.

### Raising findings and CARs

Each criterion card has a "Raise a finding or CAR" panel.

- **Finding**: choose a classification and describe what was found. Evidence IDs are required for every finding. A major or minor nonconformity also needs record or controlled-document evidence (`EVD-` records of type record review or document review). It also needs a CAR owner and due date, because it records a CAR in the ledger, linked to the criterion.
- **CAR only**: records a CAR against the criterion without a finding. It needs the statement, an owner and a due date.
- A nonconformity is checked before any CAR is recorded. If the finding is still refused by the server, the CAR stays in the ledger and is reused when the finding is raised again. Nothing is duplicated. If the finding is abandoned, that CAR remains open in the ledger and must be closed or explained in the review.
- CAR IDs are generated from the audit reference and a timestamp. The ledger ID (for example `CAR-0009`) is the reference findings use.

### Snapshots

A snapshot is offered only for a standard that has at least one clause selected in Scope & Criteria (AS9100D or AS9110C). Nothing is selected by default. A snapshot that is not ready is still written, marked not ready, and its blockers are shown.

### Scope of the current build

Not yet built: CAR closure and effectiveness review in the conduct cards (closure is recorded on the capture screen), a customer checklist upload screen, enforced sponsor sign-off, selectable site and process lists, and device and SharePoint validation.

## Mike’s implementation contract

Read these first:

1. `MIKE-AUDITS-MODULE-HANDOFF-CANONICAL.md`
2. `docs/MIKE-IMPORT-FIELD-DICTIONARY.md`
3. `docs/MIKE-HANDOFF-PACKAGE.md`
4. `08-SHAREPOINT-SCOPE.md`

The v1.0 package contract has 19 required top-level keys. Mike’s module must preserve source identity, hierarchy, applicability, assessments, evidence IDs/hashes, findings/CAR links, snapshot hashes, and withheld-source notices.

## Completion gate

This package is not approved for live third-party audits until:

- AS9100D and AS9110C wording has passed source-backed review.
- FAA QSA rows reconcile to the owner workbook.
- Customer ingestion validates CSV, JSON, and XLSX fixtures.
- Selected rows publish into immutable snapshots.
- Assessments, evidence, CARs, findings, reports, and exports round-trip successfully.
- The unified prototype works from one page without requiring the QSA-only server.
- The full test suite and check runner pass from this repository.
- Device and SharePoint validation are complete.

## Verification

Run the repository test and check instructions in `tests/`. Record the exact test count, check count, source counts, and commit hash in the canonical handoff before delivery.
