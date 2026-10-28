
# Third-Party & Customer AI Requirements Flow-down Template

**Document No.:** [AIMS-T-17]
**Version:** [1.0]
**Effective Date:** [YYYY-MM-DD]
**Owner:** [AI Governance Lead / Procurement Lead]
**Approved By:** [Top Management Role/Name]
**Review Cycle:** [Annually, and at each new supplier/customer AI contract]
**Applies to control intent:** ISO/IEC 42001:2023 Annex A.10 (Third-Party and Customer Relationships)

---

## 1. Purpose

[The Organization]'s AI supply chain runs two directions: it relies on third parties (AI vendors,
data providers, model hosting, outsourced development) whose behavior affects its own AIMS, and it
has customers/business partners who impose their own AI-related requirements on
[The Organization]. This document sets out how requirements are identified, flowed down into
contracts and internal controls, and verified in both directions.

## 2. Scope

Applies to: (a) third parties supplying an AI system, AI component, training data, or AI-related
service used in an in-scope system; (b) customers or business partners who impose AI-specific
requirements on [The Organization] as a condition of doing business (e.g., a customer's AI
acceptable-use policy, a right-to-audit clause, a model documentation requirement).

## 3. Defined Terms

| Term | Meaning |
|---|---|
| Third-party AI component | Any model, dataset, API, or AI-enabled tool [The Organization] did not build in-house but incorporates into an in-scope system. |
| Flow-down | Passing a requirement [The Organization] is subject to (from a customer, regulator, or its own policy) down into a contract, SOW, or internal control so a supplier is bound by it too. |
| Requirement traceability | The ability to show, for any given customer or regulatory requirement, exactly which AIMS control or contract clause satisfies it. |

## 4. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| AI Governance Lead | Maintains this template and the requirements traceability matrix; advises on which requirements must flow down. |
| Procurement / Contracts | Ensures flow-down clauses are included in supplier contracts/SOWs before signature. |
| Sales / Account Management | Captures customer-imposed AI requirements at the proposal/contract stage and routes them to the AI Governance Lead. |
| AI System Owner | Confirms a specific supplier/component actually meets flowed-down requirements before use in their system. |
| Legal | Reviews contractual language for enforceability and consistency with [The Organization]'s AI Policy. |

## 5. Procedure

### 5.1 Pre-engagement evaluation of third-party AI suppliers
Before contracting with a new AI supplier (model vendor, data provider, AI-enabled SaaS, outsourced
development firm), [The Organization] evaluates, at minimum:
- Whether the supplier can provide documentation equivalent to a model card (Document 15) or
  sufficient information to build one.
- Data rights/provenance the supplier can attest to for any data it supplies or trains on.
- The supplier's own AI governance maturity (does it have a policy, incident process, security
  certifications) proportionate to how critical/high-risk the use case is (per Document 9).
- Security and data protection posture (existing supplier/vendor security assessment process may be
  reused).

### 5.2 Standard flow-down requirements (contractual checklist)
The following are considered for inclusion in any AI supplier contract; not all apply to every
engagement — select per risk tier and rights needed.

| # | Flow-down Requirement | Applies When |
|---|---|---|
| 1 | Supplier will provide model documentation sufficient to populate Document 15 fields | Supplier's model/component is embedded in an in-scope system |
| 2 | Supplier discloses training data sources/rights basis to the extent it is able | Data provenance is material to risk tier |
| 3 | Supplier notifies [The Organization] of material model changes/retraining | Ongoing/subscription-based AI service |
| 4 | Supplier notifies [The Organization] of known defects, safety issues, or security incidents within [X days] | All AI suppliers |
| 5 | Data protection / confidentiality terms consistent with [The Organization]'s data policy | Any personal or confidential data shared with supplier |
| 6 | Right to audit or request evidence of supplier's AI governance controls | Higher-risk use cases (Tier [High]) |
| 7 | Restrictions on sub-outsourcing / further AI supply chain without notice | All AI suppliers |
| 8 | IP ownership/license terms for outputs generated using the supplier's system | Any generative/content-producing system |
| 9 | Defined exit/termination assistance (data return/deletion, transition support) | All AI suppliers |
| 10 | Liability/indemnity allocation for AI-related harm proportionate to risk tier | Higher-risk use cases |

### 5.3 Capturing customer/business-partner requirements
When a customer or partner imposes AI-specific requirements (in an RFP, MSA, or side letter), Sales/
Account Management routes the requirement to the AI Governance Lead, who logs it in the Customer
Requirements Register (Section 7.2) and maps it to the internal AIMS control(s) that satisfy it —
or flags a gap requiring a decision (accept the requirement and close the gap, negotiate, or decline
the business).

### 5.4 Ongoing monitoring
Third-party AI suppliers material to a Tier [High/Medium] system are reviewed at least
[annually] against the requirements in 5.2 (renewed attestation, updated documentation, incident
history check). Customer requirements are reviewed when the underlying AIMS controls change
materially (e.g., a change to Document 13 or 14) to confirm continued compliance.

### 5.5 Handling supplier non-compliance
Where a supplier fails to meet a flowed-down requirement (e.g., stops providing model updates,
suffers an incident it fails to disclose in time), the AI System Owner logs a nonconformity
(Document 20) and assesses whether continued use of that supplier's component is acceptable, needs
compensating controls, or requires replacement.

### 5.6 Exit / termination
On contract exit with an AI supplier, [The Organization] confirms data return/deletion per the
contract, updates the AI System Lifecycle record (Document 13) if the exit affects a live system
(triggering a retirement or supplier-substitution path), and archives the final supplier
documentation per Document 12.

## 6. Records Generated
Supplier AI evaluation records, executed contracts with flow-down clauses, Customer Requirements
Register, supplier review/re-attestation records, supplier non-compliance/exit records.

## 7. Templates

### 7.1 Supplier Flow-down Checklist (per supplier/contract)

| Requirement (from 5.2 list) | Applies (Y/N) | Included in Contract (Y/N, clause ref.) | Verified By | Date |
|---|---|---|---|---|
| [1–10] | [ ] | [ ] | [ ] | [ ] |

### 7.2 Customer/Partner AI Requirements Register

| Req. ID | Customer/Partner | Requirement (plain language) | Source (contract/RFP clause) | Mapped AIMS Control/Document | Status (Met/Gap/Negotiating) | Owner | Last Reviewed |
|---|---|---|---|---|---|---|---|
| [001] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

### 7.3 Requirements Traceability Matrix (summary view)

| Source Requirement | Internal AIMS Document/Control | Evidence Location | Verified (Date) |
|---|---|---|---|
| [Customer X — model documentation clause 4.2] | [Document 15 — Model Card] | [ ] | [ ] |
| [Supplier Y contract — incident notification] | [Document 16 — Responsible Use Procedure §5.7] | [ ] | [ ] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
Third-Party & Customer AI Requirements Flow-down Template is proprietary software of Conform-Edge Quality Consulting LLC
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
