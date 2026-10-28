# HF ENGINE — CONTROLLED AUTHORITY MODEL (BOUNDED AUTONOMOUS AUTHORITY)
## STATUS: SUPERSEDED AND REFERENCE-ONLY — DO NOT IMPLEMENT FROM THIS DOCUMENT
## Superseded by: `HF-ENGINE-PROGRESSIVE-AUTONOMY-CHARTER-Rev-A.md` (HFPAC-CCB-2026-001)
## All content is subsumed into Charter §18. This file is retained for traceability only.

**Scope:** HF-ENGINE application. Implements, at the product level, the M-AI Kernel's MAI-ARCH-003 (Bounded Autonomous Authority) as the controlling law for what the system may do autonomously and where human authority is mandatory. This is the HF-ENGINE-scoped paper trail the Defense Dossier relies on; the kernel-level law lives in `M-AI/Kernel-MASTER/docs/MAI-ARCH-003-*`.
**Approval:** not effective until Brian R. Olea approves (block §6). Supersedes the prior "advisory only — every condition requires an explicit human" statement for HF-ENGINE, which remains true for *release* but no longer for *preparation*.

---

## 1. The principle
The system may autonomously **prepare** controlled training revisions from organizational learning. It may never autonomously make a revision the **effective, controlled version**. Preparation is unlimited within an approved Authority Profile; **release is always a human act.**

Plain statement for the UI and dossier: *"The engine continuously prepares controlled revisions from organizational learning; qualified personnel review the exact changes and release or reject them."*

## 2. What an approved Authority Profile MAY do without a human click
Ingest evidence; associate it to existing lessons; detect recurrence; determine that an approved lesson needs review; draft a new lesson revision; draft changed questions and scenarios; determine proposed applicability, audience, recurrence; compile impact information; generate the tracked-change package; and place the revision into `AWAITING_HUMAN_RELEASE`. Every such act is recorded as a `MaiGovernedDecision` and is fail-closed by default (`humanApprovalPerInstance` defaults `true`; a profile is inert until explicitly authorized).

## 3. What NO profile may EVER do autonomously (hard boundary)
- Transition any content `AWAITING_HUMAN_RELEASE → APPROVED_EFFECTIVE`. This is structurally forbidden to any `SYSTEM:` principal — enforced in the release code path itself, not by profile configuration. A non-human actor attempting release is rejected and logged, regardless of any profile flag.
- Release `EMERGENCY_INTERIM` content — even emergency content requires a specifically authorized human release.
- Author or classify a Corrective Action, decide a CAR's `trainingClassification`, confirm a Lesson Learned (Draft→Approved), create CAR↔Lesson links, publish to the Knowledge Base, or bypass product-safety escalation (`DualApprovalGate` always escalates, never auto-clears).
- Delete, silently retire, or mutate any historical revision, frozen manifest, or learner evidence.

## 4. Content revision lifecycle (controlled-document model)
```
APPROVED_EFFECTIVE
      ↓  (new evidence / lesson learned / CAR / risk triggers review)
CHANGE_PROPOSED
      ↓
DRAFT_REVISION            (AI Assist proposes; advisory, source-grounded)
      ↓
KERNEL_REVIEWED           (authority, applicability, controls, conditions checked)
      ↓
AWAITING_HUMAN_RELEASE ───┬── APPROVED_EFFECTIVE   (human release — new controlled version)
                          ├── RETURNED_FOR_REWORK   (draft stays open, not approved)
                          └── REJECTED              (retained as rejected history; prior rev remains effective)
```
The prior approved revision remains the effective controlled version until, and unless, a human releases the new one. Rejection never deletes; it is retained history.

## 5. Rollback is a controlled forward event, never a status flip
Restoring earlier content is itself a new controlled revision (e.g. `Rev C — Rollback to Rev A content`), with reason, approver, and effective date. The historical sequence (Rev A → Rev B → Rev C) stays intact; Rev B is never erased. Rollback automatically runs impact analysis (learners trained on the superseded revision, active assignments, future packages, derived assessments, open effectiveness reviews, affected certificates, downstream atoms/scenarios, policy-pack relationships, whether corrective retraining is required) — reusing the existing recall/supersession engine.

## 6. Approval block
| Field | Value |
|---|---|
| Document | HF-ENGINE Controlled Authority Model (Bounded Autonomous Authority) |
| Implements | MAI-ARCH-003 at HF-ENGINE product scope |
| Drafted by | Claude (from owner's 2026-08-12 design; no authority) |
| Reviewed & approved by | ______________________ (Brian R. Olea) |
| Approval ref | HFAUTH-CCB-2026-____ |
| Effective date | ____________ (real date, never backdated) |
| Supersedes | "advisory only" statement, for *preparation* only; release remains fully human |
