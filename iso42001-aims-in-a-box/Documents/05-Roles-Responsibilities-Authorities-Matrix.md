# Roles, Responsibilities & Authorities Matrix

**Document ID:** [AIMS-DOC-05]
**Version:** [1.0]
**Owner:** [AIMS Manager / AI Governance Lead]
**Approved by:** [Top Management — Name, Title]
**Effective date:** [DD Month YYYY]
**Review cycle:** [Annually, or upon organizational/role change]

---

## 1. Purpose

This matrix defines who does what in [The Organization]'s AI Management System (AIMS) — the
specific roles, their responsibilities, and the authority each role holds to make or veto
AI-related decisions. It exists to satisfy the intent of ISO/IEC 42001 Clause 5.3 and the
related Annex A control area on internal organization (A.3), which call for top management to
assign and communicate responsibilities and authorities relevant to the AIMS, so that the system
operates through defined accountability rather than informal, ambiguous ownership.

In plain terms: when something goes wrong with an AI system, "someone should have caught that"
is not an acceptable answer. This document exists so that, for every AIMS activity, there is a
named role that is accountable, and everyone else knows who to escalate to.

## 2. Scope

Covers all roles with defined responsibility or authority under the AIMS, across all AI systems
within scope (`02-AIMS-Scope-and-Context-Statement.md`).

## 3. Defined Terms (RACI convention used below)

| Letter | Meaning |
|---|---|
| R — Responsible | Does the work / owns execution of the activity. |
| A — Accountable | Ultimately answerable for the outcome; approves/signs off; only one "A" per activity. |
| C — Consulted | Provides input before the activity is finalized. |
| I — Informed | Notified of the outcome after the fact. |

## 4. Key Roles — Definitions

| Role | Definition |
|---|---|
| Top management [Name/Title] | The individual or body with ultimate accountability for the AIMS, its resourcing, and its outcomes. |
| AIMS Manager / AI Governance Lead [Name/Title] | Day-to-day owner of the AIMS; coordinates all AIMS processes; primary point of contact for internal and external AIMS queries. |
| AI System Owner [Name/Title, one per in-scope system] | Accountable for a specific AI system's compliant operation, risk posture, and lifecycle decisions. |
| Risk Owner [Name/Title] | Accountable for tracking and treating a specific risk entry through to closure or accepted residual risk. |
| Data Governance Lead [Name/Title] | Accountable for data quality, provenance, and lawful basis for data used in AI systems. |
| Information Security Lead [Name/Title] | Accountable for security controls protecting AI systems and their data. |
| Legal / Compliance Lead [Name/Title] | Accountable for identifying and interpreting legal/regulatory obligations affecting AI systems. |
| Internal Auditor [Name/Title, may be external/contracted] | Independently verifies the AIMS is operating as documented. |
| All personnel | Follow AI-related policies and procedures relevant to their role; report concerns. |

## 5. RACI Matrix — Core AIMS Activities

| Activity | Top Mgmt | AIMS Manager | AI System Owner | Risk Owner | Data Gov. Lead | InfoSec Lead | Legal/Compliance | Internal Audit |
|---|---|---|---|---|---|---|---|---|
| Approve AI Policy | A | R | C | I | I | I | C | I |
| Maintain Scope & Context statement | A | R | C | — | — | — | C | I |
| Identify interested parties/requirements | I | A | C | — | — | C | R | I |
| Conduct AI risk assessment | I | A | R | C | C | C | C | I |
| Approve risk treatment plan | A | R | C | R | C | C | C | I |
| Maintain Statement of Applicability | A | R | C | — | — | C | C | I |
| Conduct AI system impact assessment | I | C | R | C | C | C | A/C | I |
| Set AI objectives | A | R | C | — | — | — | — | I |
| Approve new AI system for deployment | A | R | R | C | C | C | C | I |
| Manage AI system lifecycle (change control) | I | C | A/R | C | C | C | C | I |
| Data quality/provenance controls | I | C | C | A/R | — | C | C | I |
| Security controls for AI systems | I | C | C | — | C | A/R | — | I |
| Third-party/vendor AI due diligence | I | A | R | C | C | C | C | I |
| Deliver competence/awareness training | I | A | C | — | — | — | — | I |
| Conduct internal AIMS audit | I | C | I | I | I | I | I | A/R |
| Investigate nonconformity / incident | I | A | R | C | C | C | C | C |
| Conduct management review | A | R | C | I | I | I | I | C |

*Tailor this matrix to [The Organization]'s actual org chart — the roles above are a
representative minimum, not a mandatory headcount. Small organizations may combine several roles
in one person; the accountability should still be explicit even when one person wears several
hats. Add rows for Tier 3/4 activities as those procedures are adopted.*

## 6. Authorities

| Role | Specific authority granted |
|---|---|
| Top management | Sole authority to approve the AI Policy and any AIMS scope change; final decision on residual risk acceptance above [threshold]. |
| AIMS Manager | Authority to require any AI System Owner to pause deployment pending an overdue risk or impact assessment. |
| AI System Owner | Authority to approve minor, low-risk changes to their system within [defined change-control thresholds]; must escalate above threshold. |
| Risk Owner | Authority to accept residual risk up to [defined threshold]; above threshold requires top management sign-off. |
| Internal Auditor | Authority to access any AIMS record needed for audit, independent of AI System Owner objection. |

## 7. Roles and Responsibilities (for this document itself)

| Role | Responsibility |
|---|---|
| Top management | Approves this matrix and any change to named roles or authorities. |
| AIMS Manager | Owns and maintains this matrix; keeps named individuals current as personnel change. |
| HR / People function | Notifies the AIMS Manager of role changes affecting named individuals in this matrix. |

## 8. Review and Maintenance

Reviewed at least [annually], and updated immediately whenever a named individual leaves a role
— accountability must never have a gap.

| Version | Date | Change description | Approved by |
|---|---|---|---|
| 1.0 | [DD Month YYYY] | Initial issue | [Name/Title] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
Roles, Responsibilities & Authorities Matrix is proprietary software of Conform-Edge Quality Consulting LLC
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
