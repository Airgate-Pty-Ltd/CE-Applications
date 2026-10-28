# AI Risk Assessment Procedure and Register

**Document ID:** [AIMS-DOC-06]
**Version:** [1.0]
**Owner:** [AIMS Manager / AI Governance Lead]
**Approved by:** [Top Management — Name, Title]
**Effective date:** [DD Month YYYY]
**Review cycle:** [At each new/changed AI system; at least quarterly full-register review]

---

## 1. Purpose

This procedure defines how [The Organization] identifies, analyzes, and evaluates risks arising
from its AI systems, and provides the register template used to record and track those risks.
It exists to satisfy the intent of ISO/IEC 42001 Clause 6.1.2, which calls for a documented,
repeatable AI risk assessment process using consistent criteria, applied whenever AI systems are
introduced or changed and at planned intervals thereafter.

In plain terms: "we thought about the risks" is not good enough on its own — this procedure
makes the thinking repeatable, comparable across systems, and visible in one place so that
nothing important gets assessed once and then forgotten.

## 2. Scope

Applies to every AI system within the AIMS scope (`02`), at initial assessment (before or at
deployment) and at defined review intervals or trigger events thereafter (Section 5).

## 3. Defined Terms

| Term | Working definition |
|---|---|
| Risk | The effect of uncertainty on AIMS objectives — can be a threat (negative) or, less commonly discussed but still relevant, an opportunity. This procedure focuses on threat-type risk. |
| Likelihood | The estimated probability that a given risk event occurs within the assessment horizon. |
| Impact | The estimated severity of consequences if the risk event occurs. |
| Risk score | Likelihood × Impact, used to rank and prioritize risks. |
| Residual risk | The risk remaining after existing or planned controls are applied. |
| Risk owner | The named individual accountable for tracking a specific risk to closure or accepted residual level. |

## 4. Risk Categories Considered

Assessors must consider, at minimum, risk arising from each of the following categories for
every AI system assessed:

1. **Bias / fairness** — unequal or discriminatory treatment of individuals or groups.
2. **Safety** — physical, financial, or psychological harm from system outputs or failures.
3. **Security** — adversarial manipulation, data poisoning, model theft, unauthorized access.
4. **Privacy** — unlawful or excessive processing of personal data.
5. **Performance / reliability** — inaccurate, inconsistent, or degraded outputs (including
   model drift over time).
6. **Misuse** — use of the system outside its intended purpose, by insiders or external actors.
7. **Third-party / supply chain** — risk inherited from vendors, foundation-model providers, or
   external data sources.
8. **Legal / regulatory** — noncompliance with applicable law or contractual obligation.
9. **Reputational** — damage to organizational trust or standing, independent of legal exposure.
10. **Environmental** — resource/energy consumption of training or operating the system, where
    material to [The Organization]'s commitments.

## 5. Procedure

1. **Trigger.** A risk assessment is performed: (a) before a new AI system enters production;
   (b) when an existing system undergoes a significant change (new model version, new data
   source, new use case, new user population); (c) following an incident or near-miss; and (d) at
   the routine review interval — at least [quarterly / semi-annually] for high-risk systems and
   [annually] for others.
2. **Identify.** The AI System Owner, with the AIMS Manager, walks through the risk categories in
   Section 4 and records any applicable risk as a new register entry.
3. **Analyze.** Assign likelihood and impact ratings using the criteria in Section 6, based on
   available evidence (historical incidents, testing results, vendor documentation, expert
   judgment).
4. **Evaluate.** Calculate the risk score and risk level, and compare against [The
   Organization]'s risk acceptance criteria (Section 6.3) to determine whether treatment is
   required.
5. **Assign ownership.** Every risk entry above the "Low" threshold gets a named Risk Owner.
6. **Route to treatment.** Risks requiring treatment are handed to `07-AI-Risk-Treatment-Procedure.md`.
7. **Record and review.** All entries — including those accepted with no further action — remain
   in the register and are reviewed at the frequency in Section 5, or sooner if a trigger event
   occurs.

## 6. Risk Criteria

### 6.1 Likelihood scale

