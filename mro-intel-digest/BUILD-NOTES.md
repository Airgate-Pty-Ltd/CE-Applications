# Build Notes — mro-intel-digest

## 2026-07-11 (C-E/AQ Master Task governance run) — brand/copyright correction

**Problem found:** `index.html`'s `<title>` and footer copyright read "Annex Quality"
(and the About-section sign-off read "— Brian Olea, Annex Quality"), even though this
product lives under the Conform-Edge product tree (`Opportunity-Scans/Automated/builds/`)
and the mandatory `_Brand/Conform-Edge/BRAND-STANDARD.md` (v1.0, 2026-07-08, postdates
this product's 2026-06-19 build) requires every Conform-Edge application to carry
"© [year] Conform-Edge Quality Consulting LLC" copyright, the full legal/trademark/
advisory-disclaimer block, and `<title>` = "[Product] — Conform-Edge". The footer was
attributing IP ownership to the wrong legal entity for a product that had never been
through the branding retrofit (the 2026-07-09 portfolio alignment run published the
retrofit *guide* but assigned the actual per-app retrofit work to Brian; this product
had not been touched since its 2026-06-19 build).

**Fix:** Updated `index.html`: added the mandatory HTML proprietary/copyright comment
banner at the top of the file, added `<meta name="author" content="Conform-Edge Quality
Consulting LLC">`, changed `<title>` to end in "— Conform-Edge", replaced the footer's
"© 2026 Annex Quality" line with the full mandatory Conform-Edge copyright/trademark/
advisory block, and changed the About-section byline from "— Brian Olea, Annex Quality"
to "— Brian Olea, Conform-Edge" for internal consistency (the bio already lists "Founder,
Conform-Edge AI-QMS Platform" as a credential, which had been contradicting its own
sign-off two paragraphs later).

**Same fix applied to `sample-issue-Q3-2026.md`:** its "Published by: Annex Quality" byline
and "© 2026 Annex Quality" closing line carried the identical inconsistency and were
corrected to Conform-Edge for the same reason.

**Not resolved (Brian's call, tracked in NEEDS-FROM-BRIAN.md item 2):** the actual
domain/positioning decision — whether this digest ultimately launches under a
Conform-Edge URL, an Annex Quality URL, or a dual-brand cross-sell — is still open. This
fix only corrects the mandatory legal-ownership fields to match the standing brand
standard; it does not pre-empt Brian's domain/positioning choice.

## What was built

| File | Type | Description |
|------|------|-------------|
| `index.html` | HTML landing page | Self-contained, professional subscriber acquisition page with hero, authority grid, what-you-get section, 3-tier pricing cards, about section, FAQ, and CTA. No external dependencies. |
| `sample-issue-Q3-2026.md` | Markdown | Full draft of a Q3 2026 sample issue covering all 5 authorities (FAA, EASA, UK CAA, CAAC, CASA) with Action Required / Monitor / Awareness triage, compliance calendar, and cross-authority radar table. Ready for Brian to verify placeholders and publish as proof of concept. |
| `editorial-calendar.md` | Markdown | Repeatable production workflow: authority monitoring log, source checklist per authority, standard compliance items to check each quarter, cross-authority radar table template, flash alert template, and publish-day checklist. |
| `NEEDS-FROM-BRIAN.md` | Markdown | Itemized list of 9 gaps requiring Brian's input before launch. |
| `BUILD-NOTES.md` | Markdown | This file. |

---

## Why this pick

**Top-ranked on all three scoring dimensions:**

1. **Automation level — High.** Once the editorial process is established, each quarterly issue is largely a structured research + writing task that benefits from AI assistance (Brian drafts; AI helps monitor sources and drafts sections). Delivery is automated through Beehiiv/Ghost/Substack. Near-zero per-subscriber marginal cost.

2. **Closeness to Brian's existing edge — Maximum.** Brian holds active lead auditor certifications in all five authorities covered (FAA Part 145, EASA Part-145, UK CAA, CAAC CCAR-145, CASA). He is literally traveling to China this week for CCAR-145 training — making him the most current English-language authority on CAAC maintenance approvals in the market. No one else has this credential stack.

3. **Buildability today — Maximum.** The landing page, sample issue, and editorial calendar were built entirely from on-hand knowledge. No external research blocked the build.

**vs. the other 4 scored opportunities:**

| Opportunity | Auto | Edge | Build now | Pick? |
|-------------|------|------|-----------|-------|
| MRO Regulatory Intelligence Digest | HIGH | MAX | YES | ✅ TOP PICK |
| CCAR-145 English Compliance Navigator | Medium | High | Partial* | Runner-up |
| UK CAA CAR-145 Sprint Kit | Medium | High | YES | 3rd |
| FAA PMA Self-Navigation Kit | Medium | High | YES | 4th |
| EASA SMS/SMSVP for Repair Stations | Medium | High | YES | 5th |

*CCAR-145 English Compliance Navigator is rated "Partial build now" because the most current CCAR-145 requirements should be verified in-country during Brian's China trip — making it a slightly better build AFTER the trip. The digest is a better immediate build because it uses knowledge already on hand.

---

## Key assumptions

1. **[ASSUMPTION]** Pricing ($49/$149/$349/mo) is estimated from comparable niche regulatory intelligence products (EHS, pharma regulatory, financial compliance newsletters). Validate with 5–10 potential subscribers before publishing at these rates.

2. **[ASSUMPTION]** Beehiiv Pro or Ghost is the recommended delivery platform; actual platform choice depends on Brian's preferences for payment processing, subscriber portal, and email features.

3. **[ASSUMPTION]** Revenue math: 150 Professional subscribers × $149/mo = $267,600/yr. This is achievable but requires real audience development (12–18 months of consistent publishing + LinkedIn/industry presence). Conservative year-1 target: 30–50 subscribers = $53,640–$89,400/yr.

4. **[ASSUMPTION]** CAAC/CCAR-145 regulatory content in the sample issue is representative of the type of changes CAAC issues; exact current requirements must be verified. Brian's China trip this week is the ideal opportunity to verify these details.

5. **[ASSUMPTION]** UK CAA enforcement statistics in the sample issue (Section 3.2) are illustrative; real data must be sourced from caa.co.uk before publishing.

6. **[ASSUMPTION]** The market has not yet been tested. The digest concept is validated by analogy to successful niche regulatory intelligence products (e.g., FDA regulatory intelligence newsletters, OSHA compliance digests) but direct aviation MRO market testing has not occurred.

---

## To go live — YOU do these

- [ ] Choose a delivery/billing platform (Beehiiv Pro recommended; alternatives: Ghost, Substack, Lemon Squeezy + ConvertKit)
- [ ] Register a domain (suggested: `mrodigest.com` or subdomain of annexquality.com)
- [ ] Replace all `[PLACEHOLDER: Subscribe link]` CTAs in `index.html` with real checkout links
- [ ] Update the footer `[PLACEHOLDER]` in `index.html` with real domain, contact, and legal links
- [ ] Add a Privacy Policy and Terms of Service page (required for subscription product)
- [ ] Verify CCAR-145 regulatory content during your China trip (June 23–26) and update sample issue Section 4
- [ ] Verify UK CAA enforcement statistics (Section 3.2 of sample issue) from caa.co.uk
- [ ] Remove all `> **[ASSUMPTION]**` callouts from sample issue before publishing (replace with verified content)
- [ ] Have legal review disclaimer language
- [ ] Consider "Founding Subscriber" launch pricing (e.g., $99/mo locked for first 20 subscribers) to accelerate early traction
- [ ] Post 3 LinkedIn teaser posts (one per week for 3 weeks) before launch; use the EASA cert expiry story and the MAG CHG 10 Section 20 finding as real hooks — you have live examples from this week

---

*Build date: 2026-06-19 | Built by: Automated Opportunity Scanner (Desktop)*
