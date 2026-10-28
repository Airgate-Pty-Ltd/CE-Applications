# HF Continuous Learning Engine — Architecture Foundation Summary

**Date:** 2026-08-05  
**Status:** ✅ Foundation Design Complete (Ready for Implementation or Refinement)  
**Reference:** HF-ENGINE-BUILD-PROMPT-v3.md (the vision); DESIGN-NOTES.md, DECISIONS.md, SCHEMA-DELTA.md, PHASE-1-SPECIFICATION.md (the technical foundation).

---

## What Was Completed

Four foundational documents have been created that translate the v3 vision directive into implementable technical specification:

### 1. DESIGN-NOTES.md
**Purpose:** Explain the "why" behind each major architectural decision.

**Contents:**
- Four-plane architecture (Evidence, Governance, Learning, Delivery)
- M-AI Kernel vs. AI Assist split (deterministic governance vs. pluggable LLM)
- Learning Atoms (smallest content units, versioned, replaceable)
- Curriculum Compiler (deterministic package generation)
- First-time vs. Recurrent logic
- Frozen manifests (historical immutability)
- Evidence relationship graph (bidirectional traceability)
- Deployment edition config (one codebase, two editions)
- Phase 1 vertical slice (narrow, complete, testable)

**Key insight:** Every architectural choice is justified by either audit requirements, confidentiality laws, operational reality, or risk-reduction effectiveness.

### 2. DECISIONS.md
**Purpose:** Formal record of 15 architectural decisions with trade-offs and alternatives considered.

**Each decision includes:**
- What (the decision)
- Why (the rationale)
- Alternatives rejected (and why)
- Trade-offs (cost vs. benefit)
- Implementation approach

**Examples:**
- D-002: M-AI Kernel ÷ AI Assist — "Auditors demand deterministic decisions for mandatory training; commercial AI APIs violate export-control requirements for regulated industries."
- D-004: Curriculum Compiler — "Identical inputs → identical output hash enables auditor verification: 'are all learners in role X trained the same?' Answer: yes, compiler hash proves it."
- D-009: Phase 1 vertical slice — "Narrow scope (one source, three atoms, one learner, baseline only) proves architecture quickly; full feature set (Phase 2-15) is extension, not rework."

**Coherence checks:** All architectural components support each other—planes are independent, kernel is deterministic, confidentiality is enforced, offline-readiness is preserved.

### 3. SCHEMA-DELTA.md
**Purpose:** Complete Prisma schema additions (23 new models, 4 planes).

**Structure:**
- **Evidence Plane (4 models):** HfEvidence, HfEvent, EvidenceClassification, EvidenceRelationship
- **Governance Plane (6 models):** MaiRuleManifest, MaiSystemCondition, MaiCausalStatus, MaiApproval, LearningInterventionAppropriatenessReview, + LearningIntervention (bridges to Learning)
- **Learning Design Plane (4 models):** LearningAtom, PolicyPack, PolicyPackClause, CurriculumManifest
- **Delivery & Effectiveness Plane (5 models):** TrainingAssignment, TrainingPackageManifest, SupervisorObservation, EffectivenessEvidence, + LearningIntervention (bridges from Governance)

**Key properties:**
- No changes to existing models (User, Course, Lesson, Assessment, etc.); backward-compatible
- One-way governance flow: evidence → governance → learning → delivery
- Bidirectional traceability: evidence_relationship supports forward & reverse queries
- Immutability constraint: frozen manifest triggers prevent UPDATE after assignment
- Classification inheritance: Burrana-private evidence → Burrana-private atoms → no external AI

### 4. PHASE-1-SPECIFICATION.md
**Purpose:** Complete specification for Phase 1 vertical slice (scope, workflow, 14 exit criteria, test plan).

**Scope (Deliberately Narrow):**
- One source: NCR or lessons-learned (Markdown or PDF)
- One theme: fatigue (or communication/procedural-compliance/situational-awareness/supervision)
- One intervention: micro-lesson + case study + 3 questions + supervisor observation
- One learner: assignment, completion, supervisor observation, effectiveness closure
- One cycle: baseline only (Phase 2 tests recurrent divergence)

**Workflow (10 Steps):**
1. Source ingestion → quarantine pipeline → classification (PUBLIC/INTERNAL/BURRANA_PRIVATE)
2. Event extraction + causal investigation (human-promoted status)
3. Appropriateness review (competence gap? training best control? behavior change expected?)
4. Atom design (with source evidence spans, AI proposal + no-AI fallback, approval)
5. Curriculum compilation (deterministic, frozen, reproducible hash)
6. Assignment (learner sees in dashboard)
7. Learner completion + assessment pass
8. Supervisor observation (workplace transfer evidence)
9. Intervention closure (effectiveness target level met)
10. Defense Dossier export (one-click audit proof)