| Rating | Label | Description |
|---|---|---|
| 1 | Rare | Not expected to occur within the assessment horizon absent a major change. |
| 2 | Unlikely | Could occur, but no history or strong indicator that it will. |
| 3 | Possible | Plausible; some precedent in similar systems or organizations. |
| 4 | Likely | Expected to occur at some point without intervention. |
| 5 | Almost certain | Already occurring, or occurs routinely absent controls. |

### 6.2 Impact scale

| Rating | Label | Description |
|---|---|---|
| 1 | Negligible | No meaningful harm to individuals, the organization, or third parties. |
| 2 | Minor | Limited, recoverable harm; no regulatory or media exposure expected. |
| 3 | Moderate | Meaningful harm to individuals or moderate business impact; possible regulatory inquiry. |
| 4 | Major | Significant harm to individuals/groups, material financial or reputational damage, likely regulatory action. |
| 5 | Severe | Serious, potentially irreversible harm; existential regulatory, legal, or reputational consequence. |

### 6.3 Scoring matrix and risk levels

| Score (Likelihood × Impact) | Risk level | Action required |
|---|---|---|
| 1–4 | Low | Monitor; no mandatory treatment plan, document rationale. |
| 5–9 | Medium | Treatment plan recommended within [90 days]; Risk Owner assigned. |
| 10–15 | High | Treatment plan required within [30 days]; escalate to AIMS Manager. |
| 16–25 | Critical | Immediate escalation to top management; deployment paused or blocked pending treatment. |

## 7. AI Risk Register — Template

| Risk ID | AI System | Risk Description | Category | Likelihood | Impact | Score | Risk Level | Existing Controls | Owner | Treatment Option | Target Date | Status | Residual Risk | Review Date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | [Customer recommendation engine] | Model may recommend inappropriate content to minors due to insufficient age-verification signal | Safety / Misuse | 3 | 4 | 12 | High | Basic content filter | [AI System Owner] | Reduce | [DD/MM/YYYY] | Open | [To be updated post-treatment] | [Date] |
| RISK-002 | [Résumé-screening tool] | Historical training data may encode gender or ethnicity bias in scoring | Bias/Fairness | 4 | 4 | 16 | Critical | Periodic manual review of rejected candidates | [AI System Owner] | Reduce | [DD/MM/YYYY] | Open | [To be updated post-treatment] | [Date] |
| RISK-003 | [Internal analytics chatbot] | Prompt injection could cause disclosure of confidential internal data | Security | 3 | 3 | 9 | Medium | Role-based access control, output logging | [InfoSec Lead] | Reduce | [DD/MM/YYYY] | Open | [To be updated post-treatment] | [Date] |
| RISK-004 | [Third-party foundation model API] | Vendor may deprecate or materially change model behavior without notice | Third-party | 3 | 3 | 9 | Medium | Vendor SLA, version pinning where available | [Procurement/IT Lead] | Accept with monitoring | [DD/MM/YYYY] | Open | [To be updated] | [Date] |
| RISK-005 | [Add organization-specific risk] | [Describe] | [Category] | [1–5] | [1–5] | [calc.] | [Low/Med/High/Critical] | [Describe] | [Owner] | [Avoid/Reduce/Transfer/Share/Accept] | [Date] | [Open/In Progress/Closed] | [Rating] | [Date] |

*The example rows above are illustrative, not a claim about any specific real product. Replace
with [The Organization]'s actual AI systems and risks; do not ship the examples unedited into a
live audit trail.*

## 8. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| AIMS Manager | Owns this procedure; ensures assessments happen on schedule; maintains the consolidated register. |
| AI System Owner | Leads the assessment for their system; keeps entries current. |
| Risk Owner | Tracks assigned risks through to treatment or accepted closure. |
| Top management | Reviews High/Critical risks at management review; approves acceptance of residual risk above the delegated threshold. |

## 9. Review and Maintenance

| Version | Date | Change description | Approved by |
|---|---|---|---|
| 1.0 | [DD Month YYYY] | Initial issue | [Name/Title] |

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
AI Risk Assessment Procedure and Register is proprietary software of Conform-Edge Quality Consulting LLC
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
