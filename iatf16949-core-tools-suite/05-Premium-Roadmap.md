# Premium Roadmap: v2.0–v3.0 Features

## v1.0 (Now — Q3 2026)
**MVP**: 45 questions, 6 tabs, radar chart, PDF/CSV export, localStorage, no backend.
**Go-live**: Gumroad + Railway deployment.
**Target**: 50–100 customers (Solo tier), validate market demand.

---

## v2.0 (Q4 2026 — Q1 2027)

### Cloud Storage + Audit Trail (Enterprise tier unlock)
- **Users**: Save assessments to cloud (opt-in, Tier 2+)
- **Benefit**: Multi-year trend analysis, no local data loss
- **Implementation**: Add simple Node.js backend (Express), SQLite/PostgreSQL, authentication (simple email-based)
- **Effort**: 40 hours

### Multi-User Collaboration
- **Invite team members**: Share an assessment with 3–5 colleagues; each can answer independently
- **Comment on gaps**: "This FMEA gap is being addressed in Q4; no action needed"
- **Assign actions**: "John, you own the MSA redesign; due 90 days"
- **Implementation**: Add permissions layer, comment table, assignment workflow
- **Effort**: 60 hours

### Aggregate Supplier Dashboard (Enterprise tier)
- **Multi-supplier view**: See all suppliers' maturity scores in one dashboard
- **Trend analysis**: Line chart showing supplier X's FMEA maturity trending up over 4 quarters
- **Benchmark compare**: "Your FMEA maturity is 3.2; industry avg is 2.8; target is 4.5"
- **Effort**: 80 hours

### Enhanced Customer Variants
- Add Honda, Toyota, BMW, VW, Tesla CSR language
- Add IATF Tier 2 automotive distributor variant (AS9120B integration)
- Add IATF Tier 1 variant (Ford, GM, Stellantis sub-tier CSR depth)
- **Effort**: 30 hours (mostly copy/customize, minimal code change)

### API Access (Enterprise tier)
- REST API to query/export assessments
- Webhook integration with QMS systems (Infor ERP, SAP, Oracle)
- **Use case**: QMS auto-imports supplier compliance status; triggers training if FMEA < 3.0
- **Effort**: 60 hours

### Pricing Change (v2.0 launch)
- **Tier 1**: $199 → $249 (Solo Supplier)
- **Tier 2**: $399 → $499 (Regional Group)
- **Tier 3**: $699 → $999 (Enterprise)
- **Grandfathering**: Existing customers locked at v1.0 price for 12 months

---

## v2.5 (Q2 2027) — Training Integration

### Embedded Video Training
- Each tab has optional 3–5 min video explaining the core tool (APQP lifecycle, PPAP levels, FMEA S/O/D logic)
- Video accessible from within assessment (inline player)
- **Implementation**: Upload to Vimeo, embed iframe
- **Effort**: 40 hours (script, film, edit)

### Micro-Certification Program
- Users who complete assessment + score > 4.0 in all tools = "IATF Core Tools Certified"
- Digital badge + PDF certificate (email-delivered)
- **Value**: Resume/LinkedIn differentiation; renewal every 2 years
- **Effort**: 20 hours

### Teacher Edition (Training Manager tier)
- Assign assessment to team members (5–50 people)
- View all their scores + progress
- Set passing threshold (e.g., all must score > 3.5)
- Trigger auto-emails when someone completes
- **Price**: $799/month (between Regional Group and Enterprise)
- **Effort**: 100 hours

---

## v3.0 (Q3–Q4 2027) — AI-Powered Roadmap

### Claude API Integration (Premium feature)
- User clicks "Generate Action Plan" → API call to Claude
- Claude analyzes all gap areas + generates specific, prioritized corrective action steps
- Output: 30-page "IATF Readiness Roadmap" (FMEA redesign timeline, MSA validation protocol, SPC control limits, etc.)
- **Implementation**: Add OpenAI/Anthropic API calls, generate + email PDF
- **Effort**: 80 hours

### Competitive Benchmarking (Premium feature)
- **Anonymized data sharing**: Aggregate all customers' scores (opt-in) into industry benchmark
- **Your benchmark vs. others**: "Tier 2 suppliers' avg FMEA maturity is 2.9; you're 3.5 (top 20%)"
- **Price sensitivity benchmarking**: Show how pricing compares (e.g., "Your cost per assessment is $2.21/supplier vs. consultant's $75/supplier")
- **Effort**: 120 hours (data aggregation, privacy handling, dashboard)

