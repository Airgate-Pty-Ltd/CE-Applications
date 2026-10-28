# CONTENT REVISION CONTROL RUN DIRECTIVE — HF ENGINE
**Issued:** 2026-08-12 by owner (Brian R. Olea)
**Implements:** `docs/02-controlled/HF-ENGINE-AUTHORITY-MODEL-*.md` (approve it before this run closes). Turns training content into controlled-document revision management with a hard human-release boundary and a flagship tracked-change review screen.
**Standing law:** `CLAUDE.md` in full — evidence standard, §5a host boundary, no invented content, commit at WP boundaries. Do not begin until the Authority Model doc is approved (owner sign-off).

---

## WP-1: Revision lifecycle + the hard release boundary (correct what exists first)
1. Add the controlled lifecycle to content (LearningAtom and/or a LessonRevision model — choose and justify, following the existing `revision`/`replacementAtomId` fields): `APPROVED_EFFECTIVE → CHANGE_PROPOSED → DRAFT_REVISION → KERNEL_REVIEWED → AWAITING_HUMAN_RELEASE → {APPROVED_EFFECTIVE | RETURNED_FOR_REWORK | REJECTED}`. Preserve the existing states; migrate, don't mutate history. Targeted schema edits, `npx prisma validate` after each.
2. **Correct `LessonAutoImplementationService`:** it currently writes `status: 'APPROVED'` autonomously (line ~218). Change its terminal state to **`AWAITING_HUMAN_RELEASE`** — the autonomous pipeline now *prepares* a revision and stops. Nothing it produces reaches learners until released.
3. **Hard release gate:** implement the release transition (`AWAITING_HUMAN_RELEASE → APPROVED_EFFECTIVE`) so it **structurally rejects any `SYSTEM:` / non-human principal**, independent of any Authority Profile flag. This is code-enforced, not config. Write the test that proves a `SYSTEM:` actor cannot release even under a fully-permissioned profile.
4. Only a human release makes a revision effective; the prior revision stays effective until then.
**Exit gate:** autonomous pipeline lands a prepared revision in `AWAITING_HUMAN_RELEASE` (not APPROVED) — executed evidence; the SYSTEM-cannot-release test passes; historical revisions untouched.

## WP-2: Tracked-change review + release actions (the flagship screen)
Build the reviewer screen. It must show, for a proposed revision vs the current approved revision: current revision, proposed revision, **tracked differences** (additions/deletions, changed assessment questions, changed applicability, changed audience, recurrence changes, source additions/removals, effect on effectiveness criteria), reason for every change, source evidence that triggered each change, Kernel System-Detected Conditions, AI Assist rationale **clearly labelled advisory**, affected roles/sites, affected Policy Packs, estimated change in learner duration, existing learner/package impact, and the proposed effective date.
The authorized human gets exactly these controls:
- **Approve Revision** → proposed becomes new controlled effective version.
- **Approve with Edits** → human edits the proposal; system records the human edits (attributed to the human, not SYSTEM); releases the edited version.
- **Reject Revision** → retained as rejected history; prior approved revision stays effective.
- **Return for Rework** → draft stays open, not approved.
Every action writes an audit record with actor, reason, and timestamp. This screen is a flagship — it demonstrates controlled configuration management, not "AI generating training." Design it to the "Controlled" design language (pairs with the UI directive).
**Exit gate:** a real proposed revision reviewed through the running UI: diff renders correctly, each of the four actions works end-to-end with pasted evidence, Approve-with-Edits attributes edits to the human.

## WP-3: Rollback as a controlled forward event
Rollback restores earlier content as a **new** controlled revision (e.g. `Rev C — Rollback to Rev A content`, reason/approver/effective-date), never a status flip and never deleting Rev B. Selecting rollback automatically runs impact analysis — **reuse the existing recall/supersession engine** (`ContentSupersessionService` / the Phase-3 recall workflow): learners trained on the superseded revision, active assignments, future packages, derived assessments, open effectiveness reviews, affected certificates, downstream atoms/scenarios, policy-pack relationships, and whether corrective retraining is required.
**Exit gate:** a rollback executed in the running app produces a new revision preserving the A→B→C sequence, with the impact analysis rendered from real data — pasted evidence.

## WP-4: Reconcile the authority claims (consistency)
1. Fix the UI badges: `KernelConditionsClient.tsx` (and any similar) must stop asserting "the kernel never has authority / every condition requires an explicit human." Replace with the honest statement from the Authority Model doc §1 — advisory/preparation autonomous under approved profiles; **release always human**.
2. Update the Defense Dossier language to describe bounded autonomous authority accurately (never "human holds all authority" as an absolute). The dossier must show, for released content, the human releaser and the governed-decision chain that prepared it.
3. Note the stale `mai-kernel-integration` Anthropic skill (still describes advisory-only) as a cross-session concern — do not edit it; log in OPEN-QUESTIONS.md.
**Exit gate:** no screen or export asserts a control the system doesn't enforce; dossier shows the release actor for released revisions.

## Hard constraints
- No content is invented. AI Assist proposals are source-grounded (existing §5.2 constraint) — a proposed revision with no source span cannot enter `AWAITING_HUMAN_RELEASE`.
- The 236-test baseline must still pass (paste it); new features ship with real positive/negative tests. Emergency content still requires a specifically authorized human release — no autonomous emergency release.
- Every autonomous preparation step remains a `MaiGovernedDecision`; every human release remains an `AuditLog` action under the human principal.

## Run mechanics
Journal `RUN-JOURNAL-REVISION.md` in `docs/05-run-records/`. Decisions D-068+. Commit at each WP. `RUN-REVISION.done` last, per-WP Verified/Partial with named gaps. Independent validation on return: SYSTEM-cannot-release test, tracked-change diff on real data, rollback preserves sequence, no badge asserts un-enforced control, test count ≥ baseline.
