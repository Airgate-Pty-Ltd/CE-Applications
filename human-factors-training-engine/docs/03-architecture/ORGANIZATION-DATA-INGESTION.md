# Organization Data Ingestion

## Purpose

HF Engine accepts controlled files supplied by an organization's training department through
two deployment-neutral paths. Both paths call the same ingestion service and produce the same
database records, hashes, quarantine decisions, and audit events.

1. **Server/on-prem folder:** the application continuously polls one explicitly configured
   folder. The Windows installer defaults this to `data\incoming`; Docker mounts a host folder
   read-only at `/app/incoming`.
2. **Hosted web:** an authorized QM, trainer, or administrator uploads a file on the Source
   Intake page. `POST /api/intake/files` is the underlying multipart endpoint.
3. **Hosted folder connector:** a read-only agent beside the training department's folder sends
   stable files over HTTPS to the hosted service. Each connector has an organization-bound,
   revocable bearer token; the raw token is shown only once.

## Controlled processing

The intake boundary:

- resolves every record to the authenticated organization;
- refuses absolute paths, `..` traversal, hidden entries, and symbolic links;
- waits for server-folder files to become stable before reading them;
- limits files to 20 MiB by default (`HF_MAX_INGEST_BYTES`);
- scans before extraction (Windows Defender or ClamAV in production);
- computes a SHA-256 hash and deduplicates within the organization;
- stores the original bytes and extracted text with status and provenance;
- supports UTF-8 `.txt`, `.md`, `.markdown`, `.csv`, and `.json` in the first release;
- never deletes, moves, or changes the training department's source file.

`organizational_data` files are staged as controlled source records. They do not silently create
or modify people, assignments, completions, or certificates. A file explicitly submitted as
`evidence` also enters the existing evidence quarantine workflow and receives an `HfEvidence`
record. This separation prevents a dropped spreadsheet from becoming an unreviewed operational
change.

Authorized reviewers can open a staged record in Source Intake, inspect up to 100,000 characters
of safely extracted text alongside its source, classification, media type and hash, and perform a
named `promote_to_evidence` action. Promotion requires a title and may add occurrence date and
themes. It is organization-scoped, idempotent, transactional and audited; it creates controlled
HF evidence for the existing human classification/event/appropriateness workflow. It still does
not create training automatically.

## Server-folder configuration

```text
HF_INGEST_ROOT=D:\TrainingDepartment\HF-Engine-Incoming
HF_INGEST_ORGANIZATION_ID=<organization-id-from-administration>
HF_INGEST_POLL_MS=15000
HF_INGEST_RECORD_TYPE=organizational_data
HF_INGEST_CLASSIFICATION=INTERNAL
HF_AV_SCANNER=windows-defender
```

The application starts the worker automatically when `HF_INGEST_ROOT` is present. Operators can
also run one controlled pass for verification:

```text
npm run ingest:folder:once
```

For ClamAV set `HF_AV_SCANNER=clamav`; `HF_AV_EXECUTABLE` may point to a controlled executable
when it is not on `PATH`. Production fails closed when scanning is unavailable. The explicit
`HF_ALLOW_UNSCANNED_INGESTION=true` escape hatch exists for exceptional, risk-accepted operation
and must not be the normal production configuration.

The folder worker never guesses an organization. On a new installation, complete initial setup,
copy the real organization ID from administration, set both `HF_INGEST_ROOT` and
`HF_INGEST_ORGANIZATION_ID`, and restart HF Engine. If the organization is absent or inactive,
the worker fails closed. Optional Docker deployments use `HF_INGEST_CONTAINER_ROOT=/app/incoming`
plus the same organization ID.

## Hosted-folder connector

An administrator creates a connector in HF Engine and securely transfers the one-time token to
the operator responsible for the source folder. On that source machine, configure:

```text
HF_CONNECTOR_ROOT=D:\TrainingDepartment\HF-Engine-Incoming
HF_CONNECTOR_STATE_PATH=C:\ProgramData\Conform-Edge\HF-Connector\state.json
HF_HOSTED_URL=https://hf-engine.example.com
HF_CONNECTOR_TOKEN=<one-time-connector-token>
HF_CONNECTOR_POLL_MS=15000
HF_CONNECTOR_RECORD_TYPE=organizational_data
HF_CONNECTOR_CLASSIFICATION=INTERNAL
```

Run `npm run connector:hosted:once` as a preflight, then `npm run connector:hosted` under the
customer's process supervisor or service account. The state ledger must be outside the watched
folder. The connector rejects non-HTTPS destinations except localhost, ignores symbolic links,
hidden and partial files, waits for stable files, hashes content, and does not alter source files.
Revoking the device in administration stops future uploads. A changed file hash is ingested as a
new immutable revision; an already acknowledged hash is not re-uploaded.

The connector endpoint is `POST /api/connectors/ingest`. It accepts multipart fields `file`,
`relativePath`, `sourceFileModifiedAt`, `classification`, and `recordType`, authenticated by
`Authorization: Bearer <token>`. Tokens belong to one organization and cannot select or override
the destination tenant.

## Current boundary and next adapters

This release stages roster, competency, completion-history, and assignment files as organizational
data. It extracts UTF-8 TXT/Markdown/CSV/JSON, PDF, DOCX, and XLSX after malware scanning and
content-signature validation. XLSX formulas are never evaluated, formula-like text is neutralized,
and archive/page/cell/text limits fail closed. Schema-specific mapping, human preview/approval,
row-level validation, and reversible application of roster/completion records remain separate
adapters; extracted documents are not promoted into operational records automatically. Unsupported
or malformed formats receive `REJECTED_EXTRACTION` with a visible reason.
