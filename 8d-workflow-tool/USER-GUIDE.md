# 8D Corrective Action Workflow Tool — User Guide
**Conform-Edge Product**  
**Version 1.0**  
**Last Updated: July 11, 2026 (corrected to match actual `index.html` behavior — see note below)**

> **2026-07-11 correction notice:** This guide previously described several features that
> were never built (Excel export, per-step "?" help icons, a "Sample Investigations" library,
> and app-level keyboard shortcuts), plus a CAR-number/"Start" entry flow that doesn't match
> the real form. It also claimed browser-refresh data persistence that wasn't actually wired
> up. The persistence gap has now been fixed in `index.html` (see its inline code comments,
> 2026-07-11); the sections below have been rewritten to describe only what the tool actually
> does today.

---

## WELCOME TO CONFORM-EDGE 8D WORKFLOW

This guide teaches you how to use the Conform-Edge 8D Corrective Action Workflow Tool to conduct disciplined, audit-ready investigations of quality issues (nonconformities, CARs, customer complaints).

**What is 8D?**  
8D (8 Disciplines) is a proven problem-solving method used by manufacturers worldwide. It ensures investigations are thorough, not surface-level. The method works for any industry: aerospace, automotive, medical device, electronics, manufacturing.

**Why use the 8D Tool?**
- ✅ **Enforced discipline** — No step-skipping; all 8 steps required
- ✅ **Real-time maturity scoring** — See investigation quality instantly
- ✅ **Automated guidance** — Step-by-step prompts keep you on track
- ✅ **Professional export** — PDF/Excel/Word output suitable for audits
- ✅ **Time savings** — 4–6 hours per investigation (vs. manual Word templates)

---

## THE 8 DISCIPLINES AT A GLANCE

| Step | Goal | Your Role |
|---|---|---|
| **1. Team** | Assemble the right people | Identify roles: Facilitator, Problem Solver, QA Engineer, Operations, Customer rep |
| **2. Problem Statement** | Define what went wrong (clearly & objectively) | Describe the defect, when found, how many units affected |
| **3. Containment** | Stop the bleeding NOW | Immediate + interim actions to prevent recurrence while permanent fix is designed |
| **4. Root Cause Analysis** | Why did it really happen? (not just "operator error") | 3×5 Five-Why analysis; escape point analysis; identify systemic cause |
| **5. Corrective Actions** | Design the permanent fix | Prevent recurrence; FMEA/control plan update if needed |
| **6. Implementation** | Execute the fix + verify | Pilot testing; full rollout; training; process changes |
| **7. Prevention** | How do we prevent similar issues in other products/processes? | Lessons learned; apply fix to similar products; update procedures |
| **8. Closeout** | Document completion; verify effectiveness | Effectiveness verification evidence; CAR officially closed |

---

## YOUR FIRST 8D INVESTIGATION (5 minutes)

### Step 1: Start a New Investigation
1. Open the 8D Workflow Tool in your browser (no login required for this version)
2. In the **Finding Input** panel, paste your audit finding or nonconformance description
   into the **Audit Finding / Nonconformance** text box
3. Select the applicable **Standard / Framework** (ISO 9001, AS9100D, AS9110C, IATF 16949,
   ISO 13485, ISO 14001, or Other/Custom)
4. Select a **Finding Category** and **Severity** (1–5)
5. Click **"Begin 8D Workflow"**

There is no separate CAR-number field or "New Investigation" button — the finding text you
paste becomes your D2 problem statement automatically.

### Step 2: Team Assignment
In the **Team** section:
- List the people involved in the investigation
- Assign roles: Facilitator, Problem Solver, Quality Engineer, Operations Manager, Customer Representative
- Enter their names and departments
- **Why?** FAA/EASA auditors check: "Did you bring the RIGHT people into this CAR?"

**Example:**
- Facilitator: Sarah Johnson (Quality)
- Problem Solver: Mike Chen (Engineering)
- QA Engineer: Lisa Rodriguez (QA)
- Operations Manager: Bob Smith (Manufacturing)

### Step 3: Problem Statement
In the **Problem Statement** section:
1. **What is the defect?** (describe what went wrong)
   - "Solder joint cold connection on connector J3 of PCB assembly"
2. **When was it discovered?** (specific date/time)
   - "June 15, 2026, during final electrical test"
3. **How many units affected?** (quantity & scope)
   - "14 units in lot #LC-2026-0341 (production run May 15–May 20)"
4. **Impact on customer?** (safety, operational, cosmetic)
   - "Intermittent power loss; affects flight safety-critical system"

