# NEEDS FROM BRIAN — ITAR/EAR Export Control Compliance Self-Assessment

## LAUNCH BLOCKERS

| # | Item | Why it blocks launch | Source |
|---|------|----------------------|--------|
| 1 | **Pricing confirmation** — $199–$249 individual / $599–$799 site license is above the standard ANSWER_BANK range of $149–$399. The premium is justified by the legal-adjacent regulatory severity (criminal ITAR penalties). Brian to confirm, adjust, or authorize the premium pricing reasoning as a canonical exception. | Cannot publish pricing without Brian decision | INFERRED |
| 2 | **Legal disclaimer scope** — The current UI displays "This tool identifies compliance gaps for internal use. Not legal advice." Brian (and optionally export control counsel) to confirm this disclaimer is sufficient, or advise whether a more extensive disclaimer is needed given ITAR criminal penalty exposure. | Regulatory liability | INFERRED |
| 3 | **Defense Compliance Suite bundle strategy** — Confirm pairing the ITAR/EAR tool with the CMMC 2.0 Readiness tool (built same night) as a "Defense Compliance Suite" bundle at $299–$349. Confirm bundle pricing and whether to list as separate products with a discount code or a single bundle SKU. | Affects product page architecture | INFERRED |
| 4 | **Behavioral verification** — Brian to open `itar-ear-export-control-tool.html` in a browser and run a test assessment: (a) set regime = "Both"; (b) answer Q1 as No (critical), other Qs as a mix; (c) confirm COMPLIANCE ACTION REQUIRED verdict fires; (d) re-run with all Yes; (e) confirm COMPLIANT POSTURE fires; (f) test JSON export and copy narrative. | Automated code inspection PASS ≠ live browser test | Required |
| 5 | **EAR99 and CCL classification guidance accuracy** — The assessment correctly identifies that EAR99 items generally do not require a license for most destinations, but the phrasing in Q8 ("EAR-controlled items correctly classified") may need legal review. Confirm the tool does not inadvertently over-claim or under-claim EAR coverage for the organization's specific commodity profile. | Product accuracy | INFERRED |

## WHEN RESOLVED — UPDATE ANSWER_BANK WITH:
- ITAR/EAR pricing tier confirmed (individual, site, bundle)
- Legal disclaimer standard for legal-adjacent regulatory tools
- Defense Compliance Suite bundle strategy confirmed (canonical for future defense compliance builds)
