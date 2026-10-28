# HF-ENGINE Handoff — 2026-08-12, post-D-068

**Purpose:** context transfer for a new chat session, before starting Training Engine work.
Read this first, then `docs/02-controlled/HF-ENGINE-PROGRESSIVE-AUTONOMY-CHARTER-Rev-A.md`
(the governing design document for everything below), then `docs/05-run-records/DECISIONS.md`
(D-066 through D-068 at minimum — full history above that if needed).

---

## 0. Where this repo actually lives — read this first

**Correct path:** `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\Conform-Edge Software\HF-ENGINE`

The bare path `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\HF-ENGINE` (no
`Conform-Edge Software`) is **stale** — a portfolio reorganization moved this repo (and `M-AI`
alongside it) under a new `Conform-Edge Software` subfolder. The old bare path was found nearly
empty mid-session on 2026-08-12 and briefly, incorrectly diagnosed as catastrophic data loss —
it wasn't; the repo was just relocated. **Always operate from the `Conform-Edge Software` path.**

**One consequence of the move**: the `@mai/kernel` `file:` dependency's `node_modules` symlink
was left pointing at the pre-move absolute path. If you ever see `Cannot find module
'@mai/kernel/decision'` after a fresh checkout or `npm install`, that's why — it self-heals on
the next `npm install` (npm recomputes the symlink target from the current package.json
location), already done once this session, but worth knowing if it recurs.

---

## 1. What's done, verified, and should NOT be redone

Three decisions this session, in order — **read D-066 through D-068 in `DECISIONS.md` for full
detail**, this is a summary only:

- **D-066** — investigated a reported checkbox-persistence "defect" on the
  `LearningInterventionAppropriatenessReview` UI. Root-caused as a testing-tool artifact (a
  browser-automation `form_input` call bypassing React's controlled-component update path for
  checkboxes), not a real app bug. **Reconfirmed a second time in D-068** after the same defect
  was re-reported — still not real. Permanent regression coverage now exists:
  `src/app/api/intake/appropriateness-review/__tests__/route.test.ts` (8 cases, the first
  route-level test anywhere in this codebase). **Do not "fix" this a third time without new
  evidence** — if it's raised again, point to these tests and D-066/D-068's findings first.

- **D-067** — built the first version of a Kernel-governed autonomous pipeline: an approved
  `LessonLearned` → `LessonAutoImplementationService` → straight to a live, distributed
  `APPROVED` `LearningAtom`, zero human click, gated by a `MaiAuthorityProfile`. Also fixed a
  real, previously-broken build (the M-AI Kernel repo had been reconstructed from scratch with a
  different internal architecture) by bringing the 13-operator/3-composite rule-evaluation
  grammar fully in-house into `MaiKernel.ts` (no more external kernel dependency for that piece).

- **D-068** — **corrected D-067's authority boundary.** The owner determined that autonomous
  *preparation* of a content revision is fine, but autonomous *release* (making it the live,
  effective, distributed version) is not, at the current maturity level. This is now enforced in
  code, not configuration:

  ```
  APPROVED_LEARNING_INTERVENTION_REQUIRED
        ↓
  LessonAutoPreparationService.prepare()        (autonomous — Kernel-gated, no human click)
        ↓
  MaiContentRevisionProposal (AWAITING_HUMAN_RELEASE)   ← NOT a live LearningAtom yet
        ↓
  LessonRevisionReleaseService                  (human action required, always)
        ├── approve()              → APPROVED_EFFECTIVE, real atom created, distributed
        ├── approveWithEdits()     → same, with human-edited content preserved separately
        ├── returnForRework()      → stays non-effective
        ├── reject()               → prior effective revision (if any) stays effective
        └── rollback (prepareRollback + approve) → new revision, history never rewritten
  ```

  A `SYSTEM:`-prefixed actor is structurally rejected (checked and audit-logged before the DB
  lookup) — no Authority Profile flag can grant a non-human principal release authority.
  `User.role` enforcement (`learner` cannot release) is the first role-based authorization
  check anywhere in this codebase — narrowly scoped to release/rollback only.

**Current verified state**: 254 tests (249 passing + 5 pre-existing environment skips), zero
regressions across the whole session. `npx tsc --noEmit` clean. `npm run build` clean. A full
end-to-end DB-verified script run demonstrated prepare→approve (with real distribution and a
byte-identical historical manifest afterward), reject (nothing becomes effective), and rollback
(new revision, full history preserved, honest impact-analysis reporting).

---

## 2. Key files (D-067/D-068 pipeline)