### Mobile App (Native iOS/Android)
- React Native app mirroring HTML tool
- Offline-first (sync when internet returns)
- Push notification: "Your IATF audit is in 30 days; reassess readiness"
- **Price**: Free (bundled with subscription)
- **Effort**: 200 hours

### Vertical Expansion
- **AS9100D Supplier Audits** (aerospace): Reuse assessment engine, 45 new questions (different tool set)
- **ISO 9001 Supplier Audits** (generic QMS): 30 new questions (Clause 4–9 coverage)
- **ISO 13485 Supplier Audits** (medical device): 35 new questions (design controls, complaint handling, traceability)
- **Total effort**: 120 hours (leverage existing code, mostly Q writing)
- **Revenue impact**: 3 new verticals × 10% market share each = +$450k ARR by Year 3

---

## Long-Term Vision (Year 4+)

### Managed Service Tier
- Dedicated success manager (1 per 50 customers)
- Quarterly business reviews
- Custom questionnaire building (white-label)
- Dedicated Slack channel for support
- **Price**: $2,999/month
- **Target**: 10–20 enterprise customers = $360k–$720k ARR

### SaaS Enterprise (Gumroad → Hosted)
- Move off Gumroad to native payments (Stripe Billing)
- SSO/LDAP (Azure AD, Okta)
- Multi-tenancy (white-label for certification bodies)
- **Target**: 50+ enterprise customers = $1.5M+ ARR

### Consultant Channel Program
- Partner with top IATF auditors
- They white-label the tool, charge their customers, keep 70%, we keep 30%
- **Target**: 100 consultants × $5k avg annual commission = $500k channel revenue

---

## Feature Prioritization Matrix (for v2.0 planning)

| Feature | Revenue Impact | Build Effort | Priority | Quarter |
|---------|----------------|--------------|----------|---------|
| Cloud Storage | High (Enterprise lock-in) | 40 hrs | P0 | Q4 |
| Multi-user Collaboration | High (team stickiness) | 60 hrs | P0 | Q4 |
| Aggregate Dashboard | High (Enterprise TAM) | 80 hrs | P1 | Q1 |
| API Access | High (integration ecosystem) | 60 hrs | P1 | Q1 |
| Honda/Toyota/BMW Variants | Medium (5–10% market expansion) | 30 hrs | P2 | Q1 |
| Video Training | Medium (adoption velocity) | 40 hrs | P2 | Q2 |
| Micro-Cert Badge | Medium (resume differentiation) | 20 hrs | P2 | Q2 |
| Claude API Roadmap Gen | High (AI differentiation) | 80 hrs | P0 | Q3 |
| Benchmarking | Medium (premium feature) | 120 hrs | P1 | Q3 |
| Vertical Expansion (AS9100D, ISO9001, ISO13485) | Very High (3× market) | 120 hrs | P0 | Q2–Q3 |

---

## Financial Impact (5-Year Projection)

| Year | ARR (Conservative) | ARR (Realistic) | Cumulative Users | Notes |
|------|------------------|-----------------|------------------|-------|
| Y1 (v1.0) | $250k | $380k | 100–150 | MVP launch |
| Y2 (v2.0 launch) | $650k | $1.0M | 250–350 | Cloud, collaboration, API unlock |
| Y3 (v2.5–v3.0) | $1.2M | $1.8M | 500–650 | Verticals + AI + benchmarking |
| Y4 (Managed Service) | $2.0M | $3.5M | 800–1,000 | Consultant channel + white-label |
| Y5 | $3.0M | $5.5M | 1,200–1,500 | Market maturity, enterprise expansion |

---

## Risk Mitigation (Premium Roadmap)

| Risk | Mitigation |
|------|-----------|
| **Feature creep delays launch** | Strict v1.0 scope gate (no features beyond 45 Qs + radar + export). v2.0 planning after 90 days live data. |
| **Cloud infrastructure costs exceed margin** | Monitor usage; optimize queries. If cost > 20% of revenue, move to Vercel/Netlify (cheaper). |
| **API security (enterprise tier)** | API keys, rate limiting, OAuth 2.0, regular security audits. Outsource to third-party security firm. |
| **Vertical expansion dilutes focus** | Ship v2.0 first (prove IATF core tools unit economics). Then invest in verticals only if churn < 5%/mo. |

