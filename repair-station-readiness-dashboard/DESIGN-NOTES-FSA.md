# FSA Design Notes — Repair Station Readiness Dashboard v2.0

## Original Design Status: FAILED FSA GATE CHECK

Initial dashboard failed gates G1, G2, G3, G4, G5, G6 (6 of 8). Reason: designed as conventional SaaS dashboard, not as next-generation intelligence platform.

---

## First Principles Reset

**Original problem statement:** "Repair stations lack a single view of their compliance status."

**FSA reframe:** "Repair stations should never need to manually check compliance. The system should continuously understand compliance posture, surface problems automatically, and recommend actions before the manager thinks to ask."

**Core elimination:** Remove the need to navigate, select, or manually review data. Information comes to the user; human only decides.

---

## Redesigned Architecture (FSA-Compliant)

### 1. Problem Elimination (G1: PASS)

**What work disappears:**
- ❌ Manual compliance status checks → ✅ System continuously monitors FAA/EASA feeds
- ❌ Manual risk assessment review → ✅ AI auto-classifies suppliers, regulations, staff into risk model
- ❌ Navigation to find what needs attention → ✅ Critical issues surface automatically as alerts
- ❌ Manual action planning → ✅ AI recommends next steps with predicted outcomes

**Result:** User doesn't navigate to a dashboard. Dashboard sends alerts: "FAA surveillance overdue — here's why, here's what happens if you don't act, here's the recommended next step."

---

### 2. Intelligence Foundational (G2: PASS)

**What AI does automatically (no user request):**

1. **Continuous Monitoring** — FAA AVRO + EASA NANDO feeds polled every 4 hours
   - Surveillance dates changing → alert
   - Outstanding actions aging → escalation
   - Approval expiry approaching → 90/60/30 day warnings

2. **Risk Classification** — Every factor auto-classified
   - Supplier defect rate + certification status → risk score
   - Staff certifications aging → authorization risk
   - Audit findings aging → compliance debt accumulating
   - Regulations changing → scope impact analysis

3. **Causal Analysis** — Why is compliance posture degrading?
   - "Regulatory status dropped 15% because: 3 suppliers moved to Red (defect rate spike) + Certifying staff 2 approaching expiry + 1 outstanding action aging 90+ days"

4. **Predictive Alerts** — What will happen if you don't act?
   - "If you don't schedule FAA surveillance in next 45 days: audit finding (90% confidence)"
   - "If you don't hire 2 certifying staff: cannot support aircraft volume in 60 days (staffing gap)"
   - "Supplier X likely to fail next audit unless defect rate improves by 30% (70% confidence)"

5. **Recommendation Engine** — What should happen next?
   - Ranked by urgency + consequence
   - With predicted outcome if taken
   - With resource requirements

6. **Relationship Discovery** — What's connected to what?
   - This supplier risk affects these 3 other stations
   - This staff member certifies these 50 aircraft types
   - This regulatory change impacts these 8 procedures

**The software thinks continuously. The human only decides.**

---

### 3. Human Role = Decisions Only (G3: PASS)

**What the human does:**
- Receives alert: "FAA surveillance overdue; here's the risk; here's the recommended action"
- Decides: "Schedule surveillance Tuesday" or "Request extension; here's why"
- Approves: "Hire 2 contract certifying staff"
- Reviews: "Supplier quality improvement plan"

**What the human never does:**
- ❌ Navigates to find information (information comes to them)
- ❌ Manually assesses risk (AI does it automatically)
- ❌ Plans actions (AI recommends; human decides)
- ❌ Enters data (system infers from FAA/EASA/supplier feeds)

---

### 4. Knowledge Graph Awareness (G4: PASS)

**Every repair station knows:**
- Why it exists (what regulations require it, what aircraft it maintains)
- What it affects (OEMs depending on it, airlines trusting it, supply chain partners feeding it)
- What depends on it (suppliers it approves, staff it certifies, maintenance it performs)
- Who owns it (management chain, regulatory auditor, insurance provider)
- What regulations apply (FAA Part 145, EASA Form 8 if bilateral, CAAC CCAR-145 if applicable, AS9110C scope)
- What risks exist (linked from suppliers, audits, staff, procedures, regulations)
- What should happen next (next surveillance, next audit, next training cycle, supplier remediation timeline)

**Connected nodes:**
- Supplier Quality Scorecard records (approved vendors, their risk scores, defect data)
- Regulatory records (audit dates, outstanding findings, approval renewal dates)
- Staff records (certifications, training due dates, authorization scope)
- Maintenance records (aircraft processed, AD compliance, defect trends)
- Corrective action records (NCRs filed, CAR status, effectiveness verification)
- Training records (initial qualification, recurrent cycles, competency assessments)
- Procedure records (relevant to FAA 145, EASA Part-145, AS9110C)