**Exit Criteria (14 Verified Checkpoints):**
- C-001 to C-014 cover every critical flow and gatekeeping point
- All verified with running app (not code review), with proof (screenshots, logs, test results)
- No fabrication: checkpoints marked Verified (with proof), Partial (with caveats), or Not Implemented (honest about scope)

**Deliverables:**
- Prisma schema migration
- ~12-15 new API endpoints
- ~4-5 new UI pages
- 5 backend services (M-AI Kernel, AI Assist, Curriculum Compiler, Traceability Graph, Defense Dossier Builder)
- Seed data (1 NCR, 1 event, 3 atoms, 1 intervention, 1 assignment, 1 observation, 1 effectiveness evidence)

---

## Architectural Coherence

### How the Four Planes Work Together

```
EVIDENCE PLANE (Facts)
├─ HfEvidence: "NCR-2026-0042: Night shift fatigue error"
│  └─ Classification: INTERNAL (blocks external AI)
└─ HfEvent: "Technician missed inspection step due to fatigue"
   └─ Causal Status: REPORTED → VERIFIED (human-only promotion)

GOVERNANCE PLANE (Decisions)
├─ MaiRuleManifest: "Rule R-001: If fatigue theme 3+ times in 12 months AND training gap → flag"
├─ MaiSystemCondition: "Kernel flagged: fatigue pattern detected; suggested training"
├─ MaiCausalStatus: "QM verified: root cause is insufficient rest pre-shift; systemic scheduling issue"
└─ LearningInterventionAppropriatenessReview: "Competence gap: YES; Training reduces risk: YES; Primary control: YES"

LEARNING DESIGN PLANE (Content)
├─ LearningAtom-001: "Fatigue Fundamentals" (source spans → NCR text)
├─ LearningAtom-002: "Fatigue Case Study" (the NCR-0042 incident itself)
├─ LearningAtom-003: "Fatigue Questions" (3 knowledge questions)
└─ CurriculumManifest (frozen): {baseline_content: [A-001, A-002, A-003], output_hash: "abc123", frozen_at: "2026-08-08T10:00Z"}

DELIVERY & EFFECTIVENESS PLANE (Outcomes)
├─ TrainingAssignment: "John Doe assigned on 2026-08-08, due 2026-08-15"
├─ Learner completes → Assessment passed (85%)
├─ SupervisorObservation: "John recognized fatigue; took break; no errors on shift 2026-08-14"
├─ EffectivenessEvidence: WORKPLACE_TRANSFER level achieved
└─ LearningIntervention.closure_status = CLOSED (effectiveness target met)

RESULT: Defense Dossier export shows auditor the complete chain
└─ "Incident → Root cause (verified) → Appropriateness (reviewed) → Training (atoms + manifest) → Assignment (frozen) → Assessment (passed) → Observation (effective) → Closure (evidence-based)"
```

### Confidence Calibration (Why This Works)

| Aspect | Why Audit-Proof |
|--------|-----------------|
| **Evidence** | Never mutated; sourced from original document; hash-verified integrity. Classification enforced (BURRANA_PRIVATE blocked from AI). |
| **Governance** | Deterministic kernel (rules-only, no LLM, no randomness). Every decision traced to rule ID + revision. Causal-status promotion is human-only (audit trail shows who decided). |
| **Learning** | Atoms are versioned, approvable, immutable once APPROVED. Curriculum Compiler produces deterministic output (identical inputs → identical hash). Frozen manifest cannot be edited post-assignment. |
| **Delivery** | Frozen assignment → assessment score → supervisor observation → effectiveness evidence → closure. No backdoor edits. Audit trail complete. |
| **Traceability** | Evidence graph supports bidirectional queries. Defense Dossier traverses end-to-end. Auditor can reconstruct every decision. |

---

## Why This Architecture Meets the Directive's Requirements

### Directive §1: Problem Statement
> "Training is mandatory; auditors demand proof it's necessary, designed well, assigned fairly, and works."

**Solution:** Four-plane architecture makes each requirement machine-checkable and auditor-reviewable.

### Directive §2: Five Differentiators
1. **Regulatory Defense Dossier** ✅ — One-click export of complete audit chain (Defense Dossier service)
2. **Recurrent training from org's own occurrences** ✅ — First-time vs. Recurrent logic (Phase 2), event-sourced governance (Phase 1 proves foundation)
3. **Controlled Differential Training (explainable, frozen, reproducible)** ✅ — Curriculum Compiler (deterministic, frozen manifests)
4. **Continuous drift watch** ✅ — M-AI Kernel evaluates rules against evidence stream (Phase 1 seed, Phase 2 automation)
5. **Auditable AI** ✅ — AI Assist layer separate from kernel, all proposals traced to source spans, approval gated

### Directive §3-5: Architecture
> "Four planes; M-AI Kernel (no LLM) + AI Assist (pluggable); Learning Atoms; Curriculum Compiler; Policy Packs; frozen manifests."

**Solution:** SCHEMA-DELTA.md implements all 23 models; DESIGN-NOTES.md justifies each layer.

