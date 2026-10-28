# MVP Scope: Supplier Quality Risk Scorecard v1.0

## Feature Specification

### Core Functionality (MVP = Must Have)

#### 1. Supplier Risk Scorecard Engine
**Requirement:** Calculate and display supplier risk across 4 dimensions

**Inputs (per supplier):**
- Supplier Name (text)
- Primary Standard (dropdown: AS9100D, ISO 9001:2015, IATF 16949, ISO 13485, FAA Part 21, EASA Part 145, CAAC CCAR-145)
- Last Audit Date (date picker)
- Certification Status (dropdown: Current, Expired, Pending, Not Required)
- Process Capability Score (1–5 scale based on history)
- Last NCR Count (number: 0–10+)
- Days Since Audit (auto-calculated from audit date)

**Scoring Dimensions:**

| Dimension | Weight | Criteria | Score Calculation |
|-----------|--------|----------|-------------------|
| **Certification Status** | 25% | Current cert = 5pts; Expires in < 3mo = 3pts; Expired = 1pt | Direct from input |
| **Process Capability** | 25% | 1 = Critical; 2 = Poor; 3 = Fair; 4 = Good; 5 = Excellent | Direct from input |
| **Audit History** | 25% | Days since audit: 0–180 days = 5pts; 180–365 = 3pts; 365+ = 1pt | Auto from audit date |
| **Compliance Gap** | 25% | NCR count: 0 NCRs = 5pts; 1–2 NCRs = 3pts; 3+ = 1pt | Direct from input |

**Overall Risk Score = (Cert 0.25 + Capability 0.25 + Audit 0.25 + Gap 0.25) × 20**
- **Result: 0–100 scale**
- **Green: 75–100 (Low Risk)**
- **Yellow: 50–74 (Medium Risk)**
- **Orange: 25–49 (High Risk)**
- **Red: 0–24 (Critical Risk)**

**Output (Visual Dashboard):**
- 4×4 Risk Matrix (supplier names, color-coded by risk level)
- Risk Summary Stats: "3 Red, 5 Orange, 8 Yellow, 12 Green"
- Individual Supplier Card: Name, overall score, 4 dimension breakdown (bar chart)
- Trend Indicator: Score improving/declining vs. last audit

#### 2. SQA Checklist Generator
**Requirement:** Auto-generate Supplier Quality Agreement checklist from standard selection

**Process:**
1. User selects supplier from dashboard
2. User selects target standard (AS9100D, ISO 9001, IATF 16949, ISO 13485, FAA Part 21, EASA Part 145, CAAC CCAR-145)
3. Tool generates 30–50 governance questions in 4 categories:
   - **Sourcing Control** (5–8 questions): Approval process, qualification, change control
   - **Inspection & Acceptance** (8–10 questions): Incoming inspection, COC, traceability
   - **Flow-Down Requirements** (8–10 questions): SQA content, customer requirements, special processes
   - **Corrective Action & Audit** (5–8 questions): CAR handling, audit rights, nonconformance

**Example SQA Checklist Items (AS9100D):**
- Supplier shall maintain AS9100D certification OR equivalent QMS (Y/N)
- Supplier shall notify within 24 hours of any nonconforming product detected post-shipment (Y/N)
- Supplier shall flow down counterfeit parts prevention requirements per JSARA to all subsuppliers (Y/N)
- Supplier shall participate in annual audit by [Organization Name] on mutually agreed schedule (Y/N)
- Supplier shall provide first article inspection (FAI) evidence per AS9102 for new products (Y/N)

**Output (Customizable PDF):**
- Org name / logo placeholder
- Audit date field
- Auditor name / signature field
- 30–50 checklist items (yes/no/N/A columns)
- Scoring: # Yes items ÷ total applicable = compliance percentage
- Severity indicator: 80%+ = Pass; 60–79% = Conditional; <60% = Fail
- Export to PDF (print-ready, audit-trail ready, signature-ready)

#### 3. CSV Import / Export
**Requirement:** Load supplier data from CSV; export all data and reports to CSV for backup/integration

**CSV Import Format:**
```
Supplier Name,Standard,Last Audit Date,Certification Status,Process Capability,NCR Count
Supplier A,AS9100D,2026-03-15,Current,4,1
Supplier B,ISO 9001:2015,2026-02-01,Expired,3,2
Supplier C,IATF 16949,2025-12-10,Current,5,0
```

**CSV Export Format:**
- All supplier records (name, standard, dates, scores, history)
- Scorecard snapshot (supplier name, overall risk, 4 dimension scores, risk level)
- SQA checklists (one row per checklist item per supplier)

