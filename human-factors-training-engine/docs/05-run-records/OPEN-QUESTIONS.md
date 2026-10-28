# Open Questions & Blocking Issues — Integration & Verification Run

**Run Date:** 2026-08-06  
**Status:** Integration run in progress, blockers identified  

---

## Critical Blockers

### B-001: Database Environment Setup
**Status:** 🔴 BLOCKING  
**Issue:** .env.local specifies SQLite but schema.prisma originally specified PostgreSQL. Schema contains @db.Text/@db.Json annotations that only work with PostgreSQL.

**Current State:**
- .env.local: `DATABASE_URL="file:./prisma/dev.db"` (SQLite)
- prisma/schema.prisma: `provider = "postgresql"` with 67+ type annotations
- No PostgreSQL instance available in dev environment

**Decision Required:**
1. **Option A**: Set up PostgreSQL server locally; revert to PostgreSQL in schema
2. **Option B**: Clean all @db.* annotations; use SQLite for dev/test
3. **Option C**: Use Docker PostgreSQL for test environment

**Recommendation:** Option A (PostgreSQL) aligns with production intent, but requires local Postgres setup. Option B fastest for dev iteration.

**Action:** Awaiting decision before proceeding with migrations.

---

### B-002: Jest Configuration for npm test
**Status:** 🟡 PARTIAL  
**Issue:** `npm test` currently fails with 0 tests executed. Jest configuration needs TypeScript support.

**Current State:**
- registry-validation test exists but written for Jest/TypeScript (fails to parse)
- Jest config likely missing ts-jest transformer
- 42 test cases (3 per rule × 14 rules) need implementation

**Required:**
- Restore TypeScript strict mode (IN PROGRESS)
- Add ts-jest to jest.config.js
- Convert validate-kernel-rules.js to Jest suite
- Implement per-rule test cases

**Action:** Proceed once database is available.

---

### B-003: Type Errors with Strict TypeScript
**Status:** 🟡 PARTIAL  
**Issue:** Restored strict mode; multiple type errors in existing code (enrollment.dueDate nullable, learner fields, etc.)

**Count:** ~39+ type errors across routes, tests, and services

**Approach:** Batch-fix null safety violations and type annotations

**Action:** Proceed in parallel with database setup.

---

## Design Decisions Requiring Clarification

### D-001: Emergency Content Expiration — Fixed or Configurable?
**Issue:** Phase 2 spec says "mandatory auto-expiration" with fixed 30-day duration. Directive says "determine if configurable or justify fixed."

**Current Implementation:** Fixed 30 days (this.EMERGENCY_DURATION_DAYS = 30)

**Question:** Should this be:
1. **Fixed per directive (current)**: 30 days hardcoded, cannot be changed
2. **Configurable per tenant**: Tenant-specific expiration window (more flexible)
3. **Configurable per item**: Each emergency content sets its own expiration (violates immutability principle)

**Rationale for Fixed:** Prevents weak emergency-content governance (no infinite renewals)

**Decision Needed:** Before finalizing Phase 2 verification

---

### D-002: Schema Mismatch Resolution  
**Issue:** SCHEMA-DELTA.md specified HfEvidence model with fields (extractedText, integrityHash, contentType) but actual schema has different fields (source, sourceType, classification)

**Resolution:** AiAssist.ts and other services adapted to use actual schema fields (source instead of extractedText). No changes to SCHEMA-DELTA.md; working with existing schema.

**Status:** Resolved via adapter pattern

---

## Deferred Items (Explicitly Out of Scope)

### X-001: DefenseDossierBuilder PDF Export
**Status:** 🟡 PROTOTYPE  
**Reason:** PDF generation (Phase 3) not in Phase 2 scope. JSON export implemented and works; PDF generation deferred.

**Current State:** 
- Builds 10-section audit chain (JSON)
- PDF export not implemented (Phase 3 work)
- Not included in verification requirements

**Action:** Retain as working prototype; do not extend. PDF belongs in Phase 3.

---

### X-002: UI Pages
**Status:** 🔴 NOT STARTED  
**Reason:** Minimal UI required only for C-001..C-014 verification. Full UI design Phase 3+.

**Approach:** Build minimal API-driven UI for testing:
- Evidence upload form
- Event/causal-status editor
- Atom designer (text + AI proposal)
- Manifest compiler trigger
- Assignment viewer
- Observation recorder

**Action:** Proceed after database is functional.

---

### X-003: Content Versioning Supersession Chain
**Status:** ✅ DESIGNED  
**Implemented:** replacesAtomId field, SUPERSEDED status, disposal records