### Directive §8: Confidentiality
> "Burrana-private never leaves org; export-controlled data handled per ITAR/EAR."

**Solution:** EvidenceClassification table with BURRANA_PRIVATE enum; AI Assist service checks classification before sending (hard block). Test included in C-002 (Burrana-Block Test).

### Directive §14: Phase 1 Vertical Slice (Exit Criteria)
> "14 explicit criteria; sourced from §14 of prompt; comprehensive; verified in tests."

**Solution:** PHASE-1-SPECIFICATION.md §3 lists all 14, cross-referenced to directive §14.

### Directive §16: Honest Completion Matrix
> "Verified vs. Partial vs. Not Implemented; no fabrication."

**Solution:** C-014 (exit criterion) enforces honest reporting; each checkpoint documented with proof or caveat.

---

## What Exists Now vs. What Phase 1 Builds

### Existing (Weeks 1-2)
- Static LMS: learner dashboard, course/lesson viewing, assessments, certificates
- Admin system: enrollment management, CSV exports, email notifications, health monitoring
- Delivery plane only: assignments, completions, certificates, audit logging

### Phase 1 Will Add
- Evidence plane: ingestion, classification, quarantine, relationship graph
- Governance plane: kernel, system conditions, causal-status control, appropriateness review, approvals
- Learning Design plane: atoms (versioned, approvable), curriculum compiler (deterministic), policy pack framework
- Enhanced Delivery: frozen manifests, supervisor observations, effectiveness evidence, intervention closure
- Integration: Defense Dossier export, traceability traversal, end-to-end workflow

### Phase 2-15 (Deferred, Not Phase 1)
- Full feature set: all themes, all roles, all Policy Packs
- Advanced AI Assist: evaluation gate, multi-provider support, advanced grounding
- Recurrent training logic: baseline vs. recurrent divergence
- Training Burden Budget: max duration, max urgent/month, smart prioritization
- Role dashboards: executive, quality, manager, learner five-minute views
- Multi-tenant (online edition), offline sync (on-prem edition)
- Advanced analytics, advanced search, field observations, etc.

---

## How to Proceed

### Option 1: Approve & Implement Phase 1
If the architecture is solid and scope is acceptable:
- Approve DESIGN-NOTES.md, DECISIONS.md, SCHEMA-DELTA.md, PHASE-1-SPECIFICATION.md
- Begin Phase 1 implementation (est. 1-2 weeks)
- Execute test plan (14 checkpoints verified)
- Deliver Phase 1 sign-off with honest completion matrix

### Option 2: Refine Before Implementation
If changes needed:
- Identify which decisions need revision (e.g., "move causal-status to delivery plane" or "reconsider classification levels")
- Propose changes to DECISIONS.md or SCHEMA-DELTA.md
- Update implementation plan
- Proceed once approved

### Option 3: Adjust Phase 1 Scope
If Phase 1 is too narrow or too broad:
- Modify PHASE-1-SPECIFICATION.md §1 (scope)
- Re-derive affected exit criteria
- Update deliverables list
- Proceed once scope confirmed

---

## Confidence Level

**Architecture Design:** HIGH CONFIDENCE
- Rationale clearly documented (DESIGN-NOTES.md)
- Decisions justified with trade-offs (DECISIONS.md)
- Schema comprehensive and normalized (SCHEMA-DELTA.md)
- Planes are independent, coherent, audit-proof
- Confidentiality enforcement is explicit (classification + AI Assist blocking)
- Determinism is enforced (no randomness, static rules, frozen manifests)

**Phase 1 Scope:** HIGH CONFIDENCE
- Narrow but real (one incident → one intervention → one learner → closure)
- Proves all four planes in one workflow
- Exit criteria are specific and verifiable (C-001 to C-014)
- Feasible within 1-2 weeks development + 1 week testing
- Risk low (vertical slice proves hard parts early; Phase 2 is extension, not rework)

**Implementation Path:** HIGH CONFIDENCE
- No changes to existing models; backward-compatible (current LMS continues)
- Schema is additive (new tables, no legacy rewrites)
- Seed data provides working examples
- Test plan is concrete (manual + 14 checkpoints)

---

## Next Decision Point

**Question:** Should we proceed with Phase 1 implementation (beginning with schema migration and M-AI Kernel service), or would you like to refine architecture first?

**If proceed:** Implementation starts with:
1. Prisma migration (add 23 new models)
2. M-AI Kernel service (deterministic rules evaluator)
3. AI Assist service (pluggable LLM abstraction)
4. Curriculum Compiler service (deterministic manifest generation)
5. API endpoints (ingestion, atom design, compilation, assignment, observation, closure)
6. UI pages (evidence intake, atom design, assignment, observation)
7. Seed data (demo NCR, event, atoms, intervention)
8. Testing (14 checkpoints verified)

**If refine:** Specify which components or decisions need adjustment.

---

*Foundation design complete. Ready for implementation or refinement. All references traceable to HF-ENGINE-BUILD-PROMPT-v3.md.*
