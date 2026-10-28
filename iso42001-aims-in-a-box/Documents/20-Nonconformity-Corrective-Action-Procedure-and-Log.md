# Nonconformity & Corrective Action Procedure and Log

**Document ref:** [ORG-AIMS-020]
**Clause intent covered:** ISO/IEC 42001:2023, Clause 10.2 (Nonconformity and corrective action) — intent-based, plain-language authoring. No text from the published standard is reproduced; clause numbers are referenced for navigation only.
**Applies to:** [Organization Name]'s AI Management System (AIMS)
**Owner:** [AIMS Manager / Quality Lead]
**Version:** [1.0] **Effective date:** [DATE] **Next review:** [DATE + 12 months]

---

## 1. Purpose

Things will go wrong: a model will drift, a risk assessment will be skipped, a vendor will miss a flow-down requirement, an AI system will produce an unexpected or harmful output. This procedure defines how [Organization Name] reacts when that happens — how it contains the immediate problem, gets to the actual root cause (not just the symptom), fixes the underlying cause so it doesn't recur, and proves the fix worked. The intent of Clause 10.2 is continual, evidence-based learning, not paperwork for its own sake.

## 2. Scope

Applies to any nonconformity related to the AIMS, including but not limited to:
- Failure to meet a documented AIMS procedure or control
- AI system incidents, near-misses, harmful/biased outputs, or unauthorized use
- Internal or external audit findings (Document 18)
- Customer, regulator, or affected-person complaints
- Missed AI risk treatment deadlines or ineffective risk controls
- Data quality or provenance failures
- Failure to meet a legal/regulatory AI obligation (e.g., EU AI Act, sectoral law — see Document 22)

## 3. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| Person who identifies the NC | Raises it promptly using the intake method below; does not need to know the cause to raise it |
| NCR Owner (assigned) | Leads investigation, root cause analysis, and corrective action implementation; usually the relevant process/system owner |
| AIMS Manager | Maintains the NCR Log; assigns owners; tracks due dates; escalates overdue items |
| Top Management | Reviews trends and high-severity NCRs at Management Review (Document 19); approves resourcing for systemic fixes |
| Verifier (independent of the fix, where practical) | Confirms the corrective action was implemented and is actually effective |

## 4. Procedure

### 4.1 Identify & Record
1. Anyone may raise a nonconformity — via [ticketing system / email / form — specify tool].
2. AIMS Manager logs it in the NCR Log (Section 6) within [2] business days with a unique NCR ID, date, and description of what happened and how it was found.
3. Classify initial severity: **Low / Medium / High / Critical** (Critical = safety, legal, fundamental-rights, or significant reputational exposure — escalate immediately to top management regardless of log cadence).

### 4.2 Contain (immediate correction)
1. Take immediate action to limit harm or exposure — e.g., pause the AI system, roll back a model version, disable a feature, notify affected parties if required.
2. Document the immediate correction separately from the root-cause fix; a correction addresses the symptom now, a corrective action addresses the cause so it doesn't recur.

### 4.3 Investigate — Root Cause Analysis
1. NCR Owner determines whether root cause analysis (RCA) is warranted based on severity/recurrence (recommended for all Medium+ and any repeat Low).
2. Use a structured method appropriate to complexity:
   - **5 Whys** — for straightforward, single-cause issues (ask "why" iteratively until the systemic cause, not just the immediate trigger, is reached).
   - **Fishbone/Ishikawa** — for issues with multiple contributing factors (categories: People, Process, Data, Technology/Model, Environment, Governance).
   - **Fault tree / timeline reconstruction** — for complex AI incidents involving multiple systems or a chain of failures.
3. Distinguish **root cause** (why the failure was possible/likely) from **contributing factors** (what made it worse) and from **symptoms** (what was observed).
4. Record the RCA method used and the conclusion in the log.

### 4.4 Determine & Implement Corrective Action
1. Define action(s) that address the root cause — not just the individual instance.
2. Assess whether similar nonconformities could exist elsewhere (other AI systems, sites, teams) and whether the fix needs to be applied more broadly.
3. Assign an owner and a realistic due date.
4. Update related documented information as needed: risk register (Documents 6–7), procedures, training records, or the Statement of Applicability (Document 8) if a control gap is found.

### 4.5 Verify Effectiveness
1. After the due date (and after enough time has passed to observe results — do not verify the same day a fix is deployed), the Verifier confirms:
   - The corrective action was actually implemented as described.
   - The root cause no longer produces the nonconformity (re-test, re-audit, or monitor a defined period).
2. If ineffective, reopen the NCR, re-investigate, and repeat from 4.3.
3. Close the NCR only once effectiveness is verified and evidenced.

### 4.6 Review Trends
AIMS Manager analyzes NCR data at least quarterly for recurring root causes, systemic issues, or clusters by AI system/site, and reports trends at Management Review (Document 19).

## 5. Severity & Escalation Guide

| Severity | Example | Escalation | Target closure |
|---|---|---|---|
| Low | Minor documentation gap, isolated training lapse | NCR Owner + AIMS Manager | [30] days |
| Medium | Recurring audit finding, missed risk-review deadline | + Process Owner sign-off | [30] days |
| High | AI system produced materially incorrect/biased output affecting a user | + Top Management notified within [24] hrs | [15] days |
| Critical | Safety impact, legal/regulatory breach, significant fundamental-rights harm | + Top Management + Legal within [24] hrs; consider external notification duties | [immediate containment; RCA within 5 days] |

## 6. Nonconformity & Corrective Action Log (template)

| NCR ID | Date Raised | Description | Severity | Root Cause | Corrective Action | Owner | Due Date | Status | Verification (method/date/result) |
|---|---|---|---|---|---|---|---|---|---|
| NCR-2026-001 | [example] 2026-02-03 | Risk register for Model X not updated after prompt-template change | Medium | Process gap: risk-review trigger not linked to change-management workflow | Add risk-register review step to the change-management checklist; retro-review last 90 days of changes | [Risk Owner] | 2026-03-05 | Closed | Re-audited 2026-03-20: checklist step present and used on 4/4 sampled changes — effective |
| NCR-2026-002 | | | | | | | | Open | |
| NCR-2026-003 | | | | | | | | | |
| [add rows] | | | | | | | | | |

**Status values:** Open (RCA in progress) / Action Assigned / Implemented — Pending Verification / Closed — Effective / Reopened — Ineffective

## 7. Records

Retain the NCR Log and all supporting RCA evidence, corrective action evidence, and verification evidence for [organization's retention period]. NCR data feeds Document 18 (audit trends), Document 19 (management review), and Document 21 (KPI: NCR closure rate, on-time closure %, recurrence rate).

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
Nonconformity Corrective Action Procedure and Log is proprietary software of Conform-Edge Quality Consulting LLC
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