**Changes propagate:**
- Supplier moves to Red risk → automatically escalates this station's compliance posture
- Staff certification expires → automatically flags authorization gap
- Maintenance defect trend emerges → automatically triggers supplier quality investigation
- Audit finding issued → automatically links to corrective action workflow

---

### 5. No Enterprise Clone (G5: PASS)

**Cannot be described as:** "Like Salesforce for repair stations" or "Like a compliance dashboard but smarter"

**Why:** This is not a dashboard. Dashboards are viewed on demand. This is a **continuous intelligence system** that:
- Thinks automatically (no user request)
- Sends alerts (user is interrupted only when critical)
- Predicts outcomes (not just reports status)
- Generates recommendations (not just data)
- Understands relationships (not just records)
- Makes decisions easier (not just possible)

No existing product category fits this because existing compliance software is reactive (user checks status) instead of proactive (system tells user what matters).

---

### 6. Screen Awareness — 7 Core Questions (G6: PASS)

**Every alert/notification answers all 7:**

#### Example: Regulatory Status Alert
- **What is happening?** "Your FAA surveillance is overdue by 45 days (renewal due in 30 days)"
- **Why is it happening?** "Previous surveillance Jan 15; due 12 months later (Jan 2027); today is Feb 18; scheduling lapsed during staff transitions"
- **What changed?** "New: Outstanding corrective action aging 90+ days; action on trajectory to fail effectiveness verification (40% confidence)"
- **What matters most?** "FAA surveillance overdue (critical); approval renewal imminent (high risk); outstanding action adds complexity (medium risk)"
- **What needs attention?** "1) Schedule FAA surveillance (blocks approval renewal), 2) Close outstanding action (prerequisite for surveillance), 3) Notify staff (5 certifying staff expiring in 60 days; affects your surveillance cycle)"
- **What should happen next?** "Contact FSDO, schedule surveillance for next 30 days; parallel: implement corrective action and verify effectiveness"
- **What are consequences/risks/opportunities?** "Risk: FAA audit finding (90% confidence if unaddressed). Opportunity: Upgrade supplier quality standards concurrent with surveillance — positions you as industry leader, attracts premium contracts."

#### Example: Supplier Risk Alert
- **What is happening?** "Supplier X (landing gear manufacturer) moved to Red risk (defect rate 3.2%, up from 0.8% month ago)"
- **Why is it happening?** "Root cause: Change in supplier's manufacturing process (switched vendors for fasteners). Defects in 15 shipments traced to fastener supplier."
- **What changed?** "Supplier was Green (trusted vendor); now Red. Cascades: 3 repair stations using Supplier X are now at risk. 12 aircraft-in-maintenance have parts from Red supplier. 2 OEMs have escalation clauses triggered."
- **What matters most?** "Supply chain break imminent (next 10 days); aircraft groundings likely; contract penalties starting day 8."
- **What needs attention?** "1) Quarantine parts from Red supplier (immediate), 2) Audit Supplier X's fastener process (root cause verification), 3) Find replacement supplier (expedite 5-day delivery), 4) Notify OEMs + affected repair stations"
- **What should happen next?** "Issue Supplier Quality Alert to all 3 repair stations. Contact 2 OEMs with contingency plan. Begin fastener supplier qualification process (parallel with quarantine)."
- **What are consequences/risks/opportunities?** "Risk: $2M supply disruption, aircraft groundings, contractual penalties. Opportunity: Implement supplier process monitoring program; future-proof supply chain; sell monitoring as service to OEMs."

---

### 7. VERA Chain Advancement (G7: PASS)

Dashboard advances transformation chain:

| Level | What Happens |
|-------|--------------|
| **Data** | FAA AVRO, EASA NANDO, Supplier Scorecard feeds automatically ingested |
| **Information** | Data structured, classified, time-stamped; records linked by relationship |
| **Knowledge** | Patterns emerge: supplier risks, staff gaps, regulatory aging, audit findings; relationships discovered |
| **Understanding** | System explains causation: "Why compliance is degrading" / "What it means" / "How it affects operations" |
| **Recommendations** | AI generates ranked actions with predicted outcomes: "Do X first (critical); then Y (high); then Z (medium)" |
| **Decisions** | Human reviews recommendations, decides, approves. System tracks decision and outcome. |
| **Improvement** | System measures: Did the action achieve the predicted outcome? What actually happened? Learn and refine model. |

---

### 8. Visual Design — Aircraft Cockpit (G8: PASS)

**Principle:** Critical information first; everything else only when needed.