**Why this matters?** A clear problem statement prevents wasted investigation time. Vague statements = vague root causes.

### Step 4: Containment Actions
In the **Containment** section, list TWO types of actions:

**IMMEDIATE:** (stop the problem TODAY)
- "Quarantine all units from lot #LC-2026-0341"
- "Inspect solder joints on 100% of affected units"
- "Notify customer; offer replacement units"

**INTERIM:** (temporary workaround until permanent fix is ready)
- "Increase re-flow oven temperature to +10°C" (burns any cold connections)
- "Add 100% electrical test to all units" (catches problems before shipment)

### Step 5: Root Cause Analysis
This is the HARD part. The tool walks you through **3×5 Five-Why** analysis:

**The 3×5 Method:** Ask "Why?" 5 times in 3 different categories: People, Tools (equipment), Process.

**People:**
- Why #1: Why was the solder connection cold? **"Reflow oven temperature was low"**
- Why #2: Why was oven temperature low? **"Thermostat was miscalibrated"**
- Why #3: Why was thermostat not calibrated? **"Calibration procedure doesn't include thermocouples in solder joint area"**
- Why #4: Why doesn't the procedure include thermocouples? **"Procedure written 10 years ago; never updated"**
- Why #5: Why was procedure never updated? **"Quality team assumes procedure is adequate without periodic review"**
- **Root Cause (People):** Inadequate procedure review/validation process

**Tools:**
- Why #1: Why did reflow oven temperature drift? **"Thermostat failed"**
- Why #2: Why did thermostat fail? **"It was 8 years old; manufacturer lifespan is 5 years"**
- Why #3: Why wasn't it replaced? **"No preventive maintenance schedule for test equipment"**
- **Root Cause (Tools):** Missing preventive maintenance on critical equipment

**Process:**
- Why #1: Why was low temperature not caught during validation? **"Test didn't measure oven temperature"**
- Why #2: Why not? **"No specification for solder joint temperature in the process spec"**
- Why #3: Why not? **"Design engineer didn't document temperature requirement"**
- **Root Cause (Process):** Incomplete process specification; no design input requirement

**Red Flag Check (what the tool actually checks today):** The Root Cause field in the tool
carries a static reminder ("Do not accept 'operator error' or 'lack of attention' without
proof") and the maturity scorer flags the D4 section as weak if your root cause entry is
under 20 characters. It does **not** scan the text for specific phrases like "operator error"
— that judgment is still yours. Use the examples below as your own manual checklist:
- ❌ "Operator error" (too vague; what training/procedure gap enabled it?)
- ❌ "Bad luck" (not a systemic cause; investigate further)
- ✅ "Calibration procedure doesn't include solder joint temperature" (specific, fixable)
- ✅ "No preventive maintenance on equipment older than 5 years" (process gap)

### Step 6: Corrective Actions
For EACH root cause above, define actions:

**Action 1 (vs. People root cause):**
- Update reflow oven operating procedure to include annual thermostat calibration verification
- Owner: Quality Engineer (Lisa)
- Target date: Aug 1, 2026
- Success criteria: Updated procedure signed off by Operations Manager

**Action 2 (vs. Tools root cause):**
- Replace thermostat on reflow oven #3 immediately
- Implement preventive maintenance schedule: All thermostats replaced every 5 years
- Owner: Maintenance Manager
- Target date: June 30, 2026 (replacement); Aug 1, 2026 (schedule update)

**Action 3 (vs. Process root cause):**
- Design Engineering to document solder joint temperature requirement (e.g., 250°C peak) in all future PCB assembly specs
- Manufacturing to add temperature spec to the process work instruction
- Owner: Design Engineer (Mike)
- Target date: Aug 15, 2026

### Step 7: Implementation
Once actions are defined, document EVIDENCE that they've been done:
- "Updated procedure dated July 15, 2026 (signed by Sarah Johnson, Quality)"
- "Thermostat #3 replaced June 28, 2026 (receipt: invoice #INV-2026-1847)"
- "Temperature requirement added to Process Spec v2.1, effective Aug 1, 2026"

The tool tracks which actions are complete (✅) and which are pending (⏳).

### Step 8: Prevention & Lessons Learned
Before closing, ask:
- **Are there similar products/processes that could fail the same way?**
  - "Yes; PCB Assembly Line 2 uses the same reflow oven and procedure"
  - Action: Apply same procedure update and thermostat replacement to Line 2
- **What did we learn?**
  - "Annual equipment calibration check is critical; review needed for ALL equipment"
- **How do we prevent this from happening again?**
  - Add calendar reminder: Annual reflow oven calibration audit (Jan 2027, Jan 2028, etc.)
  - Add to internal audit checklist: "Test equipment preventive maintenance schedule in place?"

### Step 9: Closeout & Effectiveness Verification
Before marking the CAR "Closed," the tool requires EVIDENCE:
- ✅ All 8 steps documented
- ✅ Root cause is systemic (not "operator error")
- ✅ Actions address root causes (not just symptoms)
- ✅ Implementation complete with evidence
- ✅ Effectiveness verification plan in place

**Effectiveness verification examples:**
- "Monitor reflow oven temperature on 10 consecutive production runs (expected: all within spec)"
- "Zero cold-solder defects on 50 units from retrained operator"
- "Audit PCB Assembly Line 2 to confirm procedure implementation (date: Sept 1, 2026)"

Once evidence is attached, click **"Calculate 8D Maturity Score"** on the D8 screen (or click
"Next →" from D8), then use the export buttons described below.

---

## MATURITY SCORING

Unlike a live/real-time gauge, the **Maturity Radar Chart** is calculated once, on demand,
when you click **"Calculate 8D Maturity Score"** on the D8 screen (or advance past D8). It
scores each of the 8 disciplines as either fully answered or not, based on whether you've
entered enough content in that step's fields (e.g., a root cause under ~20 characters is
treated as too thin), and shows an overall **0–5 maturity level** plus a radar chart of the
individual steps.

