# DMAIC Tool - Architecture Document

Technical architecture, data model, component structure, and M-AI rules engine.

## Technology Stack

### Frontend (MVP)
- **HTML5/CSS3:** Vanilla markup and styling (no framework)
- **React 18:** Via CDN (unpkg.com/react@18)
- **JavaScript:** ES6+ via Babel standalone
- **Charting:** SVG-based custom charts (Pareto, SPC, correlation matrix)
- **Export:** html2pdf.js, XLSX.js (via CDN)
- **Styling:** CSS Grid, Flexbox, CSS Variables for theming
- **State Management:** React hooks (useState, useEffect, useCallback)

### Backend (Phase 2)
- **API:** Node.js + Express.js
- **Database:** PostgreSQL (relational)
- **Caching:** Redis (optional)
- **Authentication:** OAuth 2.0 / SAML
- **Cloud:** Railway.app, AWS, or Azure

### Deployment
- **Static Hosting:** Railway.app, Vercel, GitHub Pages, Netlify
- **Container:** Docker (optional, for complex deployments)
- **CDN:** Cloudflare (optional, for global distribution)

---

## Data Model

### Project Object

```javascript
{
  // Metadata
  id: "proj-001",
  title: "Supplier On-Time Delivery Improvement",
  owner: "Sarah Johnson",
  champion: "Mike Chen",
  createdDate: "2026-05-01",
  lastUpdated: "2026-07-17",
  status: "in-progress",

  // Project Definition
  charter: "Business problem statement...",
  businessCase: "Financial impact...",
  goal: "Increase on-time delivery to 95% by Q3 2026",

  // Team
  team: [
    { role: "Champion", name: "Mike Chen", email: "mchen@conform-edge.com" },
    { role: "Black Belt", name: "...", email: "..." }
  ],

  // Budget
  budget: {
    planned: 50000,
    actual: 35000,
    remaining: 15000
  },

  // Timeline
  timeline: {
    defineStart: "2026-05-01",
    defineEnd: "2026-05-15",
    measureStart: "2026-05-15",
    // ... etc
  },

  // Phase Data
  phases: {
    define: { /* Define Phase Object */ },
    measure: { /* Measure Phase Object */ },
    analyze: { /* Analyze Phase Object */ },
    improve: { /* Improve Phase Object */ },
    control: { /* Control Phase Object */ }
  },

  // Metrics
  metrics: [
    { name: "On-Time Delivery %", baseline: 87, target: 95, current: 94, trend: "improving" },
    // ...
  ]
}
```

### Phase Object (Generic Structure)

```javascript
{
  status: "complete" | "in-progress" | "not-started" | "at-risk" | "blocked",
  completeness: 75, // 0-100%

  // Deliverables (phase-specific)
  deliverables: {
    charter: true,
    businessCase: true,
    scopeStatement: false
    // ...
  },

  // Phase-specific data (varies by phase)
  [phaseSpecificFields]: {
    // Define phase
    // Measure: baselineMetric, sampleSize, dataCollectionMethod, msaResults
    // Analyze: rootCauses[], statisticalTests, hypothesis
    // Improve: solutionDesign, pilotResults, fmeaRisks[]
    // Control: controlMethod, controlLimits, currentMetric, trend
  },

  // Phase Gate
  phaseGate: {
    approvedBy: "John Smith (Sponsor)",
    approvalDate: "2026-05-15",
    conditions: ["Charter approved", "Stakeholders identified"]
  },

  // Risk Management
  risksDetected: [
    { category: "schedule", severity: "high", description: "Delayed data collection" }
  ],

  // Notes & Evidence
  notes: "Project is on track...",
  evidenceFiles: [
    { id: "evi-001", name: "baseline_data.xlsx", uploadedDate: "2026-05-10" }
  ]
}
```

---

## Component Structure

### App Structure (React Component Hierarchy)

```
DMAICApp (Root)
├── Header
│   ├── Title & Branding
│   ├── Dark/Light Mode Toggle
│   └── Export Controls (PDF, CSV)
├── ProjectDashboard
│   ├── Summary Cards (title, progress, owner)
│   └── Phase Navigation Tabs
├── PhasePanel (Rendered 1 at a time based on activePhase)
│   ├── DefinePhase
│   ├── MeasurePhase
│   ├── AnalyzePhase
│   ├── ImprovePhase
│   └── ControlPhase
├── AIEngine (provides suggestions)
└── Footer (copyright, version)
```

### DefinePhase Component

