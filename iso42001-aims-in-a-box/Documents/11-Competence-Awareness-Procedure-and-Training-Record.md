
# Competence, Awareness & Training Procedure

**Document No.:** [AIMS-P-11]
**Version:** [1.0]
**Effective Date:** [YYYY-MM-DD]
**Owner:** [AIMS Manager / AI Governance Lead]
**Approved By:** [Top Management Role/Name]
**Review Cycle:** [Annually / Every 2 years]
**Applies to clause intent:** ISO/IEC 42001:2023 Clause 7.2 (Competence) and Clause 7.3 (Awareness)

---

## 1. Purpose

This procedure describes how [The Organization] determines, provides, and verifies the competence
of people whose work affects (or is affected by) the performance of the AI Management System
("AIMS"), and how [The Organization] builds and maintains awareness of the AI Policy, AIMS
objectives, and each person's role in the system. The intent is straightforward: people who design,
build, deploy, operate, or oversee AI systems — and people whose decisions are informed or acted on
by those systems — need to know enough to do that safely and responsibly, and everyone in the
organization needs to know the policy exists and what it means for them.

## 2. Scope

This procedure applies to:
- All employees, contractors, and temporary personnel whose duties touch the AI lifecycle (design,
  development, data preparation, testing, deployment, operation, monitoring, or retirement of AI
  systems within scope of the AIMS).
- All personnel in roles named in the [Roles, Responsibilities & Authorities Matrix] (Document 5),
  including Top Management.
- Third parties performing AIMS-relevant work under contract, to the extent required by
  [Document 17 — Third-Party & Customer AI Requirements Flow-down].

It does not replace [The Organization]'s general HR onboarding or unrelated professional licensing
requirements — it adds the AI-specific layer on top of them.

## 3. Defined Terms

| Term | Meaning in this procedure |
|---|---|
| Competence | The demonstrated ability to apply knowledge and skill to achieve intended results in an AIMS-relevant role. |
| Awareness | Knowing the AI Policy exists, what it commits the organization to, and how one's own work contributes to or could undermine it. |
| AI literacy | A baseline, role-appropriate understanding of what an AI system is, how it can fail, and why oversight matters — distinct from technical competence to build or operate one. |
| Competence gap | A documented difference between the competence a role requires and the competence a person currently holds. |
| Training record | Evidence that a specific person received specific training, on a specific date, with a specific outcome. |

## 4. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| Top Management | Approves this procedure; ensures budget/time is available for training; is itself subject to AI-literacy awareness activities appropriate to its governance role. |
| AIMS Manager / AI Governance Lead | Owns the competence matrix; identifies AIMS-wide training needs; maintains the training record system; reports competence status at management review. |
| HR / People Function (or delegated owner) | Integrates AIMS competence checks into hiring, onboarding, and performance processes where practical. |
| Line Managers / AI System Owners | Identify role-specific competence needs for their team; nominate staff for training; verify on-the-job competence for hands-on AI lifecycle roles. |
| All Personnel | Complete assigned awareness/training activities; apply what they learn; report if they believe they lack the competence needed for a task assigned to them. |

## 5. Procedure

### 5.1 Determine competence needs
For every role identified in the Roles, Responsibilities & Authorities Matrix, the role owner
(with the AIMS Manager) defines the competence needed using the **Competence Matrix** (Section 7.1).
Competence needs should be pitched at "what does this role need to not cause, or fail to catch, an
AI-related problem" — not a generic technology course list.

### 5.2 Verify current competence
Current competence is verified through one or more of: relevant education/qualification on file,
documented prior experience, a completed internal or external training course, a practical
assessment or demonstration, or a probationary/supervised period for new hands-on roles. The method
used is recorded against each person in the training record (Section 7.2).

### 5.3 Identify and close gaps
Where verification in 5.2 reveals a gap against the matrix in 5.1, the role owner logs the gap and
assigns a remediation action (training, mentoring, supervised practice, or role reassignment) with a
target completion date. Gaps affecting roles with direct control over live AI systems in higher-risk
use cases (per the AI System Impact Assessment, Document 9) should be closed, or the role
temporarily supervised, before that person works unsupervised.

