# Risks, Assumptions & Boundaries

## Key Assumptions (Validate Early)

| Assumption | Impact | Validation Method | Owner |
|-----------|--------|------------------|-------|
| **Pricing is acceptable** | If $199/mo too high, churn increases | Survey 10 early customers (first 2 weeks) | Brian |
| **Customers want CSV import** | If false, feature underutilized | Track feature adoption in v1.1 metrics | Support |
| **Offline mode is valuable** | If false, can simplify to web-only in v2.0 | Ask customers: "Do you audit without internet?" | Brian |
| **SQA templates match real needs** | If gaps, customers customize manually (painful) | Audit real SQAs from 3 customers post-launch | Brian |
| **Risk scoring is intuitive** | If confusing, support burden increases | A/B test dashboard explanation in landing page | Marketing |
| **7-day TAM is $3–15M** | If smaller, growth slower than projected | Interview 10 VP Quality on budget allocation | Sales |

---

## Known Limitations (v1.0)

| Limitation | Workaround | Timeline to Fix |
|-----------|------------|-----------------|
| **No cloud backup** | Export CSV, save locally | v1.1 (Oct 2026) |
| **No authentication** | Browser-local storage only; don't share devices | v2.0 (cloud + login) |
| **No email alerts** | Manual reminders (set phone calendar) | v1.1 (Oct 2026) |
| **No API integration** | Manual CSV export; copy/paste to ERP | v2.0 (API, Dec 2026) |
| **Limited customization** | SQA templates fixed; can't add custom questions | v2.0 (custom scoring, Dec 2026) |
| **English only** | Screenshots in English; Spanish in v2.0 | v2.0 (Dec 2026) |
| **No multi-user roles** | Device-sharing OK; no permission controls | v1.1 (read-only auditor, Oct 2026) |
| **No historical trend analysis** | Can track scores manually over time | v2.0 (AI-assisted trending, Dec 2026) |

## Mitigation Strategy
- Clearly communicate limitations in product help section
- Position v1.0 as "launch product," not "final product"
- Offer roadmap transparency: "v1.1 adds X, v2.0 adds Y"
- Collect v1.0 feedback to inform v1.1 priority

---

## Risk Register (Top 5)

### Risk 1: Low Adoption Due to Lack of Awareness
**Probability:** Medium | **Impact:** High
**Mitigation:**
- LinkedIn campaign targeting 500 Quality managers (Week 1–2)
- Direct email to 100 aerospace/auto contacts (Week 3)
- Content marketing: "Supplier Risk in 10 Minutes" webinar (Week 4)
- Referral program: Customer referral = $50 credit (Month 2)

---

### Risk 2: Competitor Launches Similar Product
**Probability:** Low | **Impact:** High (if before Brian establishes market share)
**Mitigation:**
- Launch URGENTLY (Aug 1, not Sept 1)
- Move fast → capture early customers → build moat
- Build network effects: integrate with Annex Quality courses, Conform-Edge brand
- IP protection: proprietary scoring rubric, custom SQA templates

---

### Risk 3: Customer Churn (Switching to Spreadsheet)
**Probability:** Medium | **Impact:** Medium
**Mitigation:**
- Ensure time-to-value is < 15 minutes (critical)
- Free trial → paid conversion must happen in first 5 minutes of use
- Export CSV so customers don't feel locked in (paradoxically increases retention)
- Quarterly feature drops (v1.1, v2.0 roadmap) show momentum

---

### Risk 4: CSV Import / Export Bugs Frustrate Customers
**Probability:** Low | **Impact:** High (broken imports = bad word-of-mouth)
**Mitigation:**
- Test CSV import with 5 different Excel versions during beta
- Provide detailed import guide with example file
- Auto-detect common formatting errors (quoted fields, extra commas)
- Customer support: respond to CSV issues within 4 hours

---

### Risk 5: Regulatory Requirement Changes (e.g., FAA modifies Part 145)
**Probability:** Low | **Impact:** Medium (SQA templates become obsolete)
**Mitigation:**
- Monitor regulatory updates (subscribe to FAA AD list, EASA notices)
- v2.0 compliance alert engine auto-notifies of standard changes
- Quarterly SQA template review; update to latest regulatory intent
- Communicate updates to customers ASAP

---

## Legal & Compliance Boundaries

### Data Privacy & GDPR
- **v1.0 Boundary:** No customer personal data collected (only supplier name + audit data)
- **Cloud Sync (v2.0):** Supplier data may be stored in AWS; will require privacy policy + GDPR compliance
- **Action:** Draft privacy policy before v2.0 cloud launch

### Regulatory Liability
- **SQA Templates:** Tool generates checklists based on published standards (AS9100D, ISO 9001, etc.)
- **Boundary:** Tool does NOT provide legal/compliance advice; users must validate SQA against their customer requirements
- **Disclaimer:** "SQA templates are for reference only. Verify compliance with your applicable regulations, industry standards, and customer requirements before audit."