**Note:** Not fully tested pending database.

---

## Recommendations for Owner

1. **Database Priority:** Decide SQLite vs PostgreSQL for integration testing. PostgreSQL strongly preferred (aligns with production).
2. **TypeScript Cleanup:** Fix type errors systematically before tests can pass.
3. **Test Framework:** Get jest configured + registry validation working as baseline.
4. **Emergency Expiry Clarification:** Confirm 30-day fixed is acceptable, or provide preferred window.
5. **Execution Evidence:** All verification must include terminal/API/DB output; code review insufficient.

---

## Session Checkpoint: 2026-08-06 ~04:00

### Progress Made
✅ Database: SQLite created, schema valid, 23 Phase 1 models instantiated  
✅ Seed Data: 8 vertical slice records loaded successfully  
✅ Schema: Rebuilt from SCHEMA-DELTA.md, SQLite-adapted  
✅ Decisions: 10 decisions logged in DECISIONS.md  
✅ TypeScript Fixes: 12 files updated with JSON.stringify, 1 null-check fix  

### Currently Blocked
❌ Build fails: 13 TypeScript errors remain despite strict: false  
❌ Tests won't run: Jest/Babel cannot parse TypeScript (config issue)  
❌ Execution verification: Cannot run Task 0, API checks, or generate C-001..C-014 evidence  

### Owner Decision Required
1. **Remediate TypeScript/Build:**  
   - Fix field type mismatches (responses: any[] → string, etc.)
   - Review 20+ files for schema/code alignment
   - Restore strict: true once errors clear

2. **Alternatively, Refactor Schema:**  
   - Review which fields truly need JSON serialization
   - Decide array storage strategy (JSON string vs native array)
   - Regenerate migration if schema changes

3. **Or Defer to Follow-up Session:**  
   - Assign TypeScript/build fixes as isolated work
   - Resume integration verification once build passes

---

**Next Checkpoint:** Owner decision on remediation path; infrastructure foundation ready for execution verification once build passes.

---

## Session Checkpoint: 2026-08-06 — Real Re-Verification Pass

### Q-001: C-012 Defense Dossier — scope conflict between authority documents

**Conflict:** `PHASE-1-SPECIFICATION.md` §3 lists C-012 (Defense Dossier PDF export, one-click,
complete audit chain) as one of the 14 exit criteria. `AUTONOMOUS-RUN-DIRECTIVE.md` §1
explicitly lists "Defense Dossier build-out" under "Explicitly out of scope for this run."
Per the directive's own precedence rule (§0: "Authority documents (precedence order):
HF-ENGINE-BUILD-PROMPT-v3.md → HF-ENGINE-PHASE1-KERNEL-RULES-Rev-A.md →
PHASE-1-SPECIFICATION.md → this directive. Conflicts resolve upward"), PHASE-1-SPECIFICATION.md
outranks the directive, which would mean C-012 IS in scope. But the directive's explicit
exclusion reads as a deliberate, considered scope decision, not an oversight.

**What exists:** `_prototypes/DefenseDossierBuilder.ts` — parked as an unverified prototype
(D-011) during the earlier build-remediation pass. It compiles but has not been executed against
real data, produces no PDF (only a JSON structure), and was excluded from `tsconfig.json`.

**Recommendation:** Treat C-012 as Not Implemented for this verification pass. Building a real
PDF-export subsystem (templating, section assembly, hash-chain rendering) is disproportionate
to the remaining scope of a re-verification pass and was explicitly deferred once already.
Owner should confirm: build C-012 for real in a dedicated pass, or formally amend
PHASE-1-SPECIFICATION.md's exit criteria to match the directive's exclusion.

---

### Q-002: C-006 classification inheritance is not automatic anywhere in the codebase

PHASE-1-SPECIFICATION.md C-006 requires atoms to have classification "inherited from evidence."
Code search (`grep -rn "classification.*evidence\|inherit" src/services`) found no code that
copies `HfEvidence.classification` onto a `LearningAtom` at creation time — only `AiAssist.ts`
*reads* the evidence's classification for its own AI-routing gate. In practice, whoever creates
the atom (human or the AiAssist proposal flow) must set `classification` explicitly; nothing
enforces it matches the source evidence. `Phase1Workflow.e2e.test.ts` demonstrates and documents
this: the test manually sets `classification: 'INTERNAL'` on both atoms rather than relying on
any inheritance mechanism.

