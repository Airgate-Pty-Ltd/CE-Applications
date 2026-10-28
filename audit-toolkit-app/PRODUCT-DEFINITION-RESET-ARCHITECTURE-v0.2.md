# Audit Toolkit — Corrected Product Definition and Architecture Amendment v0.2

**Date:** 2026-10-11 · **Status:** mandatory amendment per owner directive; DRAFT for owner review · **`RELEASE_NOT_AUTHORIZED`**
**Amends:** `ARCHITECTURE-AND-CONTRACTS.md`, `PRODUCTION-ARCHITECTURE-v0.1.md` (their findings and constraints stand; their scope statements are superseded where they describe the Toolkit as a field audit execution application).

## 1. What changed
| Before (drift) | Now (corrected) |
|---|---|
| Toolkit = field audit execution app (evidence capture, sampling at the audit, offline field use) | **Toolkit = professional, standards-intelligent audit planning, audit-program, checklist, SCAR-response and NCR-statement toolbox** |
| Checklist content inside the app | **Requirement Intelligence Library (RIL): a separately governed, versioned Conform-Edge IP asset consumed by both products** |
| Pocket Auditor treated as a sibling prototype | **Pocket Auditor is the separate field-execution product** and the second consumer of the same library |
| Aerospace-first terminology | Multi-standard; NCR builder, program and checklists work for any supported management system |
Preserved, not discarded: the verified audit logic (evidence assessment, conclusion governance, citation verification, 12-gate NCR), the verification-record rules, the content validation gate, the Kernel/MAK findings and blockers, the 144 headless tests and browser sweeps. The audit-record prototype remains as a **reference component** (`prototype/index.html`), not the Toolkit's workflow.

## 2. Product map and boundaries
| System | Role | Owns | Does not own |
|---|---|---|---|
| **Requirement Intelligence Library** (`2026-10-11-requirement-intelligence-library/`) | Canonical source identities, obligation identifiers, authored audit intelligence, validated checklists, manifests, versions, provenance | Canonical record schema, citation rules, content hash, manifest, completeness, diffs | Application logic, user data, audits |
| **Conform-Edge Audit Toolkit** | Plan audits, build programs and coverage, prepare checklists, respond to SCARs, construct NCR statements, practice competency | Planner, program, SCAR, NCR and competency logic; its own user data | Checklist content (consumes it) |
| **Pocket Auditor** (separate product) | Field audit execution: evidence capture, sampling in the field, observations, findings hand-off | Field workflows | Checklist content (consumes it) |
| **MAK / M-AI** | Invisible background intelligence and decision-integrity services | Private, governed development | Never named in customer UI; not enabled until blockers clear (BD-02, BD-03) |
Data flow: Library → (signed/pinned content pack) → Toolkit and Pocket Auditor. Toolkit → plans, checklists → Pocket Auditor executes → results/findings → Toolkit imports → NCR and corrective-action preparation. The only coupling is the content-pack contract and a results-import format; there is no shared source code and no merge of products.

## 3. Toolkit modules (primary navigation)
Dashboard · Audit Planner · Audit Program · Checklist Library · SCAR Builder · NCR Builder · Competency Assessment (enabled module). Demonstrated in `prototype/toolkit.html`; logic in `src/planner-core.js`, `program-core.js`, `scar-core.js`, `competency-core.js`, with the preserved NCR gates in `audit-core.js`.
| Module | Key rules enforced in code (tests) |
|---|---|
| Planner | Plans built only from library obligations; applicability via resolver with reasons; team competence, lead qualification, expiry and **independence** checks; accountable approver; plan **pinned** to pack and per-obligation hashes; library updates raise a drift flag and never alter an approved plan; demonstration content marked on every export |
| Program | **Seven distinct coverage measures from obligation identifiers** (total, applicable, justified N/A, assigned, assessed, not covered, re-evaluation); coverage never inflated by headings, duplicate assignment or question counts; justified N/A needs a real justification; scheme coverage is a **policy object**, unverified policies never yield a compliance statement; incomplete pack caveat; overdue, repeat findings, risk schedule (labelled planning rule), effectiveness report, revisions with reasons |
| SCAR | Stated requirements separated from customer assertions; never invents containment, causes, actions or results (completion needs date + evidence; unverified causes are "probable cause"); occurrence/escape/systemic; measurable effectiveness criteria; response must address each allegation item; 8D is an optional view |
| NCR | Should Be / As Found / Statement of nonconformity retained; 12 gates; classification scheme selectable (not aerospace-only); built from imported results |
| Competency | Items derived from library records and the product's own evidence logic; practice-only until expert review; the free-text NCR is scored by the real gates |

