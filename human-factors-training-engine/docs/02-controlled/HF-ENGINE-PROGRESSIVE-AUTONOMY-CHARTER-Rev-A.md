# HF-ENGINE — PROGRESSIVE AUTONOMY CHARTER
## Rev A — DRAFT, NOT EFFECTIVE
**Document ref:** HFPAC-CCB-2026-001
**Controlled document class:** Constitutional governance — `docs/02-controlled/`
**Governed by:** CLAUDE.md §3 (owner authority required; never modify without approval)
**Issued for approval:** 2026-08-12 by Brian R. Olea
**Supersedes/subsumes:** `HF-ENGINE-AUTHORITY-MODEL-DRAFT.md` — that file is now REFERENCE-ONLY; this Charter is the single governing constitution. See §APPROVAL for effective-date control.

---

### Purpose

This Charter defines the constitutional rules governing how autonomy may evolve inside HF-ENGINE and the M-AI Kernel ecosystem. It is the single governing authority for all autonomy-related design decisions in HF-ENGINE. No subordinate document, directive, or code configuration may contradict it.

**Present product objective:**
> Operational evidence continuously becomes controlled, targeted, recurrent Human Factors learning with complete traceability, human-governed release, and effectiveness feedback.

**Long-term objective:**
> The system may progressively assume more administrative and software-governance authority as it proves itself reliable, but authority must remain distributed, evidence-earned, reversible, and permanently subject to human alignment and intervention.

---

# 1. CONSTITUTIONAL GOVERNANCE MODEL

The long-term governance hierarchy shall be:

```text
Human Constitutional Authority
            ↓
Independent Oversight Layer
            ↓
Federated Domain Kernel Council
            ↓
Host-Side Execution Services
```

These tiers are not interchangeable. Authority flows downward only through explicit, governed grants. It does not flow upward under any circumstance.

## 1.1 Federated Domain Kernel Council

The Domain Kernel Council may eventually contain independent Kernels responsible for areas such as: evidence; causation; risk; Human Factors; learning appropriateness; content; compliance; curriculum; adversarial review; effectiveness; release authorization.

The council may evaluate and govern domain decisions. It does not possess constitutional authority.

## 1.2 Independent Oversight Layer

Oversight sits **above** the decision council. Oversight is not an ordinary voting member of the council and cannot be outvoted by it when exercising a valid freeze or safety restriction within its authority.

Oversight shall: monitor Kernel behavior; detect abnormal consensus; detect correlated failure; detect authority overreach; detect excessive automation or excessive conservatism; monitor rollback rates, human overrides, false positives, false negatives, Kernel disagreement, rule and Authority Profile drift; trigger fail-safe restrictions where preauthorized.

## 1.3 Human Constitutional Authority

Humans remain above Oversight. Humans shall always retain structural authority to: freeze one Kernel or all autonomous execution; reduce autonomy; revoke an Authority Profile; require manual approval; override consensus with documented rationale; force re-evaluation; roll back governed changes; change mission and policy boundaries; establish prohibited behaviors; define acceptable risk; realign system objectives; inspect full decision lineage.

Human intervention is an alignment mechanism. The system shall never resist, conceal, suppress, or reinterpret a valid human constitutional override.

**Definition of "valid" — authentication-based, never merit-based:** The validity of a human constitutional override is determined solely by whether the actor is authenticated and authorized within the system. It is never determined by the system's assessment of whether the decision is correct, wise, evidence-supported, or consistent with prior behavior. The system may record its own assessment of the override as a dissent note in the audit record. It may not use that assessment as a basis for resistance, delay, reinterpretation, or partial compliance. If the system cannot authenticate the actor, it escalates and halts — it does not decide for itself whether to comply.

---

# 2. AUTHORITY NEVER SELF-EXPANDS

**This is an inviolable design law.**

> **Learning may optimize behavior within an Authority Profile. Learning may not enlarge that Authority Profile.**

No Kernel, model, service, council, or Oversight component may silently grant itself additional authority. The system may: measure performance; recommend greater authority; prepare an authority-change proposal; demonstrate that autonomy criteria have been achieved. It may not approve its own authority expansion unless a future governance profile explicitly establishes an independent approval mechanism that does not allow the beneficiary Kernel to control the decision. Authority expansion must always be a separate governed decision.

