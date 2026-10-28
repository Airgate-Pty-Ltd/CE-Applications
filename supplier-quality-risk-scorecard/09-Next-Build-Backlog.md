# Next-Build Backlog: Post-Launch Features (Ranked by ROI)

## Backlog Ranking Methodology
- **ROI (Revenue Impact):** Higher price point or increased retention
- **Effort:** Lower development hours = faster to market
- **Customer Requests:** Features customers specifically ask for
- **Strategic Fit:** Aligns with vision (supplier quality + compliance)

---

## Tier 1: High-Impact, Medium Effort (v1.1 — Oct 2026)

### 1. Cloud Backup (Encrypted, Opt-In)
**Impact:** +$10/mo per customer (30% adoption)
**Effort:** 40 hours
**Why:** "Don't lose my supplier data" is #1 customer fear
**Spec:** AWS S3, AES-256 encryption, auto-sync daily, user can export anytime
**Success Metric:** 25%+ of users enable cloud backup

### 2. Email Reminders (Audit Due Dates)
**Impact:** Sticky feature, reduces churn
**Effort:** 30 hours (email service integration)
**Why:** Auditors forget when audits are due; reminders save them time
**Spec:** Notify when audit is 30/60/90 days overdue
**Success Metric:** 80%+ of users enable email reminders

### 3. Multi-User Roles (Read-Only Auditor)
**Impact:** Enables team use; reduces single-point-of-failure
**Effort:** 35 hours
**Why:** Auditors need to view supplier data; managers need edit access
**Spec:** Owner (full), Manager (edit), Auditor (read-only, can download PDF)
**Success Metric:** 50%+ of customers add second user

### 4. Supplier Audit History Timeline
**Impact:** Shows trend; builds confidence in supplier
**Effort:** 25 hours
**Why:** "Is this supplier getting better or worse?" needs visual answer
**Spec:** Chart showing supplier score over past 12 months
**Success Metric:** 80%+ of users view timeline for at-risk suppliers

### 5. Notes & Observations Field
**Impact:** Audit completeness
**Effort:** 10 hours
**Why:** Auditors write manual notes; good to keep in tool
**Spec:** Free-form text field per supplier; retained in cloud backup
**Success Metric:** 60%+ of suppliers have at least one note

---

## Tier 2: Strategic, High Effort (v2.0 — Dec 2026)

### 6. AI-Assisted Risk Scoring
**Impact:** +$50/mo (upsell to Professional tier)
**Effort:** 80 hours (model training, integration)
**Why:** Predicts supplier risk based on historical data
**Spec:** ML model ingests past scores + NCRs → predicts future risk
**Success Metric:** Scoring accuracy 85%+; 40% of customers upgrade

### 7. Supplier Self-Service Portal
**Impact:** +$100/mo (Enterprise tier)
**Effort:** 120 hours (backend + portal)
**Why:** Suppliers upload certs, test reports → reduces email back-and-forth
**Spec:** Supplier login, document upload, audit response form
**Success Metric:** 50% reduction in email exchanges

### 8. Integration API (ERP, QMS, Audit Tools)
**Impact:** +$200/mo per customer (Enterprise)
**Effort:** 100 hours (API design, documentation, support)
**Why:** Suppliers exist in ERP; risk scorecard should sync with ERP
**Spec:** REST API, webhooks, Salesforce/Dynamics/SAP connectors
**Success Metric:** 20%+ of customers use API integration

### 9. Compliance Alert Engine
**Impact:** +$30/mo (stickiness feature)
**Effort:** 60 hours (regulatory data source, alert logic)
**Why:** When standard changes (e.g., ISO 9001:2026), SQA becomes outdated
**Spec:** Monitor ISO/IATF/FAA updates → notify customers → suggest SQA refresh
**Success Metric:** 80%+ customers enable alerts

### 10. Advanced Analytics & Benchmarking
**Impact:** +$50/mo (premium reporting)
**Effort:** 70 hours
**Why:** "How do my suppliers compare to industry average?"
**Spec:** Dashboard: benchmarking score, churn prediction, KPI trends
**Success Metric:** 30%+ of customers view benchmarking

---

## Tier 3: Niche/Strategic (v3.0 — Jun 2027)

### 11. Multi-Organization Support
**Impact:** +$500/mo (consulting firms, large OEMs)
**Effort:** 100 hours
**Why:** Consultants audit multiple clients; need separate accounts
**Spec:** One master account, multiple sub-orgs, data isolation
**Success Metric:** 5 consulting firm customers

