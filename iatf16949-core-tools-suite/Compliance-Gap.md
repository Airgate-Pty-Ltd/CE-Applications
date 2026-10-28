# Compliance Gap & Expansion — IATF 16949 Core Tools Suite
**Date:** 2026-07-07

## Gap 1 (HIGH — fix before launch): AIAG-VDA FMEA Handbook currency
The FMEA tab (8 questions) tests discipline (design/process FMEA existence, control verification, action closure) but never tests whether the supplier has transitioned to the **AIAG-VDA FMEA Handbook (2019)**: 7-step approach, Action Priority (AP) replacing RPN thresholds, and FMEA-MSR. OEMs require the harmonized method on new programs; this is a top interview topic in current IATF audits.

**Ready-to-add questions (30-minute edit to artifact/index.html):**
1. "Have new-program FMEAs transitioned to the AIAG-VDA harmonized methodology (7-step approach), where required by your customer?" (1=No awareness … 5=All new programs on AIAG-VDA, legacy transition plan documented)
2. "Do you prioritize actions using Action Priority (AP) tables rather than legacy RPN cutoffs, per AIAG-VDA?" (1=RPN only … 5=AP fully adopted with documented rationale)
3. "Where mechatronic/monitoring systems apply, has FMEA-MSR been evaluated?" (1=Unknown … 5=Applied where applicable)

Also: report output should cite current editions — PPAP 4th ed., MSA 4th ed., SPC 2nd ed., APQP 3rd ed. (2024 update) — edition citations make the report defensible in a customer audit.

## Gap 2 (MEDIUM): Customer-Specific Requirements depth
Tab 6 asks about CSR awareness generically. The subscription value story ("quarterly CSR feeds") needs the tool to score at least: CSR document register currency, CSR-to-QMS deployment matrix existence, and OEM portal score monitoring (Ford Q1/SIM, GM BIQS, Stellantis eSupplierConnect). Add at v1.1.

## Gap 3 (LOW): Sanctioned interpretations
IATF publishes Sanctioned Interpretations (SIs) and FAQs that modify audit practice. Quarterly content updates must track SIs — name this explicitly in the update log so subscribers see the value.

## Expansion Priority

| Framework | Value | Effort | When |
|---|---|---|---|
| VDA 6.3 process audit module | High (EU suppliers; pairs perfectly) | M | v2.0 |
| ISO 9001 baseline mode (strip automotive layer) | Medium (SMB TAM) | S | Evaluate — may cannibalize; likely separate SKU |
| ASES/ASPICE-lite (software suppliers) | Medium | L | 2027 watch |
| Semiconductor auto supply chain (SEMI + IATF hybrid buyers) | Emerging | M | Watch |

## Guardrails
Tool must state it is not an IATF/AIAG-endorsed product; "IATF 16949" used descriptively; no certification-outcome guarantees; AIAG handbook content referenced by requirement intent, never reproduced verbatim (copyright).
