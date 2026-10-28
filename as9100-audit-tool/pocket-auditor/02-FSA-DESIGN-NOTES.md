# 02 — FSA Design Notes (BUILD mode)

## Problem eliminated
Not "faster checklists." Eliminated: (1) hand-building checklists by reading four kinds of source documents and cross-referencing them; (2) duplicate questions when several sources require the same outcome; (3) rewriting field notes into findings and reports; (4) lost traceability between a finding, its requirements, and its evidence.

## Intelligence operating layer (runs without being asked)
- **Ingestion:** uploaded documents are segmented into candidate requirements automatically; authority level is suggested from document signals (regulator detection patterns from `aerospace-regulatory-audit-router/packs/`).
- **Crosswalk:** candidate MAPS_TO links proposed automatically (deterministic clause-family match now; semantic proposals once PAD-008 is approved). Conflicts flagged with the precedence rule that applies.
- **Checklist generation:** applicability, risk weighting, sampling size, question, evidence hierarchy, and interview prompts assembled with no manual entry.
- **Prior audit memory:** open and repeat findings on the same requirement are surfaced on the item automatically.
- **M-AI (server, on sync):** System-Detected Conditions on audit integrity (finding without evidence, N/A without justification, sample below plan, regulatory item not assessed). Report issuance HOLD when major conditions are open.
- **JudgmentProvider (online):** intent review of recorded evidence returns MET / NOT_MET / PARTIALLY_MET / UNKNOWN with provenance, as a second opinion.

## Human role (decisions only)
Approve library content and crosswalk links; choose audit scope; judge intent met/not met on site; decide whether to raise a finding; classify findings (A3); issue the report. Data entry reduced to what only a person on site can capture: photos, record IDs sampled, observations, interview notes.

## Knowledge graph position
Every checklist item is a node linked to: requirement nodes (Requirement Graph) → their sources and authority levels → prior findings → evidence → audit → auditee/site/process. On CE-QMS sync, findings link to CARs and `requirement_evidence` edges (ADR-008), so an audit feeds the organization's requirement coverage picture.

## Comparison test
| Resembles | Its limitation | Eliminated how |
|---|---|---|
| Form-builder inspection apps | Static forms, no requirement model, no intent | Checklist is generated from a governed requirement graph; items carry intent and multiple source citations |
| Enterprise QMS audit modules | Online only, clause-by-clause, one standard at a time | Offline-first; multi-source crosswalk; process-mode ordering |
| Excel checklists | No traceability, no evidence linkage | Every finding carries requirement + evidence + auditor provenance |

## Gate check (design stage)
| Gate | Result | Note |
|---|---|---|
| G1 Problem elimination | PASS | Manual checklist construction and duplicate questioning eliminated |
| G2 Intelligence foundational | PASS | Generation, crosswalk, prior-finding recall and M-AI conditions run without request |
| G3 Human = decisions | PASS | Field capture limited to evidence only a person can obtain |
| G4 Knowledge graph | PASS | Requirement Graph native (ADR-008) |
| G5 Not an enterprise clone | PASS | See comparison table |
| G6 Screen awareness | PASS (design) | Each screen spec in 04 §5 lists its answers to the 7 questions; Claude Code must keep them |
| G7 VERA chain | PASS | Data (evidence) → knowledge (linked requirements) → understanding (coverage, repeat findings) → recommendation (conditions, intent review) → decision (auditor) → improvement (findings to CAR, later) |
| G8 Visual/motion | PASS (design) | Field-grade UI; no decorative motion; no 3D canvas on mobile (per vera-molecule-design-system "When NOT to use") |

**Overall: PASS.** REVIEW-mode gate check is required after build (`09-FSA-REVIEW.md`).
