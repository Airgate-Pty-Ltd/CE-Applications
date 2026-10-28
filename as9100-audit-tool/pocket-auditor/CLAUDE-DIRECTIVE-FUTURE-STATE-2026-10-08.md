# Claude Directive — Pocket Auditor Future-State Build

Date: 2026-10-08

## Mission

Build Pocket Auditor as a separate aerospace audit product, not as an extension of CE-QMS-M365. Pocket Auditor is the field execution, evidence, intent-auditing, and audit-package product. SharePoint/QMS is the governed enterprise record and collaboration environment. The two products must be compatible through explicit contracts and adapters.

Do not modify `Conform-Edge-QMS-git`, `m365-qms`, `CE-QMS-M365`, the M-AI kernel source, or other product folders. Work only inside this product folder.

## Product definition

Pocket Auditor is not a checklist generator or a chatbot. It is a governed evidence and judgment system for aerospace audits. It must help an auditor plan, prepare, conduct, document, assess, report, and follow up an audit while preserving source lineage, objective evidence, authority, and an immutable audit record.

## Future-state experience

### A. Plan the audit

The planner must capture:

- auditee, organization, legal entity, sites, departments, processes, products, and time period;
- audit objective, scope, criteria, type, mode, schedule, lead auditor, team, auditees, observers, and witnesses;
- required auditor competence, independence, and conflicts;
- selected standards, regulations, contracts, customer requirements, internal procedures, and controlled documents;
- risk preset: Light, Standard, or Deep;
- sampling strategy and planned evidence types;
- audit readiness status and missing prerequisites.

The audit cannot be locked until the quality-manual review and source/applicability gates are complete.

### B. Review the quality manual first

The first required planning action is to upload or select the organization's quality manual and record:

- QMS scope;
- sites and activities;
- products/services;
- design responsibility;
- maintenance/repair/production activities;
- special processes;
- customer property;
- outsourced processes;
- regulatory approvals;
- stated exclusions and non-applicabilities;
- referenced procedures and records.

The system proposes applicability decisions from this review. The auditor must accept, reject, or amend them. Each exclusion requires an exact requirement reference, quality-manual section or approved document reference, reason, evidence, reviewer, and timestamp. Requirements without an approved exclusion remain applicable.

### C. Govern sources and requirements

Every source and requirement must carry authority, edition/revision, effective date, jurisdiction, source artifact, source hash, upload/retrieval date, license/access status, reviewer, approval status, supersession, and review cycle.

Represent the hierarchy exactly:

`Clause → subclause → deeper subclause → lettered paragraph/regulatory item`

Examples: `4`, `4.1`, `8.1.1`, `21.137(a)`.

Never flatten these into generic clause lines. Never guess missing clauses or wording. If only the clause structure is approved, render a controlled clause audit item without inventing standard text. If no source exists, show an upload/request path and block approved checklist generation.

Support user-uploaded checklists and source documents, including missing MX AFAC RAC 145. Preserve the original identifiers, calculate a hash, parse the hierarchy, allow controlled additions, and require review/approval before use.

### D. Generate intent-based audits

Generate checklists automatically whenever approved requirements exist. A generated item must show:

- governing intent;
- exact source and requirement references;
- parallel obligations that cannot be merged;
- expected controls and evidence;
- failure modes;
- risk level;
- sampling minimum and escalation rule;
- interview prompts by role;
- prior findings and recurrence history;
- why the item is applicable;
- what would change the assessment.

Intent-based merging is allowed only through approved relations. Different regulators remain independently traceable even when they share intent. Guidance cannot create a finding by itself. The system must never convert AI language into an authoritative requirement.

### E. Conduct the field audit

The item card must support the complete loop without losing work:

1. understand intent and requirements;
2. ask a question or follow a process;
3. capture evidence;
4. record the observation/interview/document review;
5. assess Documented, Implemented, and Effective dimensions;
6. record sample details;
7. identify gaps and follow-up questions;
8. draft a finding if justified;
9. continue offline.

