# HF ENGINE — PHASE 1 KERNEL RULE TABLE

> **SUPERSEDED 2026-08-05 by `HF-ENGINE-PHASE1-KERNEL-RULES-Rev-A.md`** (approved by Brian R. Olea, MAI-CCB-2026-001, effective 2026-08-05). Retained for history. Do not implement from this file.

## STATUS: DRAFT FOR OWNER REVIEW — NOT EFFECTIVE

**No rule in this file is approved.** Per MAI-ARCH-001 governance: rules become effective only when Brian R. Olea reviews, edits as needed, signs the approval block (§6), and sets a real (never backdated) effective date. Claude drafted this table for owner review; the owner is the quality-domain authority for all fires-when logic, severities, finding text, and clause citations.

**Owner inputs still required (marked `[OWNER]` throughout):**
1. Clause references — left empty everywhere; never invented.
2. Three thresholds (§5).
3. Severity confirmations and finding-text edits.
4. Approval signature + effective date.

**Format:** rules follow `rule-template.json` from the M-AI integration skill. Conditions use ONLY the closed operator grammar: `is_null, not_null, is_empty, not_empty, eq, ne, in, length_gte, length_lt, date_before_today, date_after_today, linked_record_exists, linked_record_missing, all[], any[], not{}`. No new operators are introduced. Where a rule needs counting or time-window logic, the **host adapter computes a derived snapshot field** (§4) and the kernel evaluates it deterministically.

**Severity mapping for UI:** template severity `major` → display HIGH (CRITICAL where riskClass A); `minor` → display LOW/MEDIUM. Kernel outputs remain "System-Detected Conditions" with `logic_result` + `data_confidence` (high/medium/low) — never numeric confidence.

---

# 1. DIM: `dim-hf-src` — Source & Content Governance

**subscribesTo:** `source.review_entered`, `source.ai_routing_requested`, `content.approval_requested`, `content.publish_requested`, `assignment.issue_requested`

### HFSRC-001 — Source missing confidentiality classification
```json
{
  "ruleId": "HFSRC-001", "dimId": "dim-hf-src", "revision": 1,
  "effectiveDate": "[OWNER — set on approval]", "approvedBy": "[OWNER — Brian R. Olea on approval]",
  "approvalRef": "[OWNER]", "severity": "major", "category": "completeness", "riskClass": "B",
  "basisType": "deterministic-record-completeness",
  "description": "A source record entering evidence review must carry a confidentiality classification before any further processing.",
  "requiredFields": ["confidentialityClass"],
  "events": ["source.review_entered"],
  "findingText": "This source has no confidentiality classification. Unclassified material cannot be risk-routed, AI-routed, or used in training content.",
  "resolutionHint": "Assign one of the seven license/confidentiality classifications before review proceeds.",
  "clauseRefs": [],
  "condition": { "field": "confidentialityClass", "op": "is_null" },
  "testCases": ["HFSRC-001-POS-001", "HFSRC-001-NEG-001", "HFSRC-001-MISSING-001"],
  "limitations": ["Cannot verify the classification chosen is factually correct — only that one exists."]
}
```

### HFSRC-002 — Restricted content routed toward external AI
```json
{
  "ruleId": "HFSRC-002", "dimId": "dim-hf-src", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "authority", "riskClass": "A",
  "basisType": "deterministic-record-completeness",
  "description": "Content classified BURRANA_PRIVATE or CUSTOMER_PRIVATE must never be routed to an external AI provider. The application blocks this deterministically; this rule surfaces any attempt as a condition.",
  "requiredFields": ["confidentialityClass", "aiRoutingTarget"],
  "events": ["source.ai_routing_requested"],
  "findingText": "An external AI routing request was made for restricted content. The request was blocked. This attempt requires review.",
  "resolutionHint": "Confirm the block, review who initiated the request, and correct the workflow or classification if wrong.",
  "clauseRefs": [],
  "condition": { "all": [
    { "field": "confidentialityClass", "op": "in", "value": ["BURRANA_PRIVATE", "CUSTOMER_PRIVATE"] },
    { "field": "aiRoutingTarget", "op": "eq", "value": "external" }
  ]},
  "testCases": ["HFSRC-002-POS-001", "HFSRC-002-NEG-001", "HFSRC-002-MISSING-001"],
  "limitations": ["Detects routing requests recorded by the host; cannot detect exfiltration outside the application."]
}
```

