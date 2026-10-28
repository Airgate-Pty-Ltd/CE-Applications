# NEEDS FROM BRIAN — CMMC 2.0 Level 1 Readiness Self-Assessment

## LAUNCH BLOCKERS

| # | Item | Why it blocks launch | Source |
|---|------|----------------------|--------|
| 1 | **Pricing confirmation** — $149 individual / $399 site is within the ANSWER_BANK default range. Brian to confirm or adjust. | Cannot publish pricing without Brian decision | INFERRED |
| 2 | **Defense Compliance Suite bundle** — confirm pairing the CMMC tool with the ITAR/EAR Export Control tool (built same night) as a "Defense Compliance Suite" bundle at $299–$349. Confirm whether to list as two separate products with a coupon/bundle code or as a single bundle product page. | Affects product page architecture | INFERRED |
| 3 | **Verdict threshold calibration** — the tool uses 100% = LEVEL 1 READY; 82–99% (no critical fail) = NEAR READY; <82% or any critical fail = NOT READY. The 82% threshold means ≥14/17 practices implemented. NIST SP 800-171 does not define a passing threshold — this is a product design choice. Brian to confirm this is the right split or adjust. | Product design decision | INFERRED |
| 4 | **Behavioral verification** — Brian to open `cmmc-readiness-tool.html` in a browser and run: (a) Answer AC.L1-3.1.1 = No (critical), all others = Yes → confirm CMMC LEVEL 1 NOT READY fires; (b) All = Yes → confirm CMMC LEVEL 1 READY fires; (c) ~14/17 Yes, no critical fail → confirm NEAR READY fires; (d) Test JSON export and copy narrative. | Automated inspection PASS ≠ live browser test | Required |
| 5 | **CMMC 2.0 Final Rule regulatory currency** — confirm the SPRS score description, C3PAO information, and DFARS clause references (252.204-7019/7020/7021) reflect the current 32 CFR Part 170 Final Rule as effective December 16, 2024. Any additional DFARS amendments since then should be noted. | Regulatory accuracy | INFERRED |

## WHEN RESOLVED — UPDATE ANSWER_BANK WITH:
- Defense Compliance Suite bundle strategy confirmed (canonical for all future defense compliance tool pairings)
- CMMC Level 1 pricing tier confirmed ($149/$399 or adjusted)
- Verdict threshold design (82% = NEAR READY / <82% = NOT READY) confirmed or adjusted
