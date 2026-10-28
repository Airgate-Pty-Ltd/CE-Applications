# Product Brief: IATF 16949 Core Tools Compliance Suite

## Vision
Enable automotive suppliers (Tier 1/2) to achieve IATF 16949:2016 readiness and maintain certification compliance through continuous self-assessment of the five AIAG core tools — in 30 minutes, offline, for $199–$699/month.

## User Story
> "As a Quality Manager at a Tier 2 automotive supplier, I need to know if we're audit-ready for our upcoming IATF surveillance visit. I have 4 hours before the auditor arrives. Instead of manually reviewing 50+ FMEA worksheets, 20 MSA data packages, and 100 SPC control charts, I want to run a single 30-minute self-assessment that tells me exactly which of the five core tools are at risk, what evidence is missing, and what I need to fix in the next 30 days."

## Product Name & Positioning
**IATF 16949 Core Tools Compliance Suite** (branded as "Conform-Edge Automotive IATF Toolkit")

**Tagline**: "30-Minute IATF Readiness Check. Audit Evidence in One Report."

**Elevator Pitch**: "Self-contained HTML tool that assesses your supplier's compliance against all five AIAG core tools (APQP, PPAP, FMEA, MSA, SPC) + IATF 16949 integration. Get a maturity radar, gap report, and audit-ready evidence pack—no consultant needed. $199/month."

## Core Features

### 1. Multi-Tab Assessment Engine
Each tab focuses on one core tool + integration scenario:
- **APQP Readiness** (8 Qs): Product lifecycle planning, cross-functional participation, design controls, risk analysis, prototype & pilot validation
- **PPAP Submission** (7 Qs): Submission levels, documentation completeness, product drawings/specs, run-at-rate capability, approval authority
- **FMEA Discipline** (8 Qs): Process vs design vs customer FMEA coverage, S/O/D severity-occurrence-detection logic, control verification, action closure discipline
- **MSA Validity** (6 Qs): Measurement system selection, discrimination ratio, stability/repeatability, gauge R&R methodology, operator competence, data integrity
- **SPC Effectiveness** (6 Qs): Control chart strategy, subgroup logic, action rules (reaction), reaction plan execution, capability studies, process control linkage
- **IATF Integration** (10 Qs): Customer-specific requirements (Ford CSR 4.x, GM CSR 2.x, etc.), supplier control hierarchy, configuration management, product safety, special processes

### 2. Real-Time Scoring
- **4-Dimension Radar Chart** plotting maturity (1–5) across all six categories
- **Automated gap analysis**: Flags lowest-scoring tool, calculates days-to-compliance
- **Risk indicators**: Red/yellow/green status on each question
- **Improvement roadmap**: Ranked action items (30/60/90/180 days to fix)

### 3. Outputs
- **Printable compliance report** (PDF via browser print-to-PDF)
- **CSV export** for trend tracking across multiple assessments
- **Email-sendable summary card** (maturity radar + one-pager)
- **Audit evidence checklist** auto-generated per tool (FMEA control plan, MSA validation report, SPC chart criteria, etc.)

### 4. Customer-Specific Configurations
- **Ford CSR navigator**: Maps questions to specific Ford CSR 4.3.2, 4.4.1, 4.4.2 requirements
- **GM CSR navigator**: Maps to GM-specific supplier control hierarchy
- **Stellantis variant**: Stellantis-specific PPAP & FMEA language
- **Generic IATF 16949**: Defaults to ISO/IEC 16949:2016 + AIAG guidance (no customer-specific overlay)
- **Extendable**: Easy to add Honda, Toyota, BMW, VW variants as customers adopt

### 5. Data Handling
- **Offline-first**: No data sent to servers (MVP); all logic in JavaScript
- **Local storage**: Browser's localStorage allows return visits to same assessment
- **Enterprise tier (v2.0)**: Optional cloud storage + audit trail + multi-user collaboration
- **No login required** for MVP (frictionless entry)

---

## User Workflows

### Workflow A: 30-Minute Self-Assessment
1. Open IATF tool in browser
2. Select customer (or "Generic IATF 16949")
3. Answer 45 scored questions across six tabs (~30 min)
4. View real-time maturity radar
5. Read improvement roadmap
6. Print or email report to team