| File | Role |
|---|---|
| `src/services/LessonAutoPreparationService.ts` | Autonomous preparation only. `prepare()`. Never creates a live atom. |
| `src/services/LessonRevisionReleaseService.ts` | The human-release gate. `approve()`/`approveWithEdits()`/`returnForRework()`/`reject()`/`prepareRollback()`/`previewRollbackImpact()`. Runs the 14-rule Kernel governance check and `DualApprovalGate` here, not at prepare time. |
| `src/services/ContentRevisionDiff.ts` | Track-changes diff (word-level via `diff`/jsdiff for prose, before/after for scalars/sets). Computed on demand, not persisted. |
| `src/services/ContentSupersessionService.ts` | Pre-existing, reused (not modified) — the actual "create new revision, mark old SUPERSEDED, find affected learners, audit-log" mechanism, now finally wired into a live path via the release service. |
| `src/services/MaiKernel.ts` | In-house 13-operator rule evaluator (D-067). Still the only consumer of `@mai/kernel` is the Authority/Decision types (`@mai/kernel/decision`), not condition evaluation. |
| `prisma/schema.prisma` | `LessonLearned`, `CorrectiveAction`, `CarLessonLink`, `MaiAuthorityProfile`, `MaiGovernedDecision`, `MaiContentRevisionProposal` — the full organizational-learning + governance plane, all added this session (D-066–D-068). |
| `prisma/seed-kernel-rule-manifest.ts`, `prisma/seed-authority-profiles.ts` | Idempotent seeds — the 14 approved rules as a real `MaiRuleManifest`, and the `HF-LESSON-AUTO-IMPLEMENT` `MaiAuthorityProfile`. Both wired into `npm run db:setup`. |

---

## 3. What is NOT built yet — likely relevant to "Training Engine" work

No UI exists for any of this — everything above was exercised via direct service calls / scripts,
matching this repo's evidence discipline (never claim UI-verified without actually using the UI).
Per the Charter §20 (Near-Term Build Boundary) and §19 (Track-Changes Release Control), still
open:

- **Lessons Learned authoring UI** — create/submit/review/request-evidence/approve/reject/
  supersede/archive, positive-lesson support. `LessonLearned` rows currently only exist via
  direct DB/script creation in this session's tests and walkthroughs.
- **CAR/Corrective Action UI or import path** — schema exists (`CorrectiveAction`,
  `CarLessonLink`), no authoring surface.
- **Track-changes review screen** — `ContentRevisionDiff.ts` computes the real diff data;
  nothing renders it yet. Charter §19 lists the full required display (objective/scenario/
  question/scoring/audience/recurrence/effectiveness/source/Policy-Pack/duration changes, Kernel
  assessments, AI Assist contribution label).
- **Human release UI** — the four actions (`Approve` / `Approve With Edits` / `Return for
  Rework` / `Reject`) plus rollback, calling `LessonRevisionReleaseService` from a real screen
  instead of a script.
- **Recurrent/batch curriculum cycles** — confirmed absent from this codebase (D-067/D-068 both
  note it explicitly): manifests compile synchronously per assign action, nothing runs on a
  schedule. `LessonRevisionReleaseService.approve()` distributes immediately to
  *already-assigned* learners at release time — this is not the same thing as "the next
  recurrent package uses the new revision" (Charter §20.F) if a real recurrence/cycle concept is
  expected. Worth clarifying scope before building against this assumption.
- **`mai-kernel-integration` Anthropic skill** — confirmed stale (still describes the pre-D-068,
  pre-MAI-ARCH-003 "advisory only" law). Not fixed, cross-session concern, noted again here so
  it doesn't get lost.

---

## 4. Governance documents (read in this order)

1. `docs/02-controlled/HF-ENGINE-PROGRESSIVE-AUTONOMY-CHARTER-Rev-A.md` — **still DRAFT**, owner
   signature/approval block unfilled. This is the authoritative design reference for everything
   in §1 above (Progressive Autonomy Levels 0–5, the human-release boundary, rollback rules,
   track-changes requirements) even though it isn't formally effective yet. Don't contradict it;
   don't treat it as binding-and-final either — flag anything that would need its approval.
2. `docs/05-run-records/DECISIONS.md` — D-066, D-067, D-068 (append-only; newest at the bottom).
3. `docs/01-directives/PHASE-REVISION-CONTROL-DIRECTIVE.md` — the directive that named the
   Charter as its authority pointer.
4. `DOCS-INDEX.md` (repo root) — folder map and precedence order.

---

## 5. Operating notes for the next session

- **Evidence discipline is load-bearing in this repo**: every decision entry in `DECISIONS.md`
  is written and logged *before* implementing, and every "done" claim in this session was
  backed by an actual test run or DB query, not asserted. Several real bugs (governance rules
  firing at the wrong pipeline stage, missing schema fields, a regex mismatch) were only found
  by actually running things — expect the same here.
- **`prisma/postgresql/schema.prisma` drifts on its own** as a side effect of various
  `prisma`/`npm` commands (a generator script regenerates it). It's out of scope for the
  SQLite-only work done so far — check `git status` and `git checkout -- prisma/postgresql/schema.prisma`
  if it shows modified and you didn't intend a Postgres-parity change.
- **Never claim UI-verified without using the UI.** Everything in §1 was verified at the
  service/DB layer only — if Training Engine work builds the missing UI surfaces from §3, that's
  the first real opportunity to browser-test this whole pipeline end to end.
