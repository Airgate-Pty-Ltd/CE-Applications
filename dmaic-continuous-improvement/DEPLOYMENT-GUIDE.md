# DMAIC Tool - Deployment Guide

Complete instructions for deploying the DMAIC Continuous Improvement Tool to production.

## Deployment Options

### Option 1: Local/Network File Share (Development/Team Pilot)

**Fastest:** No server required. Share via OneDrive, Dropbox, or network drive.

1. Copy entire project folder to shared location:
   ```
   \\corporate-share\quality-tools\dmaic-tool\
   ```

2. Users open: `\\corporate-share\quality-tools\dmaic-tool\artifact\index.html`

3. **Limitation:** Each user has isolated localStorage (no cloud sync between users)

**Best for:** Team pilot, initial feedback, internal testing

---

### Option 2: Railway.app (Recommended for MVP)

**Easiest cloud deployment with automatic scaling.**

#### Prerequisites
- GitHub account (fork this repository)
- Railway account (free tier available at railway.app)
- Git installed locally

#### Steps

1. **Create GitHub Repository**
   ```bash
   cd /path/to/dmaic-tool
   git init
   git add .
   git commit -m "Initial DMAIC tool commit"
   git remote add origin https://github.com/YOUR-USERNAME/dmaic-tool.git
   git push -u origin main
   ```

2. **Create Dockerfile** (place in project root)
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY . .
   EXPOSE 3000
   CMD ["npx", "http-server", "artifact", "-p", "3000", "-c-1"]
   ```

3. **Create railway.toml** (place in project root)
   ```toml
   [build]
   builder = "dockerfile"

   [deploy]
   startCommand = "npx http-server artifact -p $PORT -c-1"
   ```

4. **Deploy to Railway**
   - Go to railway.app
   - Click "Create New Project"
   - Select "Deploy from GitHub"
   - Authorize and select your repository
   - Railway auto-detects Dockerfile
   - Click "Deploy"
   - Railway provides URL: `https://dmaic-tool-prod.railway.app`

5. **Configure Custom Domain** (Optional)
   - In Railway dashboard: Settings → Domains
   - Add: `dmaic.conform-edge.com`
   - Update DNS CNAME to Railway endpoint

#### Cost
- Free tier: 500 hours/month (sufficient for MVP)
- Paid tier: $5-20/month depending on usage

---

### Option 3: Vercel (Alternative Cloud Deployment)

**Zero-downtime deployments, optimal for static content.**

#### Steps

1. **Create `vercel.json`** (place in project root)
   ```json
   {
     "version": 2,
     "buildCommand": "echo 'No build step required'",
     "public": true,
     "rewrites": [
       { "source": "/(.*)", "destination": "/" }
     ]
   }
   ```

2. **Deploy via Vercel CLI**
   ```bash
   npm install -g vercel
   vercel --prod
   ```
   Or via GitHub:
   - Import repository at vercel.com
   - Vercel auto-deploys on push to `main`

3. **Enable Preview Deployments**
   - Every git branch creates temporary preview URL
   - Use for testing before merging to main

#### Cost
- Free tier: Unlimited builds, deployments, and bandwidth
- Professional tier: $20/month (for priority support)

---

### Option 4: GitHub Pages (Static Hosting)

**Simplest if already using GitHub, no server cost.**

#### Steps

1. **Enable GitHub Pages in repository settings:**
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: main → /artifact folder
   - Save

2. **URL will be:** `https://YOUR-USERNAME.github.io/dmaic-tool/`

3. **Custom domain** (optional):
   - Add CNAME file to /artifact:
     ```
     dmaic.conform-edge.com
     ```
   - Configure DNS CNAME in domain registrar

#### Cost
- Free

---

### Option 5: Netlify (Marketing-Friendly)

**Good for public-facing tool with analytics.**

#### Steps

