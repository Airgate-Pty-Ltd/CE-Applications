# IATF 16949 Core Tools Compliance Suite — README

## Quick Start

**What is this?**  
A self-contained HTML tool that assesses automotive supplier compliance against IATF 16949:2016 and all five AIAG core tools (APQP, PPAP, FMEA, MSA, SPC) in 30 minutes.

**How do I use it?**
1. Open `artifact/index.html` in any web browser (Chrome, Safari, Firefox, Edge)
2. Enter your company name and assessment date
3. Answer 48 scored questions across 6 tabs (includes AIAG-VDA FMEA Handbook (2019) methodology-currency questions as of v1.0.1)
4. View your real-time maturity radar chart
5. Generate a PDF report or export CSV

**No login, no backend, no internet required.** All data stays on your device (localStorage).

---

## File Structure

```
iatf16949-core-tools-suite/
├── artifact/
│   ├── index.html                    ← Main tool (open this in browser)
│   ├── sample-output.md              ← Example report output
│   └── customer-facing-copy.md       ← Sales/marketing copy
├── 00-Executive-Summary.md           ← 1-page business overview
├── 01-Opportunity-Validation.md      ← Market validation (10/10 criteria)
├── 02-Product-Brief.md               ← Product vision & features
├── 03-Buyer-and-Pricing.md           ← Customer personas & tiers
├── 04-MVP-Scope.md                   ← In/out scope for v1.0
├── 05-Premium-Roadmap.md             ← v2.0–v3.0 features & roadmap
├── 06-Compliance-Alignment.md        ← IATF 16949 + AIAG alignment
├── 07-Implementation-Instructions.md ← Deployment & launch checklist
├── 08-Risks-Assumptions-Boundaries.md ← Risk mitigation & limits
├── 09-Next-Build-Backlog.md          ← 15 prioritized features
├── 10-UI-TEST-PLAN.md                ← Smoke test checklist
├── 11-RAILWAY-DEPLOYMENT.md          ← How to deploy to Railway
├── 12-GITHUB-READY.md                ← How to push to GitHub
└── README.md                         ← This file
```

---

## Getting Started (Local Testing)

### Step 1: Open in Browser
```bash
# macOS / Linux
open artifact/index.html

# Windows
start artifact/index.html

# Or manually: drag artifact/index.html into Chrome/Safari/Firefox
```

### Step 2: Test Features
- **Answer questions**: Click on any score (1–5) for a question
- **View radar**: Maturity chart updates in real-time on the right
- **Switch tabs**: Click APQP, PPAP, FMEA, MSA, SPC, IATF tabs
- **Generate PDF**: Click "Generate Report (PDF)" → Ctrl+P → Save as PDF
- **Export data**: Click "Export CSV" → Downloads a CSV file
- **Reset**: Click "Reset Assessment" to start over

### Step 3: Verify Data Persistence
1. Answer a few questions
2. Refresh the browser (F5 or Cmd+R)
3. Your answers should still be there (stored in localStorage)

---

## Deployment Options

### Option A: GitHub Pages (Free, Fast)
1. Push code to GitHub
2. Enable GitHub Pages in repo settings → main branch → /root
3. Site auto-deploys at `https://YOUR_USERNAME.github.io/iatf16949-tools/`

### Option B: Railway (Recommended for v1.0)
1. Push code to GitHub (prerequisite)
2. Sign up at https://railway.app
3. Create new project → Deploy from GitHub → select repo
4. Railway auto-detects static site; deploys in 30 seconds
5. Auto-assigned URL: `https://iatf16949-tools-production.up.railway.app`

### Option C: Gumroad (Payment Processing)
1. Host artifact/index.html on Railway or GitHub Pages (as above)
2. Create product on Gumroad.com pointing to your hosted URL
3. Gumroad handles payments + license delivery
4. Customers get email with license key + link to tool

See `11-RAILWAY-DEPLOYMENT.md` and `12-GITHUB-READY.md` for detailed steps.

---

## Features (v1.0.1)

✓ **48 scored questions** across 6 tabs (FMEA tab includes AIAG-VDA (2019) methodology-currency questions)  
✓ **Real-time maturity radar** (6-dimension chart)  
✓ **Customer-specific variants** (Generic IATF, Ford CSR, GM CSR, Stellantis)  
✓ **PDF export** (print-to-PDF via browser)  
✓ **CSV export** (all responses + scores for Excel)  
✓ **Offline-capable** (localStorage persistence, no internet needed)  
✓ **Mobile-responsive** (iPad, iPhone SE, laptop all supported)  
✓ **No backend** (zero infrastructure, zero DevOps)  

---

## Pricing Tiers

