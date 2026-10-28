# Pocket Auditor — Field and Intent-Audit Gap Addendum

This addendum supplements `04-PRODUCT-REQUIREMENTS.md`, `05-PRODUCT-ARCHITECTURE.md`, and `06-DECISION-LOGIC.md`.

## Core field-audit loop

Every checklist item should support this loop:

1. Understand the intent and applicable requirements.
2. Ask the prompt or interview question.
3. Select or capture objective evidence.
4. Record what was seen, heard, or reviewed.
5. Assess documented, implemented, and effective dimensions.
6. Record gaps, risks, and follow-up questions.
7. Raise or draft a finding when justified.
8. Move to the next item without losing offline work.

The item card should make this loop possible without navigating away from the audit.

## Capabilities to add or make explicit

### 1. Photo and media evidence

On phone/tablet, the auditor must be able to:

- take a photo directly in the item or finding;
- choose an existing photo or file;
- attach multiple images to one evidence record;
- add a caption, location/area, subject, and what the image proves;
- record capture time, device, auditor, and SHA-256 hash;
- mark sensitive or restricted evidence;
- preview, rotate, replace, and delete only by voiding with a reason;
- continue capture offline and show upload/sync status;
- preserve the original file and any derived thumbnail separately.

Do not treat a photo as self-explanatory evidence. Require a description of what is visible and how it relates to the requirement.

### 2. Interviews

Add an interview mode linked to an audit item:

- interviewee name or controlled identifier, role, department, and consent/notification state;
- interviewer, date/time, location, and method;
- generated intent-based prompts by role: process owner, performer, verifier, leadership, or support function;
- notes per prompt and an overall summary;
- optional audio recording only when enabled by policy and consent is recorded;
- optional transcription as an assistive draft, never as authoritative evidence without auditor review;
- evidence classification: direct statement, corroborated statement, or uncorroborated statement;
- links to documents, records, observations, and findings that corroborate the interview.

### 3. Objective evidence workspace

Evidence should be a first-class object, not just a text box:

- evidence type: record, controlled document, system data, observation, interview, verbal, photograph, video, or file;
- source/reference number, revision, date range, owner, and storage location;
- exact observation or excerpt;
- relevance to one or more requirements;
- confidentiality/access classification;
- chain of custody and hash status;
- evidence sufficiency indicator as guidance only, never an automatic conformity decision.

### 4. Intent-based auditing behavior

The auditor should see:

- the governing intent in plain language;
- all parallel regulatory/standard references that remain independently applicable;
- why the item is in scope;
- expected controls and evidence types;
- failure modes and risk level;
- interview prompts;
- sampling plan and escalation rule;
- prior findings and recurrence history;
- a “what would change this assessment?” prompt.

The system must allow the organization to satisfy intent without copying standard wording. It must also prevent an intent-based pass from hiding a mandatory regulatory requirement.

### 5. Sampling and traceability

For every sample, capture sample identity, population/basis, selection method, period, result, evidence, and whether the sample was expanded. When a sample reveals a problem, show the escalation rule and require the auditor to confirm the expanded sample or record why it was not performed.

### 6. Findings and conditions

Support:

- draft finding while offline;
- finding from an item, evidence record, interview, or photo;
- requirement(s) not met and exact evidence;
- factual statement separated from classification;
- proposed classification separated from lead-auditor classification;
- immediate correction, containment, root cause, corrective action, owner, due date, and verification;
- repeat/recurrence link;
- auditee response and disagreement/contestation;
- controlled conversion to NCR/CAR through a compatibility adapter, not direct coupling to another product.

### 7. Quality-manual-first planning

Make quality-manual review the first required planning activity. The user uploads/selects the manual, records the approved scope and exclusions, and reviews system-proposed applicability decisions. Every exclusion must retain the manual section or approved document reference, reviewer, date, and evidence. Field-created N/A decisions require the same basis before close-out.

### 8. Field reliability

Add explicit support for:

- offline package readiness check before departure;
- visible online/offline and last-sync status;
- autosave and crash recovery;
- battery/storage warning before evidence capture;
- timezone and clock source;
- duplicate-photo detection without deleting originals;
- sync queue, retry, conflict resolution, and encrypted export package;
- device loss/revocation response;
- accessibility, gloves/large controls, sunlight contrast, and one-handed use.

### 9. Reports and handover

Reports should include scope, quality-manual basis, standards and exact source revisions, applicability decisions, coverage, sampling, evidence index, interview register, photographs with captions, findings, unresolved items, sync/acceptance status, signatures/approvals, and report hash. Include an appendix showing what was not assessed and why.

## Keep deterministic versus intent-assisted

Deterministic: source approval, clause hierarchy, applicability gates, N/A evidence requirements, sampling arithmetic, assessment state transitions, finding completeness, authority, hashes, sync conflicts, and report holds.

Intent-assisted: prompt suggestions, evidence-to-intent review, possible related requirements, draft finding wording, interview follow-up prompts, and report summarization. All such output must be labelled advisory and remain subject to auditor/lead approval.
