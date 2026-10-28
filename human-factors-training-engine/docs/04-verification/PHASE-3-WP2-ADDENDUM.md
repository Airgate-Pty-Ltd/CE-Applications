# WP-2 Addendum — Partials Closed

**Date:** 2026-08-06
**Status:** This is an ADDENDUM, not a rewrite. `PHASE-1-VERIFICATION-REPORT-v2.md` and
`PHASE-2-VERIFICATION-REPORT-v2.md` are left completely unedited. This document records that
four items previously reported as Partial now have executed evidence sufficient to flip to
Verified, and cites where that evidence lives.
**Evidence standard unchanged:** code review is never evidence. Every flip below cites a
specific, re-runnable test.

---

## C-006 (classification inheritance) — was Partial in PHASE-1-VERIFICATION-REPORT-v2.md → now VERIFIED

**Previous gap:** "classification inheritance from source evidence is not automatic anywhere in
the codebase... every atom in every test has its classification set explicitly by the caller."

**What closed it:** `src/services/AtomClassificationService.ts` — atoms created through
`createAtom()` automatically inherit the most restrictive classification of their linked
source evidence (ranking defined in `src/lib/classificationRank.ts`, logged as D-026).
Deliberately creating an atom LESS restrictive than that inherited floor requires a linked,
APPROVED `MaiApproval` (`approvalType: 'CLASSIFICATION_LOOSENING'`) — without one, creation is
rejected outright, not silently allowed at a weaker classification.

**Evidence:** `AtomClassificationService.test.ts`, 7/7 passing:
```
√ C-006 exit-gate requirement: BURRANA_PRIVATE evidence -> atom CANNOT be created less restrictive without approval
√ no requestedClassification: atom automatically inherits the most restrictive source classification
√ mixed sources: inherits the MOST restrictive among multiple source evidence records
√ tightening (requesting MORE restrictive than the floor) is always allowed, no approval needed
√ loosening WITH a valid APPROVED CLASSIFICATION_LOOSENING approval succeeds
√ loosening with an approvalId that references a REJECTED (not APPROVED) record is still blocked
√ resolveClassification() throws on unknown source evidence id (fail loud, not silent)
```

**Scope note (unchanged from Partial → Verified — read before treating this as total
coverage):** `AtomClassificationService.createAtom()` is the enforcement point for atoms
created THROUGH it. Pre-existing atom-creation call sites elsewhere in the codebase (seed data,
other services, ad-hoc test fixtures) that call `prisma.learningAtom.create()` directly are NOT
retrofitted — this was a deliberate scope decision (D-026), not an oversight. If the owner wants
every atom-creation path to go through this enforcement, that is a larger refactor than WP-2's
"demonstrated by executed tests" exit gate required.

---

## C-009 (per-atom completion tracking) — was Partial in PHASE-1-VERIFICATION-REPORT-v2.md → now VERIFIED

**Previous gap:** "No table or service exists for per-atom completion/gating (the spec's 'Ready
for Assessment button appears after Atom-003' behavior)."

**What closed it:** new `AtomCompletion` model (migration `20260806165843_add_atom_completion`)
+ `src/services/AtomCompletionService.ts`. `InterventionClosureService.checkAndClose()` updated
to require full atom completion (for the assignment backing the qualifying effectiveness
evidence) before closing — evidence at target level is no longer sufficient on its own if the
atoms were never marked done.

**Evidence:** `AtomCompletionService.test.ts`, 4/4 passing:
```
√ getCompletionStatus() on a fresh assignment: zero atoms complete, not ready for assessment
√ marking atoms complete one at a time updates remaining/complete counts correctly
√ C-009 exit-gate requirement: 'Ready for Assessment' becomes true only after the LAST atom is complete
√ markComplete() is idempotent — marking an already-complete atom again does not error or duplicate
```

Plus the closure-gate integration, `InterventionClosureService.test.ts`
(`describe("C-009 (WP-2): atom-completion gate...")`), 2/2 passing:
```
√ closure is BLOCKED when qualifying evidence exists but atoms are incomplete — evidence alone is not enough
√ closure PROCEEDS once all atoms are marked complete — the exact same evidence now qualifies
```