```javascript
function DefinePhase({ projectData, setProjectData, unlocked }) {
  const [expanded, setExpanded] = useState(true);
  const phase = projectData.phases.define;
  const aiSuggestions = generateAISuggestions('define', projectData);

  return (
    <div className="glass-panel">
      {/* Phase Header */}
      {/* Progress Bar */}
      {/* Form Fields (title, owner, charter, goal, business case) */}
      {/* Deliverables Checklist */}
      {/* AI Suggestions Box */}
      {/* Phase Gate Section */}
    </div>
  );
}
```

Similar structure for Measure, Analyze, Improve, Control phases.

---

## M-AI Kernel Rules Engine

The M-AI system is a **deterministic rules engine** (not machine learning) that provides context-aware suggestions.

### Rule Structure

```javascript
{
  id: "ai-1",
  phase: "define",
  condition: (projectData) => { /* boolean logic */ },
  type: "success" | "warning" | "info",
  icon: "✓" | "⚠" | "ℹ",
  message: (projectData) => `Message with ${projectData.goal}...`,
  priority: 1-10 // Higher = shown first
}
```

### Define Phase Rules

**Rule: SMART Goal Validation**
```javascript
{
  id: 'ai-1',
  phase: 'define',
  condition: (data) => {
    const goal = data.goal || '';
    const hasSpecific = goal.length > 10;
    const hasMeasurable = /\d+|%|rate|improve/i.test(goal);
    const hasTimeBound = /\d{4}|month|quarter|week|by|until/i.test(goal);
    return hasSpecific && hasMeasurable && hasTimeBound;
  },
  type: 'success',
  icon: '✓',
  message: 'Goal appears SMART. Ready to proceed to Measure phase.',
  priority: 10
}
```

**Rule: Business Case Missing**
```javascript
{
  id: 'ai-3',
  phase: 'define',
  condition: (data) => !data.businessCase || data.businessCase.length < 50,
  type: 'info',
  icon: 'ℹ',
  message: 'Document business case with financial impact...',
  priority: 8
}
```

### Measure Phase Rules

**Rule: Sample Size Adequacy**
```javascript
{
  id: 'ai-5',
  phase: 'measure',
  condition: (data) => {
    const sampleSize = data.phases?.measure?.sampleSize || 0;
    return sampleSize < 100;
  },
  type: 'warning',
  icon: '⚠',
  message: (data) => `Sample size ${data.phases.measure.sampleSize} may be too small...`,
  priority: 9
}
```

### Analyze Phase Rules

**Rule: Statistical Significance**
```javascript
{
  id: 'ai-8',
  phase: 'analyze',
  condition: (data) => {
    const pValue = data.phases?.analyze?.statisticalTests?.pValue;
    return pValue !== undefined && pValue < 0.05;
  },
  type: 'success',
  icon: '✓',
  message: (data) => `Significance detected (p=${data.phases.analyze.statisticalTests.pValue.toFixed(4)})...`,
  priority: 10
}
```

**Rule: Pareto 80/20**
```javascript
{
  id: 'ai-10',
  phase: 'analyze',
  condition: (data) => {
    const causes = data.phases?.analyze?.rootCauses || [];
    if (causes.length === 0) return false;
    const topCause = causes[0];
    return topCause.percentage >= 80;
  },
  type: 'success',
  icon: '✓',
  message: (data) => {
    const topCause = data.phases.analyze.rootCauses[0];
    return `80/20 rule confirmed: ${topCause.cause} (${topCause.percentage.toFixed(1)}%)...`;
  },
  priority: 10
}
```

### Improve Phase Rules

**Rule: Pilot Success**
```javascript
{
  id: 'ai-11',
  phase: 'improve',
  condition: (data) => {
    const pilotResult = data.phases?.improve?.pilotResults;
    const baseline = data.phases?.measure?.baselineMetric || 0;
    return pilotResult && pilotResult > baseline;
  },
  type: 'success',
  icon: '✓',
  message: (data) => {
    const pilot = data.phases.improve.pilotResults;
    const baseline = data.phases.measure.baselineMetric;
    return `Pilot shows ${(pilot - baseline).toFixed(1)}% improvement...`;
  },
  priority: 10
}
```

### Control Phase Rules

**Rule: Control Limits Set**
```javascript
{
  id: 'ai-14',
  phase: 'control',
  condition: (data) => data.phases?.control?.controlLimits !== undefined,
  type: 'success',
  icon: '✓',
  message: (data) => {
    const { ucl, mean, lcl } = data.phases.control.controlLimits;
    return `Control limits set: UCL=${ucl}, Mean=${mean}, LCL=${lcl}...`;
  },
  priority: 10
}
```