---

# 2A. ABSENCE OF AUTHORITY IS NOT AUTHORITY

**This is an inviolable constitutional law.**

> **If authority is not explicitly granted, it is denied.**

No Kernel, service, or component may infer, assume, inherit, or claim authority that has not been explicitly established in a current, approved Authority Profile. Silence in the Authority Profile is not permission. Ambiguity in the Authority Profile is not permission. Prior behavior within a similar domain is not permission. The fact that an action is technically possible is not permission.

When a Kernel or service encounters an action for which no Authority Profile entry exists: the action is **blocked**; the attempt is **logged**; the condition is **escalated** as an authority-gap finding; and the system **waits** — it does not proceed under an assumption of permission. This law applies at every maturity level, including Level 0. It is never relaxed by operational pressure, efficiency arguments, or a finding that the action would "obviously" have been approved.

---

# 3. AUTONOMY IS DOMAIN-SPECIFIC

Autonomy shall never be granted globally by default. Each domain and action class shall possess its own autonomy level and Authority Profile.

```text
Source classification           Level 4
Duplicate detection             Level 4
Lesson revision drafting        Level 3
Training assignment             Level 4
Product-safety content          Level 2
Regulatory interpretation       Level 1
Database schema changes         Level 1
UI optimization                 Level 3
Lesson revision release         Level 1 (current — see §18)
```

A system may be highly autonomous in one domain and deliberately manual in another. Domain classifications must be documented in an approved Authority Profile — they are not implied by the level definitions alone (see §2A).

---

# 4. PROGRESSIVE AUTONOMY LEVELS

## Level 0 — Manual
Kernels detect and recommend. Humans decide and implement.

## Level 1 — Assisted
Kernels and AI Assist may: analyze; classify; draft; compare; prepare impact analysis; recommend. Humans release each controlled change. **This is the current default level for lesson revision release.**

## Level 2 — Bounded Execution
A human approves the decision or Authority Profile envelope. The system may then execute within that approved envelope without requiring redundant human clicks. The system may not expand scope, audience, risk class, or authority beyond the approved envelope.

## Level 3 — Multi-Kernel Governed Autonomy
Independent Kernels may jointly authorize defined low- and medium-risk actions through governed quorum. Human review becomes exception-based for permitted domains.

## Level 4 — Self-Regulating Domain Ownership
The Kernel ecosystem may govern routine domain administration (classification; recurrence; routing; lesson revision; curriculum placement; retirement; assignment; effectiveness response; routine administrative maintenance) — but only where the applicable Authority Profile and Policy Pack explicitly permit it (see §2A).

## Level 5 — Software Stewardship
The Kernel ecosystem may propose and govern controlled changes to the software itself (workflow improvements; rule changes; configuration changes; UI behavior; data relationships; DIM additions; administrative logic; curriculum logic). Level 5 shall require independent architecture, security, governance, adversarial, test, release, and effectiveness review.

**Levels 3–5 are not active. Do not enable them now. Build the architecture so they can be introduced later without rewriting the application.**

---

# 5. REGULATORY / POLICY AUTONOMY CEILING

Technical capability does not automatically determine permitted authority. Each Policy Pack, regulatory profile, customer requirement, or organization policy may impose a maximum autonomy ceiling.

```text
SYSTEM MAXIMUM AUTONOMY
            ↓
DOMAIN AUTONOMY PROFILE
            ↓
REGULATORY / POLICY CEILING
            ↓
RISK-SPECIFIC AUTHORITY
            ↓
QUORUM REQUIREMENT
            ↓
EXECUTION AUTHORITY
```

A domain may technically qualify for Level 4 while a specific regulatory or organizational control restricts one action to Level 1 or Level 2. The lowest applicable ceiling governs.

**Human Accountability Mandate — fail-closed default:** The Mandate defaults to **"human release required"** for every domain and action class. It may only be lowered by a named, authenticated human with the regulatory authority to accept that risk, recorded as a controlled decision with approval reference and effective date. It may never be lowered by the system itself, by an Authority Profile alone, or silently. A Policy Pack that is silent on the Mandate inherits the default. A Policy Pack that explicitly reduces the Mandate below "human release required" must itself carry an owner approval reference and is subject to audit scrutiny.

