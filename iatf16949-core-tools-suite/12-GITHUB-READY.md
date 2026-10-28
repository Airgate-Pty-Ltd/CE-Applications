# GitHub Deployment Guide

## Prerequisites
- GitHub account (free at https://github.com)
- Git installed on your machine

---

## Step 1: Create Repository

### On GitHub
1. Go to https://github.com/new
2. Repository name: `iatf16949-tools`
3. Description: "IATF 16949 Core Tools Compliance Suite v1.0"
4. Make it **Public** (so it's discoverable)
5. Click **Create repository**

### Copy SSH Key (Optional, for future pushes)
1. Go to GitHub → Settings → SSH and GPG keys
2. New SSH key → paste your public key (`cat ~/.ssh/id_rsa.pub`)
3. Save

---

## Step 2: Push Code to GitHub

### First Time Setup
```bash
cd /path/to/iatf16949-tools

git init
git add .
git commit -m "Initial: IATF 16949 Core Tools Suite v1.0

- 45-question self-assessment tool
- Real-time maturity radar chart
- PDF + CSV export
- Customer-specific variants (Ford/GM/Stellantis CSR)
- Offline-capable (localStorage)
- Mobile-responsive design
- No backend dependencies

Ready for production launch."

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/iatf16949-tools.git
git push -u origin main
```

### Future Updates
```bash
git add .
git commit -m "feat: Add cloud storage + API (v2.0)"
git push origin main
```

---

## Step 3: Configure GitHub Pages (Optional Auto-Deployment)

1. Go to GitHub repo → **Settings** → **Pages**
2. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main** / **/root**
3. Save

Your site auto-deploys at:
```
https://YOUR_USERNAME.github.io/iatf16949-tools/
```

---

## .gitignore (What NOT to Commit)

Create `.gitignore` in repo root:
```
# Dependencies
node_modules/
npm-debug.log
yarn-error.log

# Environment
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo

# Build
dist/
build/
.cache/

# Logs
logs/
*.log

# Optional
.env.production.local
```

---

## Directory Structure (What to Commit)

```
iatf16949-tools/
├── artifact/
│   ├── index.html              ✓ Commit
│   ├── sample-output.md        ✓ Commit
│   └── customer-facing-copy.md ✓ Commit
├── docs/
│   ├── 00-Executive-Summary.md ✓ Commit
│   ├── 01-Opportunity-Validation.md
│   └── ... (all 12 docs)       ✓ Commit all
├── README.md                   ✓ Commit
├── .gitignore                  ✓ Commit
└── LICENSE                     ✓ Commit (optional)
```

---

## Commit Message Format

Good commit messages help with history + automated release notes:

```
feat: Add cloud storage + multi-user collaboration (v2.0)

- Users can now save assessments to cloud (opt-in)
- Multiple team members can collaborate on one assessment
- Commenting + action assignment
- Audit trail included

BREAKING CHANGE: localStorage format changed; old assessments must be re-imported
Fixes #42, #108
```

**Prefix** (feat, fix, docs, refactor, perf, test, chore):
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code rewrite (no new features)
- `perf`: Performance improvement
- `test`: Add/update tests
- `chore`: Maintenance (version bump, dep update)

---

## Branches & Collaboration

### Recommended Workflow (for team)

```bash
# Create feature branch
git checkout -b feature/cloud-storage

# Make changes...
git add .
git commit -m "feat: Add cloud storage API"

# Push to GitHub
git push origin feature/cloud-storage

# On GitHub: Create Pull Request
# → Review → Merge to main
# → Delete branch
```

### For Solo Dev (You)
- Commit directly to `main` branch (simpler, faster)
- Tag releases: `git tag v1.1` → `git push origin v1.1`

---

## Releases & Version Tags

When you deploy a new version:

```bash
# Tag the commit
git tag v1.0

# Push tag to GitHub
git push origin v1.0
```

GitHub auto-creates a "Release" page:
```
https://github.com/YOUR_USERNAME/iatf16949-tools/releases/tag/v1.0
```

You can add release notes there (what changed, how to update, known issues).

---

## License (Optional)

Add a LICENSE file to clarify usage rights:

```
MIT License

Copyright (c) 2026 Conform-Edge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and distribute, subject to the following
conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

(Popular open-source licenses: MIT, Apache 2.0, GPL 3.0 — choose based on your needs)

---

## Collaboration (If You Add Team Members)

### Invite Contributors
1. Go to **Settings** → **Collaborators**
2. Add GitHub username
3. Grant permission: **Maintain** (write access) or **Admin** (full access)

### Protect Main Branch (Recommended)
1. Go to **Settings** → **Branches**
2. Add branch protection rule: `main`
3. Require pull request reviews before merging
4. Dismiss stale reviews when new commits pushed

This prevents accidental pushes to main; requires code review.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **"Permission denied (publickey)"** | Add SSH key to GitHub; or use HTTPS with GitHub token |
| **"Could not read from remote repository"** | Check GitHub URL is correct (`git remote -v` to verify) |
| **Accidentally committed secrets** | Remove from history: `git filter-branch` or `git-secret` tool |
| **Large files slowing clone** | Use Git LFS (Large File Storage) for files > 50 MB |
| **Want to change repo name** | Go to Settings → Danger Zone → Rename; update local remote |

---

## GitHub Pages SEO (Optional)

If you want the site discoverable on Google:

1. Go to repo → **Settings**
2. Add "About" section (click edit icon):
   - Description: "IATF 16949 Core Tools Compliance Suite — 30-min supplier readiness assessment"
   - Website: `https://YOUR_USERNAME.github.io/iatf16949-tools/` or custom domain
   - Topics: `iatf`, `automotive`, `quality-management`, `compliance`

3. Create `CNAME` file (if using custom domain):
   ```
   iatf-tools.conform-edge.com
   ```

---

## Next Steps

1. **Push to GitHub**: `git push origin main`
2. **Enable GitHub Pages**: Settings → Pages → Deploy from `main` branch
3. **Test the deployed site**: `https://YOUR_USERNAME.github.io/iatf16949-tools/`
4. **Share the link**: Add to Gumroad, LinkedIn, email

---

## Versioning Strategy

Semantic Versioning: `MAJOR.MINOR.PATCH`

- **v1.0.0**: MVP launch (45 Qs, radar, PDF/CSV export)
- **v1.1.0**: Add free trial (B1-1), custom company name (B1-2)
- **v1.2.0**: Assessment history (B1-3), email report (B1-4)
- **v2.0.0**: Cloud storage + multi-user (B2-1, B2-2)
- **v3.0.0**: AI features + benchmarking (B4)

Tag each release on GitHub.

---

## Deployment Options Summary

| Platform | Cost | Uptime | Customization | Best For |
|----------|------|--------|---------------|----------|
| **GitHub Pages** | Free | 99.9% | Low (static only) | MVP, no backend |
| **Railway** | $0–50/mo | 99.9% | High (add backend) | Production, easy scaling |
| **Vercel** | $0–100/mo | 99.99% | High (Next.js) | Future React version |
| **Netlify** | $0–100/mo | 99.9% | Medium (static + functions) | Marketing site + JAMstack |

**Recommended for v1.0**: GitHub Pages (free) or Railway ($0–5/mo)

