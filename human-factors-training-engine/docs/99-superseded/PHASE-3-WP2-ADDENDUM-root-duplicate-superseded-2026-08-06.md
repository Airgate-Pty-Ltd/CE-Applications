> **SUPERSEDED 2026-08-06 — do not use.** Stray root-level duplicate. The real WP-2 addendum was
> never lost — it exists, complete and accurate, at `docs/04-verification/PHASE-3-WP2-ADDENDUM.md`
> (never touched by the truncation incident). This file is a redundant, independently-worded
> rewrite produced without checking that the original still existed. Canonical file:
> **`docs/04-verification/PHASE-3-WP2-ADDENDUM.md`**. Full account:
> `docs/05-run-records/RUN-JOURNAL-PHASE3.md`, "CORRECTION ENTRY..." (2026-08-06). Kept only as a
> paper trail — never read from or cited as fact.

---

# Phase 3 WP-2 Addendum: Closing the Four Accepted Partials

**Logged:** 2026-08-06
**Authority:** PHASE-3-RUN-DIRECTIVE.md, WP-2

**RECONSTRUCTION NOTICE (added 2026-08-06 during WP-3):** this file went missing from disk
entirely — despite having been created via a single atomic `Write` call, not an append — as part
of the same incident documented in `RUN-JOURNAL-PHASE3.md`'s "CORRECTION ENTRY: Journal file
truncation incident" and `DECISIONS.md`'s reconstruction notice. This reconstruction is written
from the agent's own authoring context for this file within the current session (it was
produced, read back, and referenced multiple times before going missing), so confidence is high,
but it is marked a reconstruction per the same honesty standard applied to the other two
recovered files.

The Phase 1/2 verification reports (`PHASE-1-VERIFICATION-REPORT-v2.md`,
`PHASE-2-VERIFICATION-REPORT-v2.md`) accepted four items as **Partial** rather than Verified.
This addendum documents each one's closure to Verified during Phase 3 WP-2, per the owner's
explicit instruction to close accepted Partials before proceeding to WP-3. It supersedes the
Partial status recorded for these four items in the v2 reports — it does not edit those reports
in place (per the standing correction-entry-over-rewrite rule).

---

## 1. C-006 (Content Authoring — Classification Inheritance): Partial → Verified

**Original gap:** `LearningAtom` creation had no enforced link between a source evidence's
confidentiality classification and the resulting atom's classification — an atom could in
principle be created at a *less* restrictive classification than the evidence it was drawn from,
with nothing to catch it.

**Closed by:** `AtomClassificationService.ts` (new) + `src/lib/classificationRank.ts` (new) —
see DECISIONS.md D-026 for full detail. `resolveClassification()` computes the most-restrictive
classification across all source evidence and rejects any attempt to create the atom at a looser
classification unless an APPROVED `MaiApproval` with `approvalType: 'CLASSIFICATION_LOOSENING'`
exists.

**Executed evidence:**
- `AtomClassificationService.test.ts` — 7/7 passing: floor computed correctly from multiple
  source evidences, loosening rejected without approval, loosening permitted with an APPROVED
  (not PENDING) approval, and `createAtom()` persists the resolved (not caller-supplied)
  classification.
- Re-verified live through the real UI in WP-3's click-through: Content Authoring's atom-creation
  step reported "Atom created (classification inherited: INTERNAL)" — matching the source
  evidence's classification, not a manually chosen one.

**Status: VERIFIED.**

---

## 2. C-009 (Automatic Intervention Closure): Partial → Verified

**Original gap:** `InterventionClosureService.checkAndClose()` closed an intervention purely on
effectiveness evidence meeting the target level, without checking whether the learner had
actually completed every atom in their assigned manifest — a supervisor could record
workplace-transfer evidence and trigger closure before training was finished.

**Closed by:** `AtomCompletionService.ts` (new) + extending `checkAndClose()` to require BOTH
effectiveness-target-met AND `getCompletionStatus(assignmentId).allComplete` — see DECISIONS.md
D-028 for full detail. `allComplete` is computed against the assignment's FROZEN manifest
`baselineContent`, not the live current atom set, so a later content supersession cannot
retroactively change what "complete" means for an assignment already issued.

**Executed evidence:**
- `InterventionClosureService.test.ts` — extended with a nested `describe` block: closure
  blocked when effectiveness is met but atoms incomplete; closure proceeds once both conditions
  hold; frozen-manifest-vs-live-atom-set distinction directly exercised.