### HFSRC-003 — Duplicate source detected
```json
{
  "ruleId": "HFSRC-003", "dimId": "dim-hf-src", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "minor", "category": "traceability", "riskClass": "C",
  "basisType": "deterministic-record-completeness",
  "description": "A source whose file hash matches an existing registered source should be linked, not processed as new evidence.",
  "requiredFields": ["duplicateOfSourceId"],
  "events": ["source.review_entered"],
  "findingText": "This source is hash-identical to an existing registered source. Processing it as new evidence would duplicate lessons and inflate occurrence counts.",
  "resolutionHint": "Link this upload to the existing source record and archive the duplicate.",
  "clauseRefs": [],
  "condition": { "field": "duplicateOfSourceId", "op": "not_null" },
  "testCases": ["HFSRC-003-POS-001", "HFSRC-003-NEG-001", "HFSRC-003-MISSING-001"],
  "limitations": ["Hash-identical only; near-duplicates are AI Assist suggestions, not kernel conditions."]
}
```

### HFSRC-004 — AI-drafted content without source spans
```json
{
  "ruleId": "HFSRC-004", "dimId": "dim-hf-src", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "traceability", "riskClass": "A",
  "basisType": "deterministic-record-completeness",
  "description": "AI-assisted content cannot enter approval without traceable approved source spans (directive §5.2 grounding constraint).",
  "requiredFields": ["aiAssisted", "sourceSpans"],
  "events": ["content.approval_requested"],
  "findingText": "This AI-drafted content has no linked source spans. Ungrounded generated content cannot be approved for training.",
  "resolutionHint": "Link the exact approved source passages the draft derives from, or reject the draft.",
  "clauseRefs": [],
  "condition": { "all": [
    { "field": "aiAssisted", "op": "eq", "value": true },
    { "link": "sourceSpans", "op": "linked_record_missing" }
  ]},
  "testCases": ["HFSRC-004-POS-001", "HFSRC-004-NEG-001", "HFSRC-004-MISSING-001"],
  "limitations": ["Verifies span links exist; cannot verify the spans semantically support every sentence."]
}
```

### HFSRC-005 — Publication requested for unapproved content
```json
{
  "ruleId": "HFSRC-005", "dimId": "dim-hf-src", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "authority", "riskClass": "A",
  "basisType": "deterministic-record-completeness",
  "description": "No content object may publish unless its status is APPROVED. The application blocks this; the rule surfaces attempts.",
  "requiredFields": ["contentStatus"],
  "events": ["content.publish_requested"],
  "findingText": "A publication request was made for content not in APPROVED status. The request was blocked.",
  "resolutionHint": "Route the content through review and approval, or reject it.",
  "clauseRefs": [],
  "condition": { "not": { "field": "contentStatus", "op": "in", "value": ["APPROVED"] } },
  "testCases": ["HFSRC-005-POS-001", "HFSRC-005-NEG-001", "HFSRC-005-MISSING-001"],
  "limitations": ["Status-based; assumes approval records themselves are controlled (see HFSRC-006)."]
}
```

### HFSRC-006 — Mandatory assignment without approval record
```json
{
  "ruleId": "HFSRC-006", "dimId": "dim-hf-src", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "authority", "riskClass": "A",
  "basisType": "deterministic-record-completeness",
  "description": "A mandatory training assignment must link to a configured human approval record before issuance.",
  "requiredFields": ["assignmentType", "approvalRecord"],
  "events": ["assignment.issue_requested"],
  "findingText": "A mandatory assignment was requested with no linked approval record. Mandatory training cannot issue without configured human approval.",
  "resolutionHint": "Obtain and link the required approval before issuing the assignment.",
  "clauseRefs": [],
  "condition": { "all": [
    { "field": "assignmentType", "op": "eq", "value": "MANDATORY" },
    { "link": "approvalRecord", "op": "linked_record_missing" }
  ]},
  "testCases": ["HFSRC-006-POS-001", "HFSRC-006-NEG-001", "HFSRC-006-MISSING-001"],
  "limitations": ["Verifies the approval link exists, not that the approver held the correct role — RBAC enforces that."]
}
```