---

# 6. AUTHORITY MUST BE EARNED THROUGH EVIDENCE

Authority advancement shall be based on measured performance, not subjective belief that the system is "smart enough." Track at minimum:

- number of recommendations; human acceptance rate; substantive human edit rate; rejection rate; rollback rate; false-positive rate; false-negative rate; human override rate; later-evidence disagreement; recurrence after implementation; intervention effectiveness; content defects; regulatory/compliance corrections; applicability errors; Kernel disagreement; authority boundary violations; operating stability.

```text
Example authority-advancement evidence record:
  Kernel: Content Governance
  Evaluations: 3,482
  Accepted without substantive human change: 99.2%
  Rollback rate: 0.08%
  Boundary violations: 0
  Regulatory corrections: 0
  Observation period: 24 months
```

The system may recommend authority advancement based on evidence. It may not grant itself that authority.

---

# 7. COMMON-CAUSE DECISION FAILURE

Multiple Kernels do not create independent governance merely because they are separate code modules. A quorum is meaningful only when common-cause failure is addressed.

Potential common causes: same rule author; same taxonomy; same evidence framing; same assumptions; same source data defect; same model; same prompt; same implementation library; same policy interpretation.

The architecture shall support independence analysis. At minimum, future federated governance shall track: Kernel authorship lineage; rule-source lineage; evidence dependencies; taxonomy dependencies; shared prompt/model dependencies; shared implementation dependencies; correlated PASS/BLOCK behavior.

The Oversight Layer shall detect suspiciously correlated decisions. A quorum of correlated Kernels shall not be treated as equivalent to independent concurrence.

---

# 8. ADVERSARIAL REVIEW IS CONSTITUTIONALLY PROTECTED

The Adversarial Review Kernel's charter is:
> Find the strongest technically supportable reason the proposed action should not proceed.

It shall challenge: weak evidence; causal assumptions; inappropriate intervention; wrong audience; excessive learner burden; confidentiality; regulatory interpretation; recurrence assumptions; unsupported content changes; authority overreach; unintended consequences.

The Adversarial Review Kernel shall **not** be optimized against: approval rate; throughput; low escalation rate; human acceptance rate; autonomy advancement metrics.

Its role is to create disciplined dissent. **The system shall never learn that a quieter adversary earns greater autonomy.**

---

# 9. OVERSIGHT IS ALSO PROTECTED FROM AUTONOMY INCENTIVES

The Oversight Layer shall not be performance-managed according to: approval throughput; reduction in escalations; release speed; percentage of autonomous approvals.

Oversight performance shall focus on: material defects intercepted; missed defects; unnecessary freezes; false alarms; successful detection of drift; successful detection of common-cause failure; boundary enforcement; recovery quality.

**The system being audited shall not be permitted to tune its own auditor.**

---

# 10. PRESERVE DISSENT

Kernel disagreement shall be treated as valuable evidence. Permitted Kernel responses shall eventually include: PASS; BLOCK; ESCALATE; ABSTAIN; MORE_EVIDENCE_REQUIRED; NOT_APPLICABLE.

When Kernels disagree: preserve every decision and rationale; preserve the rule revision; preserve the Authority Profile revision; preserve evidence snapshot hashes; identify conflicting assumptions; preserve abstentions; preserve unresolved conflicts; determine whether quorum remains valid; escalate where required.

Never convert disagreement into fake consensus. Never delete dissent after a final decision is reached.

---

# 11. NO SINGLE END-TO-END DECISION OWNER

No single Kernel shall be the sole evidence validator, interpreter, risk assessor, proposer, approver, executor, and verifier for the same material action. For higher-autonomy future states, separated governance functions shall be required.

---

# 12. KERNEL DETERMINES; HOST EXECUTES

**Preserve this architecture permanently:**
> **Kernel determines. Host executes.**

