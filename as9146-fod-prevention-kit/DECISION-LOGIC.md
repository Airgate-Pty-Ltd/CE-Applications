# Decision Logic — as9146-fod-prevention-kit

## Decision Question
Is our FOD program audit-ready, and which gaps block qualification?

## Inputs
Self-assessment ratings (2/1/0/N/A) across 10 program elements; core elements = #1 procedure, #3 tool accountability, #6 inspection, #7 event/RCCA.

## Rules / Logic
Any core element scored 0 ⇒ NOT READY. Total ≥ 85% of applicable max with no core zeros ⇒ PROGRAM-READY. Otherwise CONDITIONAL. RCCA triggers are deterministic (FO in product ⇒ mandatory; same-source ≥2/90d ⇒ systemic; unaccounted tool ⇒ immediate).

## M-AI Role
Not applicable in the hard-copy kit. The gate/RCCA rules are kernel-shaped and reusable if a software version is later built as an M-AI DIM.

## Confidence / Evidence
Structural: verdict is a direct function of declared ratings and fixed gates.

## Recommendation Output
Readiness verdict + which core gap(s) to close first.

## Human Decision
Buyer decides remediation ownership and whether to declare readiness to the prime/auditor.

## Audit / Traceability
Completed self-assessment + event log + RCCA records form the retained evidence set.