---

# 2. DIM: `dim-hf-int` — Intervention Appropriateness & Causal Control

**subscribesTo:** `intervention.approval_requested`, `atom.approval_requested`

### HFINT-001 — Training is the sole corrective action
```json
{
  "ruleId": "HFINT-001", "dimId": "dim-hf-int", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "linkage", "riskClass": "B",
  "basisType": "deterministic-record-completeness",
  "description": "When training is the only corrective action attached to the originating event, the intervention requires explicit justification (directive §7.3).",
  "requiredFields": ["otherCorrectiveControlsCount"],
  "events": ["intervention.approval_requested"],
  "findingText": "Training is the only corrective action for this event. Training alone rarely corrects process, tooling, or resource causes.",
  "resolutionHint": "Complete the Appropriateness Review: confirm training is genuinely the primary control, or add the process/engineering control that is.",
  "clauseRefs": [],
  "condition": { "field": "otherCorrectiveControlsCount", "op": "eq", "value": 0 },
  "testCases": ["HFINT-001-POS-001", "HFINT-001-NEG-001", "HFINT-001-MISSING-001"],
  "limitations": ["Counts linked controls in the host record; cannot judge whether those controls are adequate."]
}
```

### HFINT-002 — No documented competence gap
```json
{
  "ruleId": "HFINT-002", "dimId": "dim-hf-int", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "completeness", "riskClass": "B",
  "basisType": "deterministic-record-completeness",
  "description": "An intervention requesting approval must have an Appropriateness Review confirming a competence or awareness gap.",
  "requiredFields": ["competenceGapIdentified"],
  "events": ["intervention.approval_requested"],
  "findingText": "No competence or awareness gap is documented for this intervention. Training without a demonstrated gap adds burden without reducing risk.",
  "resolutionHint": "Document the gap in the Appropriateness Review, or select a non-training intervention.",
  "clauseRefs": [],
  "condition": { "any": [
    { "field": "competenceGapIdentified", "op": "is_null" },
    { "field": "competenceGapIdentified", "op": "eq", "value": false }
  ]},
  "testCases": ["HFINT-002-POS-001", "HFINT-002-NEG-001", "HFINT-002-MISSING-001"],
  "limitations": ["Verifies the review answer exists; cannot verify the gap analysis quality."]
}
```

### HFINT-003 — No effectiveness method defined
```json
{
  "ruleId": "HFINT-003", "dimId": "dim-hf-int", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "completeness", "riskClass": "B",
  "basisType": "deterministic-record-completeness",
  "description": "An intervention cannot be approved without a defined effectiveness method and target level.",
  "requiredFields": ["effectivenessMethod"],
  "events": ["intervention.approval_requested"],
  "findingText": "This intervention defines no effectiveness method. Without one, closure would rest on completion alone, which the directive prohibits.",
  "resolutionHint": "Define the effectiveness method, target level, owner, and observation period before approval.",
  "clauseRefs": [],
  "condition": { "any": [
    { "field": "effectivenessMethod", "op": "is_null" },
    { "field": "effectivenessMethod", "op": "is_empty" }
  ]},
  "testCases": ["HFINT-003-POS-001", "HFINT-003-NEG-001", "HFINT-003-MISSING-001"],
  "limitations": ["Existence check only."]
}
```

### HFINT-004 — Same issue previously trained without improvement
```json
{
  "ruleId": "HFINT-004", "dimId": "dim-hf-int", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "linkage", "riskClass": "A",
  "basisType": "deterministic-record-completeness",
  "description": "If the same HF theme + process combination was previously trained and the event recurred, another training cycle requires escalated justification (host computes the derived fields per §4; recurrence window is threshold T1).",
  "requiredFields": ["priorTrainingExistsSameThemeProcess", "priorTrainingEffective"],
  "events": ["intervention.approval_requested"],
  "findingText": "This theme and process were already trained within the recurrence window and the issue recurred. Repeating training without redesign is unlikely to change the outcome.",
  "resolutionHint": "Escalate: redesign the intervention, review the original causal analysis, or select a non-training control.",
  "clauseRefs": [],
  "condition": { "all": [
    { "field": "priorTrainingExistsSameThemeProcess", "op": "eq", "value": true },
    { "field": "priorTrainingEffective", "op": "eq", "value": false }
  ]},
  "testCases": ["HFINT-004-POS-001", "HFINT-004-NEG-001", "HFINT-004-MISSING-001"],
  "limitations": ["Depends on host-computed derived fields; window length is configuration (T1), not kernel logic."]
}
```