---

## Statistical Formulas

### Pareto Analysis

```
Given: Array of root causes with frequency counts

Steps:
1. Sort by frequency descending
2. Calculate total frequency
3. For each cause, calculate:
   - Percentage = (frequency / total) * 100
   - Cumulative percentage = sum of percentages up to this cause
4. Plot as bar chart with cumulative line
5. Identify "vital few" (top 20% of causes) = top 80% of frequency

Formula:
vital_few_cutoff = 80% of total frequency
top_causes = causes where cumulative_percentage <= 80%
```

### SPC Control Limits

```
Given: Process mean (μ) and standard deviation (σ)

Formulas:
UCL = μ + 3σ  (Upper Control Limit)
LCL = μ - 3σ  (Lower Control Limit)
Center Line = μ

Out-of-Control Signals:
1. Any point outside [LCL, UCL]
2. 8+ consecutive points on one side of center line
3. 6+ points in increasing/decreasing trend
4. 2-3 consecutive points near UCL/LCL (warning)
```

### Correlation Coefficient

```
Given: Two variables X and Y

Formula (Pearson r):
r = Σ[(Xi - X̄)(Yi - Ȳ)] / √[Σ(Xi - X̄)² × Σ(Yi - Ȳ)²]

Interpretation:
r = 1.0   → Perfect positive correlation
r > 0.7   → Strong positive correlation
r = 0.0   → No correlation
r < -0.7  → Strong negative correlation
r = -1.0  → Perfect negative correlation

P-value:
If p < 0.05, correlation is statistically significant
If p ≥ 0.05, correlation is not statistically significant
```

---

## Phase-Gate Logic

### Unlock Conditions

```
Define Phase:
  - Unlocked by default
  - Required to proceed: completeness >= 80%
  - Gate approval: Boolean (true/false)

Measure Phase:
  - Unlock condition: Define.phaseGate.approved === true AND Define.completeness >= 80%
  - Required to proceed: completeness >= 80%
  - Gate approval: Boolean

Analyze Phase:
  - Unlock condition: Measure.phaseGate.approved === true AND Measure.completeness >= 80%
  - Required to proceed: completeness >= 80%
  - Gate approval: Boolean

Improve Phase:
  - Unlock condition: Analyze.phaseGate.approved === true AND Analyze.completeness >= 80%
  - Required to proceed: completeness >= 80%
  - Gate approval: Boolean

Control Phase:
  - Unlock condition: Improve.phaseGate.approved === true AND Improve.completeness >= 80%
  - No gate approval required (Control is ongoing)
```

### Completeness Calculation

```
Deliverables-based:
  completeness = (completed_deliverables / total_deliverables) * 100

Example (Analyze Phase):
  Total deliverables: 4 (RCA Report, Pareto Analysis, Statistical Tests, Hypothesis)
  Completed: 3
  Completeness = (3 / 4) * 100 = 75%

Phase-wide:
  If any section is missing data, override to (completeness - 5%) penalty
  Example: If statistical tests not filled → max 95% even with all deliverables checked
```

---

## Storage & Persistence

### LocalStorage Schema

```javascript
localStorage['dmaic-project'] = JSON.stringify({
  id: "proj-001",
  title: "...",
  // ... full project object as defined above
})

localStorage['dmaic-settings'] = JSON.stringify({
  darkMode: true,
  activePhase: 'define',
  lastSavedTime: '2026-07-17T14:30:00Z'
})
```

### Auto-Save Behavior

```javascript
// Save after every field change (debounced 500ms)
useEffect(() => {
  const timer = setTimeout(() => {
    localStorage.setItem('dmaic-project', JSON.stringify(projectData));
  }, 500);
  return () => clearTimeout(timer);
}, [projectData]);
```

### Backup Strategy (MVP)

Users can manually:
1. **Export PDF:** Complete project snapshot
2. **Export CSV:** Data for external analysis
3. **Browser DevTools:** Right-click → Inspect → Application → Storage → LocalStorage

Future: Cloud sync with backend database

---

## Chart Rendering

### Pareto Chart (SVG)

```
Dimensions: 800x300px viewBox
- X-axis: Cause labels (0-750 pixels)
- Y-axis: Frequency scale (50-280 pixels)
- Bars: Rectangle elements, blue fill, 0.7 opacity
- Line: Polyline for cumulative percentage (orange, 3px stroke)
- Labels: Text elements positioned above bars and at axis

Rendering:
1. Sort data by frequency descending
2. Calculate total frequency
3. Calculate bar heights (frequency / max_frequency * max_height)
4. Draw bars and labels
5. Draw cumulative line (transformed Y coordinates)
6. Draw axes and grid
```

