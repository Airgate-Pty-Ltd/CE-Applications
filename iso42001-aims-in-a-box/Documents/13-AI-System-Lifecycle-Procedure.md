
# AI System Lifecycle Procedure

**Document No.:** [AIMS-P-13]
**Version:** [1.0]
**Effective Date:** [YYYY-MM-DD]
**Owner:** [AI Governance Lead / Head of AI Development]
**Approved By:** [Top Management Role/Name]
**Review Cycle:** [Annually]
**Applies to control intent:** ISO/IEC 42001:2023 Annex A.6 (AI System Lifecycle)

---

## 1. Purpose

This procedure defines the stages an AI system moves through at [The Organization] — from initial
concept to final retirement — and the stage-gate criteria that must be satisfied before a system
moves to the next stage. The intent is to make sure risk, data, testing, and human-oversight
questions get answered at the point where they are cheapest to fix, not discovered after deployment.
This procedure works together with Document 9 (AI System Impact Assessment) and Document 6/7
(Risk Assessment/Treatment), which feed decisions at each gate.

## 2. Scope

Applies to every AI system [The Organization] designs, develops, procures, integrates, or
significantly modifies, that is in scope of the AIMS (as defined in Document 2 — AIMS Scope &
Context). This includes systems built in-house, systems built by a third party on
[The Organization]'s behalf, and third-party/vendor AI systems that [The Organization] configures,
fine-tunes, or embeds into its own products or operations. A "significant modification" (retraining
on materially new data, a change of intended use, a material architecture change) re-enters this
lifecycle at the appropriate stage rather than being treated as routine maintenance.

## 3. Defined Terms

| Term | Meaning |
|---|---|
| AI system | A system that generates outputs (predictions, recommendations, content, decisions) influencing an environment, from inputs it receives, using machine learning and/or other AI techniques. |
| Stage gate | A defined checkpoint at which named exit criteria must be met and a named approver must sign off before work proceeds to the next stage. |
| System Owner | The individual accountable for the AI system across its whole lifecycle, including after deployment. |
| Rollback plan | A pre-agreed method to revert to a prior system version or fall back to a manual/non-AI process if deployment fails or causes harm. |
| Residual risk | The risk remaining after treatment, which someone with the authority to do so has knowingly accepted (see Document 7). |

