# PHASE 1 VERIFICATION REPORT v2 — Real Re-Verification

**Date:** 2026-08-06
**Status:** SUPERSEDES `PHASE-1-VERIFICATION-REPORT.md` in full. That file is left unedited on
disk as a record of what was claimed before correction — do not rely on it. Its C-001..C-014
were **redefined** as Prisma-model-existence checks, not the actual workflow criteria in
`PHASE-1-SPECIFICATION.md` §3. This report re-verifies the **original, authoritative** criteria.
**Evidence standard:** code review is never evidence. Every item below cites either pasted real
test output (file + test name, re-runnable via `npm test`) or a direct database read. Where real
evidence could not be produced, the item is marked **Partial** or **Not Implemented** — never
padded to Verified.

---

## How to reproduce every result in this report

```bash
cd HF-ENGINE
$env:DATABASE_URL="file:./dev.db"   # PowerShell; or DATABASE_URL=file:./dev.db on bash
npm test
npx tsc --noEmit
```
Current real output of both commands, captured 2026-08-06:
```
Test Suites: 16 passed, 16 total
Tests:       121 passed, 121 total
Time:        4.142 s
```
`npx tsc --noEmit` → no output (0 errors), strict mode on.

---

## C-001: Source Ingestion & Quarantine — **VERIFIED**

**Spec requirement:** upload triggers malware scan (dummy/MVP), text extraction, SHA-256 hash,
classification, and a visible state sequence NEW → INTEGRITY_VERIFIED → EXTRACTED →
CLASSIFICATION_CONFIRMED → ACCEPTED.

**What exists:** `src/services/EvidenceIngestion.ts` (built this pass — none of this pipeline
existed before; see DECISIONS.md D-016). No UI; executed via direct service call, which is the
real, only application code path for this behavior (there is no separate "UI logic" to
diverge from — the service IS the ingestion pipeline).

**Evidence — `EvidenceIngestion.test.ts`, 4/4 passing:**
- `C-001: full ingestion transitions through NEW -> INTEGRITY_VERIFIED -> EXTRACTED -> CLASSIFICATION_CONFIRMED -> ACCEPTED, hash stored` — all 5 states visited in order (asserted against `QUARANTINE_STATES` constant), SHA-256 hash matches an independent computation of the same content, persisted `quarantineStatus` reads back as `ACCEPTED`.
- `C-001: dummy malware scan rejects EICAR-marked content and halts ingestion before hashing` — content containing the EICAR test marker is rejected, final state is `REJECTED_MALWARE`, `documentHash` is `null` (never reached).
- `HFSRC-003 support: a second ingestion of byte-identical content is flagged as duplicateOfSourceId` — real duplicate-hash detection against the live DB.
- `C-002 support: HfEvidence.classification is persisted exactly as supplied` — BURRANA_PRIVATE evidence ingests successfully (gating happens downstream, see C-002).

**Limitation, documented not hidden:** the malware scan is a deterministic EICAR-marker check
per the spec's own instruction ("dummy scanner for MVP") — not a real antivirus engine.

---

## C-002: Confidentiality Enforcement (Burrana-Block Test) — **VERIFIED**

**Spec requirement:** BURRANA_PRIVATE evidence blocks AI Assist, no data sent to any LLM,
rejection is audit-logged.

**Evidence — `AiAssist.test.ts`, 5/5 passing:**
- `C-002: BURRANA_PRIVATE evidence is BLOCKED from AI Assist` — `canUseAi: false`, reason text
  specifically names BURRANA_PRIVATE (not a generic "no provider" message, proving the
  classification gate fires before any provider would even be consulted), `aiDraft` is
  `undefined`. A real `AuditLog` row is found afterward with `action: 'AI_ASSIST_REJECTED'` and
  details containing "BURRANA_PRIVATE".
- `C-002: isAiAvailable() reports false for BURRANA_PRIVATE regardless of provider state`.

