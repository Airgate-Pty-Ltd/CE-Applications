# HF Continuous Learning Engine — Design Notes & Rationale

**Date:** 2026-08-05  
**Purpose:** Document the high-level architectural decisions and the "why" behind them.

---

## 1. Four-Plane Architecture (HF-ENGINE-BUILD-PROMPT-v3.md §3)

### Rationale
Regulatory organizations live in evidence chains: "prove you know X; show where it came from; show who approved it; show who trained on it; show if it worked." A monolithic "training" data model buries these distinctions. Four separate planes make evidence traceability machine-checkable and audit-proof.

**Evidence Plane**
- Holds HF-relevant occurrences, NCRs, audit findings, safety reports, regulatory changes, industry alerts — everything factual.
- Never contains training decisions; only facts and their provenance.
- Powers drift-watch ("what HF themes are rising?") and effectiveness tracking ("did this occur again?").
- Supports the Defense Dossier's evidence chain.

**Governance Plane**
- Deterministic M-AI Kernel (no LLM) + rule manifests + escalations + approval gates.
- Kernel answers: is this acceptable? Is it within authority? May it publish? Is recurrence overdue?
- One-way dependency: kernel imports evidence-plane summaries, never reaches back to mutate them.
- Non-negotiable design laws (MAI-ARCH-001): rules-before-models, no silent authority, fail-quiet, everything persists.

**Learning Design Plane**
- Learning Atoms (approvable, versionable, replaceable).
- Curriculum Compiler (deterministic: same inputs → identical package hash).
- Baseline vs. recurrent logic (first-timers get full baseline; later cycles assemble from retained core + org lessons + Policy Pack changes).
- All decisions approved, traced, and frozen before assignment.

**Delivery & Effectiveness Plane**
- Assignments, frozen manifests, assessments, completions, certificates, retraining.
- Level 1 (completion) through Level 4 (operational impact).
- Evidence of effectiveness (not completion); supervisor observations; effectiveness closure on evidence, not auto-pass.

### Why This Works
- Evidence never confuses with learning decisions.
- Kernel stays deterministic (no AI governance surprise).
- AI Assist is pluggable; system stays functional with no-AI fallback.
- Audit trail is clear: "prove it" export can reconstruct any decision.

---

## 2. M-AI Kernel vs. AI Assist (§5 of the directive)

### The Split (Hard Boundary)

**M-AI Kernel — Deterministic, Advisory-Only, No LLM**
- Rules-only processing. No network calls. No randomness.
- Reads evidence snapshots; evaluates against versioned rule manifests; surfaces System-Detected Conditions.
- Kernel owns assessment IDs (crypto.randomUUID), writable only to `mai_*` tables.
- Non-negotiable: no silent mutations; kernel failures disable itself, not the host app.
- Example: "rule fires when: same HF theme reported 3+ times in 12 months AND current training doesn't cover it AND no CA in progress."

**AI Assist Layer — Pluggable, Optional, Human-Approved**
- Optional. Never essential. Has a no-AI fallback (manual authoring).
- Proposes only: extraction, theme suggestion, scenario/question drafting, duplicate hints, audience suggestions.
- Every AI-drafted object stores exact source spans it derives from; approval UI shows draft beside source; no traceable source = no approved status.
- Confidential/Burrana/export-controlled data never reaches external AI providers (§8.1 classification enforcement).
- Pluggable: local model, org-hosted, commercial API, no-AI fallback — switching is configuration, not code changes.

### Rationale
- Auditors expect deterministic decisions for mandatory training. LLM-governed decisions cannot be replayed.
- Commercial AI APIs are geographically/legally restricted in regulated industries (aerospace, export control, data sovereignty).
- Separation preserves the product's core credibility: "AI helps humans; humans hold all authority."

---

## 3. Learning Atoms (§6.1)

### What They Are
Smallest independently controlled content unit: id, title, revision, objective, source links, target audience, applicability, prerequisite, duration, format, risk linkage, recurrence rule, effectiveness method, review date, approval status, replacement relationship, license/confidentiality.

### Why They Matter
- Courses are too coarse; questions are too fine. Atoms are the unit of traceability, versioning, and replacement.
- Existing AQ courses remain complete. During on-boarding, they are **decomposed into atoms**: Module 1 → Atom "Module 1: Overview"; Module 2 Quiz → Atom "Module 2: Assessment"; Scenario case → Atom "Scenario: Engine failure night shift."
- Replacement is atomic: "Atom A-456 superseded by A-489 (same objective, updated examples)." Old packages keep their atoms frozen; new packages use A-489. No silent content swaps.

