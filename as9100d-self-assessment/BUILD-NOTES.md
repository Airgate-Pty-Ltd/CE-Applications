# Build Notes — as9100d-self-assessment

## What was built

**`as9100d-self-assessment.html`** — A complete, self-contained single-file HTML/JS tool:
- 35 scored questions spanning all AS9100D Rev D clauses (§4–§10 + aerospace-specific additions)
- Aerospace-specific requirements embedded: Configuration Management (§8.1.2), Product Safety (§8.1.3), Counterfeit Parts (§8.1.4), FAI/AS9102 linkage, Key Characteristics, OASIS registration
- 8 collapsible clause sections with live per-section scoring
- Real-time progress bar (questions answered / 35)
- Full/Partial/Not Met/N/A scoring with color-coded option buttons
- Scored gap report with: donut chart, verdict, section bar chart, prioritized findings table with remediation actions
- Org info fields (name, cert#, audit type, assessor, CB)
- Print/PDF export
- No backend, no login, no dependencies — runs 100% in browser
- Branded: Conform-Edge navy/steel/amber palette

**`BUILD-NOTES.md`** — This file.

**`NEEDS-FROM-BRIAN.md`** — Action items for launch.

---

## Why this pick

Ranked #1 of 5 opportunities on this scan:

| Criterion | Score | Rationale |
|---|---|---|
| Automation level | HIGH | Digital file product — zero marginal cost per sale; Gumroad delivers |
| Closeness to Brian's edge | VERY HIGH | as9100d-auditor skill = exact knowledge source; Brian is a certified AS9100D lead auditor |
| Buildability today | HIGH | MDSAP self-assessment tool (built Jun 22) = proven template; AS9100D clause knowledge is complete |
| Path to $250k/yr | CLEAR | ~2,000+ AS9100D-registered sites globally; $149–$299/tool; upsell to Conform-Edge |

Runner-up: **8130-3 / EASA Form 1 Toolkit** (timely per this morning's Air France email to Galligan) — strong but narrower buyer pool; selected for the NEXT scan's build instead.

---

## Key assumptions

1. **[ASSUMPTION]** AS9100D Rev D (current version, no imminent revision to AS9100E) — standard is stable; tool is accurate for 2024/2025 audit cycles.
2. **[ASSUMPTION]** Gumroad (or Conform-Edge product page) is Brian's preferred digital distribution channel, consistent with prior builds.
3. **[ASSUMPTION]** $149–$299 price point is appropriate, consistent with MDSAP tool pricing model from Jun 22 build.
4. **[ASSUMPTION]** 35 questions is sufficient scope for self-assessment; a full CB audit has 200+ evidence items, but self-assessment depth is intentionally calibrated to be actionable in 30–45 minutes.
5. **[ASSUMPTION]** Conform-Edge branding (navy/steel/amber) used consistently with other tools; no brand refresh has been approved.
6. **[ASSUMPTION]** Remediation text is adequate without Brian's review; Brian should scan the 35 remediation actions for accuracy before publishing.

---

## To go live — YOU do these

- [ ] Open `as9100d-self-assessment.html` in Chrome; test 10–15 questions and verify the gap report generates correctly
- [ ] Review all 35 remediation actions in the findings table for accuracy (especially Q13–Q21, aerospace-specific)
- [ ] Decide on price point ($149 single user / $299 org license recommended)
- [ ] Create Gumroad product listing — upload the HTML file, add screenshots, write description (~200 words)
- [ ] Write a LinkedIn post: "Just finished 4 days of AS9100D auditor training in [city] ... if you're prepping for your aerospace surveillance audit, here's a free first step..." (link to product)
- [ ] Optionally: add to Conform-Edge.com product page as a standalone item
- [ ] Consider bundling: AS9100D + AS9110C + AS9120B triple-pack at $399 (as9110c and as9120b tools not yet built — flag for future builds)