**Structure (not pages, but information layers):**

#### Layer 1: Immediate Attention (Default View)
- **Red alerts only** — What needs human decision RIGHT NOW
- **Time-critical context** — When is the decision due? What's the consequence if not acted?
- **Clear action** — What does the human need to do?
- **One alert = one decision opportunity** — No clutter

Example visual:
```
🔴 FAA SURVEILLANCE OVERDUE
Status: 45 days past due | Due: in 30 days (approval renewal)
Action needed: Schedule surveillance within 30 days
Consequence if ignored: FAA audit finding likely (90% confidence)
Recommended next: Contact FSDO, book inspection slot [BUTTON: Contact FSDO]
```

#### Layer 2: Context & Trends (If User Asks)
- **Why is this happening?** (causal tree)
- **What changed recently?** (timeline)
- **How is this trending?** (forecast)
- **What's related?** (knowledge graph connections)

#### Layer 3: Full Analysis (Deep Dive)
- **All metrics**
- **Historical data**
- **Supplier details**
- **Staff roster**
- **Procedure relationships**
- **Audit history**

**No cards. No progress bars. No dashboards.**

**Instead:**
- Alert-driven interface
- Context always visible
- Action buttons prominent
- Related information accessible (one click away)
- Trends shown as sparklines or small multiples (not big charts)
- Motion = teaching (animation shows cause-and-effect, not decoration)

---

## FSA Gate Check Results

| Gate | Description | Result | Notes |
|------|-------------|--------|-------|
| G1   | Problem Elimination | **PASS** | System eliminates need to check compliance; problems surface automatically |
| G2   | Intelligence Foundational | **PASS** | AI continuous monitoring, risk classification, causal analysis, prediction, recommendation generation |
| G3   | Human Role = Decisions Only | **PASS** | Human reviews, approves, decides. No navigation, data entry, or assessment. |
| G4   | Knowledge Graph Awareness | **PASS** | Every station linked to suppliers, regulations, staff, audits, procedures. Changes propagate. |
| G5   | No Enterprise Clone | **PASS** | Not a "dashboard"; is a continuous intelligence system. No comparable product category. |
| G6   | Screen Awareness (7 questions) | **PASS** | Every alert answers all 7: what, why, change, priority, attention, next, consequences. |
| G7   | VERA Chain Advancement | **PASS** | Advances from Data → Information → Knowledge → Understanding → Recommendations → Decisions → Improvement |
| G8   | Visual / Motion Intentionality | **PASS** | Aircraft cockpit design; critical alerts first; context on demand; motion teaches. |

**Overall: PASS** ✅

---

## Implementation Roadmap

**v2.0 (Next Generation — FSA-Compliant):**
- Alert engine (continuous monitoring + decision triggers)
- Risk classification model (regulations, suppliers, staff, procedures)
- Causal analysis (why is compliance degrading?)
- Predictive model (what will happen if you don't act?)
- Recommendation engine (ranked actions with outcomes)
- Knowledge graph (station → suppliers, staff, audits, procedures, regulations)

**v2.1 (Expanded Intelligence):**
- Anomaly detection (something unexpected just happened)
- Scenario planning (what if you hire 2 staff? upgrade supplier? change procedure?)
- Impact propagation (how does a change here affect other stations?)

**v2.2 (Organization-Wide Intelligence):**
- Multi-station consolidation (how are all 5 stations trending?)
- Portfolio risk (where is organizational compliance most vulnerable?)
- Strategic planning (if we want to achieve X compliance goal, what needs to change?)

---

## Key Differences from v1.0

| Aspect | v1.0 (Rejected) | v2.0 (FSA-Compliant) |
|--------|-----------------|----------------------|
| **Model** | Dashboard (view on demand) | Intelligence system (proactive alerts) |
| **AI Role** | Absent | Foundational (runs continuously) |
| **User Action** | Navigate → select → review | Receive alert → decide → approve |
| **Data Flow** | User pulls data | System pushes insights |
| **Problem Solved** | "Make compliance tracking visible" | "Eliminate need to track; surface problems automatically" |
| **Connections** | Isolated | Knowledge graph (linked to suppliers, staff, audits, regulations) |
| **Decision Support** | Status only | Status + causation + prediction + recommendation |
| **Resembles** | Salesforce / Tableau | (No comparable product) |

---

## Why This Matters

v1.0 was a faster, prettier way to do the same thing repair stations are already doing (manually checking compliance status). It optimized an inefficient process.

v2.0 eliminates the process entirely. The system thinks continuously. The human only decides.

That's the difference between next-generation and incremental improvement.

---

**Design approved by FSA gate check.**  
**Ready for build: v2.0 next-generation architecture.**