**Bug found and fixed in the process (DECISIONS.md D-017):** the rejection audit log had
**never actually persisted**, ever — it wrote to `MaiErrorLog` with `eventId: ''`, a required
foreign key, which always threw and was silently swallowed. Fixed to log to `AuditLog`.

---

## C-003: AI Proposal + No-AI Fallback (Both Paths Work) — **VERIFIED**

**Spec requirement:** AI path shows source spans + drafts text for QM review; manual path is
always available with zero AI involvement; both produce approvable atoms.

**Evidence — `AiAssist.test.ts` + `Phase1Workflow.e2e.test.ts`:**
- No-AI fallback (no provider configured): `canUseAi: false`, reason names the missing
  provider, `sourceSpans` still populated for manual authoring.
- AI path (stub provider configured): `canUseAi: true`, `aiDraft` populated, source spans
  populated, a real `AuditLog` success entry persisted (`action: 'AI_ASSIST_ATOM_PROPOSAL'`).
- Manual path: an atom created directly via Prisma with zero AiAssist involvement reaches
  `APPROVED` via the same status-progression mechanism as the AI-assisted atom.
- `Phase1Workflow.e2e.test.ts` "Step 4" runs BOTH paths against the same real evidence record
  in the same test, producing two independently APPROVED atoms.