**Outcome**: Supplier knows where they stand; one-page deck for leadership.

### Workflow B: Audit Prep (4-Week Cycle)
1. Run assessment (Week 1): Identify gaps
2. Execute quick fixes (Week 2–3): Address red/yellow items
3. Re-assess (Week 4): Confirm readiness
4. Generate audit-ready evidence pack (print report)
5. Walk auditor through compliance proof

**Outcome**: Faster audit closure; fewer findings.

### Workflow C: Annual Certification Planning
1. Run assessment for each supplier (if managing a supply chain)
2. Aggregate results (all suppliers' scorecards in one view)
3. Identify systemic gaps (e.g., "all Tier 2 suppliers weak in MSA")
4. Build training roadmap
5. Re-assess post-training

**Outcome**: Supplier quality intelligence; proactive training ROI.

---

## Key Assumptions

| Assumption | Rationale | Validation Plan |
|-----------|----------|-----------------|
| 15,000+ suppliers globally need this | TAM sized at 3,000 NA + 12,000 EU/APAC | Show Brian competitive landscape analysis |
| Suppliers will pay $199–$699/month | Similar tools (SPC software, FMEA training) cost 5–10× more | Survey 10 Tier 1/2 Quality Managers |
| 30-minute assessment is credible | Brian's IATF audits use similar questions; real scoring logic proven | Pilot with 3 suppliers; track time/accuracy |
| No backend needed for MVP | Self-contained HTML + localStorage sufficient | Deploy to Railway; validate uptime/speed |
| Offline model is acceptable | Enterprise tier (v2.0) will add cloud; MVP customers OK with local-only | Track feature requests |
| Customer-specific configs will drive adoption | Each CSR variant is a new sales hook | Build Ford/GM/Stellantis configs first |

---

## Success Metrics (12-Month)

| Metric | Target | How Measured |
|--------|--------|--------------|
| **Users (paying)** | 100–150 | Gumroad / payment processor ARU |
| **ARR** | $250k–$520k | Monthly recurring revenue (SUM of monthly subs) |
| **Churn** | < 10%/mo | (Users lost / start-of-month users) × 100 |
| **NPS** | > 50 | Post-usage survey (would you recommend?) |
| **Session time** | 25–35 min average | Browser analytics (Google Analytics) |
| **Repeat assessments** | 40%+ of users | (Unique users with 2+ assessments) / total users |
| **CSV exports** | 30%+ of users | (Users downloading reports) / total users |
| **Case studies** | 5 published | Blog posts + LinkedIn customer testimonials |

---

## Market Differentiation

### Why We Win Against Alternatives

| Alternative | Cost | Time | All 5 Tools | Audit-Proof | Offline | Our Edge |
|------------|------|------|-----------|----------|---------|----------|
| Big Four Consulting | $150k–$300k | 6 weeks | Partial | Yes | No | 100–600× cheaper, 1000× faster |
| IHS Markit Dashboard | $5,000/mo | Day 1 | No | No | No | 5–25× cheaper, specialized |
| Excel Templates (DIY) | Free | Variable | Maybe | Poor | Yes | Intelligent scoring, curated logic |
| AIAG Training + Manual Audit | $2k–$5k course + 40 hrs labor | 60 hours | Yes | Poor | No | Integrated + ongoing + low-cost |

---

## Positioning Narrative

Conform-Edge's **IATF 16949 Core Tools Compliance Suite** is the only audit-evidence-first self-assessment tool built by a lead auditor, for automotive suppliers who can't afford a $150k consulting engagement but won't risk a failed surveillance audit.

Unlike generic FMEA or SPC tools, the Suite assesses all five core tools at once, auto-generates audit-ready evidence, and maps to your customer's specific requirements (Ford/GM/Stellantis). 

It's designed for Quality Managers who have 30 minutes and $199/month, not 6 weeks and $150k.

---

## Go-To-Market Hook

"Your next IATF auditor will be here in 60 days. Are your FMEA, MSA, and SPC ready? Check in 30 minutes."

**Launch channel**: LinkedIn (targeting IATF Auditors, Quality Managers), direct email (supplier quality managers from Burrana client list), consultant referral program (lead auditors recommend the tool to clients).

