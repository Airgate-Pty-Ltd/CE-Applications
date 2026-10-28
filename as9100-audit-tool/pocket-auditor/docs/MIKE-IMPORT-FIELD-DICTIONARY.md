# Pocket Auditor → Audits module: import field dictionary (package schema v1.0)

Status: **v1.0 contract is authoritative.** Pocket Auditor implements it; the Audits module imports it through its own controlled process. This document does not change any Audits module tool. Pocket Auditor is not a dependency of that module.

Sample packages (generated from SYNTHETIC audit records, with the real FAA QSA criteria):
- `exports/SAMPLE-FAA-QSA-PACKAGE/burrana/` — recipient Burrana Inc. (owner): QSA section included.
- `exports/SAMPLE-FAA-QSA-PACKAGE/external/` — any other recipient: QSA section and licensed-standard content withheld.

Verify a package: `pe.verify_export(folder)` must return `(True, None)`. `pe.check_package(package)` must return `[]`.

## 1. Files in a package

| File | Content |
|---|---|
| `package.json` | The package. Written as exact bytes. Keys are sorted. |
| `package.sha256` | `<sha256>  package.json`. The hash of the exact bytes of `package.json`. |
| `evidence-manifest.json` | One entry per evidence item that has a file path: `evidence_id`, `file`, `sha256`, `present`. Photos carry a hash only; no image is stored by Pocket Auditor, so they do not appear here. |

## 2. Top-level keys (19 required, all present in every package)

| Key | Type | Source of truth | Notes |
|---|---|---|---|
| `package_version` | string | constant | `"1.0"`. |
| `export_id` | string | caller | Unique per export. |
| `audit_id` | string | audit | Letters, digits, dot, dash, underscore. |
| `organization` | string | caller | The recipient. The licence rules below depend on it. |
| `generated_at` | ISO 8601 string | caller | When the package was built. |
| `audit` | object | audit | Field `type`: `"Pocket Auditor draft"`. |
| `sources` | list of objects | source registry | Sources the recipient may receive. See §3.1. |
| `sources_withheld_for_licence` | list of strings | source registry | **Required.** IDs of sources left out for this recipient. Empty when nothing is withheld. See §5. |
| `manual` | object | quality-manual engine | Fields `sha256`, `source_class`, `status`, `uploaded_on`, `reviewed_on`, `reviewed_by`. All null until a quality manual is imported and reviewed. |
| `checklist_items` | list of objects | snapshot and FAA QSA publication | See §3.2. |
| `assessments` | list of objects | assessment records | See §3.3. |
| `evidence` | list of objects | snapshot capture records | See §3.4. |
| `interviews` | list of objects | snapshot capture records | See §3.5. |
| `sampling` | list of objects | snapshot capture records | See §3.6. |
| `findings` | list of objects | finding records | See §3.7. |
| `prior_car_reviews` | list of objects | snapshot CAR records | See §3.8. |
| `snapshot` | object | audit snapshot | See §3.9. |
| `unresolved_items` | list of strings | snapshot blocking issues | Empty for a ready snapshot. |
| `not_assessed` | list of objects | assessment state | See §3.10. |

Rules enforced by `check_package`: all 19 keys present; no key named `body`, `body_text`, `clause_text`, `verbatim` or `rows` anywhere in the package; each finding passes the finding rules (§4).

## 3. Section fields

### 3.1 `sources[]`

| Field | Meaning |
|---|---|
| `source_id` | Registry ID, e.g. `FAA-QSA-1.0`, `FAA-14CFR-145`. |
| `standard` | Standard or regulation name. |
| `edition` | Edition or publication label. |
| `status` | `approved`, `proposed`, `unverified`, `unavailable`, `superseded`, or the workbook status (`DRAFT_SOURCE_IMPORTED`). |
| `licence_use` | One of the licence states in §6. |
| `licence_scope_owner` | Owner of the licence. For Burrana's private sources, `Burrana Inc.`. |
| `sha256` | Hash of the source file (for the FAA QSA source: the hash of the workbook). |
| `publication_url`, `retrieved_on`, `next_review_due` | Provenance. May be null. |

### 3.2 `checklist_items[]`

Two kinds, distinguished by `requirement_id`:

| Field | Meaning |
|---|---|
| `ref` | Reference within its standard. For FAA QSA rows, the criteria reference (not unique alone; use `requirement_id`). |
| `requirement_id` | Exact identifier: `STD:<standard>:<clause>` for standards, `REG:<regulation>:<section>` for regulations. FAA QSA: `REG:FAA QSA 1.0:<system element>:<criteria_ref>`. Additions: `REG:FAA QSA 1.0 ADDITIONAL:ADD-0001`. |
| `title` | Heading. For FAA QSA rows, the system element. For standard rows, the heading from the licensed structure. |
| `origin` | FAA QSA rows only: `FAA_SOURCE` or `ADDED_BY_AUDITOR`. |
| `locator` | Standard rows only: where the item sits in the licensed copy (path and clause). |

