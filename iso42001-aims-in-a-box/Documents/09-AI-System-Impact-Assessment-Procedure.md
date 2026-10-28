# AI System Impact Assessment Procedure

**Document ID:** [AIMS-DOC-09]
**Version:** [1.0]
**Owner:** [AIMS Manager / AI Governance Lead]
**Approved by:** [Top Management — Name, Title]
**Effective date:** [DD Month YYYY]
**Review cycle:** [Per assessment trigger; procedure reviewed annually]

---

## 1. Purpose

This procedure defines how [The Organization] assesses the potential impact of an AI system on
individuals, groups, and society before deployment and at significant change, going beyond
operational/business risk to specifically consider who could be affected by the system's
outputs and how. It exists to satisfy the intent of ISO/IEC 42001 Clause 6.1.4 and the related
Annex A control area on assessing AI system impacts (A.5), which call for a structured
assessment of impacts distinct from — and feeding into — the general risk assessment process.

In plain terms: the AI Risk Register (`06`) asks "what could go wrong for the organization?" This
procedure asks a narrower, harder question: "what could this system do *to a person*, whether or
not that person is our customer, and is that acceptable?" It is the AIMS's version of a
data-protection or human-rights impact assessment, scoped to AI.

## 2. Scope

Applies to every AI system in the AIMS scope before it is first deployed, and again whenever it
undergoes a significant change (new model, new data source, new population of affected
individuals, new deployment context, or expanded decision authority). Systems already in
production without a completed assessment must be assessed retroactively within [90 days] of
this procedure's effective date.

## 3. Defined Terms

| Term | Working definition |
|---|---|
| Impact assessment | A structured evaluation of the potential effects of an AI system on individuals, groups, organizations, or society, performed before or during deployment. |
| Affected individual | A person who is subject to, or materially influenced by, an AI system's output, regardless of whether they have a direct relationship with [The Organization]. |
| Significant change | A change to an AI system's model, training data, deployment context, user population, or decision authority that could plausibly alter its impact profile. |
| High-impact system | A system whose impact assessment score meets or exceeds the threshold in Section 6.3, triggering enhanced oversight. |

## 4. When an Assessment Is Required

| Trigger | Assessment required? |
|---|---|
| New AI system entering production | Yes — mandatory before go-live |
| Significant change to an existing in-scope system (see Defined Terms) | Yes — before the change goes live |
| Minor configuration change with no effect on outputs or affected population | No — log the change in the system's change record instead |
| Existing system with no completed assessment (legacy) | Yes — retroactive assessment within [90 days] of this procedure's effective date |
| Following an incident or near-miss involving the system | Yes — re-assessment as part of the incident response |

## 5. Procedure

1. **Initiate.** The AI System Owner initiates the assessment using the template in Section 7,
   triggered per Section 4.
2. **Describe the system and its purpose.** Document what the system does, its intended use, and
   its intended users/beneficiaries.
3. **Identify affected parties.** Identify who is subject to the system's output — direct users,
   indirect subjects (e.g., people scored or screened by the system), and any group that could be
   disproportionately affected.
4. **Assess impact dimensions.** Work through each dimension in Section 6.1, scoring severity and
   likelihood of harm for each.
5. **Identify existing and needed safeguards.** Document what protections already exist (human
   review, appeal process, testing) and what additional safeguards the assessment surfaces as
   necessary.
6. **Score and classify.** Calculate an overall impact score (Section 6.3) and classify the
   system's oversight tier.
7. **Route findings.** Any risk surfaced here that isn't already tracked is added to the AI Risk
   Register (`06`); safeguards needed become entries in the AI Risk Treatment Procedure (`07`).
8. **Approve.** High-impact systems require AIMS Manager and top management sign-off before
   deployment; standard-impact systems require AI System Owner and AIMS Manager sign-off.