### 5.4 Provide organization-wide AI awareness
Independent of role-specific competence, [The Organization] provides baseline awareness to
**all personnel** (not just AIMS roles) covering, at minimum:
1. That an AI Policy and AIMS exist, and where to find them.
2. What AI systems are in scope and, in plain terms, what they are used for.
3. Why misuse, careless use, or ignoring known limitations of an AI system creates risk for the
   organization, its customers, and affected individuals.
4. How and to whom to report a suspected AI-related problem, incident, or ethical concern
   (see Document 16 — Responsible Use Procedure).
5. That people have a right and a duty to raise concerns without fear of reprisal.

This can be delivered via induction training, an annual refresher, an intranet page with a
sign-off requirement, or a short e-learning module — the method is [The Organization]'s choice;
the content coverage above is the intent to satisfy.

### 5.5 Deliver role-specific training
For AIMS-relevant roles, training goes beyond awareness into the specific knowledge/skill named in
the Competence Matrix — e.g., a data preparation role needs training on the data quality and
provenance requirements in Document 14; a deployment approver needs training on stage-gate criteria
in Document 13.

### 5.6 Evaluate training effectiveness
Training is not considered complete merely because it was attended. Effectiveness is checked by at
least one of: a short knowledge check/quiz, a supervisor sign-off after observed practice, or
absence of related nonconformities/incidents traceable to a competence gap in the following review
period. Ineffective training is repeated or replaced.

### 5.7 Maintain records
All training and competence verification activity is logged in the Training Record (Section 7.2)
and retained per the retention schedule in Document 12 (Documented Information Control Procedure).

### 5.8 Review
The AIMS Manager reviews aggregate competence status (matrix coverage, overdue training, open gaps)
at least [annually] and reports a summary to management review (Document 19).

## 6. Records Generated

- Competence Matrix (current version)
- Individual Training Records
- Competence gap log and closure evidence
- Awareness sign-off log (e.g., intranet acknowledgment, quiz completion)

## 7. Templates

### 7.1 Competence Matrix Template

| Role | Required Competence / Knowledge Area | Verification Method | Refresh Frequency | Owner |
|---|---|---|---|---|
| [AI System Owner] | [Impact assessment interpretation; lifecycle stage-gate criteria] | [Internal training + sign-off] | [Annual] | [Name/Title] |
| [Data Steward] | [Data provenance & quality requirements (Doc 14); privacy basics] | [Course completion + practical check] | [Annual] | [Name/Title] |
| [Model Developer / ML Engineer] | [Bias/robustness testing methods; documentation standards] | [Prior experience + internal briefing] | [Annual] | [Name/Title] |
| [Deployment Approver] | [Stage-gate sign-off criteria; rollback authority limits] | [Role briefing + shadow approval] | [Annual] | [Name/Title] |
| [Frontline User of AI Output] | [Known limitations; when to escalate/override] | [Onboarding module] | [Annual] | [Name/Title] |
| [Top Management] | [AI Policy intent; AIMS governance obligations] | [Briefing session] | [Annual] | [Name/Title] |
| [All Personnel] | [Baseline AI awareness (Section 5.4)] | [Induction + refresher] | [Annual] | [HR/AIMS Manager] |

### 7.2 Individual Training Record Template

| Field | Entry |
|---|---|
| Name | [ ] |
| Role/Title | [ ] |
| Training/Awareness Topic | [ ] |
| Delivery Method | [Classroom / e-learning / on-the-job / briefing] |
| Provider/Trainer | [ ] |
| Date Completed | [ ] |
| Effectiveness Check Method | [Quiz / observation / sign-off / no-incident review] |
| Effectiveness Check Result | [Pass / Needs follow-up] |
| Next Due Date | [ ] |
| Evidence Reference | [file/link/certificate no.] |
| Verified By (name, date) | [ ] |

### 7.3 Competence Gap Log Template

| Gap ID | Person/Role | Gap Description | Risk if Unaddressed | Remediation Action | Target Date | Closed Date | Verified By |
|---|---|---|---|---|---|---|---|
| [001] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
Competence, Awareness & Training Procedure is proprietary software of Conform-Edge Quality Consulting LLC
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