**Use Cases:**
- Backup/archive supplier data
- Integration with ERP (import supplier list)
- Bulk updates (edit CSV, re-import)
- Audit trail (export, sign, archive for regulatory proof)

#### 4. Demo Data
**Requirement:** Pre-load tool with 5 sample suppliers so users can test immediately

**Sample Data:**
- Supplier 1: "AeroTech Fasteners" (AS9100D, audit 3 mo ago, current cert, 0 NCRs, score 95 Green)
- Supplier 2: "ISO Parts Distributor" (ISO 9001, audit 6 mo ago, cert expires in 2 mo, 1 NCR, score 62 Yellow)
- Supplier 3: "Tier 1 Automotive" (IATF 16949, audit 10 mo ago, current, 2 NCRs, score 48 Orange)
- Supplier 4: "Medical Device Component" (ISO 13485, audit 15 mo ago, cert pending, 3 NCRs, score 22 Red)
- Supplier 5: "MRO Electronics" (EASA Part 145 eligible, audit 2 mo ago, current, 0 NCRs, score 92 Green)

#### 5. Standard Library (Embedded)
**Requirement:** Pre-built SQA templates for each supported standard

**Supported Standards (v1.0):**
- AS9100D (aerospace)
- ISO 9001:2015 (universal)
- IATF 16949:2016 (automotive)
- ISO 13485:2016 (medical device)
- FAA Part 21 Subpart E (US production approval)
- EASA Part 145 (EU repair certification)
- CAAC CCAR-145 (China repair certification)

**SQA Template Library Size:**
- 40–50 questions per standard
- 4 categories per standard
- Customizable: org name, audit date, auditor name
- Not customizable (v1.0): individual question text (v2.0 will allow custom questions)

#### 6. Local Data Persistence
**Requirement:** Save supplier data in browser so it persists between sessions

**Technology:**
- IndexedDB (browser local storage, supports large data, survives browser restart)
- Fallback: SessionStorage (single-session only; less data loss risk in MVP)
- CSV export for manual backup

**Data Retention:**
- 100+ suppliers × 30 data points each = manageable in browser storage
- Clear data option (delete all suppliers, reset to demo data)

---

## Success Criteria (MVP Acceptance)

### Technical Success
| Criterion | Success Metric |
|-----------|-----------------|
| Load Time | < 2 seconds (including demo data) |
| Score Calculation | 100 suppliers scored in < 1 second |
| PDF Export | Generated within 3 seconds, printable, readable |
| CSV Import | 100 rows imported, validated, scored within 2 seconds |
| Cross-Browser | Works on Chrome, Firefox, Safari, Edge (latest) |
| Mobile Responsive | Works on iPhone (Safari), Android (Chrome), iPad (landscape + portrait) |
| Offline | All data stored locally; no network calls required |
| Data Loss Prevention | CSV export available; user-initiated backup works 100% |

### Business Success (MVP Launch)
| Criterion | Success Metric |
|-----------|-----------------|
| Time-to-Value | User generates first SQA checklist in < 15 minutes |
| Net Promoter Score | First 10 beta users: avg 8+/10 satisfaction |
| Free Trial Conversion | 20%+ of trial users convert to paid (first 30 days) |
| Pricing Acceptance | Most customers choose $199–$399 tier (not bargain-hunting for Starter) |
| Feature Requests | 3+ distinct feature requests from early customers |

---

## Out of Scope (v1.0) — Reserved for v2.0+

**Do NOT build in MVP:**
- Cloud sync / backup (local-only in v1.0)
- User authentication / multi-user roles
- Mobile app (web-responsive only)
- API integrations (ERP, audit tools, calendar)
- AI-assisted scoring (manual inputs only)
- Supplier portal (no self-service submission)
- Email reminders (no backend)
- Advanced reporting (scorecard only, no trends/analytics)
- Audit calendar integration
- Compliance alert engine

**Why?** These add complexity, delay launch, and aren't required for MVP viability. Defer to v2.0 after validating core unit economics with 20+ paying customers.

---

## Scope Checklist (Completion Gate)

**Core App:**
- ✅ Supplier risk scorecard (4-dimension scoring)
- ✅ SQA checklist generator (7 standards, 4 categories)
- ✅ CSV import (validate, score, persist)
- ✅ CSV export (all data, scorecard, checklists)
- ✅ PDF export (SQA checklist, supplier card)
- ✅ Demo data (5 suppliers pre-loaded)
- ✅ Risk matrix dashboard (visual, color-coded)
- ✅ Local data persistence (IndexedDB/SessionStorage)

