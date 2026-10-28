# Phase 1 Implementation Roadmap

**Date:** 2026-08-05  
**Status:** Foundation locked; Phase 1 implementation beginning  
**Deliverables:** 14 verified checkpoints; Defense Dossier export; end-to-end vertical slice

---

## What's Done (Foundation)

### Architecture Refinement (Approved)
✅ Four-plane architecture (Evidence, Governance, Learning, Delivery)  
✅ M-AI Kernel design laws (MAI-ARCH-001): rules-before-models, no silent authority, fail-quiet, everything persists  
✅ M-AI Kernel ÷ AI Assist split (deterministic governance vs. pluggable LLM)  
✅ Immutable snapshots (mai_event + SHA-256 for idempotency)  
✅ Three-option response gate (Confirm / Dismiss–incorrect / Dismiss–not applicable)  
✅ Assertion gating (UNSUPPORTED_ASSERTION, DISPUTED_CONCLUSION block training)  
✅ Tenant isolation (all mai_* models, query-level filtering)  
✅ Classification-gated AI Assist (BURRANA_PRIVATE blocks all; EXPORT_CONTROLLED/CUSTOMER_CONFIDENTIAL check config)  
✅ Seven license classifications (PUBLIC, INTERNAL, BURRANA_PRIVATE, EXPORT_CONTROLLED, CUSTOMER_CONFIDENTIAL, ANNEX_QUALITY_IP, SYSTEM_PROPRIETARY)

### Schema & Models
✅ Prisma schema updated: 25+ new models  
✅ All models include tenantId for isolation  
✅ All kernel models mapped to mai_* table names  
✅ MaiCausalStatus: @unique on eventId, causal-status gate on UNSUPPORTED_ASSERTION/DISPUTED_CONCLUSION  
✅ MaiSystemCondition: idempotency on (tenantId, snapshotHash, ruleId)  
✅ Evidence plane: HfEvidence, HfEvent, EvidenceClassification, EvidenceRelationship  
✅ Governance plane: MaiRuleManifest, MaiEvent, MaiErrorLog, MaiSystemCondition, MaiCausalStatus, MaiApproval  
✅ Learning plane: LearningAtom, LearningIntervention, PolicyPack, CurriculumManifest  
✅ Delivery plane: TrainingAssignment, SupervisorObservation, EffectivenessEvidence

### Services (Started)
✅ MaiKernel.ts: Deterministic rule evaluator (JSON operators, immutable snapshots, idempotency, fail-quiet)

---

## What Remains (Phase 1 Implementation)

### Services (To Build)
- [ ] **AiAssist.ts** — Classification gate, pluggable provider (local/org-hosted/fallback), no-AI fallback path
- [ ] **CurriculumCompiler.ts** — Deterministic manifest generation (same inputs → identical hash), frozen output, explainability
- [ ] **TraceabilityGraph.ts** — Forward/reverse relationship traversal, content recall queries
- [ ] **DefenseDossierBuilder.ts** — PDF export with evidence chain, approvals, assessment results, observations, closure status
- [ ] **EvidenceClassificationGate.ts** — Query-level enforcement (BURRANA_PRIVATE blocks AI, EXPORT_CONTROLLED checks config)

### API Endpoints (To Build)
Evidence Ingestion:
- [ ] `POST /api/evidence/upload` — File upload + quarantine pipeline (NEW, SCANNED, INTEGRITY_VERIFIED, CLASSIFIED, EXTRACTED, ACCEPTED)
- [ ] `GET /api/evidence/:id` — Retrieve evidence with classification
- [ ] `POST /api/events/:id/classify` — Classify evidence (uploader selects: PUBLIC/INTERNAL/BURRANA_PRIVATE/EXPORT_CONTROLLED/...)

Causal Investigation:
- [ ] `POST /api/events/:id/promote-causal-status` — Human-only promotion (REPORTED → SUSPECTED → VERIFIED)
- [ ] `POST /api/events/:id/assert-causality` — Record assertion support (supportedAssertion true/false)
- [ ] `GET /api/events/:id/causal-status` — Retrieve current status

Appropriateness Review:
- [ ] `POST /api/interventions/:id/appropriateness-review` — Record: competence gap, training reduces risk, alternatives ranked, primary/supporting, behavior change expected
- [ ] `GET /api/interventions/:id/appropriateness-review` — Retrieve review

Atom Design:
- [ ] `POST /api/atoms` — Create atom (status: DRAFT, requires approval before publish)
- [ ] `PUT /api/atoms/:id` — Edit atom (only if DRAFT)
- [ ] `POST /api/atoms/:id/approve` — Approve atom (status: APPROVED → PUBLISHED)
- [ ] `GET /api/atoms/:id` — Retrieve with source spans

