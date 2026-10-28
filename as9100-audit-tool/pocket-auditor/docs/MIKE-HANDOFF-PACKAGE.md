# Pocket Auditor → Audits module: framework handoff package

Responds to `MIKE-AUDITS-MODULE-HANDOFF-2026-10-08.md`. Pocket Auditor is standalone. This package defines the framework and the export contract. It does not change any existing QMS tool, and the Audits module is not a dependency of Pocket Auditor.

Status: **prototype framework.** Not a certified product, not a tenant deployment, not a source-approved release.

## 1. Acceptance criteria (Mike's list) → status

| # | Criterion | Status | Where |
|---|---|---|---|
| 1 | Runnable Pocket Auditor prototype | Partly. The browser page is a static viewer of sources and scope. The engine is tested but has no screens | `prototype/index.html`; `engine/` |
| 2 | Package schema and sample export | Done (v1.0). Sample built from synthetic data and hash-verified | `engine/pa_export.py`; `exports/SAMPLE-SYNTHETIC-package/` |
| 3 | Field dictionary and state model | Summarised in §3 below | this file |
| 4 | Source and licence boundary rules | Done in code and tested | `engine/pa_governance.py`; §4 below |
| 5 | Import-mode decision (I-1 recommended) | Decided: I-1 first. Rationale in §5 | this file |
| 6 | Synthetic end-to-end demo data | Done. Quality-manual vertical demo and sample export | `tests/demo_qm_vertical.py`; `tests/fixtures/` |
| 7 | Tests for checklist, evidence, finding, CAR review, snapshot, export | Tests exist for each. Checklist rendering is gated and tested. Snapshot write-once tested. CAR flags tested. Finding and export tested. No checklist *item card* UI yet | `tests/test_*.py` (91 tests) |
| 8 | Explicit production blockers | Listed in §6 | this file |

## 2. Package (I-1) — schema v1.0

Top-level keys (19, all required; checked by `pa_export.check_package`):
`package_version`, `export_id`, `audit_id`, `organization`, `generated_at`, `audit`, `sources`, `sources_withheld_for_licence`, `manual`, `checklist_items`, `assessments`, `evidence`, `interviews`, `sampling`, `findings`, `prior_car_reviews`, `snapshot`, `unresolved_items`, `not_assessed`.

Field-by-field import documentation, the withholding rules and the final vocabularies are in `docs/MIKE-IMPORT-FIELD-DICTIONARY.md`. Sample packages: `exports/SAMPLE-FAA-QSA-PACKAGE/`.

Rules enforced:
- Keys that could carry source body text (`body`, `body_text`, `clause_text`, `verbatim`, `rows`) are rejected anywhere in the package.
- Findings must link at least one requirement (`STD:` or `REG:` format) and one evidence record.
- Lead classification must be set by `LEAD_AUDITOR`, and the lead must differ from the proposer.
- Sources with `ORG_PRIVATE_LICENSED` or `CUSTOMER_PRIVATE_LICENSED` state are withheld unless the recipient is the owning organization. Withheld IDs are listed in `sources_withheld_for_licence`.
- The package is written as exact bytes with a SHA-256 sidecar. `verify_export` fails on any change.
- An evidence manifest records each evidence file's hash and whether it is present.

Sample: `exports/SAMPLE-SYNTHETIC-package/package.json`, `package.sha256`, `evidence-manifest.json`.

## 3. Field dictionary and state model (summary)

**Finding states:** `DRAFT` → `SUBMITTED` → `CLASSIFIED` → `CLOSED`.
- `statement`: the factual statement of what was seen. Required.
- `proposed_classification`: the auditor's proposal (`MAJOR_NC`, `MINOR_NC`, `OBSERVATION`, `OFI`). Not authoritative.
- `lead_classification`: set only by a `LEAD_AUDITOR` who is not the proposer. This is the authoritative value.
- `requirement_ids`: exact references, `STD:<standard>:<clause>` or `REG:<regulation>:<section>`.

**Evidence:** `evidence_type` in {record, controlled_document, system_data, observation, photo_file, interview, verbal}. Rank from the skill hierarchy (record = 1 … verbal = 6). A photo or file requires a path and a SHA-256. A photo alone is not sufficient without an auditor description (directive).

**Quality manual:** `status` `uploaded_unreviewed` → `reviewed`. Exclusions: `proposed` → `accepted` | `accepted_amended` | `rejected`; `invalid_ref` blocks completion until corrected.

**Source:** `status` in {approved, proposed, unverified, unavailable, superseded}; `licence_use`; `licence_scope_owner`; `next_review_due`. Approved requires a passing licence gate and a current review cycle.

**Audit lock:** allowed only when the manual is reviewed, every exclusion is resolved and valid, and every selected source is approved, licence-cleared and within its review cycle.

**Snapshot:** write-once JSON with SHA-256. Later source corrections create a new version; the old file is not changed.

## 4. Source and licence boundary

- Burrana Inc. is the owner of the licensed AS9100D and AS9110C copies (`ORG_PRIVATE_LICENSED`). Verbatim use is limited to the Burrana private environment. These sources are never placed in a shared package or another organization's export.
- Regulator text (FAA, EASA, UK, CAAC) is recorded as `SHARED_DISTRIBUTABLE` on the owner's public-use statement. Per-source reuse terms are not independently verified.
- An export carries identifiers, headings, hashes and licence metadata. It does not carry source body text.

## 5. Import-mode decision

**Decision: I-1 (versioned export package) first.** The Audits module imports a copy through its own controlled process. It remains authoritative for its own records.

Reasons: it needs no shared lists and no write access to Pocket Auditor storage. It keeps the Audits module's audit trail intact. It can be tested offline with the sample package. I-2 (read-only adapter) comes later if needed. I-3 (two-way sync) is deferred and needs its own contract for identity, authority, conflicts, deletion and source ownership.

## 6. Production blockers (explicit)

- **Source approval:** no requirement row is approved. AS9100D and AS9110C clause content needs your review against the licensed copies.
- **AFAC RAC 145:** no approved source. Unavailable.
- **Regulator reuse terms:** owner-asserted, not verified per source.
- **Field and device testing:** no phone or tablet testing done. No offline sync tested on a device.
- **Tenant deployment:** no SharePoint tenant contacted or deployed. No Graph calls.
- **Missing screens:** item card, interview, sampling and CAR review UI are not built. The checklist is not rendered as items in any UI.
- **Burrana copies location:** the licensed copies are still inside this product folder. Storage decision open.
- **Intent text:** not authored for 149 clauses. Pending, not invented.
- **Standard reconciliation:** heading and reference level only. Clause text not checked. Top-level clause titles 4–10 are null.

## 7. Sample run (for the record)

`python -I -m unittest discover -s tests -p "test_*.py"` → `Ran 91 tests ... OK`.
Sample export structural errors: `[]`. Hash verification: `(True, None)`.