### Implementation
- Table: `learning_atom` (id, title, revision, objective_id, source_evidence_ids[], applicability_tags[], status, effective_date, retired_date, replacement_atom_id, license_class, owner, approved_by, created_at, updated_at).
- Status enum: Draft, Under Review, Approved, Published, Superseded, Archived, Rejected, Emergency Interim, Reference Only.
- No atom may ship without Approved status and approval record.

---

## 4. Curriculum Compiler (§6.2)

### What It Does
Deterministic package generation. Inputs: baseline curriculum revision, learner (role, site, exposure, prior performance), Policy Packs, unresolved effectiveness, approved org lessons, recurrence rules, burden budget. Outputs: frozen manifest with every selection decision explained by rule id + revision.

### Determinism
- Same approved inputs + configuration = identical output hash.
- Reproducibility: generate the same package 2 years later with archived inputs; hash matches.
- Explainability: every selection decision answerable: "why was Atom A-456 omitted?" Answer from manifest: "burden budget limit reached, priority ranking: [rule-xyz-v3 placed this atom rank 8 of 12]; included atoms: [list with ranks]."

### Rationale
- Auditor asks: "are all learners in role X trained the same?" Answer: "yes, Compiler-v2.1 produced hash ABC for this role in this cycle; archived manifest proves it."
- Content recall: "atom A-489 is recalled; was it in any active packages?" Search by compiler output, not by runtime query.

### Implementation
- Service: `CurriculumCompiler` (static method: `compile(input) → FrozenManifest`).
- Manifest: id, curriculum_revision, compiler_version, ruleset_revision, policy_pack_revisions[], learner_attributes{}, candidates_included[], candidates_omitted_with_reasons[], baseline_content[], recurrent_content[], replacement_decisions[], question_selection_log, scoring_logic, source_traceability{}, approval_hash, output_hash, timestamp.

---

## 5. First-Time vs. Recurrent (§6.3)

### The Logic
- **First-time:** always full controlled baseline (the AQ courses, decomposed into atoms).
- **Recurrent:** baseline + newly approved org lessons + Policy Pack changes + org-specific content + role/site reinforcement + carry-forwards + org's occurrence-derived scenarios.

### Why This Is Core Differentiation (Differentiator #3)
- Generic systems train everyone the same every cycle.
- This system evolves: "your incident from last month is now a scenario in this cycle's training."
- Supervisor observes it working ("oh, that's exactly what happened on my shift").

### Implementation
- Enrollment carries `first_assignment_date` (never changes).
- Compiler input includes: `is_first_time: learner.enrolled_courses.contains(this_course) && learner.completions.filter(this_course).isEmpty()`.
- First-time path uses full baseline; recurrent path uses `curriculum.recurrence_manifests[cycle_index]`.

---

## 6. Frozen Manifests & Immutability (§8.5, §10)

### The Requirement
No historical learner evidence may be mutated. A completed assessment stays exactly as it was; a package stays exactly as it was assigned.

### Implementation
- Table: `training_package_manifest` (id, package_id, frozen_at, content_snapshot_json, compiler_output_json, output_hash, assignment_frozen_at, completions_frozen_at, all_locked_after).
- Trigger: any UPDATE attempt on a frozen row fails with "frozen_manifest_immutable_error."
- Archive: frozen manifests for retired packages remain queryable, supporting "audit trail for this learner in 2024."

### Rationale
Auditor: "show me exactly what this learner was assigned in Q2 2024." Answer: pull frozen manifest from archive; every word is guaranteed unchanged.

---

## 7. Evidence Relationship Model (§7.4)

### Graph Structure (Not Relational)
Relationships: source supports lesson, source contradicts source, event reveals risk, CA addresses event, lesson teaches control, role exposed to risk, package includes lesson, question verifies objective, effectiveness-activity evaluates intervention, new supersedes old.

### Why
- Reverse traceability: "which lessons link to fatigue?" (lesson ← effectiveness-activity ← intervention ← event ← evidence).
- Forward traceability: "which risks has fatigue-training addressed?" (evidence → event → intervention → lesson).
- Recall impact: "recall atom A-489; which active packages & which learners?" (evidence ← relationship ← package ← learner).

### Implementation
- Table: `evidence_relationship` (id, relationship_type, from_entity_type, from_entity_id, to_entity_type, to_entity_id, rationale, created_by, created_at, superseded_date).
- Enum relationship_type: supports, contradicts, reveals, addresses, teaches, exposed_to, includes, verifies, evaluates, supersedes.
- Indexes on (from_type, from_id) and (to_type, to_id) for bidirectional traversal.

