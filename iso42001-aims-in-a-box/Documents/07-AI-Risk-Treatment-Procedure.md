# AI Risk Treatment Procedure

**Document ID:** [AIMS-DOC-07]
**Version:** [1.0]
**Owner:** [AIMS Manager / AI Governance Lead]
**Approved by:** [Top Management — Name, Title]
**Effective date:** [DD Month YYYY]
**Review cycle:** [Per treatment plan cycle; procedure reviewed annually]

---

## 1. Purpose

This procedure defines how [The Organization] decides what to do about AI risks identified
through `06-AI-Risk-Assessment-Procedure-and-Register.md`, selects and implements controls,
tracks treatment to completion, and formally accepts any residual risk. It exists to satisfy the
intent of ISO/IEC 42001 Clause 6.1.3, which calls for a documented risk treatment process linked
to a Statement of Applicability of controls, with a plan that is implemented and verified.

In plain terms: identifying a risk is only half the job. This procedure is how [The
Organization] turns "we found a problem" into "here is what we did about it, who approved
accepting what's left, and how we'll know if it comes back."

## 2. Scope

Applies to every risk entry in the AI Risk Register scored Medium or above (see `06`, Section
6.3), and to any Low-rated risk that top management or the AIMS Manager elects to treat anyway.

## 3. Defined Terms

| Term | Working definition |
|---|---|
| Risk treatment | The process of selecting and implementing measures to modify risk. |
| Treatment option | One of: avoid, reduce, transfer, share, or accept (Section 4). |
| Control | A measure that modifies risk — may be drawn from Annex A of the standard (see `08-Statement-of-Applicability.md`) or be organization-specific. |
| Residual risk | The risk level remaining after a selected treatment is implemented. |
| Risk acceptance | A documented, authorized decision to retain a risk at its current or residual level without further treatment. |

## 4. Treatment Options

For each risk requiring treatment, the Risk Owner selects one (or a combination) of:

1. **Avoid** — stop or do not start the activity that creates the risk (e.g., decline to deploy
   an AI system for a particular use case).
2. **Reduce** — implement controls that lower likelihood, impact, or both (the most common
   option — e.g., adding human review, improving training data, adding monitoring).
3. **Transfer** — shift some consequence to another party (e.g., contractual indemnification
   from a vendor, insurance).
4. **Share** — distribute the risk across parties without fully transferring it (e.g., joint
   liability arrangements with a technology partner).
5. **Accept** — knowingly retain the risk at its current level, with formal sign-off, because
   treatment cost/effort is disproportionate to the exposure or no further reasonable control
   exists.

*"Accept" is a valid, legitimate outcome of this procedure — but it must be an explicit,
authorized decision recorded in Section 6, never a default that happens because nobody followed
up.*

## 5. Procedure

1. **Intake.** Risks scored Medium or above in the AI Risk Register are routed to this
   procedure automatically; the Risk Owner from the register carries through as the default
   Treatment Owner unless reassigned.
2. **Select treatment option(s).** The Treatment Owner, consulting the AI System Owner and
   relevant specialists (Legal, InfoSec, Data Governance as applicable), selects the treatment
   option(s) from Section 4.
3. **Select controls.** Where "Reduce" is selected, controls are chosen with reference to the
   Annex A control catalogue in `08-Statement-of-Applicability.md` where applicable, plus any
   organization-specific controls needed. Each selected control is logged against the SoA.
4. **Draft the treatment plan.** Complete a row in the Risk Treatment Plan template (Section 6)
   describing the action, resources, owner, and target date.
5. **Approve.** Treatment plans for High/Critical risks require AIMS Manager sign-off; plans
   that involve accepting a High/Critical residual risk require top management sign-off.
6. **Implement.** The Treatment Owner executes the plan and updates status as work progresses.
7. **Verify.** Once implemented, the AIMS Manager (or Internal Audit, for higher-risk items)
   verifies the control is operating as intended before the risk is marked "Closed" or
   "Residual risk accepted."
8. **Update the register.** The residual risk level is recalculated and written back to the AI
   Risk Register (`06`).
9. **Monitor.** Accepted residual risks and implemented controls are re-checked at the next
   scheduled risk review (per `06`, Section 5) to confirm they remain valid.

## 6. AI Risk Treatment Plan — Template

| Risk ID (from Register) | Treatment Option | Selected Controls (ref. SoA / Annex A, or org-specific) | Action Description | Resources Required | Owner | Target Date | Status | Verification Method | Residual Risk Level | Approval |
|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | Reduce | Age-verification signal (org-specific); content-filtering control (A.9 — responsible use, ref. SoA) | Add a secondary age-signal check before serving recommendations flagged as mature content | [Engineering time — est. 2 sprints] | [AI System Owner] | [DD/MM/YYYY] | In Progress | Manual QA sample of 100 flagged recommendations post-release | Medium (pending verification) | [AIMS Manager] |
| RISK-002 | Reduce | Bias-testing control (A.5 — impact assessment, ref. SoA); documented-information control for training data lineage | Re-run fairness testing across protected classes; retrain or re-weight model; institute quarterly bias audit | [Data science time; may require new labeled test set] | [AI System Owner] | [DD/MM/YYYY] | Open | Statistical parity / disparate-impact test against defined thresholds | High (pending remediation) — escalated to top management | [Top management] |
| RISK-003 | Reduce | Access control and output monitoring (A.9, A.10, ref. SoA) | Implement prompt-injection detection and tighten data-access scoping for the chatbot's retrieval layer | [InfoSec + engineering time] | [InfoSec Lead] | [DD/MM/YYYY] | Open | Red-team test against updated configuration | Low (target) | [AIMS Manager] |
| RISK-004 | Accept (with monitoring) | Vendor SLA monitoring; version-pinning where offered | Formally accept residual vendor-dependency risk; monitor vendor changelog and SLA compliance monthly | [Procurement/IT time — ongoing] | [Procurement/IT Lead] | N/A — standing acceptance | Accepted | Monthly SLA/changelog review | Medium — accepted | [Top management] |
| RISK-005 | [Avoid/Reduce/Transfer/Share/Accept] | [Reference controls] | [Describe] | [Describe] | [Owner] | [Date] | [Open/In Progress/Closed] | [Describe] | [Rating] | [Approver] |

## 7. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| AIMS Manager | Owns this procedure; approves treatment plans for High/Critical risks; tracks overall treatment-plan completion. |
| Treatment Owner (typically the Risk Owner) | Drafts and executes the treatment plan; reports status. |
| Top management | Approves acceptance of High/Critical residual risk; reviews treatment-plan status at management review. |
| Internal Audit | Independently verifies that implemented controls operate as claimed, on a sampling basis. |

## 8. Review and Maintenance

| Version | Date | Change description | Approved by |
|---|---|---|---|
| 1.0 | [DD Month YYYY] | Initial issue | [Name/Title] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
AI Risk Treatment Procedure is proprietary software of Conform-Edge Quality Consulting LLC
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
