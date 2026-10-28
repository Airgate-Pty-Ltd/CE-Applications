# Product Brief: Supplier Quality Risk Scorecard & Flow-Down Compliance Tracker

## Product Name & Positioning
**Supplier Quality Risk Scorecard** — Intelligent supplier compliance & risk management platform for quality leaders.

Tagline: *"Know your supplier risk in minutes, not weeks. Audit-ready compliance in one click."*

## Vision
Eliminate manual supplier compliance tracking. Give quality leaders a single source of truth for supplier capability, risk, and audit readiness across all standards (aerospace, automotive, medical device).

## Problem Statement
Quality managers spend 40–60% of their time:
- Creating supplier audit checklists from scratch (6+ hours per supplier per audit)
- Tracking supplier certifications across 5–10 different standards
- Generating SQA (Supplier Quality Agreement) compliance matrices for OEM audits
- Identifying repeat non-compliance patterns before field failures
- Preparing supplier risk reports for executive leadership

**Current Workflow (Manual, Error-Prone, Slow):**
1. Open folder with old SQA templates
2. Search for supplier's audit date, certifications, NCRs
3. Manually update checklist based on "what I remember" from prior audits
4. Copy-paste into Word → format → PDF
5. Email to internal stakeholders
6. Chase down updates when standards change

**Result:** Inconsistent checklists, missed compliance gaps, wasted auditor time, field failures from supplier defects.

## Solution Overview
**Supplier Quality Risk Scorecard** = intelligent HTML app that:
1. **Inputs:** Supplier name, standard(s), latest audit date, certification status, recent NCRs
2. **Scoring:** 4-dimension risk model (Certification Status 25%, Process Capability 25%, Audit History 25%, Compliance Gap 25%)
3. **Output:** Color-coded supplier risk scorecard + auto-generated SQA checklist + compliance matrix + PDF export

**Key Differentiators:**
- No backend, no data sent to cloud (MVP) → security/compliance-friendly
- Works offline → no internet required during audits
- Standards-aware (AS9100D, ISO 9001, IATF 16949, ISO 13485, FAA Part 21/145, EASA Part 145)
- Scoring rubric grounded in 20 years of aerospace/auto/medical supplier audits
- Governance-customizable SQA templates (quick config, no code)
- Instant PDF export for audit evidence + customer reports

## Target User Personas

### Persona 1: VP Quality / Quality Director
- **Name:** Sarah Chen (VP Quality, Tier-1 automotive supplier)
- **Problem:** Managing 50+ suppliers across IATF/ISO 9001; OEM audits demand real-time scorecard visibility
- **Goals:** Reduce supplier audit prep time; improve compliance score; prevent field failures
- **Budget:** $150k–300k/year; can approve $5k–20k/year for software
- **Success Metric:** "Audit checklist generation time drops from 40 hrs/year to 4 hrs/year"

### Persona 2: Supplier Quality Manager
- **Name:** Miguel Rodriguez (Supplier Quality Mgr, aerospace MRO)
- **Problem:** Manually tracking which suppliers hold which certifications; no visibility into compliance gaps
- **Goals:** Automate checklist generation; reduce manual data entry; audit-ready at any time
- **Budget:** Limited discretionary ($2–5k/year) but strong business case for approval
- **Success Metric:** "SQA checklists ready in 10 min instead of 4 hours"

### Persona 3: Regulatory/Compliance Manager
- **Name:** James Park (Compliance Manager, medical device manufacturer)
- **Problem:** ISO 13485 design history file requires supplier quality evidence; FDA inspections scrutinize documentation
- **Goals:** Maintain audit-ready supplier documentation; prove compliance to regulators
- **Budget:** $5–10k/year for compliance software
- **Success Metric:** "Zero compliance findings on supplier section of FDA inspection"

### Persona 4: Operations Director (Repair Station / MRO)
- **Name:** Alfonso Velarde (Quality Lead, MRO facility)
- **Problem:** CAAC/FAA require documented supplier assessment; manual processes error-prone
- **Goals:** Standardize supplier audit process across team; reduce auditor variability
- **Budget:** Part of operations/quality budget; can allocate $3–8k/year
- **Success Metric:** "All 20 suppliers have current, standardized SQAs by month-end"

## Core Features (MVP)

### 1. Supplier Risk Scorecard
- 4-dimension scoring model (Certification 25%, Capability 25%, Audit History 25%, Compliance Gap 25%)
- 5-level risk scale (Green/Yellow/Orange/Red/Critical)
- Visual 4×4 matrix showing all suppliers at a glance
- Drill-down to individual supplier details
- Trend view (supplier risk improving/declining over time)

