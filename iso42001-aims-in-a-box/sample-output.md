# Sample Output

**Updated 2026-07-11:** the worked example below is for the deprecated/superseded single-file gap-check
tool (`ISO42001-Readiness-GapCheck-Tool.html`) — kept as a legacy reference, still accurate for that tool.
For the current product (`app\`, the AIMS Command Center), real sample output looks like this instead —
captured directly from a running instance during the 2026-07-11 integration pass, not fabricated:

```
GET /api/conditions  (a live M-AI System-Detected Condition, real JSON from the running app)
{
  "id": "ed810af6-8dd5-481a-81f8-2f74733302d3",
  "tier": "system_detected_condition",
  "ruleId": "COMP-001",
  "ruleRevision": 1,
  "dimId": "iso42001-aims-governance",
  "severity": "minor",
  "findingText": "Competence record stale",
  "resolutionHint": "Re-review this person's AI-competence and update the record",
  "clauseRefs": ["7.2"],
  "recordType": "competence",
  "recordId": "58d1646b-ec6e-4800-af4a-b56217815d98",
  "status": "active",
  "dataConfidence": "high",
  "createdAt": "2026-07-11T04:04:06.145Z",
  "response": null,
  "respondedBy": null,
  "snapshotHash": "6e334d002b716848415152ee104af362a9992182d1acddd864f6be896b0027bd"
}

GET /api/events  (real recent-activity feed, from the mai_events table)
[
  {
    "id": "565a9c9c-da6c-4203-9d8d-5dc0d084a618",
    "recordType": "competence",
    "recordId": "9c07d2b5-71cf-4862-a82e-4333257d388d",
    "eventType": "competence.created",
    "action": "created",
    "actor": "seed",
    "timestamp": "2026-07-11T04:04:06.156Z"
  }
]
```

The seeded demo (`npm run seed`) deliberately triggers all 8 M-AI governance rules across the 7 registers
so a new user immediately sees what a System-Detected Condition looks like without having to construct
one by hand. Run `app\SETUP.md`'s steps to see this live. Note the known field-name mismatch documented
in `RISKS-AND-BOUNDARIES.md` and `UI-TEST-PLAN.md`: creating NEW records through the UI's own forms
currently fails for most registers, even though the API and seeded data above work correctly.

---

# Legacy: Worked Example of the Gap-Check Tool (deprecated tool)

This is a fictional worked example showing what a completed assessment and generated gap report look
like when run through `ISO42001-Readiness-GapCheck-Tool.html`. It exists so a prospective buyer (or
Brian, when demoing) can see the tool's output shape before running their own real data through it.

## The fictional company

**Meridian Analytics Inc.** — a 140-person fintech SaaS company whose flagship product uses a
machine-learning model to generate credit-risk scores for small-business loan applications, sold to
regional banks and credit unions as an embedded underwriting signal. Meridian has an ISO 9001-certified
quality function already, a data science team of 12, and is pursuing ISO/IEC 42001 certification because
two of its bank customers have started asking about "AI governance" in vendor security questionnaires.

Meridian's Head of Compliance runs the gap-check tool as a first pass before deciding which kit tier to
buy.

## How Meridian scored each section (conceptual logic)

Meridian has decent general governance (ISO 9001 habits carry over) but almost no AI-specific risk,
impact-assessment, or Annex A control documentation — a very typical profile for a company that is
mature on "quality" but new to "AI governance" specifically.

| Section | Established (2) | Partial (1) | Absent (0) | Why |
|---|---|---|---|---|
| Clause 4 — Context | 4.1, 4.3 | 4.2, 4.4 | — | Scope is documented for ISO 9001 and was extended informally to cover the AI product; interested-parties analysis exists but hasn't been AI-specific |
| Clause 5 — Leadership | — | 5.1, 5.3 | 5.2 | Leadership is engaged (bank customers are asking questions) but there's no written AI policy yet |
| Clause 6 — Planning | — | 6.1.2, 6.2 | 6.1.3, 6.1.4 | An informal model-risk review exists; no Statement of Applicability, no formal AI system impact assessment process |
| Clause 7 — Support | 7.4, 7.5 | 7.2, 7.3 | — | Document control and communications are solid (inherited from ISO 9001 QMS); AI-specific competence/awareness training doesn't exist yet |
| Clause 8 — Operation | 8.1 | 8.2, 8.3 | 8.4 | Operational processes are controlled; risk assessments happen ad hoc at model-release time but not on a defined interval; no impact-assessment follow-through |
| Clause 9 — Performance evaluation | — | 9.1, 9.3 | 9.2 | Model performance is monitored (data science does this for accuracy/drift); no formal AIMS internal audit program yet |
| Clause 10 — Improvement | — | 10.1 | 10.2 | General improvement culture exists; no formal AIMS nonconformity/CAPA process |
| Annex A controls | A.4 | A.2, A.3, A.6, A.7, A.10 | A.5, A.8, A.9 | Resourcing is well understood; policies/lifecycle/data practices are partially documented; impact-on-individuals, model-card-style disclosure, and responsible-use monitoring are the weakest spots |

## What the tool's score bar shows

- **Overall readiness: 45%** (30 points earned out of a possible 66 across all 33 answered items)
- **33 of 33 items assessed**
- Meter bar roughly two-fifths filled, amber-leaning (consistent with a "partial, in-progress" profile
  rather than "not started" or "mostly there")

## What "Generate gap report" produces

**ISO/IEC 42001 Gap Report**
Overall readiness: **45%** | OK: **6** | Partial: **18** | Gap: **9** (33/33 items assessed)

### Ranked gaps (priority — Absent items first)

| Ref | Requirement intent | Status | Recommended action |
|---|---|---|---|
| 5.2 | A documented AI policy exists, appropriate to the org's purpose and the responsible use of AI. | GAP | Establish documented evidence and a responsible owner; treat as priority finding. |
| 6.1.3 | AI risk treatment process produces a Statement of Applicability against Annex A controls. | GAP | Establish documented evidence and a responsible owner; treat as priority finding. |
| 6.1.4 | AI system impact assessments (to individuals, groups, society) are planned and performed. | GAP | Establish documented evidence and a responsible owner; treat as priority finding. |
| 8.4 | AI system impact assessments are performed and acted upon. | GAP | Establish documented evidence and a responsible owner; treat as priority finding. |
| 9.2 | Internal audits of the AIMS are planned and conducted. | GAP | Establish documented evidence and a responsible owner; treat as priority finding. |
| 10.2 | Nonconformities are corrected and corrective actions taken and recorded. | GAP | Establish documented evidence and a responsible owner; treat as priority finding. |
| A.5 | Impacts of AI systems on individuals/society are assessed and documented. | GAP | Establish documented evidence and a responsible owner; treat as priority finding. |
| A.8 | Information for interested parties (intended use, limitations, instructions) is provided. | GAP | Establish documented evidence and a responsible owner; treat as priority finding. |
| A.9 | Responsible use of AI systems by the org is defined and monitored. | GAP | Establish documented evidence and a responsible owner; treat as priority finding. |

### Partials (strengthen and evidence)

| Ref | Requirement intent | Status | Recommended action |
|---|---|---|---|
| 4.2 | Needs and expectations of interested parties relevant to AI are determined. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 4.4 | The AI management system and its processes are established and maintained. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 5.1 | Top management demonstrates leadership and commitment to the AIMS. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 5.3 | AIMS roles, responsibilities, and authorities are assigned and communicated. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 6.1.2 | AI risk assessment process is defined (criteria, repeatability). | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 6.2 | AI objectives are set, measurable, and have plans to achieve them. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 7.2 | Competence of people doing AIMS work is determined and evidenced. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 7.3 | Awareness of the AI policy and their contribution is established. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 8.2 | AI risk assessments are performed at planned intervals and on change. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 8.3 | AI risk treatment is implemented per the plan. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 9.1 | Monitoring, measurement, analysis, and evaluation of the AIMS are defined and done. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 9.3 | Management review of the AIMS occurs with required inputs/outputs. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| 10.1 | Continual improvement of the AIMS is pursued. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| A.2 | Policies for AI are documented and aligned with the org's overall policies. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| A.3 | Internal roles/responsibilities for AI (incl. reporting of concerns) are defined. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| A.6 | AI system lifecycle requirements (design, development, verification, deployment) are defined and met. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| A.7 | Data for AI systems is managed (provenance, quality, preparation) across the lifecycle. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |
| A.10 | Third-party and customer relationships allocate AI responsibilities and flow down requirements. | PARTIAL | Strengthen/complete existing arrangement and capture objective evidence. |

*(9 Gaps + 18 Partials + 6 OK = 33, matching the "33/33 items assessed" total. Math check: got = 9×0 +
18×1 + 6×2 = 0 + 18 + 12 = 30; max for answered items = 33×2 = 66; 30/66 = 45.45% → rounds to 45%,
matching the score bar above.)*

## What Meridian would do next

Given a 45% score with the sharpest gaps clustered in **AI policy (5.2), risk treatment/SoA (6.1.3),
impact assessment (6.1.4, 8.4, A.5), internal audit (9.2), and corrective action (10.2)**, the
recommended purchase path (per `KIT-CONTENTS.md`) would be the **Full Kit + Gap-Check** tier: Meridian
needs the complete document set (not just the Starter subset) because gaps span planning, support,
operation, and Annex A — plus the one AI gap-check run is already "spent" on this baseline assessment, so
a follow-up run after implementing Tier 1–2 documents would show progress against this same 33-item
baseline.

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
ISO/IEC 42001 AIMS-in-a-Box is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction, distribution, modification,
or resale is prohibited. "Conform-Edge" and the Conform-Edge mark are trademarks of Conform-Edge Quality
Consulting LLC. Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.