### SPC Chart (SVG)

```
Dimensions: 800x300px viewBox
- X-axis: Time periods (days, weeks)
- Y-axis: Process metric (aligned to control limits)
- Data points: Circles, 4px radius, blue fill
- Line: Polyline connecting points (blue, 2px stroke)
- UCL/LCL: Dashed red lines (2px)
- Center line: Solid green line (2px)
- Labels: Text elements for each component

Rendering:
1. Extract data points from phase data
2. Calculate Y coordinates based on metric scale
3. Draw control limit lines (fixed Y positions)
4. Plot data points
5. Connect points with line
6. Add day labels below each point
```

### Correlation Matrix (SVG)

```
Dimensions: 400x350px viewBox
- Grid: 4x4 cells (60x60 each)
- Each cell: Rectangle with color-coded fill (red/yellow/green)
- Text: Correlation coefficient (2 decimal places)
- Headers: Variable names (truncated to 8 chars)

Color Coding:
- r > 0.7 or r < -0.7: Green (strong correlation)
- 0.4 < |r| <= 0.7: Yellow/Orange (moderate)
- |r| <= 0.4: Gray (weak)
- r = 1.0 (diagonal): Full color saturation

Rendering:
1. Create headers row and column
2. Iterate matrix, draw cells with color-coded fill
3. Add correlation values as text overlay
```

---

## Export Functionality

### PDF Export

```javascript
// Using html2pdf.js library
const element = document.getElementById('project-summary');
const opt = {
  margin: 10,
  filename: `${projectData.title}-DMAIC.pdf`,
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { scale: 2 },
  jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
};
html2pdf().set(opt).from(element).save();

Output: A4 PDF with:
- Project metadata (title, owner, dates)
- Phase summaries (status, completeness, approval)
- Charts (Pareto, SPC, correlation)
- Metrics (baseline, target, current)
```

### CSV Export

```javascript
// Using XLSX.js library
const data = [
  ['DMAIC Project Export', projectData.title],
  ['Owner', projectData.owner],
  ['Goal', projectData.goal],
  [''],
  ['Phase', 'Status', 'Completeness', 'Approved By', 'Approval Date'],
  ...phases.map(p => [p.name, p.status, p.completeness, p.approvedBy, p.approvalDate]),
  [''],
  ['Metrics', 'Baseline', 'Target', 'Current', 'Trend'],
  ...metrics.map(m => [m.name, m.baseline, m.target, m.current, m.trend])
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'DMAIC Project');
XLSX.writeFile(wb, `${projectData.title}-DMAIC.csv`);
```

---

## Future Enhancements (Phase 2+)

1. **Backend API:** PostgreSQL + Node.js/Python
2. **Multi-User Collaboration:** Real-time editing with Operational Transform
3. **Authentication:** OAuth 2.0 via Google/Okta
4. **Rich Text Editor:** For charter and notes (Quill.js)
5. **File Uploads:** Evidence attachments (AWS S3)
6. **Notifications:** Email/Slack alerts for gate approvals
7. **Advanced SPC:** Automated out-of-control detection
8. **Integration:** Jira/Monday.com for task tracking
9. **Mobile App:** React Native for iOS/Android
10. **BI Integration:** Direct export to Power BI/Tableau

---

## Performance Considerations

### Current (MVP)
- App load: < 1 second
- Chart rendering: < 500ms (SVG-based)
- Data save: < 100ms (localStorage write)
- Memory: < 10MB (typical browser)

### Scaling (Phase 2+)
- API response time: < 200ms (with caching)
- Database query: < 50ms (indexed queries)
- Chart rendering: < 1 second (D3.js for interactive charts)
- Concurrent users: 100+ (with load balancer)

---

## Security Architecture

### Current (MVP)
- No authentication (local tool)
- No external API calls
- No data transmission
- LocalStorage: User-isolated

### Phase 2 (With Backend)
- HTTPS only
- OAuth 2.0 for authentication
- JWT tokens (5-minute expiration)
- SQL injection prevention (parameterized queries)
- XSS protection (React auto-escapes)
- CSRF tokens on all state-changing requests
- Rate limiting (100 req/min per user)
- Encryption for PII (AES-256)
- Audit logging (all changes)
- Regular penetration testing

---

**Last Updated:** 2026-07-17
