# NEEDS FROM BRIAN — Supplier FAIR Submission Review Tool

## LAUNCH BLOCKERS

| # | Item | Why it blocks launch | Source |
|---|------|----------------------|--------|
| 1 | **AS9102B Rev B currency** — confirm Rev B is the current published revision. If Rev C or later has been published, update all form/section references in the HTML and this record. | Product claims AS9102B compliance; wrong revision = regulatory misrepresentation | INFERRED |
| 2 | **Pricing confirmation** — $149–$199 individual / $499 site is proposed. Brian to confirm or adjust. | Cannot publish pricing without Brian decision | INFERRED |
| 3 | **Bundle strategy with 08-29 FAI Self-Scoring Toolkit** — confirm the AS9102B Full Suite bundle concept ($249 for both tools) and whether it should be two separate listings with a discount or a single bundle listing. | Affects product page setup and pricing | INFERRED |
| 4 | **Behavioral verification** — Brian to open `supplier-fai-review-tool.html` in a browser, run a test review (Full FAI type; mix of Yes / No / Critical fail answers), and confirm verdict, gap table, JSON export, and narrative all render correctly. | Automated code inspection PASS is not a substitute for a live browser test | Required |

## CONFIRM / UPDATE IN ANSWER BANK
When Brian confirms items 1-3 above, update the ANSWER_BANK with:
- AS9102B version confirmed
- FAI Suite pricing model confirmed
- Bundle listing strategy confirmed

These answers are then canonical for any future FAI-related builds.