## 4. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| AI System Owner | Accountable end-to-end; convenes gate reviews; owns post-deployment monitoring. |
| Development Lead | Executes Concept/Design and Development stages; produces required artifacts. |
| Verification & Validation (V&V) Lead | Independent (not the developer) sign-off that testing was adequate and results meet acceptance criteria. |
| Deployment Approver | Authorizes go-live; distinct from the Development Lead for higher-risk systems (see Document 9's risk tiering). |
| Operations Owner | Runs post-deployment monitoring and incident response once live. |
| AI Governance Lead | Maintains this procedure; spot-checks gate evidence; escalates concerns to management review. |

## 5. Lifecycle Stages & Stage-Gate Criteria

### Stage 1 — Concept & Design
**Purpose:** Define what the system is for, who it affects, and what "acceptable" looks like before
any building starts.

**Required activities:**
- Document the intended use, intended users, and out-of-scope uses.
- Complete an initial AI System Impact Assessment (Document 9) to establish a risk tier.
- Identify data sources likely to be needed (feeds into Document 14).
- Define preliminary success criteria and acceptable-performance thresholds.
- Identify human oversight approach (human-in-the-loop, human-on-the-loop, or human-out-of-the-loop
  with defined justification).

**Exit criteria (Gate 1 — Design Approval):**
- [ ] Intended use and out-of-scope uses documented and approved.
- [ ] Initial impact assessment completed and risk tier assigned.
- [ ] Design approach and success criteria documented.
- [ ] Data sourcing feasibility confirmed (no known blocking legal/rights issue).
- **Approver:** [AI System Owner + AI Governance Lead]

### Stage 2 — Development / Build
**Purpose:** Build the system (or configure/fine-tune a third-party system) against the approved
design.

**Required activities:**
- Prepare and document training/tuning data per Document 14.
- Select and document the model/algorithmic approach and key design choices.
- Conduct developer-level testing (unit/functional) as work progresses.
- Draft initial technical documentation (architecture, data lineage, known constraints).
- Draft the initial Model Card / Information for Interested Parties record (Document 15).

**Exit criteria (Gate 2 — Build Complete):**
- [ ] System functions as designed in a controlled/test environment.
- [ ] Data documentation complete per Document 14.
- [ ] Draft model card complete.
- [ ] No unresolved blocking defects.
- **Approver:** [Development Lead, reviewed by AI System Owner]

### Stage 3 — Verification & Validation
**Purpose:** Independently confirm the system meets its acceptance criteria and that risks
identified in Stage 1 have been adequately treated, before real-world use.

**Required activities:**
- Execute the test plan: functional accuracy, robustness/edge cases, security testing, and — where
  the risk tier warrants it — bias/fairness testing against defined subgroups.
- Verify human oversight mechanisms actually work as designed (e.g., an override control functions,
  an escalation path is reachable).
- Re-run or update the impact assessment and risk register if testing reveals new risks.
- Independent V&V sign-off (someone other than the builder).

**Exit criteria (Gate 3 — Verification Complete):**
- [ ] Acceptance criteria from Stage 1 met, or deviations formally risk-accepted by an authorized
  approver.
- [ ] Residual risk documented and accepted per Document 7.
- [ ] Human oversight mechanism tested and functioning.
- [ ] V&V Lead sign-off obtained, independent of the Development Lead.
- **Approver:** [V&V Lead]

### Stage 4 — Deployment / Release
**Purpose:** Move the system into production/live use in a controlled way.

**Required activities:**
- Finalize deployment plan: rollout approach (phased/pilot/full), rollback plan, and monitoring plan.
- Confirm affected personnel are trained (Document 11) and informed (Document 15 published/shared
  as appropriate to the audience).
- Confirm change management/communication to affected interested parties per Document 4.
- Obtain formal deployment approval.

**Exit criteria (Gate 4 — Deployment Approved):**
- [ ] Deployment and rollback plans documented.
- [ ] Monitoring plan defined (what is measured, how often, who reviews it, escalation thresholds).
- [ ] Relevant personnel trained/informed.
- [ ] Deployment Approver sign-off obtained.
- **Approver:** [Deployment Approver — independent of Development Lead for Tier [High] systems per Document 9]

### Stage 5 — Operation & Monitoring
**Purpose:** Confirm the system keeps performing as intended once live, and catch drift, misuse, or
emerging risk early.

**Required activities:**
- Monitor performance against the thresholds set in Stage 1/3 at the agreed frequency.
- Monitor for data or concept drift, unexpected outputs, and user-reported issues.
- Log and triage incidents per Document 16 (Responsible Use Procedure) and Document 20
  (Nonconformity & Corrective Action).
- Periodically (at minimum [annually], or on material change) re-assess impact/risk and update the
  model card.

**Exit trigger to Stage 6:** decision to retire, replace, or materially modify the system (a
material modification re-enters at Stage 1 or 2 depending on scope of change).

### Stage 6 — Retirement / Decommission
**Purpose:** Shut the system down safely, without leaving orphaned data, undocumented dependencies,
or an unclear transition for affected users.

**Required activities:**
- Document the reason for retirement and the transition/fallback plan for affected users/processes.
- Notify affected interested parties per Document 4 where the AI Policy or contract requires it.
- Determine data disposition (retain per schedule in Document 12, anonymize, or securely delete)
  and record the decision.
- Archive the final model card, risk register entries, and monitoring history per the retention
  schedule in Document 12.
- Confirm no other in-scope system depends on the retiring system before final shutdown.

**Exit criteria (Gate 6 — Retirement Complete):**
- [ ] Affected parties notified where required.
- [ ] Data disposition executed and recorded.
- [ ] Final records archived.
- [ ] System Owner confirms no live dependency remains.
- **Approver:** [AI System Owner + AI Governance Lead]

## 6. Stage-Gate Log Template

| System Name | Stage | Gate Criteria Met (Y/N) | Evidence Reference | Approver | Date | Decision (Go / No-Go / Conditional) |
|---|---|---|---|---|---|---|
| [ ] | [1–6] | [ ] | [ ] | [ ] | [ ] | [ ] |

## 7. RACI Summary

| Activity | System Owner | Development Lead | V&V Lead | Deployment Approver | Operations Owner |
|---|---|---|---|---|---|
| Design approval | A | R | C | I | I |
| Build | A | R | I | I | I |
| Verification | A | C | R | I | I |
| Deployment approval | A | C | C | R | I |
| Monitoring | A | I | I | I | R |
| Retirement | A | C | I | I | R |

*(R = Responsible, A = Accountable, C = Consulted, I = Informed)*

## 8. Related Documents
Document 6/7 (Risk Assessment/Treatment), Document 9 (AI System Impact Assessment), Document 14
(Data Management for AI), Document 15 (Model Card Template), Document 16 (Responsible Use
Procedure), Document 20 (Nonconformity & Corrective Action).

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
AI System Lifecycle Procedure is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction,
distribution, modification, or resale is prohibited. "Conform-Edge" and the
Conform-Edge mark are trademarks of Conform-Edge Quality Consulting LLC.
Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.

**Regulatory currency notice:** This document is authored intent-based from general
knowledge of ISO/IEC 42001:2023's structure and has NOT been verified against a
licensed copy of the published standard. Confirm clause references and control
language against the current official standard text before commercial sale or use
in a certification audit.
