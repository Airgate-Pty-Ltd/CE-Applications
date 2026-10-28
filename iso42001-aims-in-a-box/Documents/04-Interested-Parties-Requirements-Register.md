# Interested Parties & Requirements Register

**Document ID:** [AIMS-DOC-04]
**Version:** [1.0]
**Owner:** [AIMS Manager / AI Governance Lead]
**Approved by:** [Top Management — Name, Title]
**Effective date:** [DD Month YYYY]
**Review cycle:** [Annually, or when a new interested party or requirement is identified]

---

## 1. Purpose

This procedure and register identify the parties who have a stake in how [The Organization]
develops and uses AI, what each of them needs or expects, and which of those needs and
expectations become binding requirements the AIMS must satisfy. It exists to satisfy the intent
of ISO/IEC 42001 Clause 4.2, which calls for the organization to determine relevant interested
parties and their requirements, and to keep that determination current.

In plain terms: an organization can't manage AI risk responsibly if it only thinks about its own
convenience. This register is where [The Organization] writes down, in one place, everyone who
has a legitimate stake in its AI decisions — including people who are affected by an AI system's
output but never chose to be a "customer" of it — and what each of them is owed.

## 2. Scope

Applies to all AI systems within the AIMS scope (`02-AIMS-Scope-and-Context-Statement.md`) and
to all parties, internal or external, with a legitimate interest in those systems.

## 3. Defined Terms

| Term | Working definition |
|---|---|
| Interested party | A person or organization that can affect, be affected by, or perceive itself to be affected by, [The Organization]'s AI-related decisions or activities. |
| Requirement | A need or expectation that is stated (e.g., in law, contract, or explicit request) or implied (generally expected, even if unstated). |
| Affected party | A specific sub-category of interested party: a person subject to or impacted by an AI system's output, whether or not they have a direct relationship with [The Organization] (e.g., an applicant scored by a screening model). |

## 4. Procedure

1. **Identify.** The AIMS Manager, with input from function leads (Legal, HR, Sales, Data
   Science, Security), brainstorms and lists all internal and external parties with a stake in
   AI governance, using the categories in Section 5 as a starting checklist.
2. **Determine needs and expectations.** For each party, determine what they need or expect from
   [The Organization]'s AI activity — through direct engagement (contracts, surveys, regulator
   guidance) or reasoned inference where direct engagement isn't practical.
3. **Classify as requirement.** Decide whether each need/expectation is a legal requirement,
   contractual requirement, or voluntary commitment, and whether it is currently relevant to the
   AIMS (i.e., actionable and in-scope) or noted for awareness only.
4. **Assess risk if unmet.** Note the consequence of failing to meet the requirement — this
   feeds directly into the AI Risk Register (`06`).
5. **Assign ownership.** Each requirement gets an accountable owner responsible for tracking
   whether it continues to be met.
6. **Review.** The register is reviewed at least [annually], when a new AI system is introduced,
   when regulation changes, or when a new party raises a concern.

## 5. Interested Parties & Requirements Register — Template

| ID | Interested Party | Category | Needs / Expectations | Requirement Type | Relevant to AIMS? | Risk if Unmet | Owner | Review Date |
|---|---|---|---|---|---|---|---|---|
| IP-01 | [Regulator — e.g., data protection authority] | External | Lawful, transparent, non-discriminatory processing | Legal | Yes | Regulatory enforcement, fines, forced remediation | [Legal/Compliance Lead] | [Date] |
| IP-02 | [Customers using AI-enabled product] | External | Accurate, safe, non-manipulative outputs; clear disclosure of AI use | Contractual / Voluntary | Yes | Customer harm, loss of trust, churn | [Product Owner] | [Date] |
| IP-03 | [Individuals affected by AI decisions but not customers — e.g., applicants] | External | Fair treatment, ability to contest an automated decision | Legal / Voluntary | Yes | Discrimination claims, reputational harm, legal liability | [AI System Owner] | [Date] |
| IP-04 | Employees / contractors | Internal | Clear guidance on acceptable AI use; job-impact transparency | Voluntary / Contractual (employment) | Yes | Misuse, morale/trust issues, unsafe workarounds | [HR Lead] | [Date] |
| IP-05 | Investors / ownership | Internal/External | Assurance that AI risk is managed; no undisclosed liability | Voluntary | Yes | Loss of confidence, valuation impact | [Top management] | [Date] |
| IP-06 | AI technology suppliers / model providers | External | Compliance with vendor terms of use; accurate usage reporting | Contractual | Yes | Contract breach, service withdrawal | [Procurement/IT Lead] | [Date] |
| IP-07 | Standards bodies / certification schemes | External | Conformance to referenced standard(s) if certification is sought | Voluntary (if pursuing certification) | Yes/No — [state] | Failed audit, inability to claim conformance | [AIMS Manager] | [Date] |
| IP-08 | General public / civil society | External | Responsible, non-harmful use of AI; environmental and societal impact awareness | Voluntary | [Yes/No — state basis] | Reputational harm, public backlash | [Top management / Comms] | [Date] |
| IP-09 | [Add organization-specific party] | [Internal/External] | [Describe] | [Legal/Contractual/Voluntary] | [Yes/No] | [Describe] | [Owner] | [Date] |

*Add rows as needed. Do not delete example rows without first confirming the corresponding
party genuinely does not apply — most organizations retain rows IP-01 through IP-06 in some
form.*

## 6. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| AIMS Manager | Owns and maintains this register; facilitates the annual review. |
| Function leads | Provide subject-matter input for parties/requirements in their domain (Legal for regulatory, HR for employee, Procurement for suppliers, etc.). |
| Top management | Reviews the register at management review and ensures resourcing to meet material requirements. |
| AI System Owners | Flag new interested parties or requirements arising from a specific system's deployment. |

## 7. Review and Maintenance

| Version | Date | Change description | Approved by |
|---|---|---|---|
| 1.0 | [DD Month YYYY] | Initial issue | [Name/Title] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
Interested Parties & Requirements Register is proprietary software of Conform-Edge Quality Consulting LLC
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
