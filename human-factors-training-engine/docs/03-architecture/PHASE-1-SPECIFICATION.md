# Phase 1 Vertical Slice — Specification & Exit Criteria

**Date:** 2026-08-05  
**Scope:** One complete end-to-end workflow proving four-plane architecture, M-AI Kernel, curriculum compiler, frozen manifests, and effectiveness closure.  
**Duration Estimate:** 1-2 weeks (design documents + implementation + testing).  
**Entry Criteria:** All architectural design documents approved (DESIGN-NOTES.md, DECISIONS.md, SCHEMA-DELTA.md).

---

## 1. Phase 1 Scope (Deliberately Narrow)

### Sources
**Ingestion:** One NCR or lessons-learned incident (Markdown or PDF).  
**Format:** Manual upload (UI) or local-folder connector (watched directory).  
**Example:** "NCR-2026-0042: Fatigue-related error during night shift maintenance of EFX-7 power system."

### Themes (HF Categories)
**In-Scope (Pick 1-2 for Phase 1):**
- Communication (e.g., shift handover gaps)
- Fatigue (e.g., scheduling, workload)
- Procedural Compliance (e.g., checklist shortcuts)
- Situational Awareness (e.g., environmental distraction)
- Supervision (e.g., oversight gaps)

### Roles
**Limited to:**
- Learner (maintenance technician, inspector)
- Supervisor (shift lead, quality inspector)
- Quality Manager (admin, intervention designer, effectiveness reviewer)

**Not in Phase 1:** HR, executive dashboards, Burrana-specific roles, multi-org RBAC.

### Intervention (One Per Phase 1)
**Single learning intervention:**
- 1 micro-lesson (5-10 min) — main concept from the incident
- 1 case study / scenario (15-20 min) — the incident itself, worked through
- 3 knowledge questions (2 min each) — verify understanding
- 1 supervisor observation form — transfer evidence

**Total learner time:** ~40 minutes (baseline only; Phase 2 adds recurrent variants).

### Cycles
**First-time assignment:**
- Baseline package compiled and frozen.
- Assigned to one learner for testing.
- Learner completes → assessment → supervisor observes → effectiveness recorded.

**No recurrent cycles in Phase 1** (Phase 2 test first-time vs. recurrent logic; Phase 1 proves baseline + first observation).

---

## 2. Phase 1 Workflow (End-to-End)