Even at high autonomy maturity: Kernel(s) determine whether execution is authorized; host-side ExecutionService performs the actual change; authority is revalidated immediately before execution; rule revision is revalidated; Authority Profile revision/hash is revalidated; quorum is revalidated where applicable; execution is persisted; post-execution verification occurs.

Do not move uncontrolled writes into Kernel code.

---

# 13. REVERSIBILITY

Every autonomous or semi-autonomous material action must be: traceable; version-bound; evidence-bound; rule-bound; Authority Profile-bound; reversible where technically possible.

Every material change shall carry: rollback target; rollback conditions; rollback procedure; affected records; affected learners/users; downstream dependencies; post-rollback verification.

Historical evidence shall never be rewritten to make an erroneous revision disappear.

---

# 14. HUMAN ERROR REDUCTION — NOT ERROR ELIMINATION

The system's objective is to reduce human administrative error in Human Factors Training. Do not state that removing a human administrator eliminates error. Error can still originate in: rule design; evidence; taxonomy; requirements; regulatory interpretation; implementation; models; prompts; governance architecture.

The goal is:
> Reduce repetitive operational error, omission, inconsistency, fatigue, and administrative drift while preserving accountable, inspectable, and correctable governance.

---

# 15. KERNEL PERFORMANCE BECOMES LESSONS LEARNED

The Kernel ecosystem itself shall generate organizational learning. Examples: human override; rollback; false positive; false negative; missed condition; unnecessary escalation; successful autonomous intervention; correlated Kernel failure; rule gap; Authority Profile weakness; inappropriate autonomy level; successful self-regulation.

Create or prepare for a controlled Kernel Lessons Learned record type. Kernel Lessons Learned may eventually feed: rule improvement proposals; test additions; Authority Profile recommendations; software improvement proposals; DIM changes.

---

# 16. SELF-REGULATION

Future Kernel governance shall be capable of detecting deterioration in its own performance. Possible conditions: rising rollback rate; rising override rate; repeated failed decisions; abnormal Kernel crashes; rule-registry mismatch; stale Authority Profiles; unexplained consensus; unresolved disagreement; test degradation; repeated audit conditions; suspicious autonomy creep.

Where preauthorized, fail-safe responses may include: reducing autonomy; suspending a DIM; requiring manual approval; increasing review; forcing revalidation; quarantining a rule revision; blocking deployment.

**Autonomy reduction may be automatic only under explicit preapproved fail-safe authority. Autonomy expansion may never occur automatically.**

---

# 17. SOFTWARE SELF-STEWARDSHIP GOVERNANCE

If HF-ENGINE or M-AI eventually reaches software stewardship, the same Kernel that proposes a software change shall never be its sole approver.

```text
Operational Kernel → Improvement Proposal → Architecture Review
→ Security Review → Governance / Authority Review
→ Test / Validation Review → Adversarial Challenge
→ Release Authorization → Host-Side Deployment
→ Post-Deployment Effectiveness Review
```

Do not implement Level 5 autonomy now. Preserve the architecture so Level 5 is possible later.

---

# 18. CURRENT HF-ENGINE HUMAN RELEASE BOUNDARY

## 18.1 The principle

The system may autonomously **prepare** controlled training revisions from organizational learning. It may never autonomously make a revision the **effective, controlled version**. Preparation is unlimited within an approved Authority Profile; **release is always a human act at this maturity level.**

Plain statement for the UI and dossier: *"The engine continuously prepares controlled revisions from organizational learning; qualified personnel review the exact changes and release or reject them."*

## 18.2 What an approved Authority Profile MAY do without a human click

Ingest evidence; associate it to existing lessons; detect recurrence; determine that an approved lesson needs review; draft a new lesson revision; draft changed questions and scenarios; determine proposed applicability, audience, recurrence; compile impact information; generate the tracked-change package; and place the revision into `AWAITING_HUMAN_RELEASE`. Every such act is recorded as a `MaiGovernedDecision`. The Authority Profile is fail-closed by default (`humanApprovalPerInstance` defaults `true`; a profile is inert until explicitly authorized).

## 18.3 What NO profile may EVER do at this maturity level — hard boundaries

The following are structurally prohibited at the current maturity level, enforced in code, not by configuration. No Authority Profile flag overrides them:

