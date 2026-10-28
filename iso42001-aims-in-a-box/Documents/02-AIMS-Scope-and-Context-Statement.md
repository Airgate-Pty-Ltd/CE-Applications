# AIMS Scope and Context Statement

**Document ID:** [AIMS-DOC-02]
**Version:** [1.0]
**Owner:** [AIMS Manager / AI Governance Lead]
**Approved by:** [Top Management — Name, Title]
**Effective date:** [DD Month YYYY]
**Review cycle:** [Annually, or upon significant organizational or AI-portfolio change]

---

## 1. Purpose

This statement documents how [The Organization] understands its own context, identifies the
factors that could affect its AI Management System (AIMS), and draws the boundary of what the
AIMS covers. It exists to satisfy the intent of ISO/IEC 42001 Clauses 4.1 (understanding the
organization and its context), 4.2 (understanding the needs and expectations of interested
parties, in summary form — the full register lives in document `04`), 4.3 (determining the
scope of the AIMS), and 4.4 (the AIMS and its processes, summarized here and detailed in
document `03`).

In plain terms: before an organization can manage AI responsibly, it has to be honest about
what kind of organization it is, what could go wrong given its situation, who cares about the
outcome, and exactly which systems and activities it is promising to govern. This document is
where that thinking is written down, so it isn't re-litigated every time someone asks "does the
AIMS cover this?"

## 2. Scope of This Document

This document itself is scoped to the analysis and scope-setting activity — not to be confused
with the *AIMS scope statement* it produces (Section 5), which is the actual boundary of AIMS
coverage. It applies organization-wide as an input to AIMS planning and is owned by the AIMS
Manager, with input from top management and relevant function leads.

## 3. Defined Terms

| Term | Working definition |
|---|---|
| Internal issue | A condition, capability, or constraint arising from inside [The Organization] that could affect its ability to achieve AIMS outcomes (e.g., technical capability, culture, governance maturity). |
| External issue | A condition arising from outside [The Organization] — market, legal, regulatory, technological, or societal — that could affect the AIMS. |
| AIMS scope | The defined boundary — organizational units, AI systems, sites, and activities — to which the AIMS applies. |
| Interested party | See `04-Interested-Parties-Requirements-Register.md` for the full definition and register. |

## 4. Understanding the Organization and Its Context (Clause 4.1 intent)

Clause 4.1's intent is that an organization actively identifies the internal and external issues
relevant to its purpose that affect its ability to achieve the intended outcomes of its AIMS —
not as a one-off exercise, but as a periodically revisited input to planning.

### 4.1.1 Internal context

| Factor | Current statement for [The Organization] |
|---|---|
| Business model / purpose | [Describe what the organization does and how AI supports or is part of that.] |
| AI maturity | [Describe current level of AI governance maturity — e.g., ad hoc, developing, established.] |
| Organizational structure | [Describe reporting lines relevant to AI decisions — e.g., who owns AI systems, who owns risk.] |
| Technical capability | [Describe in-house AI/ML/data-science capability vs. reliance on vendors.] |
| Culture and risk appetite | [Describe the organization's general appetite for AI-related risk — conservative, moderate, aggressive — and why.] |
| Resource constraints | [Describe budget, staffing, or time constraints relevant to AIMS operation.] |

### 4.1.2 External context

| Factor | Current statement for [The Organization] |
|---|---|
| Legal / regulatory environment | [List key jurisdictions and regimes relevant to the organization's AI use — e.g., EU AI Act, sector-specific regulation, general data-protection law.] |
| Market / competitive environment | [Describe competitive pressure to adopt AI, and any market expectations around responsible AI.] |
| Technological environment | [Describe the pace of change in the AI technologies the organization depends on, e.g., foundation-model providers, open-source models.] |
| Societal expectations | [Describe public and customer expectations around AI transparency, fairness, and safety relevant to the organization's sector.] |
| Supply chain | [Describe dependency on third-party AI vendors, cloud providers, or data suppliers.] |

*[The Organization] should revisit this section at least [annually] and whenever a new AI system,
regulation, or major market shift occurs.*

## 5. Understanding Interested Parties (Clause 4.2 intent — summary)

Clause 4.2's intent is to make sure the organization knows who has a stake in how it manages AI,
what they need or expect, and which of those needs become binding requirements on the AIMS. The
full, maintained register of interested parties and requirements is `04-Interested-Parties-Requirements-Register.md`.
Summary categories relevant to [The Organization]:

- Regulators and standards bodies
- Customers / end users of AI-enabled products or services
- Individuals affected by AI system outputs (who may not be customers — e.g., applicants,
  members of the public)
- Employees and contractors
- Investors / ownership
- Suppliers and technology partners
- [Other relevant party — add rows as needed]

## 6. Determining the Scope of the AIMS (Clause 4.3 intent)

Clause 4.3's intent is that the organization draws an explicit, defensible boundary around what
the AIMS covers, taking into account the context (Section 4) and interested party requirements
(Section 5), and states that boundary so anyone — auditor, employee, or customer — can tell
what's in and what's out.

### 6.1 AIMS Scope Statement

> The AI Management System of [The Organization] applies to [the design, development,
> deployment, and/or use of] the following AI systems, at the following sites/business units,
> supporting the following activities:

| In scope | Description |
|---|---|
| AI system(s) | [Name each AI system or class of AI systems covered — e.g., "Customer-facing recommendation engine," "Internal résumé-screening tool."] |
| Business unit(s) / site(s) | [List organizational units and locations covered.] |
| Lifecycle stages covered | [e.g., design, procurement, deployment, monitoring, retirement — state which stages are governed.] |
| Data covered | [State whether training data, operational data, or both are within scope.] |

### 6.2 Explicit exclusions

| Excluded item | Justification for exclusion |
|---|---|
| [e.g., Experimental/sandboxed AI not yet in production] | [e.g., Not yet used for any decision affecting customers or employees; will enter scope at pilot-to-production transition.] |
| [e.g., Third-party AI embedded in general office productivity tools] | [e.g., Treated under general IT/security policy, not as a standalone AIMS-governed system, because [The Organization] has no ability to modify or configure model behavior.] |

*Every exclusion must be justified — "convenient to exclude" is not, by itself, a valid reason.
Exclusions that remove a legally required control are not acceptable.*

## 7. The AIMS and Its Processes (Clause 4.4 intent — summary)

Clause 4.4's intent is that the organization doesn't just have a scope statement and a policy —
it operates the AIMS as a connected set of processes with clear inputs, outputs, and interactions,
consistent with a plan-do-check-act model of continual improvement. The full process map, with
process owners and interactions, is maintained in `03-AIMS-Manual-Process-Map.md`. This document
should be read alongside that one: this document defines *what* is in scope and *why*; the
process map defines *how* the AIMS actually runs day to day.

## 8. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| Top management | Approves the final AIMS scope statement and any change to it. |
| AIMS Manager | Leads the context review and scope-determination exercise; maintains this document. |
| Function leads (IT, Legal, HR, Data Science, etc.) | Provide input on context factors and scope boundaries relevant to their area. |

## 9. Review and Maintenance

This statement is reviewed at least [annually] and whenever the organization adds, retires, or
materially changes an AI system, or when regulatory context shifts. Changes to the AIMS scope
require top management approval and are recorded in the revision history below.

| Version | Date | Change description | Approved by |
|---|---|---|---|
| 1.0 | [DD Month YYYY] | Initial issue | [Name/Title] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
AIMS Scope and Context Statement is proprietary software of Conform-Edge Quality Consulting LLC
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