### HFINT-005 — Content cites unverified cause without interim label
```json
{
  "ruleId": "HFINT-005", "dimId": "dim-hf-int", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "traceability", "riskClass": "B",
  "basisType": "deterministic-record-completeness",
  "description": "A Learning Atom derived from an event whose causal status is below VERIFIED must carry the interim-awareness label (directive §7.2).",
  "requiredFields": ["linkedEventCausalStatus", "interimAwarenessLabel"],
  "events": ["atom.approval_requested"],
  "findingText": "This content presents causal factors that are not yet verified, without the required interim-awareness label. Publishing unverified causes as fact undermines just culture.",
  "resolutionHint": "Apply the label 'Interim preventive awareness content. Causal investigation remains open.' — or hold the atom until causal status is verified.",
  "clauseRefs": [],
  "condition": { "all": [
    { "field": "linkedEventCausalStatus", "op": "in", "value": ["REPORTED", "SUSPECTED", "UNDER_INVESTIGATION", "UNSUPPORTED_ASSERTION", "DISPUTED_CONCLUSION"] },
    { "field": "interimAwarenessLabel", "op": "eq", "value": false }
  ]},
  "testCases": ["HFINT-005-POS-001", "HFINT-005-NEG-001", "HFINT-005-MISSING-001"],
  "limitations": ["Label-presence check; cannot judge tone of the content body."]
}
```

---

# 3. DIM: `dim-hf-eff` — Effectiveness & Closure Control

**subscribesTo:** `effectiveness.closure_requested`, `observation.status_check`, `manifest.modification_attempted`

### HFEFF-001 — Closure requested on completion-only evidence
```json
{
  "ruleId": "HFEFF-001", "dimId": "dim-hf-eff", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "completeness", "riskClass": "A",
  "basisType": "deterministic-record-completeness",
  "description": "Effectiveness closure requires evidence at the plan's target level. Completion (Level 1) never closes a plan targeting Level 2+.",
  "requiredFields": ["planTargetLevel", "highestEvidenceLevel"],
  "events": ["effectiveness.closure_requested"],
  "findingText": "Closure was requested with completion-only evidence, but the plan requires a higher effectiveness level. Completion is not competence.",
  "resolutionHint": "Record the required evidence (assessment, observation, or outcome data) before closure, or revise the plan with approval.",
  "clauseRefs": [],
  "condition": { "all": [
    { "field": "planTargetLevel", "op": "in", "value": ["2", "3", "4"] },
    { "field": "highestEvidenceLevel", "op": "eq", "value": "1" }
  ]},
  "testCases": ["HFEFF-001-POS-001", "HFEFF-001-NEG-001", "HFEFF-001-MISSING-001"],
  "limitations": ["Level comparison only; evidence quality is human judgment."]
}
```

### HFEFF-002 — Supervisor observation overdue
```json
{
  "ruleId": "HFEFF-002", "dimId": "dim-hf-eff", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "minor", "category": "timeliness", "riskClass": "C",
  "basisType": "deterministic-record-completeness",
  "description": "An open supervisor effectiveness observation past its due date requires attention (grace period is threshold T2, applied by the host when computing observationDueDate).",
  "requiredFields": ["observationStatus", "observationDueDate"],
  "events": ["observation.status_check"],
  "findingText": "A supervisor effectiveness observation is overdue. Effectiveness evidence that arrives late weakens the defensibility of the closure.",
  "resolutionHint": "Complete the observation or re-plan it with an approved new due date.",
  "clauseRefs": [],
  "condition": { "all": [
    { "field": "observationStatus", "op": "eq", "value": "OPEN" },
    { "field": "observationDueDate", "op": "date_before_today" }
  ]},
  "testCases": ["HFEFF-002-POS-001", "HFEFF-002-NEG-001", "HFEFF-002-MISSING-001"],
  "limitations": ["Uses server-local midnight for date comparison (documented grammar behavior)."]
}
```