Question, procedure, comments and condition text are **never** present.

### 3.3 `assessments[]`

| Field | Meaning |
|---|---|
| `id` | Ledger ID, `QAS-NNNN`. Each assessment is a separate ledger record; the latest per criterion is current. |
| `requirement_id` | The criterion assessed. |
| `applicability` | §6 vocabulary. |
| `assessment` | §6 vocabulary. |
| `evidence_ids` | Ledger evidence IDs (`EVD-`, `PHO-`, `INT-`). Must be in `evidence[]`. |
| `assessor` | Name of the assessor (free text; no authentication). |
| `assessed_at` | ISO 8601. |
| `publication_version` | Version of the QSA publication the criterion belongs to. |
| `publication_sha256` | SHA-256 of that publication file. |
| `record_sha256` | SHA-256 of the canonical record in the ledger. |

Standard-clause assessments from the report are not in the sample; for licensed standards they are withheld (§5).

### 3.4 `evidence[]`

| Field | Meaning |
|---|---|
| `id` | Ledger ID: `EVD-`, `PHO-` or `INT-`. |
| `evidence_type` | Contract vocabulary, §6: `record`, `controlled_document`, `observation`, `interview`, `photo_file`. |
| `record_sha256`, `entry_sha256` | Hash of the record and of its ledger entry. |
| `timestamp`, `auditor`, `source_ref` | As recorded. Photos use `timestamp`, `auditor`. |
| `file_name`, `file_sha256`, `requirement_id` | Photos only. For non-owner recipients, a `requirement_id` into a licensed source is replaced by `WITHHELD_FOR_LICENCE`. The image is not stored by Pocket Auditor; `file_sha256` is the browser-computed SHA-256 of that file. |

### 3.5 `interviews[]`

`id` (`INT-`), `interviewer`, `date_time`, `consent_state` (§6), `evidence_class` (§6), `record_sha256`, `entry_sha256`. Notes and transcript are not in the package.

### 3.6 `sampling[]`

`id` (`SMP-`), `sample_identity`, `period`, `result` (§6), `expanded` (true/false), `evidence_refs` (ledger evidence IDs), `record_sha256`, `entry_sha256`.

### 3.7 `findings[]`

| Field | Meaning |
|---|---|
| `id` | Ledger ID, `QFN-NNNN`. |
| `audit_id` | The audit. |
| `checklist_item_ref` | The criterion ID the finding is raised against. |
| `requirement_ids` | List of exact requirement IDs (§3.2). |
| `statement` | Factual statement of what was seen. Required. |
| `proposed_by` | The auditor who raised it. |
| `proposed_classification` | §6 finding classes. The auditor's proposal; not authoritative. |
| `status` | `SUBMITTED` (no lead classification) or `CLASSIFIED`. |
| `evidence_ids` | Ledger evidence IDs. Must be in `evidence[]`. |
| `car_id` | Ledger CAR ID (`CAR-NNNN`), when raised. Required for a nonconformity. |
| `lead_classification` | Authoritative classification. Present only when `status` is `CLASSIFIED`. |
| `lead_classified_by` | Must differ from `proposed_by`. |
| `lead_role` | `LEAD_AUDITOR`. |
| `lead_classified_at` | ISO 8601. |

A finding that cites a licensed-standard requirement has that reference replaced by `WITHHELD_FOR_LICENCE` for non-owner recipients (§5).

### 3.8 `prior_car_reviews[]`

