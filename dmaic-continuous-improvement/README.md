# DMAIC Continuous Improvement Tool

**Conform-Edge Quality Management System**

A production-ready, single-page web application for managing DMAIC (Define-Measure-Analyze-Improve-Control) continuous improvement projects. Built on the VERA Molecule design system, this tool provides a complete workflow from problem definition through process control.

## Features

### 5-Phase Workflow
- **Define Phase:** Project charter, business case, SMART goal validation, stakeholder analysis
- **Measure Phase:** Baseline metric collection, measurement system analysis (MSA), data collection planning
- **Analyze Phase:** Root cause analysis with Pareto 80/20 split, statistical significance testing, correlation analysis
- **Improve Phase:** Solution design, FMEA risk assessment, pilot testing, results tracking
- **Control Phase:** SPC (Statistical Process Control) chart monitoring, control plan implementation, ongoing performance tracking

### Intelligent Features
- **Phase-Gate Governance:** Locked phase progression; unlock next phase only after ≥80% completion of current phase
- **M-AI Kernel:** Deterministic AI suggestions including:
  - SMART goal validation (Define)
  - Sample size adequacy assessment (Measure)
  - Statistical significance interpretation (Analyze)
  - Solution effectiveness validation (Improve)
  - Control limit calculation and SPC monitoring (Control)

### Statistical Analysis
- **Pareto Charts:** Visualize 80/20 vital few vs. trivial many root causes
- **SPC Control Charts:** Time-series monitoring with UCL, center line, and LCL
- **Correlation Matrices:** Heatmap of variable relationships
- **Histograms & Trend Analysis:** Baseline distribution and performance improvement tracking

### Project Dashboard
- Overall progress tracking (0-100%)
- Gantt timeline with phase milestones
- Team roster and responsibilities
- Budget tracking (planned vs. actual spend)
- Metric trending (baseline, target, current, direction)

### Deliverables Management
- Phase-specific checklists (≥80% completion required for phase gate)
- Evidence attachment slots
- Approval sign-off tracking
- Completeness percentage per phase

### Export & Reporting
- **PDF Export:** Print-ready executive summary and full project report
- **CSV Export:** All project data, metrics, and phase status for external analysis
- **Word Export:** Template-based .docx with Conform-Edge branding (future enhancement)

### User Experience
- **Dark/Light Mode Toggle:** Optimized for different environments
- **Glass-Morphism UI:** VERA Molecule frosted-glass panels with smooth transitions
- **Responsive Design:** Desktop primary, tablet secondary (320px–1400px)
- **Offline-First:** All data saved to browser localStorage; no internet required
- **Pre-Loaded Demo:** "Supplier On-Time Delivery Improvement" sample project (complete through Control phase)

## Getting Started

### Browser Requirements
- Chrome/Edge 90+, Firefox 88+, Safari 14+
- JavaScript enabled
- LocalStorage enabled (for offline mode)
- Minimum viewport: 320px wide (mobile), 1024px+ recommended for full dashboard

### Loading the Application

1. **Local File:** Open `artifact/index.html` directly in your browser
2. **Web Server:** Serve via any HTTP server (e.g., `python -m http.server`, `npx http-server`)
3. **Cloud Deployment:** Deploy to Railway.app, Vercel, or Netlify (see DEPLOYMENT-GUIDE.md)

### First Project

1. Click **"Define Phase"** tab
2. Enter:
   - Project Title
   - Project Owner
   - Problem statement (charter)
   - SMART goal (e.g., "Increase on-time delivery to 95% by Q3 2026")
   - Business case with financial impact
3. Check deliverables (charter, business case, scope, stakeholder analysis)
4. M-AI suggestions will validate your goal format
5. Once ≥80% complete, request phase gate review
6. Proceed to **Measure Phase** after approval

### Sample Project

A pre-loaded demo project "Supplier On-Time Delivery Improvement" demonstrates:
- Complete DMAIC workflow (Define → Control)
- Pareto analysis with root causes (supplier planning errors, transport delays)
- SPC control chart with historical data points
- Phase-gate sign-offs at each milestone
- Statistical test results (p-value, correlation)
- Pilot results (87% baseline → 92% pilot → 94% current)

Load this project in the application to explore all features.

## Data Persistence

- **LocalStorage Backup:** All project data auto-saves to browser storage
- **Manual Export:** Use "Export PDF" or "Export CSV" buttons to download project data
- **Import/Restore:** (Future) Manual project import via JSON upload

## Statistical Basis

### Pareto Analysis
Sorts root causes by frequency and calculates cumulative percentage. The 80/20 rule suggests 80% of problems come from 20% of causes. Use this to prioritize improvement efforts.

### SPC Control Charts
- **UCL (Upper Control Limit):** Mean + 3σ
- **LCL (Lower Control Limit):** Mean - 3σ
- **Center Line:** Process mean
- **Out-of-Control:** Points outside limits or 8+ consecutive points on one side of center line

### Correlation Coefficient
- **+1.0:** Perfect positive correlation
- **0.0:** No correlation
- **-1.0:** Perfect negative correlation
- **Strength:** |r| > 0.7 is strong; 0.4-0.7 is moderate; < 0.4 is weak

### p-Value Interpretation
- **p < 0.05:** Statistically significant (reject null hypothesis)
- **p ≥ 0.05:** Not statistically significant (fail to reject null hypothesis)
- **Sample size:** Larger samples yield more reliable p-values

## Architecture

See ARCHITECTURE.md for:
- Component structure
- Data model and state management
- M-AI rules engine
- Statistical formulas
- Database schema (for future backend integration)

## Support & Limitations

### Known Limitations (MVP)
- No backend database; local storage only
- No multi-user collaboration (yet)
- M-AI kernel is deterministic rules-based, not machine learning
- Statistical charts are SVG-based (not interactive drill-down)
- No automated email notifications
- No integration with Excel/Minitab (manual data export/import)

### Roadmap (Phase 2)
- Cloud database backend (PostgreSQL + API)
- Multi-user project collaboration with role-based access
- Real-time notification system
- Advanced SPC with automatic out-of-control detection
- Integration with BI tools (Power BI, Tableau)
- Mobile app (iOS/Android)
- Automated report generation and scheduling

### Support
For issues, feature requests, or documentation updates, contact:
**support@conform-edge.com**

## License

Conform-Edge Solutions proprietary software. © 2026. All rights reserved.

---

**Version:** 1.0  
**Build Date:** 2026-07-17  
**Status:** Production Ready (MVP)