**UI/UX:**
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Accessibility (WCAG 2.1 Level AA minimum)
- ✅ Intuitive navigation (< 3 clicks to any feature)
- ✅ Help text / tooltips (on key fields)

**Documentation:**
- ✅ User guide (how to use each feature)
- ✅ FAQ (common questions)
- ✅ Sample data explanation (why each supplier is at their risk level)

**Testing:**
- ✅ Smoke test checklist (critical paths)
- ✅ Cross-browser testing (Chrome, Firefox, Safari, Edge)
- ✅ Mobile testing (iPhone, Android, iPad)

**Deployment:**
- ✅ GitHub repo setup
- ✅ Railway deployment (static hosting)
- ✅ Health check endpoint (landing page loads successfully)

---

## Non-Functional Requirements

| Requirement | MVP Standard | Rationale |
|-------------|--------------|-----------|
| Security | No authentication required; client-side only | Reduces complexity; cloud sync (v2.0) will add auth |
| Privacy | No data sent to server; all processing local | GDPR/HIPAA-friendly; privacy-as-feature marketing |
| Accessibility | WCAG 2.1 Level AA | Accessible to auditors with visual impairments |
| Performance | Scores 100 suppliers in < 1 sec | Auditors need instant feedback |
| Localization | English only (v1.0) | Spanish/French in v2.0 (Burrana/Canadian market) |
| Backup | CSV export; manual user responsibility | Cloud backup (v2.0) will be automatic |
| Browser Support | Latest 2 versions of Chrome, Firefox, Safari, Edge | Covers 95%+ of users; older browsers degrade gracefully |

---

## Estimated Development Effort (Autonomous Build)

**Total Effort: 16–20 working hours (2–2.5 days)**

| Component | Effort | Notes |
|-----------|--------|-------|
| Scoring engine | 3 hrs | 4-dimension model, calculations |
| Risk dashboard UI | 4 hrs | Risk matrix, supplier cards, drill-down |
| SQA checklist generator | 3 hrs | Template library (7 standards), PDF output |
| CSV import/export | 2 hrs | Parse CSV, validate, export |
| Demo data + UI polish | 2 hrs | Sample suppliers, responsive design, help text |
| Testing + docs | 2 hrs | Smoke test, user guide, FAQ |

**Launch Timeline (Once Build Complete):**
- Push to GitHub: 30 min
- Deploy to Railway: 1 hour
- Gumroad product setup: 2 hours
- Landing page HTML: 2 hours
- **Total Go-Live: 5.5 hours (same day possible)**

---

## Acceptance Criteria (Final Checklist)

**Before Brian Can Say "Launch":**
- [ ] Scoring engine calculates correctly (manual test: 5 suppliers, verify hand-calc matches tool)
- [ ] SQA checklists generate with correct questions (test: 1 standard, count questions, verify content)
- [ ] CSV import works (test: import sample 5-supplier CSV, verify all data loaded + scored)
- [ ] CSV export works (test: export all data, open in Excel, verify structure)
- [ ] PDF export works (test: generate SQA PDF, open in Acrobat, verify printable + readable)
- [ ] Demo data loads (test: launch tool, verify 5 suppliers visible)
- [ ] Offline mode works (test: disconnect network, verify tool still functional, data persists)
- [ ] Responsive design works (test: desktop, tablet, mobile — all readable, no layout breaks)
- [ ] User can complete full workflow in < 15 min (test: new user generates first SQA uncued)
- [ ] Landing page copy is compelling (review: addresses buyer pain, clear pricing, demo link works)

---

## Release Notes Template (for Brian's announcement)

```
Supplier Quality Risk Scorecard v1.0 — Launch Release

What's Included:
✅ Supplier risk scoring (4-dimension, color-coded)
✅ SQA checklist generator (7 standards, instant PDF)
✅ CSV import/export (backup, integration-ready)
✅ Demo data (5 sample suppliers, ready to explore)
✅ Offline operation (no internet required)
✅ Local data persistence (browser-based)

Pricing:
Starter: $99/mo (1–3 suppliers)
Basic: $199/mo (4–10 suppliers) ← Most popular
Professional: $399/mo (11–25 suppliers)
Enterprise: $999/mo (26+ suppliers)

Launch Offer:
20% off for first 3 months (early adopter)
14-day free trial (no credit card)

Go-To-Market:
Available on Gumroad (payment)
Live demo: index.html
GitHub: [repo URL]
Website: Conform-Edge portal

Next Steps:
Week 1–2: 5–10 beta customers
Month 1: 20+ customers, $5k+ MRR target
Month 3: Feature requests, v1.1 roadmap
Month 6: Cloud backup (v2.0), integrations

Questions? Email: [support contact]
```