---

## 8. Deployment Edition Config (§4, Mode 1 vs Mode 2)

### The Principle
One codebase. Config switch (`DEPLOYMENT_EDITION=online|onprem`) governs:
- Auth: LDAP/AD available in online; local-identity fallback in on-prem.
- Database: PostgreSQL online; SQLite fallback on-prem (not production, but sufficient for intranet).
- AI Assist: configurable provider online; local model or no-AI fallback on-prem.
- Source ingestion: watched folders (on-prem), API (online), or both.
- Network: online assumes internet; on-prem assumes none.
- Multi-tenant: online supports multiple orgs; on-prem is single-org.

### Rationale
- One test matrix, one deployment pipeline, one version history.
- Customers choose their edition at deploy time; code doesn't fork.

### Implementation
- `.env`: `DEPLOYMENT_EDITION`, `AI_PROVIDER`, `AI_MODEL`, `DATABASE_MODE`, `AUTH_MODE`.
- Startup validation: verifies mode consistency ("if DEPLOYMENT_EDITION=onprem, fail if DATABASE_MODE!=sqlite and AI_PROVIDER!=local").
- Schema is identical; tables present in both modes; optional features (AI Assist, online multi-tenancy) are no-op if not enabled.

---

## 9. Phase 1 Vertical Slice (§14)

### Scope (Deliberately Narrow)
- **One source:** NCR or lessons-learned incident (Markdown or PDF; manual upload, local-folder connector).
- **Themes:** communication, fatigue, procedural compliance, situational awareness, supervision.
- **Roles:** Learner, Supervisor, Quality Manager.
- **Intervention:** one Learning Atom + one occurrence-derived case study + three knowledge questions + one supervisor effectiveness observation.
- **Cycles:** baseline assignment + first recurrent assignment (to test first-time vs recurrent logic).

### Why This Scope
- Proves all four planes and the kernel in one integrated workflow.
- Small enough to test in days; large enough to be real.
- Hits the hardest parts early: evidence traceability, appropriateness review, frozen manifests, recurrence logic, effectiveness closure.

### Exit Criteria (From §14, Verified in Tests)
1. Source ingestion with hash, quarantine states, provenance.
2. Confidentiality/license classification enforced (BURRANA_PRIVATE test file blocked from AI + seeds).
3. AI proposal + no-AI fallback both work; draft shows source spans.
4. Causal-status control (human promotion only); Appropriateness Review recorded.
5. Kernel publication gate (unapproved content cannot publish).
6. Learning Atom created, approved, versioned.
7. Baseline vs recurrent divergence (first-time learner gets full baseline; recurrent learner's package differs, with compiler explanation).
8. Deterministic compilation (identical inputs → identical hash).
9. Learner completion → assessment scores → supervisor effectiveness observation → effectiveness closure on evidence.
10. Forward + reverse traceability rendering.
11. Content recall (recalled atom → exposed learners identified → corrected training → evidence preserved).
12. Defense Dossier export (minimal but complete chain).
13. No historical mutation (test attempts to alter frozen manifest; fails).
14. Honest verified-status reporting.

---

## 10. Decisions Recorded (DECISIONS.md counterpart)

| Decision | Rationale | Alternative Considered |
|----------|-----------|------------------------|
| Four-plane architecture | Auditors require evidence/governance/learning separation; monolithic model hides traceability | Single unified model; abandoned—audit trail becomes opaque |
| M-AI Kernel + AI Assist split | Determinism for mandatory training; confidentiality for regulated data; auditable AI | Blend into one; abandoned—loses auditability and violates export control |
| Learning Atoms as content unit | Granular versioning, replacement, and traceability; atomic content recall | Courses or questions; abandoned—too coarse or too fine |
| Curriculum Compiler | Reproducibility and explainability; captures every selection decision | Runtime dynamic generation; abandoned—auditor cannot verify consistent training |
| Frozen manifests | Historical immutability; "prove it" export; accurate audit trails | Mutable history; abandoned—auditor cannot trust retrospective records |
| Phase 1 vertical slice | Narrow scope proves core hard parts; extensible into full system | Monolithic Phase 1; abandoned—riskier, longer to verify |

---

*References: HF-ENGINE-BUILD-PROMPT-v3.md §1–6, §8–9, §14; HF-ENGINE-CONTENT-AND-BUILD-MAP.md §1, §4–5.*