**Bug found and fixed (DECISIONS.md D-018):** `AiAssist` was reading `evidence.source` (a short
citation label, e.g. `"NCR-2026-0001"`, per `SCHEMA-DELTA.md`'s own field documentation) as the
document content for both the LLM prompt and source-span extraction. A real AI call would have
been given a 12-character citation string instead of the incident narrative, and span extraction
would always return zero spans. Fixed to prefer `evidence.description` (where
`EvidenceIngestion`'s EXTRACTED state actually writes the real text), falling back to `source`
only when `description` is empty. This was only caught because the e2e test used the real
ingestion pipeline instead of hand-constructing evidence with content in the wrong field.

---

## C-004: Causal-Status Control (Human-Only Promotion) — **VERIFIED**

**Spec requirement:** REPORTED → SUSPECTED → UNDER_INVESTIGATION → VERIFIED requires explicit
human decisions at each step; system may only advise, never auto-promote.

**What exists:** `src/services/CausalStatusService.ts` (built this pass; no promotion logic
existed anywhere before — see DECISIONS.md D-016).

**Evidence — `CausalStatusService.test.ts`, 4/4 passing:**
- `a freshly created event has NO causal-status row (default REPORTED, never auto-promoted)` —
  confirms no code path writes a status without an explicit call.
- `promotion requires a named human actor — rejects an empty promotedBy` — real rejection.
- `full human-driven promotion chain REPORTED -> SUSPECTED -> UNDER_INVESTIGATION -> VERIFIED,
  each step actor-attributed` — each promotion is a real Prisma write with `promotedBy` and
  `promotedAt` populated; final `verifiedRootCause` matches what was supplied.
- `an invalid transition (skipping straight from REPORTED to VERIFIED) is rejected` — real
  rejection with the specific transition named in the error.

Also exercised in `Phase1Workflow.e2e.test.ts` Step 2 against the real ingested evidence.

---

## C-005: Kernel Publication Gate (Unapproved Content Cannot Publish) — **VERIFIED**

**Spec requirement:** DRAFT/UNDER_REVIEW atoms cannot compile into a manifest; APPROVED atoms
can.

**Evidence — `CurriculumCompiler.test.ts` + `Phase1Workflow.e2e.test.ts`:**
- `compile() rejects atoms that are not APPROVED (C-005 enforcement point)` — a DRAFT atom
  passed to `compile()` throws `/not APPROVED/`; the atom is never included in any manifest.
- `Phase1Workflow.e2e.test.ts` Step 5 explicitly creates a DRAFT atom mid-workflow, attempts to
  compile it, confirms rejection, then compiles successfully with only the two APPROVED atoms.

---

## C-006: Learning Atom Creation & Approval — **PARTIAL**

**Spec requirement:** atoms created with explicit status progression, source-span linkage,
classification **inherited from evidence**, revision=1, immutable except via replacement chain.

**Verified parts — real evidence:**
- Status progression DRAFT → APPROVED with `approvedBy`/`approvedAt` populated: `AiAssist.test.ts`,
  `Phase1Workflow.e2e.test.ts` (both AI and manual paths).
- `revision` defaults to 1 (schema default, confirmed by every atom created in every test —
  none override it).
- Replacement chain (`replacementAtomId`/`replacedAtomId`) real and exercised for real: see
  C-011 below.

**Not verified — logged honestly (OPEN-QUESTIONS.md Q-002):** classification inheritance from
source evidence is **not automatic anywhere in the codebase**. Code search
(`grep -rn "classification.*evidence\|inherit" src/services`) found no code that copies
`HfEvidence.classification` onto a created `LearningAtom` — only `AiAssist.ts` *reads* it for
its own AI-routing gate. Every atom in every test in this report has its classification set
*explicitly* by the calling code, not inherited. This is a real governance gap: nothing
currently prevents an atom derived from BURRANA_PRIVATE evidence from being left at a less
restrictive classification if the author forgets to set it. Recommendation logged in
OPEN-QUESTIONS.md Q-002; not fixed in this pass (would require a design decision — auto-inherit
vs. validate-and-flag — that belongs to the owner, not an autonomous default).

---

## C-007: Baseline vs. Recurrent Divergence Logic — **VERIFIED**

**Spec requirement:** `first_time=true` compiles full baseline; Phase 1 uses baseline only,
`recurrent_content` empty/N/A.

**Evidence — `CurriculumCompiler.test.ts` + `Phase1Workflow.e2e.test.ts`:**
- `manifest.recurrent_content` is asserted `[]` (`toEqual([])`) in the e2e test's Step 5, after
  a real `compile()` call with `first_time: true`.
- `manifest.baseline_content` populated with both real approved atoms, correctly ordered.

---

## C-008: Deterministic Compilation (Identical Inputs → Identical Hash) — **VERIFIED**

**Spec requirement:** `compile(input)` is pure; identical inputs produce identical
`output_hash` across separate calls; no randomness, no timestamp variation.

**Evidence — `CurriculumCompiler.test.ts` (3 tests) + `Phase1Workflow.e2e.test.ts`:**
- `C-008: identical inputs produce identical output_hash across two independent compile() calls`
  — real SHA-256 hex string, matches across two separate `compile()` invocations, including
  `compiled_at` (deterministic timestamp derivation, not wall-clock).
- `verifyReproducibility() returns true for identical input`.
- `different learnerAttributes produce a different output_hash` — proves the hash is actually
  sensitive to content, not just deterministic-but-empty.
- `Phase1Workflow.e2e.test.ts`'s final test recompiles the exact Step-5 input independently and
  confirms the hash matches the one persisted to the database in Step 5.

**Bug found and fixed (DECISIONS.md D-013):** `computeManifestHash()` used
`JSON.stringify(canonical, Object.keys(canonical).sort())` — the array form of `JSON.stringify`'s
second argument is a **recursive key-allowlist filter** applied at every nesting level, not a
sort. Every nested field (`atomId`, `learnerId`, `role`, `site`, ...) was silently excluded from
the string that got hashed. Two manifests compiled for two *different* learners with two
*different* atom sets hashed **identically** — this is exactly what "different learnerAttributes
produce a different output_hash" caught on first run. The hash was deterministic in the trivial
sense (same call twice → same output) but was never actually a function of the manifest's real
content. This directly undermines what C-008 exists to prove, and was silently broken in the
originally-shipped Task 0 work. Fixed with a proper recursive `sortKeysDeep()`.

---

## C-009: Learner Completion → Assessment → Supervisor Observation → Effectiveness Closure — **PARTIAL**

**Spec requirement:** full journey — assignment, atom completion, assessment pass, supervisor
observation, effectiveness evidence at target level, **automatic** closure when target level met.

**Verified parts — real evidence, `Phase1Workflow.e2e.test.ts` + `InterventionClosureService.test.ts`:**
- Assignment creation, referencing a real frozen manifest: real.
- Assignment status transition ASSIGNED → PASSED (`completedAt`/`passedAt` populated): real.
- Supervisor observation recorded at WORKPLACE_TRANSFER level: real.
- `EffectivenessEvidence` recorded with `supportsClosureAtLevel: true`: real.
- **Automatic closure** — `InterventionClosureService.checkAndClose()`:
  - `does NOT close when only COMPLETION-level evidence exists but target is WORKPLACE_TRANSFER`
  - `closes automatically once evidence at the target level is recorded, and audit-logs the closure`
  - `re-running checkAndClose() on an already-closed intervention is a no-op (idempotent)`
  All three real, against real intervention/evidence rows. The e2e test's Step 5 exercises the
  full chain and confirms `closureStatus: 'CLOSED'`.

**Not verified — logged honestly (OPEN-QUESTIONS.md Q-004):** the spec's "learner completes
atoms (Atom-001, Atom-002, Atom-003) in order... 'Ready for Assessment' button appears" describes
per-atom completion tracking and gating. **No such table or service exists** — the schema has
`LessonCompletion` for the legacy Course/Lesson model, but nothing analogous for `LearningAtom`.
The e2e test uses the assignment-level status transition as the closest real, testable proxy,
which is honest about what it does and does not prove. `InterventionClosureService` (the
automatic-closure logic itself, arguably the most safety-critical part of C-009) did not exist
at all before this pass and was built specifically to produce real evidence for this criterion
(DECISIONS.md D-016).

---

## C-010: Forward + Reverse Traceability Rendering — **VERIFIED**

**Evidence — `TraceabilityGraph.test.ts`:**
- `C-010 forward: findAtomsForEvent() traverses Event -> Intervention -> Atom` — real graph
  built (evidence → event → intervention → atom, wired via `EvidenceRelationship` rows),
  forward query returns exactly the linked atom.
- `C-010 reverse: findEventsForAtom() traverses Atom <- Intervention <- Event` — same graph,
  reverse query returns exactly the linked event, themes correctly deserialized.
- `findAtomsForEvent() returns [] for an event with no linked interventions` — negative case,
  confirms no false positives.
- Also exercised end-to-end in `Phase1Workflow.e2e.test.ts` Step 4b against the real workflow
  graph (both atoms found via one forward query).

---

## C-011: Content Recall — **VERIFIED**

**Spec requirement:** mark old atom SUPERSEDED, replacement APPROVED, query identifies affected
learners, evidence preserved, recall audit-logged.

**Evidence — `ContentSupersessionService.test.ts` + `TraceabilityGraph.test.ts`:**
- `supersede() identifies the affected learner BEFORE marking old atom superseded` — real query
  against a real assignment/manifest, executed before any mutation.
- `supersession chain: old atom is SUPERSEDED with forward link, new atom is APPROVED with
  backward link — old content never deleted` — both rows independently re-fetched and checked.
- `disposition record: the recall is audit-logged with the affected learner list, and the
  original assignment record is unchanged` — real `AuditLog` row with the affected-assignment-id
  list; original assignment status confirmed untouched.
- `TraceabilityGraph.test.ts`'s `findLearnersWithAtom()` tests (positive match + negative
  unreferenced-atom case) independently cover the underlying query.

**Bug found and fixed (DECISIONS.md D-015):** `findLearnersWithAtom()` was previously an
unconditional `return []` stub, with a comment falsely claiming the required schema
(`TrainingPackageManifest`) "doesn't exist" — it does. This directly blocked C-011 entirely;
no recall query could ever have returned a result. Implemented the real query (active
assignments → manifest → parse `baselineContent` JSON → match `atomId`), then built
`ContentSupersessionService` on top of it to produce the full, real recall workflow.

---

## C-012: Defense Dossier Export — **NOT IMPLEMENTED**

**Status: honestly not built.** `_prototypes/DefenseDossierBuilder.ts` exists as an unverified
prototype (parked in an earlier session, D-011) — it compiles, produces a JSON structure, has
never been executed against real data, and produces no PDF.

**Scope conflict, logged not silently resolved (OPEN-QUESTIONS.md Q-001):**
`PHASE-1-SPECIFICATION.md` lists C-012 as an exit criterion; `AUTONOMOUS-RUN-DIRECTIVE.md` §1
explicitly lists "Defense Dossier build-out" as **out of scope for this run**. The directive's
own precedence rule would technically rank the specification above the directive, but the
directive's exclusion reads as a deliberate scope decision, not an oversight, and building a
real PDF-export subsystem is disproportionate to the remaining scope of a re-verification pass.
Recommendation: owner decides whether to schedule a dedicated pass for this, or formally narrow
PHASE-1-SPECIFICATION.md's exit criteria to match. Not fabricated as Verified or Partial.

---

## C-013: No Historical Mutation (Frozen Manifest Immutability Test) — **VERIFIED, with one documented limitation and one documented scope gap**

**Spec requirement:** a DB-level trigger blocks UPDATE on a frozen manifest row; attempt is
caught, data proven unchanged, attempt is audit-logged.

**What exists:** a real SQLite trigger (`prisma/manual-sql/frozen_manifest_trigger.sql`),
applied directly to the dev database, plus `ManifestGuard.ts` wrapping attempted mutations.

**Evidence — `ManifestGuard.test.ts`, 4/4 passing:**
- `an attempted UPDATE on a frozen (ACTIVE) manifest is rejected by the real DB trigger` — the
  Prisma call genuinely throws.
- `the manifest content is provably UNCHANGED after the rejected attempt` — re-fetched from the
  DB, `curriculumRevision` still reads the original value, not the attempted `'TAMPERED'`.
- `the rejected attempt is logged to AuditLog` — real row, `blocked: true`,
  `integrityFailure` absent (proving the "did the trigger actually fire" self-check passed).
- A negative-control case documents, rather than hides, the trigger's exact scope (see below).

**Limitation #1, documented not hidden:** Prisma's SQLite connector maps the trigger's
`RAISE(ABORT, 'frozen_manifest_immutable_error')` to a generic `P2003` "foreign key constraint
violated" error and does **not** surface the custom message text. Verified directly: the block
itself is real (the row is provably unchanged), but the literal string
`frozen_manifest_immutable_error` from the spec does not appear anywhere in the Prisma client
error object — confirmed with a direct `err.code`/`err.meta` inspection (`P2003`,
`{modelName: 'TrainingPackageManifest', field_name: 'foreign key'}`). This is a driver-level
limitation, not an application bug; it would very likely differ on PostgreSQL (the original
target datasource before the SQLite fallback, D-001), where `RAISE EXCEPTION` messages typically
do surface through Prisma's error object.

**Limitation #2, documented not hidden (OPEN-QUESTIONS.md Q-003):** the trigger condition is
`WHEN OLD.status = 'ACTIVE'` — a manifest with `status = 'SUPERSEDED'` is **not** protected.
`ManifestGuard.test.ts`'s negative-control test demonstrates this directly (an UPDATE on a
SUPERSEDED manifest succeeds). Historically-superseded manifests are still learner evidence and
arguably deserve the same protection. Not changed in this pass without explicit owner sign-off,
per the directive's caution against touching governance-relevant DB objects unilaterally.

