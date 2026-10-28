# Pocket Auditor — Claude Build Handoff

Date: 2026-10-08

## Open this first

Work only in this folder:

`E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\_Opportunity-Scans\Builds\2026-09-27-pocket-auditor`

Read `00-START-HERE.md`, `BUILD-GOVERNANCE-STATUS.md`, `01-DISCOVERY-RECORD.md`, `04-PRODUCT-REQUIREMENTS.md`, `05-PRODUCT-ARCHITECTURE.md`, `06-DECISION-LOGIC.md`, and `07-BUILD-SPEC.md` before editing.

## Product boundary

Pocket Auditor is a separate product. Do not modify, extend, or add files to:

- `E:\Conform-Edge\Conform-Edge-QMS-git`
- `m365-qms`
- `CE-QMS-M365`
- the M-AI kernel source
- other product folders

Use SharePoint/QMS only through compatibility contracts, adapters, or documented integration seams.

## Build objective

Deliver the highest-value verified prototype milestone today. Preserve existing work and run the existing checks before and after changes.

The aerospace Pocket Auditor must support:

- multi-standard audit selection, such as FAA Part 145 plus AS9110C;
- selection of regulatory parts, standards, clauses, processes, and controlled documents;
- checklist generation only from approved, uploaded, or retrieved source data;
- source artifact, edition/effective date, hash, provenance, approval, and review-cycle metadata;
- blocked generation/request-upload behavior when a source is unavailable or unapproved;
- applicability decisions, with N/A requiring an approved quality-manual basis and reviewer;
- objective evidence including documents, records, interviews, observations, photographs/files, timestamps, and hashes;
- findings linked to the exact requirement, source snapshot, and evidence;
- immutable checklist/source snapshots for completed audits;
- documented SharePoint compatibility without changing the SharePoint QMS product.

## Source and claim rules

Do not author AS9100D, AS9110C, FAA, EASA, CAAC, UK CAA, or AFAC requirements from memory. Use only approved source material actually present in this folder. Missing or unapproved content must remain visibly pending and must not reach an approved checklist.

## Required handover output

At completion, create or update a concise handover report in this folder naming:

1. files changed;
2. commands and real test output;
3. what is demonstrably working;
4. what remains blocked or prototype-only;
5. exact next steps for the owner;
6. confirmation that no QMS repository or other product was modified.

Do not claim production readiness, tenant deployment, licensed clause verification, or mobile store readiness without direct evidence.

## Corrected implementation requirements

The product must not be treated as blocked merely because authored checklist text is incomplete. The system shall render checklists automatically whenever an approved source is available.

### Checklist generation

- Generate and render checklist lines automatically from every approved source selected for the audit.
- Allow more than one standard, regulation, source, and clause selection in a single audit.
- If a source has approved clause structure but no approved question/intent text, render the clause/subclause as a controlled audit item requiring the auditor to record the question or evidence request; do not invent requirement text.
- If no approved checklist exists, provide a clear upload/import path and allow the user to expand an uploaded checklist through controlled review and approval.
- The checklist must show source status: approved, proposed, unverified, unavailable, or superseded. Only approved material may be used for an approved audit package.

### Clause hierarchy and exact references

Represent requirements hierarchically, not as undifferentiated lines:

- top-level clause: `4`, `5`, `6`, `7`, `8`, `9`, `10`;
- subclause: `4.1`, `4.2`, etc.;
- deeper subclauses: `8.1.1`, `8.1.2`, etc.;
- lettered paragraphs or regulatory items: preserve the exact identifier, such as `(a)`, `(b)`, or `21.137(a)`.

The clause universe must list actual references and titles from the licensed source. Unknown, impossible, or non-existent references must be reported as source reconciliation errors and cannot be silently retained.

### AS9100D / AS9110C reconciliation

- Reconcile every Clause 4–10 row against the licensed standard before approval.
- Resolve the 26 AS9100D and 6 AS9110C invalid seed references by removing or remapping them only when the licensed source proves the correct location.
- Do not guess replacement clauses or author standard text from memory.
- Record each correction, source locator, reviewer, date, and approval status.

### Quality-manual-first applicability workflow

The first audit question/action is: **review the organization's quality manual and establish the approved scope and exclusions.**

- Upload or select the quality manual as controlled audit evidence.
- Extract or record the organization's stated exclusions, non-applicable requirements, scope boundaries, sites, products, and processes.
- Present those exclusions as proposed applicability decisions for auditor review.
- The auditor may accept, reject, or amend a proposed exclusion.
- A manual N/A decision requires: exact requirement reference, N/A status, reason, quality-manual section or other approved document reference, evidence link, reviewer, and timestamp.
- The system must also allow the user to enter an N/A during fieldwork, but it must not accept or close that N/A without the same documented basis and evidence.
- Requirements not covered by an approved exclusion remain applicable by default.

### AFAC and user-supplied checklists

MX AFAC RAC 145 is currently missing. Implement the source state and user path now:

- show AFAC RAC 145 as unavailable until an approved source is supplied;
- allow upload of a checklist or source document;
- calculate and retain file hash, source metadata, revision/effective date, and uploader;
- parse or import the hierarchy while preserving the original identifiers;
- require review and approval before the imported content can generate an approved checklist;
- allow an approved user to add or expand checklist questions without changing the underlying regulatory text, with revision history and reviewer approval.

### Evidence, findings, and snapshots

These are required build items, not deferred placeholders:

- evidence capture must support document/record review, interview, observation, photograph/file, date/time, location, auditor, and source reference;
- findings must link to the exact checklist item, requirement identifier, source revision, applicability decision, and evidence;
- checklist/source snapshots must be immutable once the audit is issued or completed;
- later source corrections may create a new version but must not rewrite a historical audit.