### HFEFF-003 — Frozen manifest modification attempted
```json
{
  "ruleId": "HFEFF-003", "dimId": "dim-hf-eff", "revision": 1,
  "effectiveDate": "[OWNER]", "approvedBy": "[OWNER]", "approvalRef": "[OWNER]",
  "severity": "major", "category": "authority", "riskClass": "A",
  "basisType": "deterministic-record-completeness",
  "description": "Frozen manifests are immutable; the database blocks modification. Any attempted modification event is surfaced for review.",
  "requiredFields": ["manifestId"],
  "events": ["manifest.modification_attempted"],
  "findingText": "A modification was attempted on a frozen training-package manifest. The attempt was blocked. Frozen learner evidence must never change.",
  "resolutionHint": "Review who attempted the change and why. If content must change, issue a new package revision — never edit history.",
  "clauseRefs": [],
  "condition": { "field": "manifestId", "op": "not_null" },
  "testCases": ["HFEFF-003-POS-001", "HFEFF-003-NEG-001", "HFEFF-003-MISSING-001"],
  "limitations": ["Fires on host-reported attempts; DB constraints are the actual enforcement."]
}
```

---

# 4. Derived snapshot fields the host adapter MUST compute

The kernel never counts, queries, or looks across records — the adapter computes these deterministically and writes them into the event snapshot before the event row is persisted:

| Field | Type | Computed as | Used by |
|---|---|---|---|
| `duplicateOfSourceId` | string/null | id of existing source with identical SHA-256, else null | HFSRC-003 |
| `otherCorrectiveControlsCount` | int | count of non-training corrective controls linked to the originating event | HFINT-001 |
| `priorTrainingExistsSameThemeProcess` | bool | an approved intervention with same theme + process exists with closure date within window **T1** | HFINT-004 |
| `priorTrainingEffective` | bool | that prior intervention closed with effectiveness accepted at its target level | HFINT-004 |
| `linkedEventCausalStatus` | string | current causal status of the atom's originating event | HFINT-005 |
| `planTargetLevel` / `highestEvidenceLevel` | string | from the effectiveness plan / max level of accepted evidence records | HFEFF-001 |
| `observationDueDate` | date | planned date + grace period **T2** | HFEFF-002 |
| `aiRoutingTarget` | string | "external" \| "local" \| "none" for the routing request | HFSRC-002 |

---

# 5. Thresholds — `[OWNER]` decisions

| ID | Threshold | Draft default | Owner decision |
|---|---|---|---|
| T1 | Recurrence window for "previously trained without improvement" (HFINT-004) | 12 months | ______ |
| T2 | Grace period after planned observation date before HFEFF-002 fires | 14 days | ______ |
| T3 | Phase 1 severity display mapping (riskClass A majors shown as CRITICAL?) | Yes | ______ |

---

# 6. Approval block — completes on owner sign-off

| Field | Value |
|---|---|
| Rule set | Phase 1 HF Kernel Rules, 14 rules across dim-hf-src / dim-hf-int / dim-hf-eff |
| Drafted by | Claude (draft only — no authority) |
| Reviewed & approved by | ______________________ (Brian R. Olea) |
| Approval ref | MAI-CCB-2026-____ |
| Effective date | ____________ (date of actual approval — never backdated) |
| Clause references supplied | ☐ Yes ☐ Deferred (rules effective without clause refs; refs added by revision) |

**Instructions to Claude Code on receipt:** implement only after the approval block is completed. Load rules via the versioned registry (registry validation fails loud on missing fields). Each rule ships with its three named test cases (positive / negative / missing-data). The three DIM manifests (`dim-hf-src`, `dim-hf-int`, `dim-hf-eff`) follow `dim-manifest-template.json`; each DIM's Authority Charter is generated programmatically from these rule JSONs so it cannot drift.