9. **Re-assess.** Per the triggers in Section 4, and at minimum at the routine review interval
   for high-impact systems ([annually]).

## 6. Impact Dimensions and Scoring

### 6.1 Dimensions to assess

1. **Safety** — potential for physical, financial, or psychological harm.
2. **Fairness / non-discrimination** — potential for disparate impact on protected groups.
3. **Privacy** — degree of personal data processed and sensitivity.
4. **Autonomy / contestability** — degree to which the system's decision is final vs.
   contestable, and whether affected individuals know AI was involved.
5. **Security** — exposure created for affected individuals if the system is compromised.
6. **Societal / environmental** — broader effects beyond individuals directly touched by the
   system (e.g., labor displacement, environmental cost, misinformation potential).

### 6.2 Severity scale (per dimension)

| Rating | Label | Description |
|---|---|---|
| 1 | Negligible | No meaningful effect on affected individuals. |
| 2 | Limited | Minor, easily reversible effect. |
| 3 | Moderate | Meaningful effect requiring active mitigation. |
| 4 | Significant | Serious effect on rights, opportunities, safety, or wellbeing. |
| 5 | Severe | Potentially irreversible or widespread harm. |

### 6.3 Overall classification

| Highest single-dimension rating | Classification | Oversight required |
|---|---|---|
| 1–2 | Standard | AI System Owner + AIMS Manager sign-off |
| 3 | Elevated | AIMS Manager sign-off; enhanced monitoring plan required |
| 4–5 | High-impact | Top management sign-off required; mandatory human-in-the-loop control; [annual] re-assessment |

## 7. AI System Impact Assessment — Template

**System name:** [Name] **Assessed by:** [Name/Role] **Date:** [DD/MM/YYYY] **Trigger:** [New / Significant change / Retroactive / Post-incident]

**1. System description and intended purpose:** [Describe]

**2. Affected parties:**

| Party | Direct or indirect | Description of exposure |
|---|---|---|
| [e.g., Loan applicants] | Direct | [Scored by the model; outcome affects credit access] |
| [e.g., General public] | Indirect | [Aggregate effects on lending patterns in the community] |

**3. Impact dimension scoring:**

| Dimension | Severity (1–5) | Rationale | Existing safeguards | Additional safeguards needed |
|---|---|---|---|---|
| Safety | [1–5] | [Describe] | [Describe] | [Describe] |
| Fairness / non-discrimination | [1–5] | [Describe] | [Describe] | [Describe] |
| Privacy | [1–5] | [Describe] | [Describe] | [Describe] |
| Autonomy / contestability | [1–5] | [Describe] | [Describe] | [Describe] |
| Security | [1–5] | [Describe] | [Describe] | [Describe] |
| Societal / environmental | [1–5] | [Describe] | [Describe] | [Describe] |

**4. Overall classification:** [Standard / Elevated / High-impact] **Highest-scoring dimension:** [Name]

**5. Linked risk register entries:** [RISK-IDs from `06`]

**6. Decision:** [Approved for deployment / Approved with conditions / Deployment paused pending treatment]

**7. Sign-off:**

| Role | Name | Date |
|---|---|---|
| AI System Owner | [Name] | [Date] |
| AIMS Manager | [Name] | [Date] |
| Top management (High-impact only) | [Name] | [Date] |

## 8. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| AI System Owner | Completes the assessment; implements identified safeguards. |
| AIMS Manager | Reviews all assessments; escalates High-impact findings to top management. |
| Top management | Approves deployment of High-impact systems; reviews High-impact assessments at management review. |
| Legal / Compliance Lead | Advises on fairness, privacy, and contestability dimensions where legally material. |

## 9. Review and Maintenance

| Version | Date | Change description | Approved by |
|---|---|---|---|
| 1.0 | [DD Month YYYY] | Initial issue | [Name/Title] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
AI System Impact Assessment Procedure is proprietary software of Conform-Edge Quality Consulting LLC
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