### 2. SQA Checklist Generator
- Select standard (AS9100D, ISO 9001:2015, IATF 16949, ISO 13485, FAA Part 21, EASA Part 145, CAAC CCAR-145)
- Auto-populate with governance questions (sourcing, inspection, flow-down, corrective action)
- Customizable per-org (add company name, logo, audit date)
- Export to PDF for auditor use
- Export to CSV for bulk import into audit management system

### 3. Compliance Gap Report
- By-standard view: "Which suppliers are non-compliant with ISO 9001?"
- By-supplier view: "What gaps exist for Supplier X across all standards?"
- Risk-ranked: Critical gaps first
- Actionable: "Generate SQA checklist to close gaps"
- Audit-ready: Timestamp, verifier name, evidence links

### 4. Data Import/Export
- CSV upload (supplier name, standard, audit date, cert status, NCR count)
- Demo data pre-loaded (5 sample suppliers, 3 standards)
- Export all data to CSV (backup, integration with ERP)
- Export scorecard to PDF (board presentations, customer reports)

### 5. Audit Planning
- "Audits Due" view: suppliers past audit date or approaching audit window
- Pre-audit checklist: "What to check for Supplier X"
- Post-audit tracking: "Update supplier score after audit"
- Audit calendar (when audits are due, who's overdue)

## User Stories

### Story 1: Generate SQA in 10 Minutes
*As a Supplier Quality Manager, I want to generate a customized SQA for a supplier in 10 minutes so I can focus on the audit itself, not paperwork.*

- Open tool
- Select supplier (dropdown from CSV import)
- Select standard (AS9100D)
- Click "Generate Checklist"
- Tool populates SQA with governance questions
- Customize org name + audit date
- Export to PDF
- Done in 10 minutes (vs. 4 hours manual)

### Story 2: Identify At-Risk Suppliers Before Audit
*As a VP Quality, I want to see which suppliers are at risk so I can prioritize audit schedule and prevent field failures.*

- Open risk scorecard dashboard
- View color-coded matrix (Red suppliers highlighted)
- Drill into Supplier X (Red)
- Root cause: "Missing AS9100D certification since 2026-05-15"
- Action: "Issue SQA flow-down requirement; no new POs until recertified"

### Story 3: Prepare Audit-Ready Compliance Evidence
*As a Regulatory Manager, I want to compile all supplier quality evidence for FDA inspection in one place so I can prove Design History File compliance.*

- Generate "Supplier Compliance Report by Standard"
- Filter to ISO 13485 suppliers
- View certification status, audit date, NCR count, compliance gap
- Export to PDF with timestamp + verifier signature
- Use PDF in FDA inspection (evidence of supplier control per 21 CFR 820)

### Story 4: Track Repeat Suppliers Issues
*As a Quality Director, I want to see which suppliers have repeat non-conformances so I can trigger escalation/corrective action.*

- Supplier history view: "Supplier X audit history (last 5 audits)"
- Major NCRs highlighted (repeat findings)
- Trigger: "If repeat NCR on same process, escalate to exec review"
- Dashboard alert: "Supplier X has 3 repeat findings on incoming inspection — recommend source change"

## Architecture Overview

### Frontend
- Single-page HTML/JavaScript application
- No framework dependencies (vanilla JavaScript for portability)
- Responsive design (works on desktop, tablet, mobile)
- Client-side data processing (all calculations in browser)
- IndexedDB for local data persistence (optional; CSV import/export as primary)

### Data Flow (MVP — No Backend)
```
User Input (CSV / Manual) 
  → Client-Side JavaScript Processing
  → Risk Score Calculation (4-dimension model)
  → Local Storage (browser)
  → PDF/CSV Export
  → (Optional) Sync to Railway for backup (future)
```

### Standards Library (Embedded in JavaScript)
- Pre-loaded templates for SQA questions by standard
- Customizable questions per governance area (sourcing, inspection, flow-down, etc.)
- Scoring rubric (Certification Status criteria, Capability criteria, Audit History criteria)

### Export Capabilities
- PDF (audit-ready, branded with org name/logo)
- CSV (import into ERP, backup)
- JSON (future: cloud sync)

## Success Criteria (MVP Launch)

### Technical Success
- ✅ App loads in < 2 seconds (no backend latency)
- ✅ Scorecard calculation completes in < 1 second (100 suppliers)
- ✅ PDF export within 5 seconds
- ✅ Works offline (data persists in browser)
- ✅ Cross-browser compatible (Chrome, Firefox, Safari, Edge)
- ✅ Mobile responsive (tested on iPhone, Android tablet)

### Business Success (First 30 Days)
- ✅ Landing page: 200+ visits
- ✅ 10+ free trial sign-ups (Gumroad email list)
- ✅ 2–3 paid customers ($199–399/month tier)
- ✅ Net Promoter Score: 8+/10 (early feedback from users)
- ✅ Time-to-value: User generates first SQA in < 15 minutes

### Product Success (First 90 Days)
- ✅ 20–30 paying customers
- ✅ Churn rate: < 5% (retention > 95%)
- ✅ Feature request backlog: > 5 actionable items from customers
- ✅ Revenue: $4,800–12,000 MRR ($199 × 30–60 customers average)

## Go-To-Market Strategy

### Phase 1: Launch (Week 1–2)
- Push MVP to GitHub (public repo, open-source option)
- Deploy to Railway.app (static hosting, no backend)
- Set up Gumroad product page (pricing, checkout, email delivery)
- Create landing page (benefits, pricing, live demo link)

### Phase 2: Awareness (Week 3–4)
- LinkedIn launch post (targeting Quality/Supply Chain groups)
- Email to aerospace/auto supply chain contacts (from Brian's network)
- Case study teaser: "Burrana QMS uses this — here's the impact"
- Free trial offer (14 days, Gumroad honor system)

### Phase 3: Acquisition (Month 2–3)
- Direct outreach to Top 100 Quality leaders (aerospace/auto/medical)
- Webinar: "Supplier Risk in 10 Minutes" (educational, product demo)
- Content marketing: Blog posts on supplier compliance trends
- Referral program: Customer referral = $50 credit toward their account

### Pricing Strategy
| Tier | Price/Mo | # Suppliers | Limit | Target |
|------|----------|-------------|-------|--------|
| Basic | $199 | 1–5 | CSV import | Lean startups, single facilities |
| Professional | $399 | 6–25 | CSV + PDF export | Mid-size companies, 1 standard focus |
| Enterprise | $999 | 26+ | Multi-standard, integrations, priority support | Large OEMs, repair stations, multi-plant |

## Competitive Advantage

| Feature | SQ Risk Scorecard | Competitor A (Generic Risk Tools) | Competitor B (ERP Add-On) | Competitor C (Audit SaaS) |
|---------|-------------------|-----------------------------------|--------------------------|--------------------------|
| Aerospace + Auto + Medical | ✅ | ❌ | Partial | ❌ |
| Zero backend required | ✅ | ❌ | ❌ | ❌ |
| Offline capable | ✅ | ❌ | ❌ | ❌ |
| SQA auto-generation | ✅ | ❌ | Partial | ❌ |
| Compliance gap scoring | ✅ | ❌ | Basic | Basic |
| Brian's 20-year QMS IP | ✅ | ❌ | ❌ | ❌ |
| Conform-Edge integration path | ✅ | ❌ | ❌ | ❌ |
| Launch price ($199–999/mo) | ✅ | $1,000+/mo | $500–2,000/mo | $3,000+/mo |

---

## Post-Launch Roadmap (Premium Features)

### V1.1 (Month 2–3)
- Cloud backup (opt-in, encrypted)
- Multi-user roles (auditor, manager, reviewer)
- Supplier notes + audit history tracking
- Automated supplier re-certification reminder emails

### V2.0 (Month 4–6)
- AI-assisted scoring (predict supplier risk from historical data)
- Integration with audit calendar (link to audit management system)
- Supplier portal (suppliers can submit certifications, upload docs)
- Compliance alert engine (notify when standard changes)

### V3.0 (Month 7–12)
- Multi-organization support (consulting/audit firms audit many clients)
- API (integrate with ERP, QMS, audit platforms)
- Benchmarking (compare your supplier risk to industry average)
- Training integration (link to Annex Quality courses on supplier management)

---

## Success Metric Examples

**For a 20-supplier QMS (typical mid-size org):**
- **Time to generate SQA checklist:** 240 hrs/year → 24 hrs/year (90% reduction)
- **Cost savings:** $12k–15k/year (at $50–60/hour loaded labor)
- **ROI:** Tool cost $4,800/year → pays back in 4 months
- **Compliance improvement:** "Zero supplier-related compliance findings on audit" (audit pass rate up 20%)

---

## Conclusion
Supplier Quality Risk Scorecard is a focused, defensible, high-ROI tool that solves a real pain point for quality leaders. MVP is fully functional, demo-ready, and can launch within 4 weeks. Premium features unlock $1M+ Year 3 revenue potential.