## 4. Requirement Intelligence Library architecture
### 4.1 Canonical obligation record (schema `1.0.0-rc.1`, a freeze **candidate**)
Per auditable obligation (validated by `RIL.validateRecord`; see `schema/obligation.schema.json`): exact standard id, edition, exact clause through lettered/numbered subdivision, applicable requirement interpretation, intent, expected control/outcome, applicability conditions, verification activities, audit questions, interview questions, expected objective evidence, sampling guidance, process relationships, risk considerations, common failure indicators, alternative valid implementations, related requirements, aspects, alternative-explanation checks, Should Be paraphrase, **separate** source-verification and technical-approval states, authored-content version, reviewers and approver/date. Several obligations under one clause stay separate records. **Designators are never invented**: a clause reference is valid only if it is a catalogued hierarchy leaf.
### 4.2 Exact citation-validation rules (implemented and tested)
Grammar `7.1.5.2(a)(1)`; valid only if the node exists in the pack hierarchy; parents (nodes with children) are *incomplete*; non-existent paragraph/subdivision/clause are *invalid*; an obligation's reference must be a catalogued leaf that lists that obligation; NCR citation must additionally *govern* the obligation being cited.
### 4.3 Complete coverage architecture
Completeness is computed from the hierarchy **leaves** and obligation identifiers: every leaf classified auditable / not auditable (with justification); every auditable leaf has at least one source-verified, technically approved obligation; edition and hierarchy verified. The demonstration pack is **INCOMPLETE** (27 leaves, 5 authored, 22 unclassified) and the UI and manifest say so. A pack cannot be called complete while any applicable auditable obligation is absent from its approved index.
### 4.4 Shared concept graph
Concepts (traceability, measurement traceability, external-provider verification, competence effectiveness, special-process control) link similar intended outcomes across standards. Cross-standard links record `NOT-AUTHORIZED-YET` stubs; **normative distinctions are never flattened**: each standard keeps its own obligation records (ISO 9001 vs AS9100 competence, ISO 14001 environmental aspects and compliance obligations, ISO/IEC 27001 risk assessment/treatment and Statement of Applicability relationships, IATF-specific requirements).
### 4.5 Content-pack contract
`build-contentpack` → `{manifest, pack}`: manifest carries pack and per-obligation content hashes, completeness reasons, release status and a signature state (**`UNSIGNED-DEVELOPMENT`**; no signing key exists, production requires the library release authority). Consumers verify the manifest on load and refuse a failing pack (`RIL.verifyPack`); the Toolkit vendors a built pack plus the library reference code under `vendor/ril/` with a hash record and a drift test (`tools/sync-library.js`). No consumer keeps its own authored copy.
### 4.6 Versioning and non-interference
Content hash covers authored content only (approvals do not change it). Plans and programs pin the pack; `RIL.diffManifests` names added/removed/changed obligations; the Toolkit flags drift and **re-evaluation**; previously generated plans, findings, audit records and reports are never altered.

## 5. Intellectual-property boundaries
Authored questions, methods, risk relationships, sampling guidance, audit logic, mappings and concept graph = intended Conform-Edge commercial IP (owner entity subject to verification). Source standards are third-party: **no source text is carried or redistributed** (`licence.sourceTextIncluded=false`, validator rejects verbatim text and copied NOTE/definition patterns); exact references and independently authored interpretations only; source provenance and authored-content provenance recorded separately. Pocket Auditor `licensed-private` and Burrana-derived content is not used. Customer evidence is not training data without authorization. Counsel review is a hard gate before any commercial pack.

## 6. Preset standards library and references
Ten intended first commercial packs (owner list) are shown as **status only**: none authored except the AS9100D demonstration; editions, amendments, transition status, licence and source availability **to be verified before authoring** (`STANDARDS-EDITION-VERIFICATION-REGISTER.md`). ISO 19011, AS9101 and AS9104/1 inform the planning engine and are **not** content packs. Future bolt-on packs (FAA/EASA Part 21/145, other civil aviation, additional ISO, customer-specific, industry, specialised frameworks) use the same pack contract; the architecture has no pack-count limit.

## 7. Standards revision management
Each pack is bound to one source edition. A new edition or amendment = a new pack version (or a new pack) authored, verified and approved separately; the old pack remains available for audits against the old criteria. Transition status is metadata on the edition record. Differences are reported with `diffManifests`; plans/programs show drift and require owner action. No in-place edit of an approved obligation: changes create a new content version.

## 8. Commercial release gates (all must clear per pack)
Edition/amendment/transition verified from an official source · licence and source availability confirmed · counsel IP review · complete hierarchy classified · obligation index complete and **source-verified** (clause structure) · **interpretation, outcome, applicability reviewed** by named humans · final technical approval · expert-reviewed audit scenarios and competency items · coverage completeness demonstrated · shared consumption demonstrated by both products · validator release mode passes · signed manifest · Product Governor approval. No pack is described as complete before its hierarchy, obligations, interpretations and technical review are verified.

## 9. Development sequence (owner-directed)
1. Freeze the canonical obligation schema (candidate `1.0.0-rc.1` ready for owner approval).
2. Exact citation-validation rules (done, tested).
3. Content licensing and release controls (`GOVERNANCE.md`; counsel pending).
4. **Select a technically approved pilot standard** (owner decision; AS9100D has demonstration content but its edition status needs verification first — see the edition register).
5. Complete and independently validate a representative **deep checklist** for the pilot.
6. Demonstrate coverage completeness (needs a complete, verified hierarchy index).
7. Demonstrate shared consumption by Toolkit and Pocket Auditor (consumer projections and pinning done; Pocket Auditor integration not built).
8. Validate against expert-reviewed audit scenarios.
9. Demonstrate a properly constructed NCR and audit plan from the pilot.
10. Only then scale authoring to the ten standards. **Do not generate ten large packs now.**

## 10. Security and technical restrictions carried forward
Unchanged: no merging MAK/M-AI/CE-QMS/Pocket Auditor/Clause Map Framework into the product; MAK Gate 001 blocks MAK-derived suggestions; Kernel not authoritative until reproducibility is proven (WebView, locale, canonicalization, line endings, dependencies, manifest); no production NCRs against unverified interpretations; encrypted storage, authentication, tenant segregation and tamper-evident logging still unimplemented; the follow-up provider remains a labelled engineering stub. See `BLOCKING-DEPENDENCY-REGISTER.md`.