Curriculum Compilation:
- [ ] `POST /api/curriculum/compile` — Deterministic compilation (input: learner attributes, atoms, policy packs → output: frozen manifest + hash)
- [ ] `GET /api/curriculum/compile/determinism-check` — Verify: identical inputs → identical hash

Assignment & Delivery:
- [ ] `POST /api/assignments` — Create assignment (freeze manifest at assignment time)
- [ ] `GET /api/assignments/:id` — Retrieve (learner sees frozen manifest)
- [ ] `POST /api/assignments/:id/complete` — Mark complete (triggers assessment if configured)

Supervisor Observations:
- [ ] `POST /api/observations` — Record observation (effectiveness level: COMPLETION/KNOWLEDGE_SKILL/WORKPLACE_TRANSFER/OPERATIONAL_IMPACT)
- [ ] `GET /api/observations?assignmentId=...` — List observations for assignment

Intervention Closure:
- [ ] `POST /api/interventions/:id/close` — Close if effectiveness_target_level met (automatic or manual)
- [ ] `GET /api/interventions/:id/status` — Retrieve closure status

Defense Dossier:
- [ ] `POST /api/dossier/:interventionId/export` — Generate PDF (incident → causal investigation → appropriateness → atoms → manifest → assignment → assessment → observation → closure)
- [ ] `GET /api/dossier/:interventionId/export` — Download PDF

Traceability:
- [ ] `GET /api/traceability/forward?entity=atom&id=...` — Forward: which risks does this atom address?
- [ ] `GET /api/traceability/reverse?entity=event&id=...` — Reverse: which atoms address this event?

Recall Impact:
- [ ] `POST /api/atoms/:id/recall` — Mark recalled (status: SUPERSEDED)
- [ ] `GET /api/atoms/:id/recall-impact` — Which active assignments include this atom? Which learners affected?

### UI Pages (To Build)
- [ ] `/evidence/upload` — File upload + quarantine status display
- [ ] `/evidence/:id` — Evidence detail, source spans, classification selection
- [ ] `/events/:id/causal-investigation` — Status progression (REPORTED → SUSPECTED → VERIFIED), assertion evidence
- [ ] `/interventions/:id/design` — Atom selection + case study + questions
- [ ] `/interventions/:id/appropriateness-review` — Competence gap, training justification, alternatives ranked
- [ ] `/curriculum/compile` — Learner selection + manifest generation + output hash proof
- [ ] `/assignments/:id` — Learner sees atoms + assessment + completion tracking
- [ ] `/observations/new` — Supervisor records observation (effectiveness level + evidence)
- [ ] `/interventions/:id/status` — Closure status + effectiveness evidence
- [ ] `/dossier/:interventionId` — Download Defense Dossier PDF

### Testing (To Execute)
- [ ] **C-001:** Source ingestion + quarantine states
- [ ] **C-002:** BURRANA_PRIVATE blocks AI (test file uploaded, verify rejection + audit log)
- [ ] **C-003:** AI proposal + no-AI fallback both work (atom design dual paths)
- [ ] **C-004:** Causal-status human-only promotion (no auto-promotion)
- [ ] **C-005:** DRAFT atom cannot compile; APPROVED atom can
- [ ] **C-006:** Atoms created, status progression, classification inherited
- [ ] **C-007:** First-time learner gets baseline; recurrent would differ (Phase 2)
- [ ] **C-008:** Deterministic compilation (recompile with same input → identical hash)
- [ ] **C-009:** End-to-end journey (learner → supervisor → closure)
- [ ] **C-010:** Forward + reverse traceability queries work
- [ ] **C-011:** Recall query finds affected learners; audit trail
- [ ] **C-012:** Defense Dossier export complete + reviewable
- [ ] **C-013:** Frozen manifest immutability (UPDATE fails)
- [ ] **C-014:** Honest status reporting (Verified/Partial/Not Implemented)

### Seed Data
- [ ] One NCR document (Markdown)
- [ ] One HfEvent extracted
- [ ] One MaiRuleManifest (Phase 1 rules, owner-supplied)
- [ ] 3-5 LearningAtoms (micro-lesson, case study, questions)
- [ ] One LearningIntervention (complete)
- [ ] One CurriculumManifest (frozen, hash proof)
- [ ] One demo learner + TrainingAssignment
- [ ] One SupervisorObservation (effectiveness evidence)
- [ ] One EffectivenessEvidence (closure proof)

---

## Implementation Sequence (Recommended)

### Week 1: Core Services + Ingestion
1. **Day 1-2:** AiAssist, CurriculumCompiler, TraceabilityGraph services
2. **Day 3:** API endpoints (evidence upload, classification, atom design)
3. **Day 4:** UI pages (evidence upload, atom design)
4. **Day 5:** Testing C-001, C-002, C-003, C-006