```
1. SOURCE INGESTION
   ├─ QM uploads NCR-2026-0042 (PDF or Markdown)
   ├─ System scans for malware (if file) → quarantine pipeline
   ├─ Extract text → classify (PUBLIC/INTERNAL/BURRANA_PRIVATE)
   ├─ Hash for integrity verification
   ├─ Store in hf_evidence table
   └─ Move from DETECTED → INTEGRITY_VERIFIED → EXTRACTED → CLASSIFICATION_CONFIRMED

2. EVENT & CAUSAL REVIEW
   ├─ QM extracts event: "Night shift technician fatigue → missed inspection step"
   ├─ Record in hf_event: themes=["fatigue"], roles=["maintenance_technician"], status=REPORTED
   ├─ System (kernel) flags candidate root causes (if rule matches)
   ├─ QM promotes causal_status: SUSPECTED → UNDER_INVESTIGATION → VERIFIED
   └─ Record: "Verified cause: insufficient rest before 12-hour shift; existing training silent on fatigue"

3. APPROPRIATENESS REVIEW
   ├─ QM completes form:
   │  ├─ "Competence gap?" Yes — technician unaware of fatigue signs
   │  ├─ "Training reduces risk?" Yes — awareness + mitigation strategies
   │  ├─ "Engineering/process/tooling better?" Ranking: process (2=implement mandatory rest), training (1=primary)
   │  ├─ "Expected behavior?" Technician self-monitors; requests break if fatigued
   │  └─ "If ineffective?" Escalate to ops/scheduling redesign
   └─ System records appropriateness_review; unblocks intervention design

4. LEARNING ATOM CREATION
   ├─ QM (or AI Assist proposal + QM approval) designs atoms:
   │  ├─ Atom-001: "Fatigue Fundamentals" (micro-lesson, 8 min)
   │  │   Source: NCR evidence text spans → stored in sourceSpans for traceability
   │  │   Status: DRAFT → AI Assist proposes text → QM reviews source spans → APPROVED
   │  │
   │  ├─ Atom-002: "Night Shift Fatigue: The NCR-0042 Case Study" (scenario, 15 min)
   │  │   Shows incident → asks: "What went wrong?" → "What should you do?" → resolution
   │  │   Status: DRAFT → QM authors → APPROVED
   │  │
   │  └─ Atom-003: "Fatigue Self-Check Questions" (3 questions, 2 min)
   │      Q1: Describe 2 signs of fatigue. Q2: What mitigation strategies exist? Q3: When should you report fatigue?
   │      Status: DRAFT → AI Assist drafts → QM edits → APPROVED
   │
   ├─ All atoms inherit classification from source (INTERNAL; if source were BURRANA_PRIVATE, atoms too)
   ├─ All atoms linked via evidence_relationship: SUPPORTS → source evidence
   └─ Atoms freeze at APPROVED; cannot be edited; only replaced (old versioning is immutable)

5. CURRICULUM COMPILATION
   ├─ Compiler input:
   │  ├─ Baseline curriculum_revision: "HF-Phase-1-Vertical-Slice-v1"
   │  ├─ Learner attributes: role="maintenance_technician", site="Brisbane", first_time=true
   │  ├─ Approved atoms: [Atom-001, Atom-002, Atom-003]
   │  ├─ Policy Packs: none (Phase 1 has no mandatory regulatory packs; Phase 2 adds these)
   │  ├─ Burden budget: (not enforced Phase 1; all approved atoms included)
   │  └─ Recurrence rule: none (Phase 1 baseline only)
   │
   ├─ Compiler produces: FrozenManifest
   │  ├─ manifest_id: unique hash of compiled output
   │  ├─ baseline_content: [{Atom-001, duration: 8, order: 1}, {Atom-002, duration: 15, order: 2}, {Atom-003, duration: 2, order: 3}]
   │  ├─ output_hash: SHA-256 of serialized manifest (reproducibility proof)
   │  ├─ source_traceability: {Atom-001 → [NCR-source-span-1], Atom-002 → [NCR-source-span-2], ...}
   │  ├─ frozen_at: 2026-08-08 10:00:00Z
   │  └─ status: ACTIVE
   │
   └─ Manifest is now immutable; assignment references manifest_id, not mutable curriculum

6. ASSIGNMENT & DELIVERY
   ├─ QM creates training_assignment:
   │  ├─ learner_id: "john.doe" (demo learner)
   │  ├─ intervention_id: "INT-001-FATIGUE" (the one designed above)
   │  ├─ manifest_id: (hash from step 5)
   │  ├─ assigned_at: now
   │  ├─ due_date: 2026-08-15
   │  └─ status: ASSIGNED
   │
   ├─ Learner logs in → sees assignment in dashboard
   ├─ Learner completes atoms (Atom-001, Atom-002, Atom-003) in order
   ├─ After Atom-003: "Ready for Assessment" button appears
   └─ Learner takes assessment (3 questions) → submitted → scored (pass if >= 80%)

7. LEARNER COMPLETION & CERTIFICATE
   ├─ Learner passes assessment (e.g., 85%)
   ├─ System records:
   │  ├─ assignment.completed_at: now
   │  ├─ assignment.passed_at: now
   │  ├─ assignment.status: PASSED
   │  └─ Certificate generated (if configured)
   │
   ├─ Email notification sent to learner (proof of completion)
   └─ Audit log entry: {actor: "system", action: "assessment_passed", object: "TrainingAssignment", details: {score: 85, ...}}

8. SUPERVISOR EFFECTIVENESS OBSERVATION
   ├─ Supervisor (shift lead) observes learner on shift (e.g., 1 week after completion)
   ├─ Supervisor records supervisor_observation:
   │  ├─ assignment_id: (from step 6)
   │  ├─ effectiveness_level: WORKPLACE_TRANSFER (not just completion; actual behavior change)
   │  ├─ observation: "John recognized fatigue sign during 11-hour shift today; requested and took 20-min break. No errors during remainder of shift."
   │  ├─ date_observed: 2026-08-14
   │  └─ outcome: "effective"
   │
   └─ System records observation in effectiveness_evidence table

9. INTERVENTION CLOSURE
   ├─ System checks: does effectiveness_evidence.level >= intervention.effectiveness_target_level?
   │  (Phase 1 target: WORKPLACE_TRANSFER; supervisor observation shows transfer; ✓ YES)
   │
   ├─ If YES: update intervention.closure_status = CLOSED; closed_at = now
   ├─ Audit log: {actor: "system", action: "intervention_closed", object: "LearningIntervention", details: {reason: "effectiveness_target_level_met"}}
   │
   └─ Case marked complete; evidence preserved for audit trail

10. DEFENSE DOSSIER EXPORT
    ├─ Auditor (or QM for audit prep) clicks "Export Defense Dossier" for this intervention
    ├─ System generates PDF:
    │  ├─ Title: "Defense Dossier: Intervention INT-001-FATIGUE"
    │  ├─ Section 1: Incident Summary (NCR-0042 details, source document excerpt)
    │  ├─ Section 2: Causal Investigation (verified cause, why existing training insufficient)
    │  ├─ Section 3: Appropriateness Review (competence gap, training justification, alternatives ranked)
    │  ├─ Section 4: Learning Design (atoms listed, each with source evidence mapping)
    │  ├─ Section 5: Curriculum Manifest (frozen snapshot, all learners/roles trained identically)
    │  ├─ Section 6: Assignment Record (learner, due date, manifest_id, status)
    │  ├─ Section 7: Assessment Results (score, pass/fail)
    │  ├─ Section 8: Supervisor Observation (witness evidence of effectiveness)
    │  ├─ Section 9: Effectiveness Status (WORKPLACE_TRANSFER achieved; closure)
    │  ├─ Section 10: Audit Trail (hash chain of all approvals, decisions, evidence)
    │  └─ Signature/timestamp: frozen for historical accuracy
    │
    ├─ Auditor reviews: "Prove this training was necessary and effective."
    │  Answer: complete dossier, end-to-end, with source traceability and effectiveness evidence.
    └─ Case defensible; auditor satisfied.
```

