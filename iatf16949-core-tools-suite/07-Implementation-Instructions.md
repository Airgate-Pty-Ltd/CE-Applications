# Implementation Instructions: Deployment & Launch

## Local Testing (Before Launch)

### 1. Open in Browser
```bash
# No build step required. Simply:
1. Open artifact/index.html in Chrome, Safari, or Firefox
2. You should see 6 tabs: APQP, PPAP, FMEA, MSA, SPC, IATF Integration
3. Test data ("AccuSupply Inc.") is pre-populated
```

### 2. Smoke Test Checklist
- [ ] Page loads without console errors (press F12 → Console tab)
- [ ] All 6 tabs are clickable and show content
- [ ] Answering a question updates the maturity radar (real-time)
- [ ] Radar chart displays 6 dimensions (APQP, PPAP, FMEA, MSA, SPC, IATF Integration)
- [ ] "Generate Report" button produces a printable PDF (Ctrl+P or Cmd+P)
- [ ] "Export CSV" button downloads a CSV file with all responses
- [ ] Refreshing the page retains your answers (localStorage)
- [ ] Clearing data ("Reset Assessment") clears all answers
- [ ] Customer variant dropdown changes questions when selected (try "Ford CSR")
- [ ] Mobile view (F12 → responsive design mode) shows readable layout on iPhone/iPad

### 3. Test Scenarios
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| **New User** | Open tool → answer all 45 Qs | Maturity radar updates in real-time |
| **Variant Switch** | Select "Ford CSR" → notice Q wording changes | Questions re-render with Ford language |
| **Report Generation** | Answer 5 Qs → click "Generate Report" | PDF shows maturity + gaps + roadmap |
| **Data Persistence** | Close browser → reopen artifact/index.html | Previous answers are still there |
| **Export** | Complete assessment → click "Export CSV" | CSV opens in Excel with all data |
| **Mobile** | Test on iPhone SE via Chrome DevTools | No layout breaks, readable |

---

## GitHub Deployment

### 1. Create Repository
```bash
# One-time setup
git init
git add .
git commit -m "Initial IATF 16949 Core Tools Suite v1.0"
git remote add origin https://github.com/YOUR_ACCOUNT/iatf16949-tools.git
git branch -M main
git push -u origin main
```

### 2. .gitignore
```
node_modules/
.env
.DS_Store
*.swp
*.log
dist/
```

### 3. Directory Structure in GitHub
```
iatf16949-tools/
├── artifact/
│   ├── index.html (main tool)
│   ├── sample-output.md
│   └── customer-facing-copy.md
├── docs/
│   ├── 00-Executive-Summary.md
│   ├── 01-Opportunity-Validation.md
│   ├── ... (all documentation)
├── README.md
├── RAILWAY-DEPLOYMENT.md
├── GITHUB-READY.md
└── UI-TEST-PLAN.md
```

### 4. Commit Message
```
feat: IATF 16949 Core Tools Compliance Suite v1.0

- 45-question multi-tab assessment (APQP, PPAP, FMEA, MSA, SPC, IATF Integration)
- Real-time maturity radar chart (6-dimension)
- PDF report + CSV export
- Customer-specific variants (Generic IATF, Ford CSR, GM CSR, Stellantis)
- localStorage persistence (offline-capable)
- Mobile-responsive design
- No backend dependencies

Scoring logic verified against IATF16949-auditor skill.
All 45 questions reviewed for accuracy and compliance alignment.
```

---

## Railway Deployment

### 1. Push to GitHub (prerequisite)
- Code must be on GitHub before Railway can access it

### 2. Log Into Railway
```
https://railway.app/
Sign in with GitHub
```

### 3. Create New Project
```
1. Click "+ New Project"
2. Select "Deploy from GitHub"
3. Find repo: iatf16949-tools
4. Click "Deploy"
```

### 4. Configure Railway
```
Build Command:
  (leave empty — no build needed)

Start Command:
  npx serve artifact/ -l 3000
  
OR if you prefer static hosting:
  (Railway auto-detects index.html as static site)
```

### 5. Environment Variables
```
(None required for MVP — no backend, no secrets)
```

### 6. Domain & URL
```
Railway auto-assigns: https://iatf16949-tools-production.up.railway.app

Custom domain (optional):
  Go to Settings → Domain → Add custom domain
  Point your DNS: iatf-tools.conform-edge.com → Railway URL
```

### 7. Health Check
```
Open: https://iatf16949-tools-production.up.railway.app
Expected: Tool loads, all 6 tabs visible, no console errors
```

### 8. Deployment Verification Checklist
- [ ] Site loads in < 3 seconds
- [ ] All 6 tabs functional
- [ ] Radar chart renders
- [ ] localStorage works (refresh, data persists)
- [ ] PDF export works
- [ ] CSV export works
- [ ] Mobile responsive

---

## Gumroad Setup (Payment Processing)

### 1. Create Gumroad Account
```
https://gumroad.com/signup
Sign up with email
```

