# Implementation Instructions: Local Test & Deployment

## Local Testing (Your Computer)

### Step 1: Open the HTML App
1. Navigate to: `artifact/index.html`
2. Right-click → "Open with" → Choose your browser (Chrome, Firefox, Safari, Edge)
3. App loads in 2 seconds with 5 demo suppliers pre-loaded

### Step 2: Test Core Features (Smoke Test)

**Test 1: Dashboard**
- [ ] Dashboard loads and shows 5 suppliers in risk matrix
- [ ] Stats card shows: 2 Green, 1 Yellow, 1 Orange, 1 Red
- [ ] Clicking supplier card shows details (score, audit date, NCRs)

**Test 2: Add Supplier**
- [ ] Click "Add Supplier" in sidebar
- [ ] Enter: "Test Supplier XYZ", Standard: "AS9100D", Audit Date: today, Capability: 4, NCRs: 0
- [ ] Click "Save Supplier"
- [ ] Verify success message appears
- [ ] Go to Dashboard → new supplier appears in risk matrix
- [ ] Score should be approximately 95 (Green)

**Test 3: Import/Export CSV**
- [ ] Click "Import/Export"
- [ ] Click "Export All Suppliers to CSV"
- [ ] File downloads: `suppliers-2026-07-03.csv`
- [ ] Open CSV in Excel → verify all 6 suppliers (5 demo + 1 test) with columns: Supplier Name, Standard, Last Audit Date, Cert Status, Capability, NCR Count, Risk Score, Risk Level

**Test 4: SQA Generator**
- [ ] Click "SQA Generator"
- [ ] Select: "AeroTech Fasteners" (AS9100D)
- [ ] Enter Audit Date, Auditor Name, Organization Name
- [ ] Click "Generate SQA Checklist"
- [ ] Preview shows: 30+ SQA questions in 4 categories (Sourcing, Inspection, Flow-Down, CAR)
- [ ] Click "Download as PDF"
- [ ] PDF opens and is printable

**Test 5: Mobile Responsive**
- [ ] Open app on iPhone (Safari) / Android (Chrome)
- [ ] Dashboard should be readable on mobile (risk matrix responsive)
- [ ] All buttons clickable, form fields accessible

**Test 6: Offline Mode**
- [ ] Load app in browser
- [ ] Disconnect WiFi / put in airplane mode
- [ ] App still functions (scoring, SQA generation, data persistence)
- [ ] Reconnect WiFi → data still present (not lost)

---

## GitHub Setup

### Step 1: Initialize Repository
```bash
# In your project folder
git init
git add .
git commit -m "Initial commit: Supplier Quality Risk Scorecard v1.0

- Core features: risk scoring, SQA generator, CSV import/export
- 5 demo suppliers pre-loaded
- Responsive HTML/JS app (no backend)
- Ready for production deployment"

# Add remote
git remote add origin https://github.com/yourusername/supplier-quality-risk-scorecard.git
git branch -M main
git push -u origin main
```

### Step 2: .gitignore (optional)
```
node_modules/
.env
.DS_Store
*.log
dist/
build/
```

### Step 3: README.md
(See section below)

### Step 4: Commits Going Forward
```bash
# Bug fix / feature
git commit -m "Fix: [description]"
git push

# Release
git commit -m "v1.1: [feature list]"
git tag v1.1
git push --tags
```

---

## Railway Deployment (Static Hosting)

### Step 1: Create Railway Account
- Go to railway.app
- Sign up with GitHub
- Create new project

### Step 2: Connect GitHub Repository
- In Railway: "New Project" → "Deploy from GitHub"
- Select your `supplier-quality-risk-scorecard` repo
- Authorize Railway to access GitHub

### Step 3: Configure Deploy Settings
In Railway project settings:
- **Build Command:** (leave blank — static site, no build needed)
- **Start Command:** (leave blank)
- **Root Directory:** `.` (entire repo is deployable)

### Step 4: Deploy
- Click "Deploy" → Railway builds and deploys in 2–3 minutes
- URL generated: `https://supplier-quality-risk-scorecard-prod.up.railway.app`
- Verify app loads in browser

### Step 5: Custom Domain (Optional)
- In Railway: "Settings" → "Custom Domains"
- Add: `scoreboard.conform-edge.com` (or your domain)
- Update DNS records per Railway instructions

---

## Gumroad Setup (Payment & Distribution)

### Step 1: Create Gumroad Product
- Go to gumroad.com
- Log in with your account
- Click "Create" → "Product"

### Step 2: Product Details
- **Name:** Supplier Quality Risk Scorecard
- **Description:** (Copy from customer-facing-copy.md)
- **Price:** Start with Basic tier ($199/month)
- **License Key:** Optional (for usage tracking)