**Impact:** Low in the current seed/test scenario (evidence and atoms are both manually set to
INTERNAL, so nothing is visibly wrong) but this is a real governance gap — a BURRANA_PRIVATE
evidence source could produce an atom accidentally left at a less restrictive classification if
the author forgets to set it, with nothing to catch the mismatch.

**Recommendation:** Add either (a) a default-inherit-then-allow-downgrade-with-reason rule in
atom creation, or (b) a validation check that rejects/flags an atom whose classification is less
restrictive than any of its `sourceEvidenceIds`. Not built in this pass — logged instead of
silently claiming C-006 fully passes.

---

### Q-003: Frozen-manifest trigger (C-013) only protects rows with status = 'ACTIVE'

The real SQLite trigger added for C-013 (`prisma/manual-sql/frozen_manifest_trigger.sql`) has
condition `WHEN OLD.status = 'ACTIVE'`. A manifest with `status = 'SUPERSEDED'` (i.e. already
replaced by a newer package version, per the schema's own supersession design) is NOT protected
by this trigger — `ManifestGuard.test.ts`'s negative-control case demonstrates this directly: an
UPDATE on a SUPERSEDED manifest succeeds. Historically-superseded manifests are still learner
evidence and arguably should never be mutated either, matching HFEFF-003's "frozen learner
evidence must never change" language.

**Recommendation:** Widen the trigger condition to `WHEN OLD.status IN ('ACTIVE', 'SUPERSEDED')`
(i.e. block everything except rows in a genuinely transient pre-freeze state, if one is ever
introduced). Not changed in this pass to avoid touching a governance-relevant DB object without
explicit owner sign-off — flagged instead, per directive §2's "never modify... weaken a
governance decision already logged" caution, applied conservatively here.

---

### Q-004: No dedicated atom-completion tracking table

PHASE-1-SPECIFICATION.md §2 step 6 describes learners completing atoms "in order" with a
"Ready for Assessment" gate appearing after the last one. The schema has `LessonCompletion` for
the legacy Course/Lesson model but nothing analogous for `LearningAtom`. `Phase1Workflow.e2e.test.ts`
demonstrates the assignment-level status transition (`ASSIGNED` → `PASSED`) as the closest real,
testable proxy, but does not — because it cannot — demonstrate per-atom completion tracking or
gating, since no such table or service exists. Logged as Partial for that sub-element of C-009,
not silently assumed complete.


---

## Phase 3 Checkpoint: 2026-08-06

### Q-005: Defense Dossier — organization/site/date-range scopes not implemented

`DefenseDossier.buildDossier()` supports `intervention` and `learner` scope types for real
(both fully tested, both verified via real HTTP against a running server). WP-1's text lists
scope as "organization / site / learner / intervention / date range" — the other three
(`organization`, `site`, `date-range`) are not implemented; calling `buildDossier()` with one
of those throws an explicit "not implemented in this pass" error rather than silently returning
an empty or wrong dossier.

**Why deferred:** `intervention` and `learner` are the two scopes with unambiguous, directly-
modeled real data paths (an intervention has one clear query root; a learner has one clear
`learnerId` filter). `organization` and `site` have no dedicated model in the current schema —
`site` exists as a free-text field on `TrainingAssignment`/`LearningIntervention`-adjacent
records with no canonical site list to validate against, and there is no `Organization` model
at all (this is a single-tenant-per-deployment system per the schema's `tenantId` design).
`date-range` would need a decision about which timestamp anchors the range (event occurrence?
assignment date? evidence collection date?) that the directive doesn't specify.

**Recommendation:** if the owner needs these, specify: (a) what identifies an "organization" in
this schema (is it just `tenantId`?), (b) whether `site` should get a canonical lookup table or
stay free-text with fuzzy matching, (c) which timestamp a date-range scope should filter on.
Not implemented speculatively — would risk inventing a data model shape the owner didn't ask for.


---

## Phase 3 WP-2 Checkpoint: 2026-08-06

### D-001 SUPERSEDED: Emergency Content Expiration is now configurable

The original D-001 entry above (fixed 30-day, chosen as "Option 1") is now superseded per
PHASE-3-RUN-DIRECTIVE.md WP-2 §4 / directive v3 §8.4's explicit instruction. Duration is
configurable at creation from a default (`DEFAULT_EMERGENCY_DURATION_DAYS = 30`), mandatory
expiration is retained, and renewal requires an approval record. Full detail:
`PHASE-3-WP2-ADDENDUM.md`, `DECISIONS.md` D-028. The original D-001 entry is left unedited above
as the historical record of the earlier decision — this note documents that it no longer
reflects current behavior.



---

## Phase 3 WP-3 Checkpoint: 2026-08-06

### Q-006: WP-3 UI gaps found during the real click-through (none block the exit gate, all logged honestly)

1. **No UI route triggers real kernel evaluation.** `MaiKernel.processEvent()` is thoroughly
   tested at the service level (43 tests, D-012 fix verified) and the Kernel Conditions panel's
   response mechanics (three-response contract) are correct — but nothing in the WP-3 UI
   actually calls the kernel against live ingested data, so the panel's "No system-detected
   conditions" state, while honest, was never exercised against a real generated condition
   during this click-through. Wiring a real trigger point (e.g., on causal-status promotion or
   evidence ingestion) is natural WP-4 "drift watch" territory, where kernel conditions are
   meant to fire from occurrence data — not built here to avoid scope creep into WP-4.
2. **Authority Charter has no standalone UI entry point.** The `/api/authority-charter/:dimId`
   route itself works correctly (verified directly via HTTP, real rule data returned) and is
   linked from each condition card — but with zero conditions present, there is no way to reach
   it through clicking alone. A direct nav link would close this; not added in this pass.
3. **`effectivenessTargetLevel` is not collected in the Intake/appropriateness-review form.** New
   interventions get the schema default (`COMPLETION`) rather than an explicit QM-chosen target
   (e.g. `WORKPLACE_TRANSFER`). Real closure logic evaluated correctly against whatever target
   was actually set (confirmed via DB: target COMPLETION, evidence WORKPLACE_TRANSFER, correctly
   closed) — this is an incomplete form, not a closure-logic bug.
4. **Atom `duration` is not collected in the Content Authoring form** — the learner's "My
   Training" view shows `(micro_lesson, min)` with the number blank. Cosmetic.
5. **Assessment engine is a scope simplification, documented in code** (`pass-assessment/route.ts`):
   no multiple-choice question engine is wired to atoms — the route records the pass/fail
   OUTCOME that downstream effectiveness/closure logic actually depends on, correctly gated on
   full atom completion. The legacy `Assessment`/`AssessmentQuestion` models remain Course/
   Lesson-scoped, not atom-scoped.

None of these blocked the exit gate — the full lifecycle (ingest → classify → causal status →
appropriateness review → AI-assisted + manual atom authoring → approval → compile & assign →
learner completion → assessment pass → supervisor one-tap verification → automatic closure) was
executed successfully end-to-end by real QM, supervisor, and learner accounts against the real
running application, independently confirmed via direct database query after the fact.

---

## Phase 3 WP-4 Checkpoint: 2026-08-06

### Q-007: Drift Watch Has No Approved Rev-A Kernel Rule to Fire On — Built as Advisory Analytics, Not a Kernel Condition

**Context:** WP-4 asks for a "drift watch" — detecting a rising incident theme with no
corresponding training coverage. Checked all 14 approved Rev-A kernel rules
(`prisma/seed-kernel-rules.json`, dim-hf-src HFSRC-001..006, dim-hf-int HFINT-001..005,
dim-hf-eff HFEFF-001..003): none of them evaluate theme frequency or theme-to-coverage mapping.
The closest rules (HFINT-004, "same theme+process previously trained and recurred") require a
specific *prior training* record to exist first — they don't detect an emerging theme with *zero*
training coverage at all.

**Disposition:** per the standing rule ("never author a kernel rule — log a request instead"),
`DriftWatchService.ts` was built as a standalone advisory analytics service, entirely OUTSIDE the
kernel-condition/`MaiSystemCondition` authority system. It does not create a
`MaiSystemCondition`, does not require the three-response contract, and carries no kernel
authority — it is a report a QM can read, exactly like a dashboard, not a system-detected
condition claiming rule-based backing it doesn't have. If a genuine "rising uncovered theme"
kernel rule is wanted (with the three-response contract, Authority Charter documentation, and
Rev-A change-control approval that implies), it needs to go through the same controlled-document
process as the other 14 rules — this agent will not add one to the seed file unilaterally.

**Status:** OPEN (a rule request, not a bug) — logged here rather than silently building
something that *looks* like kernel authority it doesn't actually have.


---

## Phase 3 WP-5 Checkpoint: 2026-08-06

### Q-008: "online" Deployment Edition Needs a Real PostgreSQL Migration Before It Can Actually Run

**Context:** `docs/03-architecture/DESIGN-NOTES.md` §8 specifies `DATABASE_MODE=postgresql` for
the `online` edition. `prisma/schema.prisma`'s datasource provider has been `sqlite`
unconditionally since D-001, and was never revisited. WP-5's Docker Compose `online` profile
(a real Postgres container, real connection wiring) is structurally complete and passes
`docker compose config` validation, but `prisma migrate deploy` against it will fail — the
schema doesn't target Postgres. Full detail: DECISIONS.md D-033.

**What's needed if `online` edition support is wanted for real:**
1. Decide how the schema targets two providers (Prisma doesn't support one schema file
   targeting two datasources natively — likely an env-driven generator step that swaps the
   `provider` line before `prisma generate`, or two schema files kept in sync).
2. Re-run the full 27-suite test matrix against a real Postgres instance — SQLite and Postgres
   differ in enough ways (JSON handling, case sensitivity, transaction semantics) that "the
   tests pass on SQLite" is not evidence they pass on Postgres.
3. Re-verify the C-013 frozen-manifest trigger specifically (DECISIONS.md D-016 already notes
   this may behave differently — possibly better — on Postgres, since `RAISE EXCEPTION` messages
   typically do surface through Prisma's error object there, unlike SQLite's generic P2003).

**Status:** OPEN, non-blocking for WP-5 (WP-5's own scope is Docker/backup/health, not a
database-engine migration — never asked for here, not invented speculatively).


---

## Phase 4 WP-0 Checkpoint: 2026-08-06

### Q-009: Next.js Major-Version Upgrade Needed to Clear 5 npm audit Findings (1 Critical, 3 High, 1 Moderate)

**Context:** WP-0's clean-clone receiving inspection ran a real `npm install` and surfaced
`npm audit`: `next@^14.0.0` (the full range down to `9.3.4-canary.0`) carries multiple
advisories including Denial of Service via Server Components, cache poisoning in RSC responses,
SSRF in Server Actions on custom servers, HTTP request smuggling in rewrites, and XSS in
CSP-nonce App Router usage — plus a transitive `postcss` XSS/path-traversal set and a
`jspdf`→`dompurify` advisory. Full detail: DECISIONS.md D-038.

**Why deferred:** `npm audit fix --force` would install `next@16.3.0` — a two-major-version
jump requiring a full re-verification of the App Router surface (every route, every server
component, WP-5's standalone Docker build) that Phase 4's directive doesn't scope or budget for.

**Recommendation:** schedule a dedicated Next.js 14→16 upgrade pass as its own piece of work,
with the full 27-suite test matrix, `tsc --noEmit`, the license-header gate, a real
`npm run build` + Docker image build, and a fresh click-through of the WP-3 demo-user lifecycle
all re-run against the upgraded version before considering it closed.

**Status:** OPEN, non-blocking for Phase 4 (production security hardening is WP-4's scope, but
a breaking framework major-version bump is a distinct, larger piece of work than what WP-4 asks
for — logged here rather than either silently deferred without a paper trail or silently forced
through without re-verification).


---

## Phase 4 WP-1 Checkpoint: 2026-08-06

### Q-010: No Reachable PostgreSQL Instance in This Environment — Blocks WP-1's Exit-Gate Test Run and All of WP-2

**Context:** WP-1's exit gate and WP-2's entire scope both require a real, reachable PostgreSQL
instance. This environment has: Docker daemon down (`docker info` fails, same as Phase 3
D-035), no local `psql`/`postgres` binary on PATH, and port 5432 not listening. Everything
buildable without a live connection (dual-provider schema, migration SQL generation, the
Postgres trigger, the client swap-mechanism itself) has been built and verified for real — see
DECISIONS.md D-040/D-041/D-042.

**What's needed:** any ONE reachable PostgreSQL instance — a started Docker Desktop + the
existing `docker-compose.yml` `online` profile's postgres service (built in Phase 3 WP-5), a
cloud free-tier instance, or a local install — long enough to run `npm run db:setup:pg` +
`npx jest` once, and to bring up WP-2's runtime work.

**Status:** OPEN — owner input needed on how to provide this (same pattern as the Phase 3
GitHub-remote blocker, D-039, which the owner resolved directly). Logged rather than silently
skipped or worked around with an unauthorized third-party signup.


**RESOLVED 2026-08-06:** the owner installed PostgreSQL locally via Chocolatey (elevated
PowerShell, run by the owner directly — `computer-use` cannot type into terminal windows by
policy). Full account of how a working instance was reached (including the pre-existing
OneDrive-corrupted v18 data directory that was found and deliberately left untouched) in
DECISIONS.md D-043. A local, non-Docker PostgreSQL 18.4 instance is now standing at
`127.0.0.1:5544` for the remainder of this run.