---

## C-014: Honest Verified-Status Reporting (No Fabrication) — **this report is the evidence**

This report itself is the artifact C-014 requires: every Verified claim above cites a specific,
re-runnable test and its real output; every gap is marked Partial or Not Implemented with the
specific reason, not smoothed over. Nine real production defects were found and are individually
documented in DECISIONS.md (D-012 through D-020) — including in code that a prior pass had
already claimed was "production-ready." The previous `PHASE-1-VERIFICATION-REPORT.md` is the
counter-example this criterion exists to prevent: it substituted "does the Prisma model exist"
for "does the workflow the model is supposed to support actually happen," and used no
first-person hedging language to distinguish the two. This report does not repeat that.

---

## Summary Table

| ID | Status | Evidence |
|---|---|---|
| C-001 | ✅ Verified | `EvidenceIngestion.test.ts` 4/4 |
| C-002 | ✅ Verified | `AiAssist.test.ts` (block + audit log) |
| C-003 | ✅ Verified | `AiAssist.test.ts` + e2e Step 4 (both paths) |
| C-004 | ✅ Verified | `CausalStatusService.test.ts` 4/4 |
| C-005 | ✅ Verified | `CurriculumCompiler.test.ts` + e2e Step 5 |
| C-006 | 🟡 Partial | Status/approval real; classification inheritance not automatic (Q-002) |
| C-007 | ✅ Verified | `CurriculumCompiler.test.ts` + e2e Step 5 |
| C-008 | ✅ Verified | `CurriculumCompiler.test.ts` 3 tests + e2e (hash bug found & fixed) |
| C-009 | 🟡 Partial | Assignment/observation/auto-closure real; no per-atom completion table (Q-004) |
| C-010 | ✅ Verified | `TraceabilityGraph.test.ts` + e2e Step 4b |
| C-011 | ✅ Verified | `ContentSupersessionService.test.ts` (recall-stub bug found & fixed) |
| C-012 | 🔴 Not Implemented | Scope conflict logged (Q-001); prototype unverified |
| C-013 | ✅ Verified* | `ManifestGuard.test.ts` 4/4; *2 documented limitations (driver error text, SUPERSEDED scope) |
| C-014 | ✅ This report | 9 real defects found & fixed, documented individually |