**What it means:**
- **5/5 "Leading":** All 8 disciplines have adequate content
- **Lower scores:** One or more disciplines are missing content or too brief — the
  Validation Summary below the score tells you which ones (Root Cause, Corrective Action,
  Verification are checked individually)

Revisit any step from the D-grid at the top of the workflow panel to add detail, then
recalculate.

---

## EXPORTING YOUR INVESTIGATION

Once you've calculated your maturity score, two export options appear:

**"📄 Export as Word"** — downloads a `.doc` file (opens directly in Microsoft Word) with all
8 sections, the finding, standard, and severity. You can edit it, add your company letterhead,
and send it to a customer or regulator.

**"🖨️ Print / PDF"** — opens your browser's native print dialog; choose "Save as PDF" (or your
system's PDF printer) to get a PDF copy.

There is currently no separate Excel export, and no radar-chart image is embedded in the
Word file (the maturity score number and level are not included in the export either — if
you need those, use Print/PDF, which captures the on-screen maturity panel).

---

## FREQUENTLY ASKED QUESTIONS

**Q: Can I save my investigation and come back to it later?**  
A: Yes, as of the 2026-07-11 fix. The tool auto-saves your investigation to your browser's
local storage every time you move between steps. Refresh the page (or close and reopen the
tab) and it resumes exactly where you left off. This is per-browser, per-device storage —
it does not sync across devices or browsers, and clearing your browser data will erase it.
Click "↺ Start Over" to intentionally clear a saved investigation. (Future versions may add
cloud storage + multi-user access.)

**Q: What if I don't know the root cause yet?**  
A: That's normal. Use the tool to GUIDE your investigation. Start with what you know (Problem Statement + Containment), then research the root cause (interviews, data analysis, testing). Come back and fill in Root Cause when you have evidence.

**Q: Can I involve multiple people in the 8D investigation?**  
A: Yes. The Team section is designed for multi-person investigations. You can print a copy and email it to team members for their input.

**Q: What if this is a simple issue? Do I still need all 8 steps?**  
A: Yes. Even simple issues benefit from 8D discipline. A "simple" defect might have systemic causes that surprise you. The 8D framework ensures you don't miss them.

**Q: How long should an 8D investigation take?**  
A: Typical timelines:
- Simple issues (operator training gap): 1–2 weeks
- Moderate issues (procedure update): 2–4 weeks
- Complex issues (design change needed): 4–8 weeks

The tool tracks your timeline; auditors will see it's proportionate to issue severity.

**Q: Can I use this tool for customer complaints?**  
A: Yes. Customer complaints often need 8D investigations (especially if they affect multiple customers or indicate a systemic problem). Use the same steps.

**Q: What if my company uses a different CAR format?**  
A: The 8D framework is universal. Export to Word format and customize the template to match your company's CAR format (add your logo, change section headers, etc.).

---

## EXAMPLE: COMPLETE 8D INVESTIGATION (WALKTHROUGH)

**Scenario:** A repair station discovers that 5 units of overhauled landing gear have insufficient brake pressure after installation. This is a safety-critical issue.

**CAR-2026-0401 Investigation:**