---

## 3. Exit Criteria (14 Verified Checkpoints)

All criteria MUST be verified with running app (tests + manual), not code review alone.

### C-001: Source Ingestion & Quarantine
**Checkpoint:** Upload NCR document (PDF or Markdown). System:
- Scans for malware (if file type; dummy scanner for MVP)
- Extracts text
- Computes SHA-256 hash
- Classifies (uploader selects PUBLIC/INTERNAL/BURRANA_PRIVATE)
- Stores in hf_evidence table
- States visible in UI: NEW → INTEGRITY_VERIFIED → EXTRACTED → CLASSIFICATION_CONFIRMED → ACCEPTED

**Test:** Upload one NCR document; verify all states transition correctly; verify hash stored.

---

### C-002: Confidentiality Enforcement (Burrana-Block Test)
**Checkpoint:** Upload file marked BURRANA_PRIVATE. System:
- Tags it as BURRANA_PRIVATE in classification table
- Blocks AI Assist (external or internal) from reading it
- Shows: "This evidence is confidential; AI Assist unavailable. Manual authoring required."
- No data sent to any LLM
- Seed data includes test file marked BURRANA_PRIVATE to verify block

**Test:** Upload Burrana-marked file; attempt to trigger AI Assist; verify rejection & audit log entry.

---

### C-003: AI Proposal + No-AI Fallback (Both Paths Work)
**Checkpoint:** Atom design screen offers two paths:
1. AI Assist: "Generate atom text from source evidence" (if not BURRANA_PRIVATE)
   - Shows source spans inline
   - Drafts atom text
   - QM reviews & edits before approval
2. Manual: "Write atom yourself" (always available, no AI)
   - QM directly edits atom fields
   - No AI involvement