### Step 3: Upload App
- **Main File:** `artifact/index.html` (ZIP it: `scoreboard-v1.0.zip`)
- **Description:** "Unzip and open index.html in your browser. No installation required."

### Step 4: Configure Recurring Billing
- **Billing Type:** Monthly subscription (Gumroad supports this)
- **Charge:** $199/month
- **Send File Automatically:** YES (so customers get download immediately after purchase)

### Step 5: Launch Page
- Share Gumroad link on LinkedIn, email, website
- Gumroad handles payment processing, invoicing, cancellation

---

## Landing Page (Simple HTML)

Create `landing.html` to drive traffic to Gumroad:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Supplier Quality Risk Scorecard</title>
    <style>
        body { font-family: Arial; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        h1 { color: #667eea; }
        .cta { background: #667eea; color: white; padding: 15px 30px; border: none; border-radius: 6px; font-size: 1.1em; cursor: pointer; }
        .price { font-size: 2em; color: #28a745; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Supplier Quality Risk Scorecard</h1>
        <p>Know your supplier risk in minutes, not weeks.</p>
        
        <h2>What You Get:</h2>
        <ul>
            <li>Intelligent supplier risk scoring (4 dimensions)</li>
            <li>Auto-generated SQA checklists for any standard</li>
            <li>CSV import/export for easy integration</li>
            <li>Offline-capable (no internet required)</li>
            <li>Desktop + mobile access</li>
        </ul>

        <h2>Pricing:</h2>
        <p><span class="price">$199/month</span> (Basic tier, 4-10 suppliers)</p>

        <h2>Ready?</h2>
        <a href="https://gumroad.com/yourname/l/supplier-scorecard"><button class="cta">Start Free Trial</button></a>
        <p style="color: #999;">14-day free trial. No credit card required.</p>
    </div>
</body>
</html>
```

---

## Summary of Files & Locations

| File | Purpose | Location |
|------|---------|----------|
| index.html | Main app | `artifact/index.html` |
| landing.html | Marketing page | `landing.html` (root) |
| README.md | Documentation | `README.md` (root) |
| 00-Executive-Summary.md | Product overview | `00-Executive-Summary.md` |
| 01-Opportunity-Validation.md | Business case | `01-Opportunity-Validation.md` |
| ... | (other docs) | (respective files) |

---

## Deployment Checklist

**Before Launch:**
- [ ] Local test all features (see Smoke Test above)
- [ ] Test on mobile (iPhone, Android)
- [ ] Test offline mode
- [ ] Test CSV import/export
- [ ] Test PDF export
- [ ] Cross-browser test (Chrome, Firefox, Safari, Edge)

**GitHub:**
- [ ] Repository created & initialized
- [ ] All files committed
- [ ] .gitignore configured
- [ ] README.md added

**Railway:**
- [ ] Account created
- [ ] GitHub connected
- [ ] App deployed & URL verified
- [ ] Custom domain configured (optional)
- [ ] Health check passed (app loads in < 2 sec)

**Gumroad:**
- [ ] Product created
- [ ] HTML app uploaded (ZIP)
- [ ] Price set ($199/month)
- [ ] Recurring billing configured
- [ ] Product published

**Marketing:**
- [ ] Landing page created
- [ ] LinkedIn post scheduled
- [ ] Email list notified (early access offer)
- [ ] Case study teaser drafted

**Go-Live:**
- [ ] Announce on LinkedIn
- [ ] Send email to early contacts
- [ ] Monitor Gumroad for first sales
- [ ] Respond to customer questions within 2 hours

---

## Post-Launch Support

### Customer Success (First 30 Days)
- Monitor Gumroad messages for questions
- Respond to CSV import issues
- Track feature requests
- Follow up with first 5 customers for testimonials

### Metrics to Track
- Gumroad sales (daily)
- Website visits (landing page)
- Free trial-to-paid conversion rate
- Customer satisfaction (NPS survey)
- Feature requests (triage for v1.1)

### Common Issues & Troubleshooting
- **"CSV won't import"** → Check format matches template; Excel might need to be re-saved as .csv
- **"Score looks wrong"** → Verify audit date is recent; old dates = lower scores (by design)
- **"PDF won't download"** → Try different browser (Chrome is most reliable)
- **"Data disappeared"** → Local storage cleared; recommend CSV export for backup

---

## Next Steps (If Brian Approves)

1. **Week 1:** Finalize landing page, test locally, push to GitHub
2. **Week 2:** Deploy to Railway, set up Gumroad, configure email automation
3. **Week 3:** Create LinkedIn post, email early contacts, launch early-bird pricing
4. **Week 4:** Monitor sales, gather feedback, plan v1.1 features

**Timeline to First Customer:** 4–6 weeks (if marketing executed well)
**Expected Year 1 Revenue:** $240k–$480k (50–100 customers)