**9 Verified, 2 Partial, 1 Not Implemented, 1 self-referential (C-014) — 0 fabricated.**

---

## Files changed this pass

New: `src/services/EvidenceIngestion.ts`, `CausalStatusService.ts`,
`InterventionClosureService.ts`, `ManifestGuard.ts`, `ContentSupersessionService.ts`,
`prisma/manual-sql/frozen_manifest_trigger.sql`, 10 new test files under
`src/services/__tests__/`.
Modified (bug fixes): `MaiKernel.ts`, `CurriculumCompiler.ts`, `EmergencyContentManager.ts`,
`TraceabilityGraph.ts`, `AiAssist.ts`, `KernelSelfAudit.ts`, `HonestDashboardBuilder.ts`.
Full rationale for every change: `DECISIONS.md` D-012 through D-021.

**Migration status:** no schema migration this pass (all new services use the existing SQLite
schema from the prior session); one manual SQL trigger applied via `npx prisma db execute`
(not part of the normal migration flow — see DECISIONS.md D-016 for how to reapply it if the
dev database is ever reset).

**Open risks:** see OPEN-QUESTIONS.md Q-001 through Q-004.

**Acceptance recommendation:** the vertical slice's core deterministic/governance logic
(kernel evaluation, compilation, immutability, traceability, recall) is real and verified. C-006
and C-009 have real partial coverage with specific, named gaps — not silently assumed complete.
C-012 is honestly not built, with the scope conflict that caused that decision documented for
owner review. Recommend: owner reviews Q-001..Q-004, decides on C-012 scope and the two logged
governance gaps (classification inheritance, SUPERSEDED-manifest trigger scope), before treating
this vertical slice as ready for anything beyond further internal iteration.