**Test:** Design one atom with AI assist (verify draft + source spans); design another manually (verify no AI call). Both paths produce approvable atoms.

---

### C-004: Causal-Status Control (Human-Only Promotion)
**Checkpoint:** HfEvent starts at REPORTED. Transitions:
- System can suggest: "Fatigue pattern detected; could be root cause" (advisory)
- QM manually promotes: REPORTED → SUSPECTED (with notes)
- QM later: SUSPECTED → UNDER_INVESTIGATION (with deadline for investigation)
- QM finally: UNDER_INVESTIGATION → VERIFIED (with root cause narrative)

**Test:** Event lifecycle; verify UI shows promotion workflow; verify no auto-promotion (human always decides).

---

### C-005: Kernel Publication Gate (Unapproved Content Cannot Publish)
**Checkpoint:** Learning Atom status enum has: DRAFT → UNDER_REVIEW → APPROVED → PUBLISHED. System:
- Atom in DRAFT or UNDER_REVIEW: cannot be included in curriculum manifest
- Atom in APPROVED: can be compiled into manifest
- Atom in PUBLISHED: actively assigned

**Test:** Try to compile manifest with DRAFT atom; system rejects. Approve atom → retry; compiles successfully.

---

### C-006: Learning Atom Creation & Approval
**Checkpoint:** Create 3 atoms:
1. Atom-001: "Fatigue Fundamentals" (status: APPROVED, classification: INTERNAL, objective: identify fatigue signs)
2. Atom-002: "Fatigue Case Study" (status: APPROVED, objective: apply awareness to scenario)
3. Atom-003: "Fatigue Questions" (status: APPROVED, objective: test knowledge)

All atoms:
- Have explicit APPROVED status
- Linked to source evidence via source_spans
- Inherited classification from evidence
- Have revision=1 (immutable; next version replaces via replacement_atom_id chain)

**Test:** Create atoms; verify status progression; verify classification inherited; verify they appear in curriculum compiler candidate list.

---

### C-007: Baseline vs. Recurrent Divergence Logic
**Checkpoint:** Curriculum Compiler takes `is_first_time` parameter:
- **First-time true:** compile full baseline_content (all approved atoms)
- **First-time false:** compile baseline_content + recurrent_content (Phase 2 test; Phase 1 uses baseline only)

For Phase 1 vertical slice: one learner, first-time assignment; manifest shows full baseline.

**Test:** Compile manifest for first-time learner; verify baseline_content array populated; verify recurrent_content empty or N/A.

---

### C-008: Deterministic Compilation (Identical Inputs → Identical Hash)
**Checkpoint:** Compiler is pure function: `compile(input) → (manifest, output_hash)`. 
- Identical inputs (curriculum_revision, atoms, learner attributes, rules) → identical output_hash
- Compile twice with same input → hashes match
- No randomness; no timestamp variation; deterministic

**Test:** Compile manifest twice with identical input; verify output_hash matches both times. This is reproducibility proof.

---

### C-009: Learner Completion → Assessment → Supervisor Observation → Effectiveness Closure
**Checkpoint:** Full user journey:
1. Learner assigned training_assignment (manifest_id set)
2. Learner completes all atoms in manifest
3. Learner takes assessment (3 questions, pass >= 80%)
4. Learner passes assessment (85%)
5. Supervisor records observation: "Learner exhibited transfer behavior during shift"
6. System records effectiveness_evidence at WORKPLACE_TRANSFER level
7. Intervention closure_status changes from OPEN → CLOSED (target level met)

**Test:** Complete end-to-end as learner + supervisor; verify each step recorded; verify closure automatic when effectiveness_evidence at target level.

---

### C-010: Forward + Reverse Traceability Rendering
**Checkpoint:** Traceability graph queries:
- **Forward:** "Which lessons address fatigue?" → evidence_relationship traverse: event → intervention → atoms
- **Reverse:** "What risks does this atom address?" → relationship traverse: atom ← intervention ← event

