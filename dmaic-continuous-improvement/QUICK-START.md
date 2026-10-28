# DMAIC Tool - 5-Minute Quick Start Guide

Get up and running with your first DMAIC project in under 5 minutes.

## Step 1: Open the Application (30 seconds)

1. Navigate to: `artifact/index.html` (or deployed URL)
2. Page loads automatically with sample project pre-loaded

## Step 2: Explore the Sample Project (1 minute)

The application opens with "Supplier On-Time Delivery Improvement" project already loaded.

**Review each tab to see what a complete DMAIC project looks like:**
- **Define:** Problem statement and SMART goal
- **Measure:** Baseline metrics (87% on-time delivery, sample size 500)
- **Analyze:** Pareto chart showing root causes, statistical analysis
- **Improve:** Solution design, pilot results (92% achieved)
- **Control:** SPC chart monitoring with current performance (94%)

## Step 3: Create Your First Project (2 minutes)

1. **Click "Define" tab**

2. **Fill in basic information:**
   - **Project Title:** e.g., "Reduce Defect Rate in Manufacturing"
   - **Project Owner:** e.g., "Jane Smith"

3. **Enter problem statement (Charter):**
   ```
   Current defect rate is 4.5%. This impacts customer satisfaction 
   and increases rework costs. Need to identify and eliminate 
   root causes of defects.
   ```

4. **Write SMART Goal:**
   ```
   Reduce defect rate from 4.5% to 2.0% by end of Q3 2026, 
   maintaining 98% first-pass yield.
   ```
   - ✓ Specific (defect rate to 2.0%)
   - ✓ Measurable (percentage)
   - ✓ Achievable (2x improvement)
   - ✓ Relevant (customer satisfaction)
   - ✓ Time-bound (Q3 2026)

5. **Add business case:**
   ```
   Estimated cost of defects: $150K/year in rework and expedited shipping.
   Solution cost: $50K. Payback period: 4 months. Annual savings: $100K.
   ```

6. **Check deliverables as complete:**
   - ☑ Charter
   - ☑ Business Case
   - ☑ Scope Statement
   - ☑ Stakeholder Analysis

**Your Define phase is now 100% complete.**

## Step 4: Request Phase Gate Review (30 seconds)

1. Scroll down to "Phase Gate Review" section
2. Click "Request Phase Gate Review (≥80% Complete)"
3. M-AI system validates your SMART goal
4. Phase gate status updates to "Approved"

## Step 5: Move to Measure Phase (1 minute)

1. **Click "Measure" tab**

2. **Fill in baseline metrics:**
   - **Baseline Metric Value:** 4.5 (current defect rate)
   - **Sample Size:** 500 (inspect 500 units)
   - **Data Collection Method:** "Automated quality inspection system, daily counts"

3. **Complete Measure deliverables:**
   - ☑ Process Map
   - ☑ Data Collection Plan
   - ☑ MSA Results
   - ☑ Baseline Report

4. **Phase Gate Review:**
   - M-AI checks: "Sample size 500 is adequate for robust baseline analysis"
   - Click "Request Phase Gate Review"

**Measure phase is complete.**

## Step 6: Export Your Project (30 seconds)

1. **PDF Export:**
   - Click "📄 Export PDF" button
   - Gives you a print-ready project summary
   - Share with stakeholders for review

2. **CSV Export:**
   - Click "📊 Export CSV" button
   - Opens in Excel
   - Good for detailed metrics and analysis

## Step 7: Continue to Analyze Phase (Optional, 2 minutes)

1. **Click "Analyze" tab**

2. **Enter root cause data:**
   ```
   Example root causes by frequency:
   - Operator error: 45
   - Equipment calibration: 30
   - Material defects: 15
   - Other: 10
   (Total: 100)
   ```

3. **Enter statistical analysis:**
   - p-Value: 0.02 (statistically significant)
   - Correlation: 0.85 (strong relationship)

4. **Observe M-AI suggestions:**
   - "80/20 rule confirmed: Top cause represents XX% of issues. Focus improvement efforts here."
   - Pareto chart auto-generates showing vital few causes

## Key Features to Explore

### M-AI Intelligent Suggestions
- Green checkmarks (✓) = Task completed successfully
- Warning triangles (⚠) = Need refinement
- Info circles (ℹ) = Best practice recommendations

