# Pocket Auditor → Mike's Audits Module Handoff

## Purpose

Pocket Auditor is a standalone, self-contained audit execution tool. Mike may use its framework to structure the separate Audits module, but neither product becomes a dependency of the other and no existing QMS tool is modified by this build.

The immediate handover target is a stable audit framework and compatibility contract, not a claim that every aerospace source or production integration is complete.

## Product boundary

### Pocket Auditor owns

- audit planning and scope selection;
- source and requirement packages;
- quality-manual applicability review;
- clause/subclause/paragraph hierarchy;
- intent-based checklist generation;
- checklist execution;
- evidence capture;
- interviews and sampling;
- findings drafting;
- prior CAR/NCR review;
- immutable audit/source snapshots;
- audit reports and export packages.

### Mike's Audits module owns

- its own SharePoint lists, libraries, permissions, screens, and workflow;
- its own audit-program records and enterprise QMS relationships;
- its own CAR/NCR/Action integration;
- importing or consuming Pocket Auditor packages through an approved adapter;
- deciding how imported records participate in the QMS audit trail.

The Audits module must not import Pocket Auditor implementation files, write to Pocket Auditor storage directly, or alter Pocket Auditor schemas.

## Compatibility contract

Pocket Auditor exports a versioned package containing:

- `package_version`;
- `export_id` and `audit_id`;
- organization and site identifiers;
- audit type, objective, scope, criteria, team, and dates;
- source registry entries with authority, revision, effective date, source hash, licence/use scope, and approval status;
- quality-manual review and applicability decisions;
- exact clause/subclause/lettered requirement references;
- checklist items with intent, question, source references, crosswalk relations, risk, sampling, and status;
- assessments for Documented / Implemented / Effective;
- evidence records with type, description, source reference, timestamp, auditor, hash, and file manifest;
- interview records and sampling records;
- findings with requirement links, evidence links, factual statement, proposed classification, owner, due date, and status;
- prior CAR/NCR review results and effectiveness status;
- report metadata, snapshot version, snapshot hash, and generated report hashes;
- unresolved items and explicit not-assessed reasons.

Every exported object retains its Pocket Auditor identifier and source lineage. The receiving Audits module must preserve those identifiers and must not silently rewrite requirement references or evidence provenance.

## Import modes

### I-0 — No integration

Pocket Auditor remains standalone. No data exchange.

### I-1 — Versioned export package (first recommended integration)

Pocket Auditor exports JSON plus SHA-256 and an evidence manifest. Mike's module imports a copy through its own controlled process. The receiving module remains authoritative for its own records.

### I-2 — Read-only package/read adapter

Mike's module may read approved Pocket Auditor packages or approved source/checklist packages. It does not write back to Pocket Auditor.

### I-3 — Two-way sync

Deferred. Requires a separate approved contract covering identity, authority, conflict resolution, audit trail, deletion/voiding, and source ownership. Do not implement by directly sharing SharePoint lists.

## What Mike should reproduce in the Audits module

The framework pattern is:

`quality manual → applicability → prior audits/CARs → source selection → checklist snapshot → field execution → evidence/interviews/sampling → findings → report`

The Audits module should use the same concepts and field meanings even if its SharePoint implementation differs:

- source-governed checklist generation;
- exact requirement hierarchy;
- intent-based item cards;
- objective evidence as first-class records;
- separate proposed and authoritative finding classification;
- CAR effectiveness review;
- immutable audit snapshots;
- complete evidence/report traceability;
- offline/imported package awareness where applicable.

## Handover acceptance criteria

Mike can accept the framework when he has:

1. the runnable Pocket Auditor prototype;
2. the package schema and sample export;
3. the field dictionary and state model;
4. the source/licence boundary rules;
5. the import-mode decision (I-1 recommended first);
6. synthetic end-to-end demo data;
7. test output proving checklist, evidence, finding, CAR-review, snapshot, and export behavior;
8. an explicit list of production blockers: licensed source approvals, AFAC source, tenant deployment, and device testing.

## Important non-claims

This handoff does not claim that Pocket Auditor certifies an organization, that all aerospace sources are approved, or that a SharePoint tenant deployment has been qualified. It defines the framework and contract Mike can implement safely in the separate Audits module.
