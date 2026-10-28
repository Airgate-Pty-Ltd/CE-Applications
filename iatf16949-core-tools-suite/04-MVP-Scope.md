# MVP Scope: IATF 16949 Core Tools Compliance Suite

## In Scope (MVP v1.0)

### Assessment Engine
- **45 scored questions** across six tabs (APQP 8 + PPAP 7 + FMEA 8 + MSA 6 + SPC 6 + IATF Integration 10)
- **Maturity scoring**: 1–5 scale per question; auto-averaged per tool
- **Real-time radar chart**: 6-dimension visualization (updated as user answers)
- **Question branching**: Some questions revealed/hidden based on previous answers (e.g., "Do you have design responsibility?" → reveal design FMEA depth questions)

### Data Handling
- **Browser localStorage**: Persist answers across sessions (same device, same browser)
- **No server**: All logic runs in JavaScript; no data sent to cloud
- **Session reset**: Users can clear data and start over
- **No login**: Frictionless entry; any user can open and start

### Outputs
- **Printable PDF report**: Via browser print-to-PDF (maturity radar, scoring summary, gap analysis, improvement roadmap)
- **CSV export**: All question responses + scores (for trend tracking, import to Excel)
- **On-screen maturity radar**: Interactive (hover over dimension to see details)
- **Gap report**: Ranked list of lowest-scoring areas; auto-generated action items (30/60/90/180 days)
- **Email-friendly summary**: One-page recap (radar + key gaps + next steps) — copyable to clipboard

### Customer Variants
- **Generic IATF 16949** (default): Pure ISO/IEC 16949:2016 + AIAG guidance
- **Ford CSR variant**: Questions mapped to Ford CSR 4.x clause language
- **GM CSR variant**: Questions mapped to General Motors CSR 2.x language
- **Stellantis variant**: Stellantis (PSA/FCA) specific requirements

### Configuration
- **Simple dropdown** to select customer variant at start (re-selectable between assessments)
- **Simple name/date fields** to identify the assessment (e.g., "AccuSupply Inc., April 2026 Audit Prep")

### Help & Guidance
- **Inline tooltips**: Each question has a "?" icon; hovering shows 2–3 sentence definition/examples
- **Video hints** (optional, MVP-lite): Placeholder for future embedded training clips
- **Reference PDF**: Single-page printable guide linking to AIAG standards + IATF handbook (external links)

### Test Data
- **Example company**: Pre-filled sample data ("AccuSupply Inc., Tier 2 supplier") shows realistic scoring + full report output
- **Demo mode**: Users can view completed example without filling it out themselves

---

## Out of Scope (Post-MVP, v2.0+)

### Cloud Features
- Cloud storage (no server-side persistence in MVP)
- Multi-user collaboration (no sharing/commenting)
- Audit trail (no access logs)
- Data backup / recovery

### Integrations
- API (no external integrations)
- QMS system connectors (no SAP/Oracle/Infor sync)
- Email automation (manual copy-paste only)

### Advanced Features
- AI-powered action planning ("Claude API suggests specific corrective actions based on gap")
- Training & certification bundling
- Video embedded courses
- Managed service (one-on-one coaching)

### Enterprise Variants
- SSO/LDAP login
- Role-based access (admin, auditor, viewer)
- Aggregate dashboards (view all suppliers' scores at once)
- Custom questionnaire builder (white-label variant)

### Mobile App
- Native iOS/Android apps
- Offline sync when internet returns
- Push notifications

---

## Success Criteria (MVP v1.0)

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| **Assessment completeness** | 100% of questions answered | Every assessment has data for all 45 Qs |
| **Scoring accuracy** | Maturity calc within 0.1 points | Spot-check 10 test assessments; manual verify |
| **Report generation** | PDF print under 5 sec | Time from "print" click to saved PDF |
| **Session persistence** | localStorage survives browser close | Close browser, reopen, data intact |
| **CSV export** | All 45 responses + metadata | Export contains column headers + all data rows |
| **Customer variant switching** | User can switch variants mid-assessment | Start Generic, switch to Ford, verify questions update |
| **Performance** | Page load < 3 sec, radar render < 0.5 sec | Measure on 3G connection + old laptop |
| **Browser compatibility** | Works on Chrome, Safari, Firefox, Edge | Test on latest + 2 prior versions |
| **Mobile responsiveness** | Readable on iPhone SE, iPad, laptop | Use Chrome DevTools to test viewports |
| **Data privacy** | No data leaves the browser | Inspect network tab; confirm no POST/fetch calls |

---

## Technical Requirements

### Frontend Stack
- **HTML5** + **CSS3** (no build step, no npm)
- **Vanilla JavaScript** (ES6+, but compatible with ES2015)
- **No frameworks** (to avoid dependencies; pure HTML artifact)
- **Chart.js** (for radar visualization, CDN-loaded)
- **Normalize.css** (for cross-browser consistency, CDN-loaded)

### Browser Support
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

### Performance Targets
- **Page load**: < 3 seconds (on 3G)
- **First interaction**: < 1 second (click question → see response recorded)
- **Radar render**: < 500ms
- **CSV generation**: < 2 seconds (45 rows)
- **File size**: < 500 KB (HTML + embedded CSS + JS; no external assets except CDN libs)

### Accessibility
- WCAG 2.1 Level AA
- Keyboard-navigable (Tab through all fields)
- Color-blind friendly (radar uses shapes + colors)
- Form labels + aria-labels on all inputs

---

## Deliverables Checklist (MVP v1.0)

- [x] **artifact/index.html** (single file, 45 Qs, 6 tabs, radar, exports)
- [x] **artifact/sample-output.md** (example report from test data)
- [x] **artifact/customer-facing-copy.md** (sales/landing page copy)
- [x] **README.md** (quick-start guide for Brian)
- [x] **UI-TEST-PLAN.md** (manual smoke-test checklist)
- [x] **RAILWAY-DEPLOYMENT.md** (how to host on Railway)
- [x] **GITHUB-READY.md** (how to push to GitHub)
- [x] **All docs**: 00-Executive-Summary through 09-Next-Build-Backlog

---

## Acceptance Criteria

1. **Code quality**: No console errors; all logic commented; variable names clear
2. **Scoring logic**: Verified against IATF16949-auditor skill scoring definitions
3. **Question accuracy**: All 45 questions reviewed by Brian (auditor sanity-check)
4. **Usability**: Any user (non-technical) can complete assessment in 30 min without help
5. **Report clarity**: PDF printout is professional; readable by auditor
6. **Performance**: Loads and renders in < 3 sec on 4G connection
7. **Mobile**: No layout breaks on iPad / iPhone SE

---

**MVP Ready for Launch**: All deliverables completed + passing acceptance criteria = ready for Gumroad + Railway deployment.

