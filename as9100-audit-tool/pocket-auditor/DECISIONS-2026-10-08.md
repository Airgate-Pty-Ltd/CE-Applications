# Pocket Auditor — Decisions for Next Milestone

## 1. Quality manual

Do not wait for a real customer quality manual. Build the workflow, schema, validators, and tests using clearly labelled synthetic manuals and synthetic exclusions. A real organization's manual is a customer-provided input at deployment time, not product seed content.

The quality-manual workflow must support upload/import, hash, source metadata, scope extraction/entry, proposed exclusions, reviewer accept/reject/amend, evidence references, and an audit-lock gate. No synthetic manual may be presented as a customer or approved regulatory source.

## 2. Intent text

Do not author licensed requirement text or unverified intent from memory. Keep intent fields pending where approved source content is absent. Build the data path and UI states so approved intent becomes visible automatically when a reviewed source pack is loaded.

## 3. Audio and transcription

Audio recording and transcription are OFF by default. If later enabled by organization policy, require explicit consent/notification, show a visible recording state, retain the original audio and transcription provenance, require auditor review, and never treat an unreviewed transcript as authoritative evidence.

## 4. Photo location and privacy

GPS is OFF by default. Photo evidence must always support manual area/location text. GPS may be enabled by organization policy with a visible capture indicator, consent/privacy notice where applicable, retention control, and the ability to strip location from exports. Do not collect precise location merely because the device supports it.

## 5. Advisory AI

Do not connect a production JudgmentProvider, VERA, or other AI service yet. Implement the provider contract, provenance fields, pending/unavailable states, and local test stub only. Advisory output must never set assessment, finding classification, applicability, approval, or report issuance.

## 6. Approved next milestone

Proceed now with:

- complete source registry metadata and review-cycle model;
- quality-manual record and synthetic fixture workflow;
- proposed exclusion review with accept/reject/amend;
- N/A and audit-lock validators;
- tests for source gates, manual review, evidence references, reviewer/timestamp requirements, and lock refusal/allowance;
- handover report with actual command output.

Do not stop at schema-only work: demonstrate the vertical workflow from synthetic manual upload through proposed exclusion review to an audit-lock decision. Keep all changes inside the Pocket Auditor folder.