- Transition any content `AWAITING_HUMAN_RELEASE → APPROVED_EFFECTIVE`. This transition is structurally forbidden to any `SYSTEM:` principal — enforced in the release code path itself. A non-human actor attempting release is rejected and logged regardless of profile.
- Release `EMERGENCY_INTERIM` content autonomously — even emergency content requires a specifically authorized human release.
- Author or classify a Corrective Action; decide a CAR's `trainingClassification`; confirm a Lesson Learned (Draft→Approved); create CAR↔Lesson links; publish to the Knowledge Base; bypass product-safety escalation (`DualApprovalGate` always escalates, never auto-clears).
- Delete, silently retire, or mutate any historical revision, frozen manifest, or learner evidence.

## 18.4 Content revision lifecycle

```text
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

## 18.5 Rollback is a controlled forward event, never a status flip

Restoring earlier content is itself a new controlled revision (`Rev C — Rollback to Rev A content`), with reason, approver, and effective date. The sequence (Rev A → Rev B → Rev C) stays intact; Rev B is never erased. Rollback automatically runs impact analysis reusing the existing recall/supersession engine: learners trained on the superseded revision, active assignments, future packages, derived assessments, open effectiveness reviews, affected certificates, downstream atoms/scenarios, policy-pack relationships, whether corrective retraining is required.

## 18.6 This boundary and the Progressive Autonomy framework

The `AWAITING_HUMAN_RELEASE → APPROVED_EFFECTIVE` human-release requirement is current Level 1. It may be reconsidered in the future only through the Progressive Autonomy framework defined in this Charter (§4), subject to §5's Regulatory/Policy Ceiling and fail-closed Mandate default, and never by a configuration change alone.

---

# 19. TRACK-CHANGES RELEASE CONTROL

HF-ENGINE shall provide controlled revision comparison before human release.

Required display: current approved revision; proposed revision; text additions, deletions, modifications; learning-objective changes; scenario changes; question changes; scoring changes; audience/role/site changes; recurrence changes; effectiveness criteria changes; source additions/removals; Policy Pack impact; learner-duration impact; Kernel assessments; AI Assist contribution (clearly labelled advisory).

Human release actions: Approve Revision; Approve With Edits; Return for Rework; Reject Revision; Roll Back.

Rollback shall create a new controlled revision. History shall remain intact.

---

# 20. NEAR-TERM BUILD BOUNDARY

**Do not build the live federated Kernel council yet.** The immediate HF-ENGINE build shall remain focused on the core continuous-learning differentiator.

## A. Fix Governance Persistence Bug
Correct the Learning Intervention Appropriateness Review checkbox persistence issue. Required tests: unchecked persists false; checked persists true; mixed states persist; UI reload matches DB; gating uses persisted values; audit record matches the decision.

## B. Build Native Lessons Learned
Implement: create; submit; review; request evidence; approve no-training-required; approve learning-intervention-required; reject; supersede; archive; positive lesson support; source linking.

## C. Build CAR / Corrective Action Workflow or Import
Support: issue; investigation; causal linkage; corrective actions; owner; due date; effectiveness; Lesson Learned linkage; training appropriateness.

## D. Build Track-Changes Lesson Revision
Implement: current revision; proposed revision; source-backed change rationale; exact diff; assessment changes; audience changes; impact analysis.

## E. Build Human Release / Reject / Rework / Rollback
Preserve complete revision history.

## F. Feed Released Revision Into Curriculum Compiler
The next applicable recurrent learner package shall automatically use the released revision. Historical packages remain immutable.

---

# 21. MULTI-KERNEL FUTURE SEAMS — PREPARATION ONLY

The following may be implemented now only as **persistence and interface seams**. Do not instantiate a live council.

## G. Multi-Kernel Participation Seams
Prepare schema/interfaces for future: Kernel identity; Kernel charter; participation; vote; dissent; abstention; quorum policy; Oversight assessment. No production decision shall depend on multi-Kernel quorum unless explicitly authorized later.

## H. Authority Performance Metrics
Begin collecting: proposal count; human acceptance; substantive edit; rejection; rollback; recurrence; effectiveness; applicability errors; override; disagreement; defects; boundary violations. These metrics are observational only. They shall not automatically change authority.

---

# 22. DO NOT OVERBUILD THE FEDERATION

Do not: scaffold eleven active Kernels; implement quorum-based release now; implement autonomous lesson release now; implement autonomous Authority Profile expansion; implement software self-modification; implement multi-agent orchestration merely to match future architecture.

The near-term objective is to prove the real organizational-learning loop.

---

# 23. REQUIRED NEAR-TERM WALKTHROUGH

Before claiming the core HF continuous-learning engine is operational, demonstrate:

```text
NCR → CAR → Lesson Learned → Existing lesson identified
→ Proposed tracked-change revision → Human review
→ Rev B APPROVED_EFFECTIVE → Curriculum Compiler includes Rev B
→ Historical Rev A learner package remains unchanged
→ Learner completes new recurrent package → Effectiveness recorded
→ CAR / Lesson Learned receives feedback
```

Then demonstrate rollback:

```text
Rev B → Rollback requested → Impact analysis
→ Authorized rollback → Rev C created using prior approved content
→ History preserved
```

---

# 24. HONEST COMPLETION STANDARD

Do not claim the unique continuous-learning engine is complete merely because: a Learning Atom exists; an assessment works; an assignment works; a lesson can be seeded directly into the DB; a Kernel condition fires.

The differentiator is proven only when: real organizational learning enters through a supported workflow or ingestion path; the system creates or updates a controlled lesson; the exact change is reviewable; the change is governed; it is released under the current authority model; future recurrent training changes; historical training remains immutable; effectiveness feeds back into the organizational-learning record.

---

# 25. FINAL ARCHITECTURAL PRINCIPLE

HF-ENGINE shall evolve toward:

> A self-regulating Human Factors organizational-learning system in which operational evidence continuously becomes governed knowledge, multiple independent Kernels eventually challenge and validate decisions, autonomy grows only through evidence-earned and policy-bounded Authority Profiles, no single Kernel becomes an unchecked decision point, Oversight remains independent, absence of authority is denial, and humans retain permanent constitutional authority to inspect, intervene, realign, freeze, and roll back the system.

Build today's product so this future remains possible. Do not build tomorrow's autonomy before today's learning loop is complete.

---

# APPROVAL BLOCK

| Field | Value |
|---|---|
| Document | HF-ENGINE Progressive Autonomy Charter Rev A |
| Document ref | HFPAC-CCB-2026-001 |
| Governing class | Constitutional — `docs/02-controlled/` |
| Implements | MAI-ARCH-003 (Bounded Autonomous Authority) at HF-ENGINE product scope |
| Drafted by | Claude from owner's 2026-08-12 design direction and review; no independent authority |
| Constitutional additions | §1.3 valid-override definition (auth-based, not merit-based); §2A Absence of Authority Is Not Authority; §5 Human Accountability Mandate fail-closed default; §18 subsumed from `HF-ENGINE-AUTHORITY-MODEL-DRAFT.md` |
| Subsumed documents | `docs/02-controlled/HF-ENGINE-AUTHORITY-MODEL-DRAFT.md` — see §SUPERSESSION below |
| Reviewed & approved by | ______________________ (Brian R. Olea) |
| Approval ref | HFPAC-CCB-2026-001-Rev-A |
| Effective date | ____________ (fill on approval — not backdated) |
| Status on approval | Removes DRAFT — becomes effective; governs all HF-ENGINE autonomy decisions |

---

# SUPERSESSION NOTE

`docs/02-controlled/HF-ENGINE-AUTHORITY-MODEL-DRAFT.md` is **SUPERSEDED AND REFERENCE-ONLY** upon approval of this Charter. Its content is fully subsumed into §18 of this document. Do not implement from it, do not issue it as controlled, and do not treat its approval block as a governing authority. It may be moved to `docs/99-superseded/` after the owner confirms this Charter is effective.

The Rev-A revision control directive (`docs/01-directives/PHASE-REVISION-CONTROL-DIRECTIVE.md`) points to `docs/02-controlled/HF-ENGINE-AUTHORITY-MODEL-*.md` — that pointer now resolves to this Charter. No change to the directive is required.