`Phase1Workflow.e2e.test.ts` was also updated (its Step 7 now calls `AtomCompletionService`
for real, replacing the comment that used to say the table didn't exist) — full suite still
6/6 passing for that file.

---

## C-013 (frozen manifest immutability, SUPERSEDED scope) — was Verified-with-limitation in PHASE-1-VERIFICATION-REPORT-v2.md → limitation #2 now CLOSED, limitation #1 remains (documented, not a gap)

**Previous gap (limitation #2):** "the trigger condition is `WHEN OLD.status = 'ACTIVE'` — a
manifest with `status = 'SUPERSEDED'` is NOT protected... Not widened in this pass without
explicit owner sign-off." WP-2 §3 IS that owner sign-off.

**What closed it:** trigger widened to `WHEN OLD.status IN ('ACTIVE', 'SUPERSEDED')`
(`prisma/manual-sql/frozen_manifest_trigger_v2_widen_superseded.sql`, D-027).

**Evidence:** `ManifestGuard.test.ts`, 5/5 passing (was 4/4 — the SUPERSEDED case flipped from
asserting the update SUCCEEDED to asserting it's REJECTED):
```
√ C-013: an attempted UPDATE on a frozen (ACTIVE) manifest is rejected by the real DB trigger
√ C-013: the manifest content is provably UNCHANGED after the rejected attempt
√ C-013: the rejected attempt is logged to AuditLog (surfaced for review per HFEFF-003)
√ C-013 (WP-2 §3, was a documented gap — now closed): a manifest with status SUPERSEDED IS protected by the widened trigger
√ SQLite driver error-text limitation, documented directly (not just referenced): ...
```

**Limitation #1 (Prisma/SQLite error-text mapping) remains, unchanged, and is not a gap to
close** — it's a driver-level fact independently verified (P2003, generic FK-violation text
instead of the literal `frozen_manifest_immutable_error` string), documented with its own
dedicated test rather than only in prose.

---

## Emergency Expiry (fixed 30-day) — was a Phase-2-session decision (see prior session's
OPEN-QUESTIONS.md D-001) → SUPERSEDED per directive v3 §8.4 (not a Partial-to-Verified flip;
a deliberate policy change WP-2 §4 explicitly instructed)

**Previous state:** `EMERGENCY_DURATION_DAYS = 30` was a fixed, non-configurable private
constant. Expiration was recomputed from `atom.createdAt + 30 days` on every check — no
per-item control.

**What changed:** duration is now configurable at creation (`durationDays` parameter,
default `DEFAULT_EMERGENCY_DURATION_DAYS = 30`), persisted per-item
(`LearningAtom.emergencyExpiresAt`, migration `20260806170445_add_emergency_expires_at`).
Mandatory expiration is retained — `durationDays <= 0` or non-finite is rejected outright.
Renewal is a new, separate operation requiring a linked APPROVED
`MaiApproval` (`approvalType: 'EMERGENCY_CONTENT_RENEWAL'`) — self-service renewal does not
exist as a code path.

**Evidence:** `EmergencyContentManager.test.ts`, 13/13 passing (was 7):
```
√ createEmergencyContent() creates an auto-approved atom with EMERGENCY_INTERIM format and a persisted emergencyExpiresAt
√ mandatory expiration: durationDays <= 0 is rejected, not silently treated as 'no expiry'
√ WP-2 §4 exit-gate requirement: duration is configurable AT CREATION — a 5-day item expires much sooner than the 30-day default
√ fresh emergency content (created now) is NOT expired and CAN be assigned
√ a normal (non-emergency) APPROVED atom is never reported expired by this manager
√ C-emergency-expiry: an item whose expiration was backdated into the past IS expired and CANNOT be assigned
√ emergency content within the 7-day warning window is NOT expired but WARNS
√ mustReplace() is true for expired content with no replacement yet linked
√ mustReplace() is false once a replacement atom links back via replacedAtomId
√ renewEmergencyContent() WITHOUT a valid approval is rejected
√ renewEmergencyContent() WITH a valid APPROVED EMERGENCY_CONTENT_RENEWAL approval extends expiration and audit-logs it
√ renewEmergencyContent() rejects a REJECTED (not APPROVED) approval record
√ renewEmergencyContent() on a non-EMERGENCY_INTERIM atom is rejected
```

Full rationale: DECISIONS.md D-028.

---

## Full suite state after WP-2

```
npx tsc --noEmit: 0 errors
node scripts/check-license-headers.js: 79/79 compliant
npm test: 19 suites, 153/153 passing
```

**WP-2 exit gate: MET** — all four items demonstrated by executed tests, this addendum appends
rather than rewrites the prior reports.