`id` (`CAR-NNNN`, ledger ID), `car_id` (the CAR's own identifier), `state` (§6 CAR states), `status` (`open`, `in_progress`, `closed`), `auditor_result` (§6), `linked_requirement` (requirement ID, or `WITHHELD_FOR_LICENCE`), `record_sha256`, `entry_sha256`. Problem statement and owner are kept in the snapshot, not in this section.

### 3.9 `snapshot`

| Field | Meaning |
|---|---|
| `sha256` | SHA-256 of the snapshot file (the clause-row snapshot, with CAR and capture records). |
| `standard` | The standard the snapshot was taken against. Shown even when the standard is withheld, so the withholding notice has context. |
| `snapshot_version` | Version number. |
| `reconciliation_status` | `RECONCILED` for a ready snapshot. |
| `licensed_source_sha256` | Hash of the licensed copy used for reconciliation. Hash only; no text. |
| `capture_ledger_head`, `capture_ledger_length` | The ledger state the snapshot was taken at. |
| `qsa_publication` | `{version, sha256}` of the FAA QSA publication, for Burrana Inc. only. `null` for other recipients. |

### 3.10 `not_assessed[]`

`ref`, `reason`, and `requirement_id` (FAA QSA rows). For non-owner recipients, licensed-standard rows are not listed (§5).

## 4. Finding rules (checked on import and on export)

- At least one requirement ID in `requirement_ids`.
- At least one evidence ID in `evidence_ids`.
- Lead classification only by `LEAD_AUDITOR`, and never by the proposer.
- A nonconformity (`MAJOR_NC`, `MINOR_NC`) needs a CAR and at least one evidence item of type `record` or `controlled_document`.

## 5. Withholding and licence rules

- `sources_withheld_for_licence` always lists the IDs of sources not included for this recipient. The FAA QSA source is `FAA-QSA-1.0`. AS9100D and AS9110C are `AS9100D` and `AS9110C`.
- **For the owner (Burrana Inc.):** the QSA section and the FAA source entry are included. Licensed-standard content is included.
- **For any other recipient:**
  - the QSA section is not included;
  - licensed-standard checklist rows, not-assessed rows and assessments are not included;
  - a requirement ID or CAR link into a licensed source is replaced by the marker `WITHHELD_FOR_LICENCE`;
  - the withheld source IDs are listed in `sources_withheld_for_licence`.
- Question, procedure, comments and condition text are never included, for any recipient.
- Identifiers that name a withheld source (for example `snapshot.standard`, and the IDs in `sources_withheld_for_licence`) are included on purpose. The recipient needs them to know what was intentionally withheld. They do not expose licensed checklist content. This is confirmed by the owner.

## 6. Vocabularies (final for v1.0)

| Field | Values |
|---|---|
| `applicability` | `APPLICABLE`, `NOT_APPLICABLE`, `UNDECIDED` (import default). |
| `assessment` | `CONFORMING`, `NONCONFORMING`, `NOT_ASSESSED` (import default), `NOT_APPLICABLE`. |
| `evidence_type` (export) | `record`, `controlled_document`, `system_data`, `observation`, `photo_file`, `interview`, `verbal`. The export emits the first five; `system_data` and `verbal` are reserved. |
| Ledger evidence type → export | `record_review` → `record`; `document_review` → `controlled_document`; `observation`; `interview`; photo → `photo_file`. |
| `proposed_classification`, `lead_classification` | `MAJOR_NC`, `MINOR_NC`, `OBSERVATION`, `OFI`. |
| `status` (finding) | `SUBMITTED`, `CLASSIFIED`. (`DRAFT`, `CLOSED` are reserved by the contract.) |
| `lead_role` | `LEAD_AUDITOR`. |
| `consent_state` | `NOTIFIED`, `CONSENT_RECORDED`, `CONSENT_DECLINED`. |
| `evidence_class` (interview) | `direct_statement`, `corroborated_statement`, `uncorroborated_statement`. |
| `result` (sampling) | `CONFORMING`, `NONCONFORMING`. |
| CAR `state` | `ACTIVE`, `CLOSED_EFFECTIVE`, `CLOSED_PARTIALLY_EFFECTIVE`, `CLOSED_INEFFECTIVE`, `CLOSED_NOT_VERIFIED`. |
| CAR `auditor_result` | `effective`, `partially_effective`, `ineffective`, `recurring`, `not_available`, `not_applicable`. |
| `licence_use` | `ORG_PRIVATE_LICENSED`, `CUSTOMER_PRIVATE_LICENSED`, `SHARED_DISTRIBUTABLE`, `REFERENCE_METADATA_ONLY`, `UNVERIFIED_OR_UNAVAILABLE`. |

**Nonconformity evidence rule (final).** A nonconformity needs a CAR in the ledger and at least one evidence item of type `record` or `controlled_document`. Interview, observation and photo evidence support a finding but do not on their own support a nonconformity.

## 7. Hashes and identifiers (how to check a record)

- Each record carries `record_sha256` (the canonical JSON of the record) and `entry_sha256` (the ledger entry). A changed record changes its hash.
- `snapshot.sha256` is the hash of the snapshot file. `snapshot.capture_ledger_head` is the last ledger entry hash at snapshot time.
- A QSA assessment or finding carries the publication version and hash it belongs to.
- Identifiers are never rewritten. A withheld reference is replaced by the marker, so no identifier is silently changed to something else.

## 8. What the Audits module must do, and must not do

Must: import the package with `verify_export` first; reject a package whose hash does not match; check `check_package`; treat `sources_withheld_for_licence` as the list of what it did not receive; keep Pocket Auditor IDs and hashes unchanged.

Must not: import Pocket Auditor implementation files; write to Pocket Auditor storage; alter Pocket Auditor schemas; rewrite requirement references or evidence provenance; expect question or condition text in any package.

## 9. Open items

- Sampling `result` and `consent_state` are final for v1.0; any change needs a new contract version.
- `system_data` and `verbal` evidence are reserved; the ledger does not yet record them.
- `DRAFT` and `CLOSED` finding status are reserved; the ledger does not yet record finding closure.
- Lead-classifier identity is free text. There is no authentication.
- Checklist wording still awaits line-by-line reviewer approval. Nothing here is an approved audit record.
