# Risks, Assumptions & Boundaries

## Key Assumptions

### Market Assumptions
| Assumption | Confidence | Validation Plan |
|-----------|-----------|-----------------|
| 15,000+ suppliers globally need this tool | High | TAM research + LinkedIn poll (500 Tier 1/2 QMs) |
| Suppliers will pay $199–$699/month | High | Survey 10 current Burrana clients, ask WTP |
| IATF audit cycle = sticky revenue hook (12+ month commitment) | High | Industry standard; verified in IATF handbook |
| Consultants won't undercut on price | Medium | Monitor Deloitte/EY/Accenture pricing; adjust if needed |

### Product Assumptions
| Assumption | Confidence | Validation Plan |
|-----------|-----------|-----------------|
| 30-minute assessment is credible | High | Pilot with 3 suppliers; measure actual time |
| Offline model (localStorage) sufficient for MVP | High | Tech feasible; same pattern as other SaaS tools |
| Customer-specific variants (Ford/GM/Stellantis CSR) will drive adoption | Medium | Survey OEMs re: CSR terminology importance |
| No backend required for MVP | High | Self-contained HTML; proven tech pattern |

### Adoption Assumptions
| Assumption | Confidence | Validation Plan |
|-----------|-----------|-----------------|
| IATF auditors will recommend the tool to clients | High | Direct outreach to 50 lead auditors; ask opinion |
| LinkedIn + email launch will reach 50+ early adopters | High | Burrana client list + IATF auditor network |
| Free trial → 10% conversion to paid | Medium | Monitor Week 1 conversion; adjust messaging if needed |

---

## Identified Risks & Mitigation

### Risk 1: Standards Update (IATF 16949:2026 or AIAG Core Tools 6.0)
**Severity**: Medium | **Probability**: Medium  
**Impact**: Questions become outdated; tool loses credibility with auditors

**Mitigation**:
1. Subscribe to IATF newsletter + AIAG updates (free)
2. Quarterly review of standard guidance documents
3. Maintain "Last Updated: [date]" on tool + documentation
4. v2.0 roadmap: auto-alert customers when updates needed
5. Grandfather existing customers at current standard for 12 months; then upgrade

---

### Risk 2: Competitive Response from Large Consulting Firms
**Severity**: Medium | **Probability**: Low  
**Impact**: Deloitte/EY replicate tool; charge $99/month; capture market

**Mitigation**:
1. Move fast: 90-day to 1,000 customers = customer lock-in
2. Brand as "built by auditor, for auditors" (defensible positioning)
3. Expand faster: AS9100D, ISO 9001, ISO 13485 verticals (multi-standard suite)
4. Build consultant channel: white-label for 50+ lead auditors (ecosystem moat)
5. If competitor emerges: Move upmarket (Tier 1 enterprise + managed service tier)

---

### Risk 3: Low Adoption / Weak Product-Market Fit
**Severity**: High | **Probability**: Low  
**Impact**: < 50 customers in Year 1; pivot needed

**Mitigation**:
1. Launch with free trial (14-day access, no credit card needed)
2. Gather NPS + feedback in Week 1 (< 40 NPS = redesign)
3. Pivot levers ready:
   - If auditors love it but suppliers won't pay: B2B2C model (auditors resell)
   - If Tier 1s love it but Tier 2s won't pay: Drop to $99/month Solo tier
   - If no one cares about IATF: Pivot to ISO 9001 / AS9100D focus
4. Hard stop decision: If < 10 customers by Month 3, allocate resources to v2.0 features or next opportunity

---

### Risk 4: Data Privacy / Customer Hesitation
**Severity**: Medium | **Probability**: Medium  
**Impact**: Customers refuse to use tool if data is sent to cloud; slow adoption

**Mitigation**:
1. MVP = offline-only (localStorage, no server)
2. Clear privacy statement: "No data leaves your browser"
3. Enterprise tier (v2.0) = optional cloud; opt-in, not default
4. GDPR / CCPA compliance statement in ToS
5. No tracking (no Google Analytics; exception: basic page load count for uptime monitoring only)

---

### Risk 5: Customers Request Custom Questionnaires
**Severity**: Low | **Probability**: High  
**Impact**: Support load increases; custom builds eat margin

**Mitigation**:
1. MVP: No custom questionnaires (fixed 45-Q set only)
2. "We hear you" response: "v2.0 will include custom builder; stay tuned"
3. Offer workaround: "Download CSV, modify in Excel, re-import"
4. v2.0 premium feature: "Questionnaire Builder" (Enterprise tier only, +$300/mo)
5. Set expectation: Custom variants built by Conform-Edge (not customer-driven) based on demand votes

---

### Risk 6: Performance Issues (Slow Load, Radar Lag)
**Severity**: Medium | **Probability**: Low  
**Impact**: Poor UX; high bounce rate; NPS damage

**Mitigation**:
1. Performance testing: Load on 3G, test on 5-year-old laptop
2. Optimize: Minimize JS, inline CSS, lazy-load images (if any)
3. Monitoring: Google Lighthouse (free tool) run weekly
4. Target metrics: < 3 sec page load, < 500ms radar render
5. Fallback: If slowness persists, move to Next.js + Vercel (faster CDN)

---

