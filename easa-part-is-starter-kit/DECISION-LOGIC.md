# Decision Logic — easa-part-is-starter-kit

## Decision Question
Which Part-IS requirements does the organization fail today, and what is the
minimum proportionate remediation before the next authority audit?

## Inputs
Approval scope(s); org interfaces; existing QMS/SMS procedures; IT asset and
outsourcing inventory; incident history; training records.

## Rules / Logic
Each requirement area (governance, risk assessment, incident detection/response/
reporting, outsourcing control, personnel competence, continuous improvement,
integration with management system) is assessed intent-based:
compliant (evidence exists and operates) / partial (documented, not evidenced) /
missing. Priority = authority visibility × operational exposure.

## M-AI Role
Not applicable in the hard-copy kit. The requirement decomposition is written
rules-first so it can later become a deterministic M-AI DIM (Part-IS record
completeness checks) without rework.

## Confidence / Evidence
Every "compliant" rating must cite a named record or procedure clause; uncited
ratings are downgraded to partial. (Auditor discipline built into the checklist.)

## Recommendation Output
Prioritized remediation register: gap → action → owner → evidence that closes it
→ target date.

## Human Decision
Accountable Manager approves scope, risk acceptances, and the remediation plan.

## Audit / Traceability
Completed checklist + remediation register are retained as the ISMS's own
records — they become the evidence sampled at the next audit.
