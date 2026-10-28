# AIMS Manual and Process Map

**Document ID:** [AIMS-DOC-03]
**Version:** [1.0]
**Owner:** [AIMS Manager / AI Governance Lead]
**Approved by:** [Top Management — Name, Title]
**Effective date:** [DD Month YYYY]
**Review cycle:** [Annually, or upon significant process change]

---

## 1. Purpose

This manual describes how [The Organization]'s AI Management System (AIMS) actually operates as
a connected set of processes — what happens, in what order, who owns each step, and how the
pieces feed each other. It exists to satisfy the intent of ISO/IEC 42001 Clause 4.4, which calls
for the organization to establish, implement, maintain, and continually improve the AIMS,
including the processes needed and their interactions.

In plain terms: the AI Policy says *why*, the Scope statement says *what's covered*, and this
manual says *how it runs* — which document governs which activity, who does what, and how
information flows from risk identification through to management review and back into planning.

## 2. Scope

This manual covers the entire AIMS as bounded by `02-AIMS-Scope-and-Context-Statement.md`. It
is the reference document new AIMS participants should read first to understand how the
document set fits together operationally.

## 3. Defined Terms

| Term | Working definition |
|---|---|
| Process | A defined set of activities that transforms inputs into outputs — e.g., "AI Risk Assessment" takes a proposed or in-service AI system as input and produces a scored, treated risk entry as output. |
| Process owner | The role accountable for a given process operating as designed. |
| PDCA | Plan-Do-Check-Act — the continual-improvement cycle underlying the AIMS structure. |

## 4. AIMS Structure Overview

The AIMS is organized as a Plan-Do-Check-Act cycle:

- **Plan** — understand context and interested parties, set the AI Policy, determine scope,
  assess and plan treatment of AI risks, set AI objectives. (Documents 01, 02, 04, 05, 06, 07,
  10.)
- **Do** — operate AI systems day to day: competence and awareness, documented-information
  control, the AI system lifecycle, data management, responsible use, third-party management.
  (Tier 3 documents, e.g., 11–17.)
- **Check** — monitor, measure, audit, and assess actual performance against the plan. (Tier 4
  documents, e.g., 18, 20, 21.)
- **Act** — review the AIMS at the top, decide what changes, and feed corrections back into
  Plan. (Management review, document 19; corrective action, document 20.)

## 5. Document Hierarchy

```
Level 1 — AI Policy (01)
   sets direction and top-management commitment
        |
Level 2 — AIMS Scope & Context (02), this Manual (03)
   define boundary and operating model
        |
Level 3 — Procedures (Interested Parties Register 04, Roles Matrix 05,
   Risk Assessment 06, Risk Treatment 07, SoA 08, Impact Assessment 09,
   Objectives & Plans 10, and Tier 3/4 procedures as authored)
   define how each activity is actually carried out
        |
Level 4 — Records
   registers, logs, completed assessments, meeting minutes, training
   records — the evidence that the AIMS is operating as designed
```

## 6. Core AIMS Processes and Interactions

| # | Process | Owner | Key inputs | Key outputs | Feeds into |
|---|---|---|---|---|---|
| 1 | Context & interested-party review | AIMS Manager | Business changes, regulatory scan, stakeholder feedback | Updated Scope & Context Statement (02), updated Interested Parties Register (04) | Risk assessment; policy review |
| 2 | Policy setting/review | Top management | Context review, audit/management-review findings | AI Policy (01) | All downstream procedures |
| 3 | AI risk assessment | AIMS Manager / AI System Owners | New/changed AI system, incident reports, context changes | AI Risk Register entries (06) | Risk treatment; Statement of Applicability |
| 4 | AI risk treatment | AIMS Manager / Risk Owners | Risk register entries above threshold | Risk Treatment Plans (07), updated SoA (08) | Objectives & plans; operational controls |
| 5 | AI system impact assessment | AI System Owner | New AI system or significant change | Completed Impact Assessment (09) | Risk register; go/no-go decision for deployment |
| 6 | Objective setting | Top management / AIMS Manager | Policy commitments, risk treatment needs | AI Objectives & Plans (10) | Resourcing decisions; monitoring |
| 7 | Operation (lifecycle, data, competence, third-party, responsible use) | Function/system owners | Objectives, treatment plans, procedures | Operating records, training logs, model documentation | Monitoring; internal audit |
| 8 | Monitoring & measurement | AIMS Manager | KPIs, operating records | Performance data, dashboards | Internal audit; management review |
| 9 | Internal audit | Internal Auditor(s) | AIMS documents and records | Audit findings, nonconformities | Corrective action; management review |
| 10 | Corrective action | AIMS Manager / relevant owner | Nonconformities, incidents | Closed corrective actions | Risk register; policy/procedure updates |
| 11 | Management review | Top management | All of the above | Decisions, resource commitments, direction for next cycle | Policy (01); Objectives (10); Context (02) |

## 7. Clause-to-Document Cross-Reference

| ISO/IEC 42001 Clause (intent) | Governing AIMS document |
|---|---|
| 5.2 — AI Policy | `01-AI-Policy.md` |
| 4.1–4.4 — Context, interested parties (summary), scope, AIMS processes | `02-AIMS-Scope-and-Context-Statement.md`, this manual |
| 4.2 — Interested parties (detail) | `04-Interested-Parties-Requirements-Register.md` |
| 5.3 / A.3 — Roles, responsibilities, authorities | `05-Roles-Responsibilities-Authorities-Matrix.md` |
| 6.1.2 — Risk assessment | `06-AI-Risk-Assessment-Procedure-and-Register.md` |
| 6.1.3 — Risk treatment | `07-AI-Risk-Treatment-Procedure.md` |
| Annex A — Statement of Applicability | `08-Statement-of-Applicability.md` |
| 6.1.4 / A.5 — System impact assessment | `09-AI-System-Impact-Assessment-Procedure.md` |
| 6.2 — Objectives and planning | `10-AI-Objectives-and-Plans-Template.md` |
| 7.2–7.5 — Competence, awareness, documented information | [Tier 3 — to be authored] |
| A.6–A.10 — Lifecycle, data, transparency, responsible use, third parties | [Tier 3 — to be authored] |
| 9.1–9.3 / 10.2 — Monitoring, internal audit, management review, corrective action | [Tier 4 — to be authored] |

## 8. Roles and Responsibilities

| Role | Responsibility for this manual |
|---|---|
| Top management | Approves the process model and resources it. |
| AIMS Manager | Owns and maintains this manual; ensures process owners understand their interactions. |
| Process owners (per row in Section 6) | Operate their process as described and flag when reality diverges from the map. |

Full role definitions are in `05-Roles-Responsibilities-Authorities-Matrix.md`.

## 9. Review and Maintenance

This manual is reviewed at least [annually] or when a process is added, removed, or materially
changed — including when Tier 3/4 documents are authored and need to be added to Sections 6–7.

| Version | Date | Change description | Approved by |
|---|---|---|---|
| 1.0 | [DD Month YYYY] | Initial issue | [Name/Title] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
AIMS Manual and Process Map is proprietary software of Conform-Edge Quality Consulting LLC
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