**Test:** UI or API query: "Show me lessons linked to fatigue theme" (forward); "Show me what caused this atom" (reverse). Both return correct results.

---

### C-011: Content Recall (Recalled Atom → Learners Identified → Corrected Training)
**Checkpoint:** Intervention is recalled (e.g., outdated example, error in content). System:
1. Mark atom as status=SUPERSEDED (old) → APPROVED (new replacement)
2. Query: "Which active training_assignments include old atom?" → finds learners
3. Generate corrected assignments with new atom
4. Notify learners: "Corrected training attached" (if Phase 2; Phase 1 just shows the query works)
5. Evidence preserved: old assignment frozen, recall entry audit-logged

**Test:** Mark Atom-001 as superseded; replace with Atom-001-v2; query system for "active assignments using Atom-001"; verify learner identified; verify audit trail.

---

### C-012: Defense Dossier Export (One Click, Complete Audit Chain)
**Checkpoint:** Click "Export Dossier" on intervention. System generates PDF:
- Title, incident summary, source evidence excerpt
- Causal investigation narrative (verified cause)
- Appropriateness review decision
- Atoms listed with source mapping
- Curriculum manifest (frozen, hash proof)
- Learner assignments
- Assessment results
- Supervisor observations
- Effectiveness status & closure
- Audit trail (action log with timestamps, hashes)

**Test:** Export dossier for Phase 1 intervention; verify PDF contains all sections; verify source spans are traceable; auditor can review end-to-end without additional documents.

---

### C-013: No Historical Mutation (Frozen Manifest Immutability Test)
**Checkpoint:** training_package_manifest table has trigger: UPDATE on frozen row → error "frozen_manifest_immutable_error". Test:
1. Create assignment with manifest_id
2. Learner completes; manifest status = ACTIVE, frozen_at set
3. Attempt to UPDATE manifest content → fails
4. Verify audit log shows attempt
5. Verify no data changed

**Test:** Try to update frozen manifest via SQL/API; catch error; verify data untouched; verify audit entry.

---

### C-014: Honest Verified-Status Reporting (No Fabrication)
**Checkpoint:** Exit criteria report (§16 of directive) lists each checkpoint:
- **Verified:** Ran app, confirmed behavior (screenshot or log proof)
- **Partial:** Works but with caveats (document caveats)
- **Not Implemented:** Deferred to Phase 2 (honest about scope)

No claims without proof; no "assumed working" statements.

**Test:** Complete implementation; document each checkpoint with evidence (screenshots, logs, test results); no exaggeration.

---

## 4. Test Plan

### Manual End-to-End (Full Journey)
1. QM uploads NCR → quarantine pipeline confirms ACCEPTED
2. QM extracts event → causal_status progresses to VERIFIED
3. QM completes appropriateness_review → unblocks atom design
4. QM (or AI assist + QM) designs 3 atoms → all reach APPROVED
5. Compiler generates manifest → output_hash reproducible
6. Assignment created → learner sees in dashboard
7. Learner completes atoms → assessment triggered → passes
8. Supervisor observes → effectiveness_evidence recorded → intervention closed
9. Defense Dossier exported → PDF complete & reviewable

### Verification Tests (per exit criteria)
- **C-001:** Upload, hash, state transitions
- **C-002:** BURRANA_PRIVATE blocks AI; audit log shows rejection
- **C-003:** AI path (draft + source spans) + manual path (no AI) both work
- **C-004:** Causal-status promotion requires QM decision; no auto-promotion
- **C-005:** DRAFT atom cannot compile; APPROVED atom can
- **C-006:** Atoms created with correct status, classification, revision
- **C-007:** First-time learner gets baseline; first_time=false would get recurrent (Phase 2)
- **C-008:** Recompile with same input → identical hash
- **C-009:** Full journey works; learner → supervisor → closure
- **C-010:** Forward query (event → atom) & reverse query (atom ← event)
- **C-011:** Recall query finds learners; audit logged
- **C-012:** Dossier export PDF generated; sections complete
- **C-013:** Attempt UPDATE frozen manifest → error; audit logged
- **C-014:** Report: Verified (with proof) vs. Partial (with caveats) vs. Not Implemented (honest)

