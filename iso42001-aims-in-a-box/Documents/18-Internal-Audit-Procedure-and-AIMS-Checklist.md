# Internal Audit Procedure & AIMS Audit Checklist

**Document ref:** [ORG-AIMS-018]
**Clause intent covered:** ISO/IEC 42001:2023, Clause 9.2 (Internal audit) — intent-based, plain-language authoring. No text from the published standard is reproduced; clause numbers are referenced for navigation only.
**Applies to:** [Organization Name]'s AI Management System (AIMS)
**Owner:** [AIMS Manager / Internal Audit Lead]
**Version:** [1.0] **Effective date:** [DATE] **Next review:** [DATE + 12 months]

---

## 1. Purpose

This procedure defines how [Organization Name] plans, conducts, reports, and follows up on internal audits of its AI Management System, so that leadership has reliable, first-hand evidence of whether the AIMS (a) does what the organization says it does, and (b) actually manages AI risk and achieves its stated AI objectives. Internal audit is the AIMS's own "quality control on the quality system" — it exists to find gaps before a customer, regulator, or certification body does.

## 2. Scope

Applies to all processes, sites, AI systems, and organizational units within the AIMS scope statement (see Document 2, AIMS Scope & Context Statement), including:
- AI governance and management processes (Clauses 4–10 intent areas)
- AI system lifecycle activities in scope (design, development, verification, deployment, monitoring, retirement)
- Third-party and outsourced AI processes where [Organization Name] retains accountability
- [Add/remove sites, business units, product lines, or AI systems as applicable]

Excludes: [list any explicitly out-of-scope systems, e.g., pilot/sandbox AI systems not yet in production — state rationale]

## 3. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| Top Management / AIMS Sponsor | Approves the annual audit program; ensures auditors have authority and access; reviews summary results at Management Review |
| AIMS Manager | Owns this procedure; maintains the audit program and schedule; ensures auditor competence and independence |
| Internal Auditor(s) | Plan and execute individual audits objectively and impartially; do not audit their own work area; report findings factually |
| Process/System Owners (Auditees) | Provide access to records, personnel, and systems; respond to findings with corrective action per Document 20 |
| [Quality/Compliance Committee] | Reviews audit program effectiveness and trends at least annually |

**Independence rule:** An auditor must not audit an area for which they hold direct operational responsibility within the last [12] months. For small organizations where full independence is impractical, use a peer-review arrangement, a rotating cross-team auditor pool, or a qualified external/contracted auditor, and document the rationale.

## 4. Procedure

### 4.1 Establish the Audit Program (annual)
1. AIMS Manager drafts the annual internal audit program, sized so every AIMS process and every in-scope AI system is audited at least once per [12/24]-month cycle.
2. Prioritize audit frequency/depth using risk: systems classified as higher-risk in the AI Risk Assessment Register (Document 6) are audited more frequently than low-risk systems.
3. Factor in: results of prior audits, nonconformity trends, changes to AI systems, regulatory changes (e.g., EU AI Act phase-ins — see Document 22), and interested-party requirements.
4. Top management/sponsor approves the program before the cycle begins.

