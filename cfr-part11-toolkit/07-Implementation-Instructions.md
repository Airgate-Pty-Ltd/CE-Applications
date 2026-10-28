# 07 — Implementation Instructions
## 21 CFR Part 11 / ALCOA++ Data Integrity Toolkit v1.0
**© 2026 Conform-Edge Quality Consulting LLC**

---

## Local Testing (Fastest)

### Step 1: Locate the file
The application is at:
```
artifact/index.html
```

### Step 2: Open in browser
Double-click `index.html` OR right-click → "Open with" → Chrome / Edge / Firefox / Safari.

No server required. The app loads fully from the local filesystem.

**Note:** Chart.js loads from CDN (`cdn.jsdelivr.net`). Internet access is needed for the radar chart to render. Without internet, the chart canvas is blank but all 50 questions and scoring still function correctly.

### Step 3: Test the demo
Click "Load Demo" in the header to pre-load 50 answers for MediCore Devices, Inc. Verify:
- Radar chart renders with 6 labeled axes
- Section scores update in the sidebar
- Gap Report tab shows critical gap items
- "Generate Report" opens the browser's print dialog
- "CSV" button downloads a `.csv` file

---

## GitHub Setup

### Repository structure
```
conform-edge/cfr-part11-toolkit/
├── artifact/
│   └── index.html          ← the entire application
├── 00-Executive-Summary.md
├── 01-Opportunity-Validation.md
├── 02-Product-Brief.md
├── 03-Buyer-and-Pricing.md
├── 04-MVP-Scope.md
├── 05-Premium-Roadmap.md
├── 06-Compliance-Alignment.md
├── 07-Implementation-Instructions.md
├── 08-Risks-Assumptions-Boundaries.md
├── 09-Next-Build-Backlog.md
├── README.md
├── UI-TEST-PLAN.md
├── RAILWAY-DEPLOYMENT.md
├── GITHUB-READY.md
├── sample-output.md
├── customer-facing-copy.md
├── COMPLETION-MARKER.md
└── .gitignore
```

### Commands
```bash
cd "C:\Users\oleab\OneDrive\Brian\Claude Vaults\Personal\07-Outputs\Opportunity-Scans\Automated\builds\2026-07-08-cfr-part11-toolkit"

git init
git remote add origin https://github.com/conform-edge/cfr-part11-toolkit.git
git add .
git commit -m "v1.0: 21 CFR Part 11 / ALCOA++ Data Integrity Toolkit - complete MVP build"
git branch -M main
git push -u origin main
```

---

## Railway Deployment (Recommended Hosting)

Railway serves static files with zero configuration. Full instructions in `RAILWAY-DEPLOYMENT.md`.

**Quick path:**
1. Push to GitHub (above)
2. Go to railway.app → New Project → Deploy from GitHub
3. Select `conform-edge/cfr-part11-toolkit`
4. Set root directory: `artifact`
5. No build command required (static HTML)
6. Railway auto-assigns a URL: `https://cfr-part11-toolkit-<hash>.railway.app`
7. Add custom domain: `toolkit.conform-edge.com` (CNAME to Railway URL)

**Cost:** Railway Hobby plan $5/month. Static sites within free bandwidth limits are effectively free until high traffic.

---

## Alternative Hosting Options

### Option A: Netlify Drop
1. Go to app.netlify.com/drop
2. Drag and drop the `artifact/` folder
3. Netlify provides a URL instantly (no account required for testing)
4. Takes 30 seconds; suitable for client demos

### Option B: GitHub Pages
1. Push to GitHub
2. In repository Settings → Pages → Source: Deploy from branch `main`, folder `/artifact`
3. URL: `https://conform-edge.github.io/cfr-part11-toolkit/`
4. Free, no limits for this use case

### Option C: Direct file (no hosting)
For offline use or distribution to a single client:
1. Zip the `artifact/` folder
2. Email or share via Google Drive
3. Recipient opens `index.html` in their browser
4. Works fully offline except for the radar chart (Chart.js CDN)

To make the radar chart work fully offline, embed Chart.js:
- Download: https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js
- Save as `artifact/chart.umd.min.js`
- Replace the CDN script tag with: `<script src="chart.umd.min.js"></script>`

---

## Gumroad Product Setup

1. Create account at gumroad.com
2. New Product → Digital Product
3. Upload: zip of the `artifact/` folder + all documentation .md files
4. Price: $499
5. Description: use `customer-facing-copy.md` product page copy
6. Thumbnail: Conform-Edge brand (dark navy, "CE" logo mark)
7. Publish and add the Gumroad link to `conform-edge.com/tools`

---

## Stripe / Email Capture (Post-Launch)

For SaaS tiers ($149/$349/$799/mo):
1. Create Stripe products matching each tier
2. Use Stripe Payment Links (no-code option) for initial sales
3. After payment, redirect to a Railway-hosted download/app page with auth token
4. Long-term: Integrate Stripe webhooks with Supabase Auth (v1.1 feature)

---

© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