Provide checklist, process-walk, interview, document-review, sample-trace, remote, surveillance, follow-up, and special-audit modes.

### F. Capture objective evidence

Evidence is a first-class object, not a text attachment. Support:

- controlled documents and records;
- system data;
- direct observation;
- interviews;
- verbal evidence;
- photographs;
- video where policy permits;
- uploaded files.

For every item capture description, requirement linkage, source/reference number, revision/date range, location, auditor, timestamp, device, confidentiality, original filename, hash, sync status, and review status.

On a phone/tablet:

- take a photo in the audit item or finding;
- attach existing photos/files;
- add caption and what the image proves;
- capture area/location and time;
- preview/rotate and preserve the original;
- work offline;
- show upload/hash/sync status.

A photo alone is not sufficient evidence without an auditor description.

### G. Conduct interviews

Provide an interview record with interviewee role/identifier, consent/notification, interviewer, date/time/location, intent-based prompts, answers/notes, contradictions, corroborating evidence, follow-up actions, and confidentiality. Optional recording/transcription must be policy-controlled and reviewed by the auditor. AI may suggest follow-up questions but may not create authoritative evidence or findings.

### H. Manage sampling

For every sample record population/basis, selection method, sample identity, period, result, evidence, and whether the sample was expanded. If a problem triggers escalation, show the rule and require the auditor to confirm expansion or document why it was not performed.

### I. Manage findings

Use a staged lifecycle:

observation → evidence review → requirement identification → draft → auditee discussion → proposed classification → lead classification → response → corrective action → effectiveness verification → closure/recurrence.

Separate factual statement, proposed classification, and authoritative lead classification. Support draft findings offline, contested findings, repeat findings, split/merged findings, recurrence links, containment, correction, root cause, corrective action, owner, due date, and verification. Create NCR/CAR work through compatibility adapters only.

### J. Offline and SharePoint behavior

The native app must support encrypted offline packages, autosave, crash recovery, offline readiness checks, evidence queues, retry, hash verification, duplicate protection, device revocation, encrypted export, and human conflict resolution. Assessments and findings must never use silent last-writer-wins.

SharePoint compatibility must use Lists/Libraries, content types, metadata, versioning, permissions, retention, sensitivity/records controls, and document sets where appropriate. SharePoint/QMS must remain the enterprise record after synchronization; Pocket Auditor remains the field execution client. Define adapters for audit creation, package download, evidence transfer, findings transfer, CAR/NCR creation, report publication, and status synchronization.

### K. Close out and report

The report package must include audit plan, quality-manual applicability basis, sources/revisions/hashes, clause hierarchy and coverage, exclusions, checklist, sample register, evidence index, interview register, photos/captions, findings, responses/actions, verification, unresolved items, approvals, sync acceptance, report revision, and report hash. Include an explicit “not assessed and why” appendix.

## Deterministic versus advisory behavior

Deterministic: source approval, hierarchy, applicability gates, N/A evidence, sampling arithmetic, authority, state transitions, required evidence, hashes, sync conflicts, access control, report holds, and immutable snapshots.

Advisory: intent prompts, related requirements, evidence sufficiency guidance, follow-up questions, semantic review, draft finding wording, and report summaries. Advisory output must show provenance and never change assessment, classification, or approval without a human action.

## Build order

1. Baseline current Pocket Auditor and run existing checks.
2. Build source/requirement governance and exact hierarchy.
3. Build quality-manual-first applicability and exclusion review.
4. Build automatic multi-standard checklist generation and immutable snapshots.
5. Build field evidence, camera/photo, interview, and sampling workflows.
6. Build findings lifecycle and report package.
7. Build offline sync/conflict controls.
8. Build SharePoint compatibility adapters/contracts.
9. Run tests, mobile/field verification, accessibility checks, and produce the handover report.

At every stage report actual evidence. Prototype authorization remains distinct from production authorization. Do not claim licensed coverage, tenant deployment, store readiness, or production readiness without direct proof.