1. **Deploy via Netlify CLI**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=artifact
   ```

2. **Or via GitHub:**
   - Connect GitHub repo at netlify.com
   - Auto-deploys on push

3. **Custom domain:**
   - Netlify → Site Settings → Domain Management
   - Add: `dmaic.conform-edge.com`
   - Update DNS

#### Cost
- Free tier: Sufficient for MVP
- Pro tier: $19/month (for team collaboration)

---

## Environment Configuration

### All Deployments

**No environment variables required** (MVP is entirely client-side)

If you add backend features later:
```bash
# .env (add to root, never commit to git)
VITE_API_URL=https://api.conform-edge.com
VITE_AUTH_TOKEN=your-token-here
```

---

## Database Setup (When You Add Backend)

### PostgreSQL + Node.js API

1. **Create database schema:**
   ```sql
   CREATE TABLE projects (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       title VARCHAR(255) NOT NULL,
       owner VARCHAR(255),
       charter TEXT,
       business_case TEXT,
       goal TEXT,
       data JSONB,
       created_at TIMESTAMP DEFAULT now(),
       updated_at TIMESTAMP DEFAULT now(),
       user_id VARCHAR(255)
   );

   CREATE TABLE audit_log (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       project_id UUID REFERENCES projects(id),
       action VARCHAR(100),
       changed_by VARCHAR(255),
       timestamp TIMESTAMP DEFAULT now()
   );
   ```

2. **API endpoints (example):**
   ```
   POST   /api/projects              Create new project
   GET    /api/projects              List all projects
   GET    /api/projects/:id          Get project details
   PATCH  /api/projects/:id          Update project
   DELETE /api/projects/:id          Delete project
   GET    /api/projects/:id/audit    Get audit log
   ```

3. **Deploy API:**
   - Option A: Node.js + Express on Railway/Vercel
   - Option B: Serverless (AWS Lambda, Vercel Functions)
   - Option C: Managed service (Firebase, Supabase)

---

## Scaling & Performance

### Current MVP
- **Users:** 1-10 (local storage only)
- **Data:** ~1-2MB per project
- **Load time:** <1s on modern browsers
- **Uptime:** Browser-dependent (no server)

### With Backend (Phase 2)
- **Users:** 100+
- **Database:** PostgreSQL with indexing on `user_id`, `project_id`
- **Caching:** Redis for frequently accessed projects
- **CDN:** Cloudflare for static assets
- **Load testing:** 1000 concurrent users (with proper infrastructure)

---

## Security Checklist

### Current MVP
- ✅ No authentication (local tool)
- ✅ No external API calls
- ✅ No sensitive data transmission
- ✅ LocalStorage is user-isolated

### When Adding Backend
- [ ] HTTPS only (Railway/Vercel provide automatically)
- [ ] OAuth 2.0 / SAML for single sign-on
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (React auto-escapes, use DOMPurify for user input)
- [ ] CSRF tokens for state-changing requests
- [ ] Rate limiting (100 requests/minute per user)
- [ ] Encryption for sensitive data (PII, financial)
- [ ] Audit logging (all project changes)
- [ ] Regular security audits (OWASP Top 10)
- [ ] Data retention policy (delete old projects after 2 years)

---

## Monitoring & Alerts

### For Cloud Deployment (Railway/Vercel)

1. **Error Tracking:**
   - Sentry (free tier at sentry.io)
   - Integrate: Add script tag to index.html
   ```html
   <script src="https://browser.sentry-cdn.com/X.X.X/bundle.min.js"></script>
   <script>
     Sentry.init({ dsn: 'YOUR-SENTRY-DSN' });
   </script>
   ```

2. **Analytics:**
   - Google Analytics (free)
   - Track: Page loads, phase completions, export usage
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA-ID"></script>
   ```

3. **Uptime Monitoring:**
   - Better Stack / UptimeRobot (free tier)
   - Alert if site down > 5 minutes

---

## Rollback Procedure

### If Deployment Goes Wrong

**Railway:**
```bash
railway logs                    # View error logs
railway down                    # Stop service
git revert <bad-commit>         # Revert code
git push origin main            # Railway auto-redeploys
```

**Vercel:**
```bash
vercel rollback                 # Go to previous deployment
```

**GitHub Pages:**
- Revert commit on main branch
- Pages redeploys in 1-2 minutes

---

## Testing Before Production

### Smoke Tests
See UI-TEST-PLAN.md for full test suite.

Quick validation:
1. Open index.html in Chrome, Firefox, Safari
2. Load sample project → all data displays
3. Complete a phase → deliverables checklist works
4. Export PDF → file downloads
5. Export CSV → opens in Excel
6. Toggle dark/light mode → UI updates
7. Clear localStorage → new project created

### Performance Testing
- Load time: < 2 seconds (target)
- Phase gate unlock: < 100ms (localStorage write)
- Chart rendering: < 500ms (SVG render)

---

## Backup & Disaster Recovery

### Local Storage Backup
- Users can manually export CSV/PDF
- Auto-backup via browser DevTools (Application → Storage → LocalStorage)

### Cloud Backup (When Using Backend)
- Daily automated backups to S3
- Point-in-time recovery available
- Retention: 30 days

---

## Deployment Checklist

- [ ] Code review completed (see engineering:code-review skill)
- [ ] UI smoke tests passed (see UI-TEST-PLAN.md, TC-01 to TC-25)
- [ ] Dark/light mode tested
- [ ] PDF export works
- [ ] CSV export works
- [ ] Sample project loads correctly
- [ ] Phase gates function as expected
- [ ] M-AI suggestions appear
- [ ] Pareto, SPC, correlation charts render
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] Browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] Performance tested (load time < 2s)
- [ ] Security checklist complete
- [ ] Documentation reviewed and updated
- [ ] Staging URL tested with team
- [ ] Production DNS/domain configured
- [ ] Monitoring/alerts set up
- [ ] Rollback procedure documented
- [ ] Team trained on deployment process
- [ ] Post-deployment validation completed

---

## Support

Deployment issues? Check:
1. Browser console (F12) for JavaScript errors
2. Network tab for failed requests
3. Lighthouse (DevTools) for performance issues
4. Contact deployment team at devops@conform-edge.com

---

**Last Updated:** 2026-07-17