### Week 2: Investigation + Delivery
1. **Day 1:** API endpoints (causal status, appropriateness review)
2. **Day 2:** API endpoints (compilation, assignment, observation)
3. **Day 3:** UI pages (causal investigation, assignment, observation)
4. **Day 4-5:** Testing C-004, C-005, C-007, C-008, C-009

### Week 3: Traceability + Export
1. **Day 1-2:** API endpoints (traceability, recall)
2. **Day 3:** DefenseDossierBuilder service + export endpoint
3. **Day 4:** UI page (dossier download)
4. **Day 5:** Testing C-010, C-011, C-012, C-013, C-014 + sign-off

---

## Critical Path Items (Blockers)

**Must Have Before Any Testing:**
1. ✅ Prisma schema with all models (DONE)
2. ✅ MaiKernel service (DONE)
3. ⏳ AiAssist service with classification gate (NEXT)
4. ⏳ CurriculumCompiler (deterministic hash proof)
5. ⏳ Frozen manifest immutability (database trigger or ORM validation)

**Must Have Before C-001:**
1. ⏳ Evidence upload endpoint
2. ⏳ Quarantine pipeline (NEW → SCANNED → INTEGRITY_VERIFIED → CLASSIFIED → EXTRACTED → ACCEPTED)
3. ⏳ DocumentHash verification

**Must Have Before C-002:**
1. ⏳ EvidenceClassificationGate service
2. ⏳ AI Assist routing with BURRANA_PRIVATE block
3. ⏳ Audit log entry on AI rejection

**Must Have Before C-008:**
1. ✅ Deterministic rule evaluator (MaiKernel) (DONE)
2. ⏳ Curriculum Compiler with SHA-256 output hash
3. ⏳ Reproducibility test: compile twice → same hash

---

## Phase 1 Exit Criteria Mapping

| Checkpoint | Depends On | Est. Impl. Day |
|------------|-----------|----------------|
| C-001 | Evidence upload, quarantine, hash | Week 1 Day 3 |
| C-002 | ClassificationGate, AI Assist block | Week 1 Day 4 |
| C-003 | AI Assist + no-AI fallback paths | Week 1 Day 4 |
| C-004 | Causal-status API, human promotion | Week 2 Day 1 |
| C-005 | Atom status enum, compilation gate | Week 1 Day 5 |
| C-006 | Atom creation, approval, inherited classification | Week 1 Day 5 |
| C-007 | Compiler first-time logic (Phase 2 tests recurrent) | Week 2 Day 2 |
| C-008 | Deterministic compiler + hash verification | Week 2 Day 2 |
| C-009 | Full end-to-end journey (all prior checkpoints) | Week 2 Day 5 |
| C-010 | TraceabilityGraph service (forward/reverse) | Week 3 Day 1 |
| C-011 | Recall API + learner impact query | Week 3 Day 2 |
| C-012 | DefenseDossierBuilder + PDF export | Week 3 Day 3 |
| C-013 | Frozen manifest trigger + UPDATE block test | Week 2 Day 2 |
| C-014 | Honest status reporting in all tests | Ongoing |

---

## Honest About Scope

**What Phase 1 Delivers:**
- Complete evidence → intervention → assignment → observation → closure workflow
- Immutable audit trail (mai_event snapshots, hash chain)
- Deterministic kernel (rules-only, no randomness)
- Frozen manifests (no historical mutation)
- Effectiveness beyond completion (supervisor observations)
- Defense Dossier (one-click audit proof)

**What Phase 1 Does NOT Include:**
- Recurrent training logic (Phase 2)
- Multi-theme policy packs (Phase 1: single theme)
- Training Burden Budget enforcement (Phase 2)
- Advanced AI Assist (Phase 1: basic proposal; Phase 2: evaluation gate)
- Multi-tenant (on-prem only; Phase 2 adds online SaaS)
- Content recall full automation (Phase 1: query only; Phase 2: auto-remediation)

**Intentional Simplifications:**
- Phase 1 rule manifests are owner-supplied (owner defines operators)
- AI Assist uses single provider (Phase 2: pluggable switching)
- Supervisor observations are form-based (Phase 2: adds field observations)
- Dossier is PDF-only (Phase 2: adds HTML/web export)

---

## Next Immediate Steps

1. **Implement AiAssist.ts** (classification gate is core to C-002)
2. **Implement CurriculumCompiler.ts** (deterministic hash is core to C-008)
3. **Build evidence upload endpoint** (core to C-001)
4. **Add frozen manifest validation** (core to C-013)
5. **Run C-001, C-002 verification** (foundation confidence)

**Blockers:** None. Proceed.

---

*Phase 1 implementation begins immediately. Owner to supply Phase 1 rule manifests for MaiRuleManifest seed. All systems deterministic, immutable, audit-proof.*
