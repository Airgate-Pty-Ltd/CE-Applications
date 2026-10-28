# Statement of Applicability (Annex A Controls)

**Document ID:** [AIMS-DOC-08]
**Version:** [1.0]
**Owner:** [AIMS Manager / AI Governance Lead]
**Approved by:** [Top Management — Name, Title]
**Effective date:** [DD Month YYYY]
**Review cycle:** [Annually, or upon any change to control applicability]

---

## 1. Purpose

This Statement of Applicability (SoA) records, for every control in the reference Annex A
control catalogue, whether [The Organization] has determined it applicable, why, and its current
implementation status. It exists to satisfy the intent of the Annex A requirement in ISO/IEC
42001, which calls for the organization to compare its risk-treatment control needs against a
reference catalogue of controls, explicitly include or exclude each one with justification, and
keep that determination as a living, auditable record.

In plain terms: the SoA is the single document an auditor (internal or external) will ask for
first. It is the master cross-reference between "what risks did you find," "what controls did
you pick," and "can you prove it." Every "N" (not applicable) in this table must be defensible —
"we didn't think of it" is not a justification; "it does not apply because [reason]" is.

## 2. Scope

Covers every AI system within the AIMS scope (`02-AIMS-Scope-and-Context-Statement.md`). Where
applicability differs by system, note the exception in the Justification column rather than
marking the whole control inapplicable.

## 3. How to Use This Document

1. For each control, mark **Applicable** Yes or No.
2. Where **Yes**, state the justification (usually: a risk in the AI Risk Register, a legal/
   contractual requirement, or a voluntary policy commitment) and the related AIMS document or
   record that implements it.
3. Where **No**, state the justification for exclusion (e.g., "no third-party AI components are
   used," "system does not process personal data"). An exclusion that removes a legally required
   control is not acceptable and must be corrected before sign-off.
4. Record implementation status: **Not started / In progress / Implemented / Verified**.
5. Update whenever the AI Risk Register, AIMS scope, or applicable law changes.

## 4. Defined Terms

| Term | Working definition |
|---|---|
| Control | A measure — technical, procedural, or organizational — that modifies AI-related risk. |
| Applicability | A determination of whether a given reference control is relevant to [The Organization]'s AI systems and risk profile. |
| Implementation status | The current state of a control's rollout, independent of its applicability determination. |

## 5. Statement of Applicability — Control Table

*[ASSUMPTION — see notice below]: the control groupings and numbering (A.2–A.10) below reflect
general, on-hand knowledge of ISO/IEC 42001:2023's Annex A structure at authoring time. They have
NOT been checked against a licensed copy of the published standard. Before commercial sale or use
in a certification audit, verify the exact control numbers, titles, and count against the current
official standard and correct this table accordingly.*

| Control ID | Control Area / Name | Applicable (Y/N) | Justification | Implementation Status | Related AIMS Document(s) |
|---|---|---|---|---|---|
| A.2.1 | AI-related policies exist and are aligned to organizational policy | [Y/N] | [e.g., Required — AI Policy is the top-level governance document] | [Status] | `01-AI-Policy.md` |
| A.2.2 | AI policies address roles, responsibilities, and required behaviors | [Y/N] | [Justification] | [Status] | `01`, `05` |
| A.3.1 | Roles and responsibilities for AI governance are defined | [Y/N] | [Justification] | [Status] | `05-Roles-Responsibilities-Authorities-Matrix.md` |
| A.3.2 | Reporting lines and escalation paths for AI issues are defined | [Y/N] | [Justification] | [Status] | `05` |
| A.4.1 | Resources (people, budget, tooling) for AI governance are identified and allocated | [Y/N] | [Justification] | [Status] | `01` (Section 5.9), management review records |
| A.4.2 | Competence requirements for AI-related roles are defined and met | [Y/N] | [Justification] | [Status] | [Tier 3 — competence/awareness procedure, to be authored] |
| A.5.1 | AI system impact assessments are performed before deployment and at significant change | [Y/N] | [Justification] | [Status] | `09-AI-System-Impact-Assessment-Procedure.md` |
| A.5.2 | Impacts to individuals and groups (fairness, safety, rights) are specifically assessed | [Y/N] | [Justification] | [Status] | `09`, `06` |
| A.5.3 | Societal-level impacts are considered where relevant | [Y/N] | [Justification] | [Status] | `09` |
| A.6.1 | AI system life cycle stages (design, development, verification, deployment, operation, retirement) are managed | [Y/N] | [Justification] | [Status] | [Tier 3 — AI system lifecycle procedure, to be authored] |
| A.6.2 | Change control is applied to AI system updates (model, data, configuration) | [Y/N] | [Justification] | [Status] | [Tier 3], `05` (authority thresholds) |
| A.6.3 | AI systems are tested/verified against defined criteria before release | [Y/N] | [Justification] | [Status] | [Tier 3], `09` |
| A.7.1 | Data used for AI systems is managed for quality, relevance, and provenance | [Y/N] | [Justification] | [Status] | [Tier 3 — data management procedure, to be authored] |
| A.7.2 | Lawful basis and consent for data used in AI systems is established and documented | [Y/N] | [Justification] | [Status] | [Tier 3], Legal/Compliance records |
| A.8.1 | Information about AI systems is made available to relevant interested parties (e.g., model cards, disclosures) | [Y/N] | [Justification] | [Status] | [Tier 3 — model-card/disclosure template, to be authored], `04` |
| A.8.2 | Mechanisms exist for affected individuals to seek information or contest automated decisions | [Y/N] | [Justification] | [Status] | [Tier 3], `04` |
| A.9.1 | Intended use and known limitations of each AI system are documented and communicated | [Y/N] | [Justification] | [Status] | [Tier 3 — responsible-use procedure, to be authored] |
| A.9.2 | Misuse and out-of-scope use of AI systems are identified and controlled | [Y/N] | [Justification] | [Status] | [Tier 3], `06` |
| A.10.1 | Third-party AI components and vendors are subject to due diligence before adoption | [Y/N] | [Justification] | [Status] | [Tier 3 — third-party/flow-down template, to be authored], `06` |
| A.10.2 | Contractual AI-specific requirements are flowed down to suppliers and vendors | [Y/N] | [Justification] | [Status] | [Tier 3], Legal/Procurement records |
| A.10.3 | Customer-facing AI-specific obligations are identified and met | [Y/N] | [Justification] | [Status] | `04`, [Tier 3] |

*Add or remove rows to match the final, verified Annex A structure. Do not present this table to
a certification auditor as authoritative without first reconciling it against the licensed
standard text — the control IDs above are a working placeholder framework, not a verified
citation.*

## 6. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| AIMS Manager | Owns and maintains the SoA; ensures every control determination is current and justified. |
| AI System Owners | Provide input on control applicability and implementation status for their system(s). |
| Top management | Approves the SoA and any change to a control's applicability determination. |
| Internal Audit | Verifies, on a sampling basis, that "Implemented"/"Verified" statuses are actually true. |

## 7. Review and Maintenance

| Version | Date | Change description | Approved by |
|---|---|---|---|
| 1.0 | [DD Month YYYY] | Initial issue — control list pending verification against licensed standard | [Name/Title] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
Statement of Applicability (Annex A Controls) is proprietary software of Conform-Edge Quality Consulting LLC
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