### 4.2 Plan Each Audit
1. Auditor confirms scope, criteria (this AIMS's documented procedures + relevant clause intents + applicable external obligations), and audit dates with the auditee.
2. Auditor prepares an audit plan and the checklist in Section 6 (tailored to the area under audit).
3. Notify auditee of logistics, records/access needed, and personnel to be interviewed.

### 4.3 Conduct the Audit
1. Opening meeting: confirm scope, criteria, and logistics with the auditee.
2. Gather objective evidence via: document/record review, interviews, observation of the AI system or process in operation, and (where relevant) sampling of AI system outputs, logs, or monitoring data.
3. Evaluate evidence against audit criteria using **intent-based judgment**: does the organization achieve the outcome the clause/procedure intends, regardless of the exact terminology or format used?
4. Classify observations: **Conformity**, **Opportunity for Improvement (OFI)**, **Minor Nonconformity**, or **Major Nonconformity** (see Section 5 for definitions).
5. Closing meeting: present findings to the auditee before leaving; agree on facts even where interpretation of significance may differ.

### 4.4 Report
1. Issue a written audit report within [5] business days covering: scope, criteria, dates, auditor(s), findings (with evidence references), and overall conclusion.
2. Log any Minor/Major Nonconformity in the Nonconformity & Corrective Action Log (Document 20) and assign an owner and due date.
3. Distribute the report to the auditee, AIMS Manager, and top management.

### 4.5 Follow-Up
1. Track corrective actions to closure through Document 20.
2. Auditor verifies effectiveness of the correction, either at the next scheduled audit or via a targeted follow-up, and records the verification.
3. Audits are not closed until findings are either resolved or formally accepted as open with a documented plan.

## 5. Finding Classifications

| Classification | Definition |
|---|---|
| **Conformity** | Evidence shows the requirement's intent is met. |
| **Opportunity for Improvement (OFI)** | Requirement intent is met, but a weakness, inefficiency, or risk was observed that is not yet a nonconformity. |
| **Minor Nonconformity** | An isolated lapse or a single instance of failure to meet intent, unlikely to compromise the AIMS's ability to achieve its objectives. |
| **Major Nonconformity** | A systemic failure to meet a clause intent, absence of a required process/control, or a pattern of repeated minor issues affecting the same area; or any finding that creates significant AI risk exposure (e.g., safety, legal, or fundamental-rights impact) left unmanaged. |

## 6. AIMS Internal Audit Checklist (working template)

Use/adapt per audit. Answer Y / P (Partial) / N / N-A, and reference evidence.

| # | Area (clause intent) | Audit Question (intent-based) | Y/P/N/NA | Evidence Ref. | Finding |
|---|---|---|---|---|---|
| 1 | Context & scope (4.1–4.4) | Is the AIMS scope current and does it reflect the AI systems actually in production? | | | |
| 2 | Leadership (5.1–5.3) | Can leadership demonstrate active engagement with AI risk decisions (not just a signed policy)? | | | |
| 3 | Risk assessment (6.1.2) | Are AI risk assessments current for all in-scope systems, and were they updated after any significant model or use-case change? | | | |
| 4 | Risk treatment (6.1.3) | Are risk treatment plans implemented, tracked, and is residual risk formally accepted by an accountable owner? | | | |
| 5 | Impact assessment (6.1.4) | Was an AI system impact assessment completed before deployment for each in-scope system? | | | |
| 6 | Objectives (6.2) | Are AIMS objectives measurable, resourced, and being tracked against target dates? | | | |
| 7 | Competence (7.2) | Do personnel with AIMS responsibilities have demonstrable, current competence records? | | | |
| 8 | Documented information (7.5) | Is documentation version-controlled, approved, and are obsolete versions controlled/withdrawn? | | | |
| 9 | AI lifecycle (Annex A.6 intent) | Is there evidence of verification/testing before deployment, and monitoring after deployment, for sampled systems? | | | |
| 10 | Data management (Annex A.7 intent) | Can the organization show data provenance, quality checks, and preparation records for training/operational data used? | | | |
| 11 | Transparency (Annex A.8 intent) | Are model cards / system information available and accurate for interested parties who need them? | | | |
| 12 | Responsible use (Annex A.9 intent) | Is there evidence of human oversight, and were any misuse/abuse incidents captured and reviewed? | | | |
| 13 | Third-party/customer requirements (Annex A.10 intent) | Are third-party AI components/vendors assessed and flow-down requirements documented? | | | |
| 14 | Monitoring & measurement (9.1) | Are the KPIs in Document 21 actually being measured, and is the data trustworthy (not just a spreadsheet nobody updates)? | | | |
| 15 | Prior audit follow-up | Are all corrective actions from the last audit cycle closed or on an approved open-action plan? | | | |
| [16+] | [Organization-specific: add rows for specific AI systems, sites, or regulatory obligations, e.g., EU AI Act Annex III conformity assessment readiness] | | | | |

## 7. Records

- Annual audit program (approved)
- Individual audit plans and reports
- Nonconformity & Corrective Action Log entries (Document 20)
- Auditor competence/training records

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
Internal Audit Procedure and AIMS Checklist is proprietary software of Conform-Edge Quality Consulting LLC
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