### Risk 7: IATF Auditor Feedback: "Tool Not Rigorous Enough"
**Severity**: Medium | **Probability**: Medium  
**Impact**: Auditors recommend against using tool; reputation damage

**Mitigation**:
1. Pre-launch: Beta test with 5 IATF lead auditors
2. Incorporate their feedback before public launch
3. "Auditor Advisory Board" (5 volunteers, quarterly review)
4. Position tool as "readiness check, not audit substitute" (clear messaging)
5. If auditors object: Add detailed question rationale + evidence requirements to justify scoring

---

### Risk 8: CSV Export / PDF Report Quality Issues
**Severity**: Low | **Probability**: Medium  
**Impact**: Exports are broken/ugly; customer frustrated

**Mitigation**:
1. Smoke test: Export 10 completed assessments; verify data accuracy
2. PDF styling: Use browser's print-to-PDF, test on Chrome/Safari/Firefox
3. CSV headers: Use clear, audit-ready column names (not cryptic variable names)
4. Validation: Each exported file = spot-check before launch
5. Feedback loop: First 5 exports reviewed by Brian for quality

---

## Known Limitations & Transparency

### MVP (v1.0) Limitations
```
✗ No cloud backup (use screenshots/CSV export if worried about data loss)
✗ No multi-user collaboration (one person per assessment)
✗ No integration with QMS systems (manual entry only)
✗ No video training (text-based tooltips only)
✗ No mobile app (web browser only)
✗ No team dashboard (single supplier view only)
✗ No AI-powered action planning (manual roadmap only)
✗ No benchmarking (no peer comparison)
✗ No certifications / badges (yet)
✗ No training / instructor materials (yet)
```

### Transparency Statement (in ToS)
```
This tool is a **self-assessment aid**, not a formal IATF audit.
Results do not guarantee certification approval.
For official compliance verification, consult an IATF-registered auditor.
```

---

## Commercial Boundaries

### What We Will NOT Do
1. **Guarantee audit approval** (can't; auditor-dependent)
2. **Provide consulting** (MVP is self-service only; v2.5+ has optional 4 hrs/year)
3. **Replace auditors** (positioning: "prepare FOR audit, not instead of")
4. **Store sensitive customer data** (MVP = offline only)
5. **Issue certifications** (we're not IATF-registered; positioning: "assessment, not certification")
6. **Support non-IATF variants** (at least Year 1; future = expand verticals)

### What We WILL Do
1. **Provide readiness assessment** (45 questions, 30 minutes)
2. **Generate audit-ready evidence checklists** (PDF report)
3. **Track trends over time** (CSV export, re-assess quarterly)
4. **Support standard updates** (quarterly refreshes)
5. **Listen to feedback** (monthly review, prioritize v2.0 features)

---

## Decision Gates for Continuation

### Gate 1: Market Validation (Month 1)
**Criterion**: ≥ 10 trial signups; ≥ 1 paid customer; NPS ≥ 40  
**Decision**: Continue if MET. If NOT: Assess + pivot (adjust pricing? repositioning? new channels?).

### Gate 2: Product-Market Fit (Month 3)
**Criterion**: ≥ 50 paid customers; < 15% monthly churn; NPS ≥ 50; < 5 support complaints  
**Decision**: Continue to v2.0 if MET. If NOT: Pause marketing; focus on feedback + redesign.

### Gate 3: Revenue Traction (Month 6)
**Criterion**: ≥ 100 customers; ARR ≥ $150k; churn ≤ 10%/mo  
**Decision**: Invest in v2.0 (cloud, collaboration, API) if MET. If NOT: Evaluate next opportunity.

### Hard Stop Condition
**If**: < 10 customers by Month 3 AND NPS < 40 AND support feedback is consistently negative  
**Then**: Allocate team to next opportunity. (Tool archived, available as open-source educational resource.)

---

## Compliance & Legal Boundaries

### What We Claim
- "Self-assessment tool based on IATF 16949:2016 and AIAG core tool standards"
- "Helps suppliers prepare for audits"
- "Generates audit-ready evidence checklists"

### What We Don't Claim
- "Guarantees certification"
- "Replaces formal audits"
- "Is a certification body service"
- "Provides legal advice"
- "Offers customized consulting"

### Disclaimer (Always Visible)
```
This tool is a self-assessment aid designed to help suppliers prepare for IATF audits.
Results do not guarantee certification approval and do not substitute for formal audits
conducted by IATF-registered certification bodies.

For official certification or legal compliance advice, consult IATF-registered auditors
or legal counsel.

© 2026 Conform-Edge. All rights reserved. Built by auditors, for auditors.
```

---

## Insurance & Risk Transfer

### Recommended Before Launch
1. **Professional Liability Insurance** ($1M–$5M coverage): Protects against claims of "tool said we were ready, but audit failed"
2. **Product Liability Insurance** ($1M coverage): Protects against data breach or tool failures
3. **Cyber Liability Insurance** ($500k coverage): Protects if customer data is exposed (v2.0+ when cloud launched)

### Legal Review (Before Launch)
- [ ] Terms of Service (ToS) — drafted by legal counsel
- [ ] Privacy Policy — drafted by legal counsel, GDPR/CCPA compliant
- [ ] Liability waiver — clear that tool is "advisory, not definitive"
- [ ] Acceptable Use Policy — prohibit reverse-engineering, resale without permission