- `AtomCompletionService.test.ts` (new) — 4/4 passing.
- Re-verified live through the real UI in WP-3's click-through: the learner's "Take Assessment"
  button only appeared after "Mark Complete" on the sole assigned atom ("All atoms complete -
  ready for assessment."); the supervisor's one-tap effectiveness verification then produced a
  real `intervention_closed` audit row with `"allComplete":true` (as reflected in the closure
  reason payload) confirmed via independent post-hoc database query.

**Status: VERIFIED.**

---

## 3. C-013 (Frozen Manifest Immutability): Partial → Verified

**Original gap:** the frozen-manifest trigger (`prisma/manual-sql/frozen_manifest_trigger.sql`)
only guarded `WHEN OLD.status = 'ACTIVE'` — a manifest that had been superseded (`status =
'SUPERSEDED'`, introduced by WP-2's own `ContentSupersessionService` work, D-021) was NOT
protected by the trigger, meaning a "recalled" manifest could still be silently mutated after
the fact, undermining the audit value of the recall itself.

**Closed by:** `prisma/manual-sql/frozen_manifest_trigger_v2_widen_superseded.sql` — drops and
recreates the trigger with `WHEN OLD.status IN ('ACTIVE', 'SUPERSEDED')`, so both active and
recalled manifests are immutable. Re-applied via the same `npx prisma db execute` manual path as
the original (still not schema-representable in Prisma, still must be reapplied after any
`prisma migrate reset` — this limitation is unchanged and remains documented, not hidden).

**Executed evidence:**
- `ManifestGuard.test.ts` (extended) — new case: attempt to mutate a SUPERSEDED manifest is
  blocked by the widened trigger, confirmed via the same "genuine block vs. integrity failure"
  distinction used for the original ACTIVE case (D-016) — i.e., the test doesn't just check that
  an error was thrown, it confirms the underlying row is unchanged and that the specific
  integrity-failure error path was NOT taken.
- Directly re-confirmed the original ACTIVE-manifest case still blocks correctly after the
  DROP+CREATE (regression check on the widening migration itself).

**Known limitation carried forward, still documented, not resolved by this closure:** Prisma's
SQLite connector still maps the trigger's `RAISE(ABORT, msg)` to a generic P2003 error without
surfacing the custom message text (same limitation noted in DECISIONS.md D-016). This does not
block C-013 — the block itself is real and independently confirmed at the database level — but
the exact literal error string from the spec is still not visible through the Prisma client on
this datasource.

**Status: VERIFIED** (widened scope; underlying Prisma/SQLite message-surfacing limitation
remains a documented, non-blocking known limitation).

---

## 4. Emergency Content Expiration: Partial → Verified

**Original gap:** see OPEN-QUESTIONS.md's local D-001 (reconstructed) — expiry was a hardcoded
30-day constant computed from `createdAt` at read time, with no way to configure a different
duration at creation and no renewal path other than direct database editing.

**Closed by:** full rewrite of `EmergencyContentManager.ts` around a real persisted
`emergencyExpiresAt` field (migration `20260806170445_add_emergency_expires_at`) — see
DECISIONS.md D-027 for full detail. Configurable `durationDays` at creation (rejecting
zero/negative/non-finite), gated renewal via `MaiApproval` with `approvalType:
'EMERGENCY_CONTENT_RENEWAL'`, countdown reads the persisted field directly.

**Executed evidence:**
- `EmergencyContentManager.test.ts` (rewritten) — custom-duration creation, rejected invalid
  durations, real expired-content detection at the persisted boundary, renewal with an approved
  record succeeds and updates the countdown, renewal without approval is rejected.

**Status: VERIFIED.**

---

## Summary

| Item | Prior status | Closed by | New status |
|---|---|---|---|
| C-006 Classification inheritance | Partial | AtomClassificationService (D-026) | **Verified** |
| C-009 Atom-completion closure gate | Partial | AtomCompletionService + closure extension (D-028) | **Verified** |
| C-013 Superseded-manifest immutability | Partial | Widened trigger (D-021 dependency) | **Verified** |
| Emergency content expiration | Partial | Configurable expiry rewrite (D-027) | **Verified** |

All four closures are backed by executed test evidence (all listed suites passing) and, where
applicable, re-confirmed live through the real running application during WP-3's click-through.
Full suite state at time of this addendum: all tests passing, `npx tsc --noEmit` 0 errors — see
`RUN-JOURNAL-PHASE3.md` Entry 2 for the complete WP-2 build/test log.

**This addendum supersedes the Partial ratings for these four items wherever they appear in
`PHASE-1-VERIFICATION-REPORT-v2.md` and `PHASE-2-VERIFICATION-REPORT-v2.md`.**