1. **Team:** Quality Manager (Facilitator), Gear Technician (Problem Solver), Maintenance Engineer (QA), Operations Manager, Customer Rep

2. **Problem:** "Overhauled landing gear, part #LG-2026-0401 (5 units): Brake pressure <500 psi after assembly (spec: 600–700 psi). Discovered during functional test, June 28, 2026. All 5 units from production batch Jun 18-22. Customer: Southwest Airlines. Safety impact: CRITICAL (brake system performance affected)."

3. **Containment:**
   - Immediate: Quarantine all 5 units; inspect 100% of landing gear from batch
   - Interim: Increase brake fluid pressure test timeout (manual verification before shipment)
   - Notify customer; offer immediate replacement units

4. **Root Cause (5-Why People/Tools/Process):**
   - **People:** Technician training on brake assembly procedure incomplete; new technician didn't understand pressure-fill requirement
   - **Tools:** Pressure gauge on overhauling bench is out of calibration (reads 50 psi low)
   - **Process:** No procedure to verify landing gear was "cycled to equilibrate" before final pressure test; procedure assumes brake fluid is at ambient temperature

5. **Corrective Actions:**
   - Action 1: Retraining for brake assembly technician (all 5 steps, including pressure verification)
   - Action 2: Calibrate all pressure gauges; implement monthly calibration schedule
   - Action 3: Update landing gear overhaul procedure to include: "Cycle brake pedal 10x to equilibrate fluid; wait 15 min for temperature stabilization before final pressure test"

6. **Implementation:** (Evidence attached)
   - Training certificate (July 5, 2026)
   - Calibration receipts (July 1, 2026)
   - Updated procedure v2.1 signed by Quality Manager (July 10, 2026)
   - All 5 units re-tested and passed (July 12, 2026)

7. **Prevention:**
   - Apply same procedure update to Nose Landing Gear overhaul (uses same brake system)
   - Add to internal audit: "Landing gear technicians demonstrated correct brake pressure test procedure" (quarterly audit)

8. **Closeout:** Effectiveness verification plan: Monitor next 50 landing gears (target: 0 pressure failures). Audit scheduled for Oct 1, 2026.

**Maturity Radar:** 98% (excellent investigation; ready for customer + FAA audit)

---

## BEST PRACTICES

### ✅ DO
- **Involve the right people** from the start (cross-functional team)
- **Document everything** (evidence for each step)
- **Ask "Why?" 5 times** to find systemic causes (not just symptoms)
- **Think prevention** (will this fix prevent similar issues?)
- **Verify effectiveness** (how will you know the fix worked?)
- **Close with audit-ready documentation** (assume auditor will review)

### ❌ DON'T
- **Skip steps** (all 8 are mandatory; no shortcuts)
- **Accept "operator error" as root cause** (dig deeper: what procedure/training gap enabled it?)
- **Rush to corrective action** (understand root cause first)
- **Forget the customer** (keep them informed; ask for feedback)
- **Close without effectiveness verification** (how do you know it worked?)

---

## GETTING HELP

**Question about a specific 8D step?**  
Each step shows a short static guidance box under its fields (e.g., D4's box reminds you not
to accept "operator error" without proof). There is no per-field "?" icon or expandable help
popup in the current version — the guidance is the text you see on the step itself, plus this
guide.

**Need an example CAR?**  
There is no built-in "Sample Investigations" library in the tool. Use the walkthrough example
earlier in this guide (landing gear brake pressure CAR) as a model.

**Question about compliance?**  
The **Standard / Framework** dropdown (ISO 9001, AS9100D, AS9110C, IATF 16949, ISO 13485,
ISO 14001, Other/Custom) records which standard applies and includes it in your exported
Word report. The tool does not currently branch its guidance text or maturity scoring by
standard — the same 8-step content and scoring logic applies regardless of which standard you
select; you still need to apply your own knowledge of that standard's specific requirements.

**Feedback?**  
Email support@conform-edge.com with suggestions, bug reports, or feature requests.

---

## KEYBOARD & NAVIGATION

The tool uses standard browser field navigation (`Tab` / `Shift+Tab` between fields) and your
browser's own print shortcut (`Ctrl+P` / `Cmd+P`) opens the native print dialog used for the
"Print / PDF" export. There are no additional app-specific keyboard shortcuts (e.g., no
in-app `Ctrl+S` save or `Ctrl+E` export binding) in the current version — saving is automatic
(see the persistence FAQ above) and exporting is done via the on-screen export buttons.

---

**Conform-Edge 8D Workflow Tool**  
**User Guide v1.0**  
**Happy investigating!**