### Intellectual Property
- **Scoring Rubric:** Proprietary; based on Brian's 20 years audit expertise. Not disclosed in public materials.
- **SQA Templates:** Based on public standards (ISO, IATF, FAA, EASA); not copyrighted. Safe to distribute.
- **Code:** MIT License recommended (open-source friendly; builds community trust)

### Liability Waiver (Terms of Service - Draft)
```
Supplier Quality Risk Scorecard is provided "as-is" without warranty.
Users assume all responsibility for validating supplier quality and compliance 
with regulatory requirements. Tool authors assume no liability for business losses 
arising from supplier failures or quality incidents.
```

---

## Market Boundaries

### NOT in Scope (v1.0 → v3.0)
- **ERP Replacement:** Tool is not a procurement system; doesn't manage POs, inventory, or supply chain logistics
- **Audit Execution Platform:** Tool generates checklists; doesn't schedule audits or manage auditor workflow (that's v2.0)
- **Compliance Management for Other Standards:** v1.0 focuses on supplier control. Health & Safety (ISO 45001), Environmental (ISO 14001), Food Safety (FSMA), and Data Protection (ISO 27001) are NOT included
- **Training Delivery:** Tool doesn't teach supplier quality; it supports auditors who are already trained (training is Annex Quality's domain)
- **Supply Chain Finance:** Doesn't handle supplier payments, invoicing, or financial risk (D&B Hoovers does this)

### In Scope (v1.0 → v3.0)
- **Supplier Quality Assessment** (risk scoring)
- **SQA Checklists** (audit readiness)
- **Compliance Evidence** (proof for regulators)
- **Audit Planning** (when + what to audit)
- **Performance Tracking** (historical scores, trends)
- **Multi-Standard Support** (aerospace, automotive, medical device)

---

## Financial Assumptions

| Assumption | Conservative | Aggressive | Sensitivity |
|-----------|--------------|-----------|------------|
| **Year 1 customers** | 50 | 150 | ±50% = ±$120k revenue |
| **Avg. monthly churn** | 10% | 5% | ±5% = ±$30k retention impact |
| **Avg. customer LTV** | 18 months | 24 months | ±6 months = ±$2.4k per customer |
| **CAC (Customer Acquisition Cost)** | $200 | $150 | ±$50 = ±$5k total acquisition |
| **Pricing acceptance** | $199 most popular | $399 most popular | If wrong: -30% revenue |

**Downside Scenario:** 30 customers, 12% monthly churn, $199 avg = $71k Y1 (vs. $360k conservative forecast)
**Upside Scenario:** 200 customers, 5% churn, $399 avg = $956k Y1 (vs. $360k conservative forecast)

---

## Technology Risks

| Risk | Mitigation |
|------|-----------|
| **Browser compatibility** | Test on Chrome, Firefox, Safari, Edge (latest 2 versions) |
| **Data loss (IndexedDB failure)** | CSV export is primary backup mechanism; encourage users to export weekly |
| **Mobile usability** | Responsive design tested on iPhone 12, Android 12+; iPad in landscape |
| **Performance (100+ suppliers)** | Scoring algorithm O(n) linear; tested with 500 suppliers = < 1 sec |
| **Offline sync conflicts** | No sync in v1.0; cloud backup (v2.0) will handle conflict resolution |

---

## Success Boundaries

### "Success" Means:
✅ 50+ paying customers by end of Year 1
✅ $250k+ ARR (annual recurring revenue)
✅ 90%+ NPS (Net Promoter Score) from customers
✅ 3+ feature requests per month (shows engagement)
✅ 0 regulatory compliance issues (data privacy, liability)

### "Failure" Would Be:
❌ < 20 customers by Month 3 (indicates market rejection)
❌ > 20% monthly churn (indicates product-market misfit)
❌ Competitor launches identical product with better marketing
❌ Regulatory change obsoletes supplier control (unlikely, but possible)

---

## Contingency Plans

**If Adoption Slow (<5 customers/month by Month 2):**
- Pivot to white-label (offer to training companies)
- Reduce price to $99/mo to prove concept
- Add free tier (limited to 3 suppliers) to drive awareness

**If Competitor Launches:**
- Lean into Brian's brand (20 years expertise) vs. generic competitor
- Integrate with Annex Quality courses (moat: competitor can't match training ecosystem)
- Build community: forum, webinars, user meetups

**If Cloud Storage Becomes Mandatory (v2.0 demand):**
- Hire backend engineer (4–6 weeks development)
- AWS S3 + encryption + backup strategy
- GDPR compliance documentation ready
- Launch cloud tier at $399+/mo (accounts for backend costs)

---

## Conclusion

Supplier Quality Risk Scorecard v1.0 has clear boundaries, known limitations, and manageable risks. Conservative assumptions project $250k Y1 revenue; aggressive assumptions project $500k+. Key success factor: **Launch urgently (Aug 1) before competitor, establish market presence, and build v1.1/v2.0 roadmap based on customer feedback.**