### Performance Checks (Non-Blocking for Phase 1)
- Ingestion → classification: < 2 sec
- Compilation: < 1 sec
- Manifest query: < 500 ms
- Dossier export: < 10 sec

### Security Checks
- BURRANA_PRIVATE never sent to external AI
- Frozen manifest UPDATE fails
- Causal-status promotion audited
- Atom approval required before publication
- Assessment scores persisted correctly

---

## 5. Deliverables

### Code
- Prisma schema additions (SCHEMA-DELTA.md → `prisma/schema.prisma`)
- Database migration
- API endpoints (TBD, ~12-15 new routes)
- UI pages (TBD, ~4-5 new pages)
- M-AI Kernel service (deterministic rules evaluator)
- AI Assist service (pluggable LLM abstraction)
- Curriculum Compiler service (deterministic manifest generation)
- Traceability Graph service (forward/reverse queries)
- Defense Dossier export service

### Documentation
- PHASE-1-SPECIFICATION.md (this document)
- API docs (new endpoints)
- Database schema diagram
- Sequence diagram (workflow)
- Test report (14 checkpoints verified)

### Seed Data (for testing)
- 1 demo NCR document (Markdown)
- 1 demo HfEvent extracted
- 3 demo LearningAtoms approved
- 1 demo LearningIntervention
- 1 demo TrainingPackageManifest (frozen)
- 1 demo Learner assignment
- 1 demo AssessmentAttempt (passed)
- 1 demo SupervisorObservation
- 1 demo EffectivenessEvidence

---

## 6. Known Limitations (Documented, Not Bugs)

### Phase 1 Does NOT Include
- Multiple interventions (only one per Phase 1)
- Recurrent training logic (Phase 2)
- Full Policy Pack support (Phase 2)
- Training Burden Budget (Phase 2)
- Multi-tenant (on-prem only, Phase 1)
- Advanced AI Assist (basic proposal + source spans; Phase 2 adds evaluation gate)
- Role-based dashboards (Phase 2)
- Advanced analytics (Phase 2)

### Intentional Simplifications (MVP)
- AI Assist uses local model or single provider (Phase 2 adds provider-switching logic)
- Supervisor observations UI is form-based (Phase 2 adds field observations)
- Defense Dossier is PDF (Phase 2 adds HTML/web export)
- No advanced search/filtering (Phase 2)

---

## 7. Success Criteria Summary

| Criterion | Target | Status |
|-----------|--------|--------|
| All 14 exit checkpoints verified | ✅ PASS | TBD |
| Deterministic compilation (identical hash) | ✅ YES | TBD |
| BURRANA_PRIVATE blocks AI | ✅ YES | TBD |
| End-to-end journey works (upload → closure) | ✅ YES | TBD |
| Frozen manifest immutable | ✅ YES | TBD |
| Traceability forward & reverse | ✅ YES | TBD |
| Defense Dossier complete & exportable | ✅ YES | TBD |
| Zero security vulnerabilities | ✅ YES | TBD |
| TypeScript: 0 errors | ✅ YES | TBD |
| Honest status reporting (no fabrication) | ✅ YES | TBD |

---

## 8. Next Steps (After Phase 1 Approval)

1. **Review & Approve:** Stakeholders review DESIGN-NOTES.md, DECISIONS.md, SCHEMA-DELTA.md, PHASE-1-SPECIFICATION.md
2. **Implement Phase 1:** Build services, API, UI, seed data per spec (1-2 weeks)
3. **Test Phase 1:** Verify all 14 exit criteria (1 week)
4. **Phase 1 Sign-Off:** Honest report (Verified/Partial/Not Implemented)
5. **Phase 2 Planning:** Design Phase 2 (full feature set, recurrence, burden budget, multi-framework)

---

*References: HF-ENGINE-BUILD-PROMPT-v3.md §14 (exit criteria); DESIGN-NOTES.md (architecture); DECISIONS.md (decisions); SCHEMA-DELTA.md (data model); PHASE-1-SPECIFICATION.md (this document).*