### Phase-Gate Governance
- Define phase unlocked by default
- Measure phase unlocks after Define ≥80% + gate approval
- Analyze phase unlocks after Measure ≥80% + gate approval
- And so on...

### Statistical Visualizations
- **Pareto Chart:** Identifies vital few root causes (80/20 rule)
- **SPC Chart:** Monitors process performance with control limits
- **Correlation Matrix:** Shows relationship strength between variables

### Dark/Light Mode
- Toggle with "🌙 Dark" or "☀️ Light" button
- Preferred for different lighting environments

### Offline-First
- All data auto-saves to browser storage
- No internet connection needed
- Data persists even if browser closes

## Common Use Cases

### Use Case 1: Supplier Quality Problem
**Time to Complete:** 2-3 weeks

1. Define: Charter, goal ($500K waste to $100K target)
2. Measure: Data from supplier rejection logs (baseline 5% defect rate)
3. Analyze: Pareto shows 70% from packaging damage
4. Improve: Redesign packaging, pilot with 100 units
5. Control: Monitor with daily SPC chart, 30-day trend

### Use Case 2: Manufacturing Efficiency
**Time to Complete:** 4-6 weeks

1. Define: Cycle time 45 min → 30 min goal
2. Measure: Baseline data from production logs
3. Analyze: Time motion study, correlation with operator experience
4. Improve: Redesign workflow, train operators, pilot one shift
5. Control: Standard work card, operator training checklist

### Use Case 3: Service Response Time
**Time to Complete:** 3-4 weeks

1. Define: Current response 48 hrs → 24 hrs goal
2. Measure: Ticket system baseline data
3. Analyze: Root causes (staffing, process complexity)
4. Improve: Process simplification, automation
5. Control: Dashboard monitoring, alert triggers

## Tips for Success

1. **Keep it Simple:** Start with one clear metric
2. **Use Real Data:** Base decisions on facts, not opinions
3. **Involve the Team:** Have process owners contribute
4. **Set Realistic Targets:** Use benchmark data
5. **Document Everything:** Use project charter and notes
6. **Pilot First:** Test solution at small scale before rollout
7. **Monitor Results:** Don't stop after implementation
8. **Share Learning:** Help others improve similar processes

## Next Steps After Quick Start

1. **Read Full Documentation:**
   - README.md (features overview)
   - ARCHITECTURE.md (technical details)

2. **Train Your Team:**
   - Share this QUICK-START guide
   - Walk through sample project together
   - Assign phase leads

3. **Plan Your Projects:**
   - Identify 3-5 key improvement opportunities
   - Estimate timeline (2-4 weeks per phase)
   - Assign resources

4. **Deploy to Team:**
   - Deploy via Railway.app (DEPLOYMENT-GUIDE.md)
   - Share URL with team
   - Provide access credentials

5. **Run Multiple Projects:**
   - Use the tool for portfolio management
   - Track savings and ROI
   - Build organizational capability

## Keyboard Shortcuts

- **Tab** — Navigate to next field
- **Shift+Tab** — Navigate to previous field
- **Enter** — Activate button or checkbox
- **Ctrl+S** — Auto-save (no action needed; auto-save is enabled)
- **Ctrl+E** — Open Export menu (future enhancement)

## Troubleshooting

**Problem:** Data not saving
- **Solution:** Check browser LocalStorage (DevTools → Application → Storage)
- Verify JavaScript is enabled
- Try different browser

**Problem:** Charts not displaying
- **Solution:** Check browser console (F12) for errors
- Verify data is entered in Analyze/Control phases
- Clear browser cache and reload

**Problem:** PDF/CSV export not working
- **Solution:** Check browser console for errors
- Try different browser
- Ensure JavaScript is enabled
- Disable ad blockers

**Problem:** Phase gate won't unlock
- **Solution:** Verify phase is ≥80% complete
- Check all required deliverables are checked
- Ensure previous phase was approved

## Need Help?

- **Documentation:** See README.md, ARCHITECTURE.md
- **Technical Issues:** Check browser console (F12)
- **Feature Requests:** Contact support@conform-edge.com

---

**Ready to start?** Open artifact/index.html now!

**Questions?** Read the full README.md for comprehensive information.

**Last Updated:** 2026-07-17