| Tier | Price | Features | Target |
|------|-------|----------|--------|
| **Solo** | $199/mo or $1,990/yr | Unlimited users, 12 assessments/year, all exports | Tier 2 suppliers, SME |
| **Regional** | $399/mo or $3,990/yr | Unlimited assessments, supplier dashboard, advanced reports | Tier 1 groups (5–50 suppliers) |
| **Enterprise** | $699/mo or $6,990/yr | Cloud storage, API, custom questionnaires, consulting hours | Global suppliers, OEMs |

---

## Support & Questions

**Email**: support@conform-edge.com  
**LinkedIn**: Direct message @BrianOlea or @ConformEdge  
**Documentation**: See detailed guides in this folder (07-Implementation-Instructions.md, 08-Risks-Assumptions-Boundaries.md)

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✓ Fully supported |
| Safari | 14+ | ✓ Fully supported |
| Firefox | 88+ | ✓ Fully supported |
| Edge | 90+ | ✓ Fully supported |
| Mobile Safari | iOS 14+ | ✓ Fully supported |
| Chrome Mobile | Android 10+ | ✓ Fully supported |

---

## Technical Details

**Frontend Stack**: HTML5 + CSS3 + Vanilla JavaScript (no build step)  
**External Libraries**: Chart.js (radar chart), Normalize.css (cross-browser consistency)  
**Storage**: Browser localStorage (max 5-10MB, sufficient for 1,000+ assessments)  
**File Size**: ~180 KB (HTML + embedded CSS + JS)  
**Performance**: Page loads in < 3 sec on 4G; radar renders in < 500ms  

---

## Data Privacy

✓ **No data sent to servers** (localStorage only in v1.0)  
✓ **No tracking** (no Google Analytics, no pixel tracking)  
✓ **No login** (completely anonymous assessment)  
✓ **Device-local only** (switching browsers or devices = separate assessments)  

Enterprise tier (v2.0) will offer **optional cloud storage** (opt-in, not default).

---

## Compliance & Legal

**Disclaimer**: This tool is a self-assessment aid for IATF audit preparation. Results do not guarantee certification approval. Consult IATF-registered auditors for formal compliance verification.

**Standards Referenced**: ISO/IEC 16949:2016, AIAG APQP/PPAP/FMEA/MSA/SPC, Ford CSR, GM CSR, Stellantis CSR, IATF Handbook 6th Ed., AIAG-VDA FMEA Handbook (2019).

---

## Changelog

### v1.0.1 — 2026-07-10
**Fixed:** AIAG-VDA (2019) FMEA methodology currency gap identified in `Compliance-Gap.md` (Gap 1, HIGH priority). The FMEA tab tested only legacy FMEA discipline and never asked whether the supplier had transitioned to the AIAG-VDA FMEA Handbook (2019) harmonized methodology — a top current IATF audit interview topic.
- Added 3 new scored questions to the FMEA tab (`artifact/index.html`, `fmea` question array): (9) AIAG-VDA 7-step methodology transition for new programs, (10) Action Priority (AP) tables replacing legacy RPN cutoffs, (11) FMEA-MSR evaluation for mechatronic/monitoring systems.
- Added a subtitle to the FMEA tab noting AIAG-VDA (2019) coverage.
- Added a footer "Reference editions" line citing AIAG-VDA FMEA Handbook (2019), PPAP 4th ed., MSA 4th ed., SPC 2nd ed., APQP 3rd ed. (2024 update) so report output is defensible in a customer audit, per Gap 1 guidance.
- Total scored questions: 45 → 48.
- Version bumped v1.0 → v1.0.1 in `artifact/index.html` footer and this README.
- Not yet addressed (deferred, see `Compliance-Gap.md`): Gap 2 (CSR depth scoring, targeted for v1.1) and Gap 3 (Sanctioned Interpretations tracking in update log).

### v1.0 — Initial release

---

## Next Steps (Post-Launch)

1. **Month 1**: Monitor NPS, churn, support feedback
2. **Month 2**: Iterate on UI/UX based on user feedback
3. **Month 3**: Decide on v2.0 investment (cloud, collaboration, API)
4. **Quarter 2**: Launch vertical expansion (AS9100D, ISO 9001 supplier audits)
5. **Quarter 3–4**: AI-powered features (Claude API integration, benchmarking)

See `09-Next-Build-Backlog.md` for detailed feature roadmap.

---

## Credits

**Built by**: Conform-Edge  
**Author**: Brian Olea (IATF Lead Auditor, 20+ years quality experience)  
**Version**: 1.0.1  
**Date**: July 2026 (patched 2026-07-10)  

---

**Ready to launch? See `07-Implementation-Instructions.md` for deployment steps.**