### 2. Create Product
```
Dashboard → Create Product
- Product Name: "IATF 16949 Core Tools Suite"
- Description: "30-minute self-assessment tool for automotive suppliers..."
- Price: $199 (monthly) or $2,388 (annual)
- Product Type: Software / Digital Tool
- License: Digital license (monthly recurring or one-time)
- License Terms: "Valid for 12 months; auto-renews unless cancelled"
```

### 3. Product Page Copy
```
Title: "IATF 16949 Core Tools Compliance Suite — 30-Minute Readiness Check"

Description:
"Are you audit-ready? Check in 30 minutes.

The IATF 16949 Core Tools Compliance Suite is a self-contained HTML tool that assesses your supplier's compliance against all five AIAG core tools (APQP, PPAP, FMEA, MSA, SPC) + IATF 16949:2016 integration.

✓ Answer 45 scored questions across 6 tabs
✓ Get real-time maturity radar (6-dimension visualization)
✓ Generate printable PDF report + audit evidence checklist
✓ Export CSV for trend tracking
✓ No backend, no login, works offline

Perfect for Quality Managers, IATF auditors, and Tier 1/2 automotive suppliers facing certification audits.

Solo tier: Unlimited users, 12 assessments/year
Regional tier: Unlimited suppliers + advanced dashboards
Enterprise tier: Cloud storage, API access, multi-user collaboration

Free 14-day trial available on our website."

Tags: automotive, IATF, compliance, audit, quality
```

### 4. Pricing Tiers (Set Up in Gumroad)
```
Tier 1 (Solo): $199/month or $1,990/year
Tier 2 (Regional): $399/month or $3,990/year
Tier 3 (Enterprise): $699/month or $6,990/year

(Gumroad allows 3 pricing tiers per product)
```

### 5. License Key Setup
```
- Gumroad auto-generates license keys
- Email to customer on purchase
- License includes 12-month access
- Auto-renewal email sent 30 days before expiration
```

### 6. Gumroad Link
```
https://gumroad.com/YOUR_ACCOUNT/l/iatf-16949-tools
Share on LinkedIn, email, website
```

---

## Launch Sequence (Week 1)

| Day | Task | Owner | Status |
|-----|------|-------|--------|
| **Day 1** | Smoke test artifact/index.html locally | Brian | ☐ |
| **Day 1** | Push to GitHub (iatf16949-tools repo) | Brian | ☐ |
| **Day 2** | Deploy to Railway | Brian | ☐ |
| **Day 2** | Verify Railway health check (load, test, mobile) | Brian | ☐ |
| **Day 3** | Create Gumroad product page | Brian | ☐ |
| **Day 3** | Configure pricing tiers + license keys | Brian | ☐ |
| **Day 4** | Draft LinkedIn launch post (see customer-facing-copy.md) | Brian | ☐ |
| **Day 4** | Email Burrana supplier QM list (50 addresses) | Brian | ☐ |
| **Day 5** | Set up Google Analytics (optional, track page views) | Brian | ☐ |
| **Day 5** | Launch on LinkedIn + post Gumroad link | Brian | ☐ |
| **Day 7** | Monitor signups + support emails (first 48 hrs) | Brian | ☐ |

---

## Monitoring & Support (Post-Launch)

### Key Metrics to Track
```
Weekly:
- Page views (Google Analytics)
- Signups (Gumroad dashboard)
- Support emails (response time)
- Feature requests (compile + prioritize)

Monthly:
- MRR (monthly recurring revenue from Gumroad)
- Churn (canceled subscriptions, reason)
- NPS (email survey: "Would you recommend?")
- Usage (average assessment time, questions answered)
```

### Support Channels
```
1. Email: support@conform-edge.com
2. LinkedIn: Direct messages (quick Q&A)
3. Gumroad messages (customer support within Gumroad)
```

### First 3 Months Feedback Loop
```
Week 1–2: Monitor for bugs, browser compatibility issues
Week 2–4: Gather feature requests (v2.0 backlog)
Week 4–12: Publish customer case studies (audit pass rates, time saved)
Month 3: Analyze churn — adjust pricing or features if needed
```

---

## Rollback Plan (If Issues Arise)

### If Railway deployment is down:
```
1. Immediately point DNS to backup GitHub Pages
2. Deploy to GitHub Pages (free, static hosting)
3. Update Gumroad link temporarily
4. Investigate Railway issue (contact support)
5. Re-deploy when fixed
```

### If Gumroad payment processing fails:
```
1. Pause new sales on Gumroad
2. Offer alternate payment (direct invoice, PayPal)
3. Contact Gumroad support
4. Resume when fixed (auto-refund any failed transactions)
```

---

## Success Criteria (Launch Week)

- [ ] Zero console errors on any browser
- [ ] Zero critical bugs reported
- [ ] Site loads < 3 sec on 4G
- [ ] Mobile layout readable on iPhone/iPad
- [ ] 10+ free trial signups
- [ ] 1+ paid customers
- [ ] NPS > 50 (from early users)