### 12. Custom Scoring Models
**Impact:** +$200/mo (Enterprise)
**Effort:** 80 hours
**Why:** Some customers weight dimensions differently
**Spec:** UI to adjust weights (e.g., Certification 40%, Capability 20%, etc.)
**Success Metric:** 10%+ of customers create custom model

### 13. Marketplace (Auditor Referral)
**Impact:** +$5k–$10k/mo (10% commission on referrals)
**Effort:** 60 hours
**Why:** Customers need auditors; tool can connect them
**Spec:** Directory of pre-vetted auditors; commission on referral leads
**Success Metric:** 20+ auditors in marketplace, $5k/mo revenue

### 14. White-Label Version
**Impact:** +$20k+/mo (if successful)
**Effort:** 40 hours (branding, domain setup)
**Why:** Training companies, consulting firms want to rebrand as their own
**Spec:** Custom logo, colors, domain; markup pricing 30%+
**Success Metric:** 3 white-label customers

### 15. Mobile App (iOS/Android)
**Impact:** +$100/mo per customer (premium tier)
**Effort:** 200 hours (React Native or native Swift/Kotlin)
**Why:** Auditors audit on-site; need mobile access
**Spec:** Native iOS/Android, offline-capable, sync with cloud
**Success Metric:** 40%+ of customers use mobile app

---

## Tier 4: Future Research (v4.0+, Year 2–3)

### 16. Supplier Financial Health Integration
**Effort:** 80 hours (integrate D&B, S&P data)
**Impact:** +$50/mo (premium)
**Why:** Insolvency risk is real; predict supplier failure

### 17. Supply Chain Risk Visualization
**Effort:** 60 hours
**Impact:** +$50/mo
**Why:** Map suppliers by geography, single-source risk, criticality

### 18. Blockchain Audit Trail
**Effort:** 100+ hours
**Impact:** +$100/mo
**Why:** Immutable proof for regulators (FDA, FAA)

### 19. Sustainability/ESG Scoring
**Effort:** 80 hours
**Impact:** +$50/mo
**Why:** OEMs increasingly require supplier ESG compliance

### 20. Machine Learning Churn Prediction
**Effort:** 120 hours
**Impact:** +$50/mo
**Why:** Predict which suppliers will lose certification before it happens

---

## Implementation Schedule (12-Month Roadmap)

```
Aug 2026 ────────── v1.0 Launch ──────────
         (Core: scoring, SQA, CSV)
           ↓
         ┌─────────────────────────────────┐
         │ Month 2–3: Monitor adoption     │
         │ Collect v1.1 feature requests   │
         └─────────────────────────────────┘
           ↓
Oct 2026 ────────── v1.1 Launch ──────────
         (Cloud backup, email alerts, roles)
           ↓
Dec 2026 ────────── v2.0 Launch ──────────
         (AI scoring, portal, API, alerts)
           ↓
Jun 2027 ────────── v3.0 Launch ──────────
         (Multi-org, custom scoring, marketplace)
           ↓
2027–2028 ────────── v4.0+ ────────────
          (ESG, blockchain, financial health)
```

---

## Feature Request Triage (First 30 Days)

**Monitor Gumroad/Email for customer requests. Triage:**
- **Quick Fix (<5 hrs):** Include in v1.1
- **Medium (5–40 hrs):** Backlog for v1.1 or v2.0
- **Large (>40 hrs):** Plan for v2.0+
- **Out of Scope:** Politely decline, explain vision

**Example Responses:**
> *"Great suggestion! That's on our v1.1 roadmap (due Oct 2026). I'll add your vote to the feature request tracker."*

> *"That's a fantastic idea for v2.0 (cloud + integrations). We're planning that for Dec 2026. Would you like to join our product advisory board to influence the roadmap?"*

---

## Post-Launch Success Metrics

**Track These Monthly:**
- Feature adoption rate (% of customers using each feature)
- Feature request velocity (# new requests per month)
- Time-to-build (avg hours to ship new feature)
- Customer satisfaction per feature (NPS by feature)
- Churn impact (does feature X reduce churn?)

**Use data to reprioritize backlog:** If a feature nobody uses ships, consider sunsetting it. If customers request something 10+ times, prioritize it.

---

## Conclusion

Post-launch backlog prioritizes:
1. **Adoption drivers** (cloud, reminders) → retention
2. **Differentiation** (AI, portal) → competitive moat
3. **Strategic expansion** (multi-org, marketplace) → revenue scaling
4. **Future innovation** (blockchain, ESG) → long-term positioning

Customer feedback will refine this list. Launch v1.0 → listen → ship v1.1 fast → iterate quarterly.
