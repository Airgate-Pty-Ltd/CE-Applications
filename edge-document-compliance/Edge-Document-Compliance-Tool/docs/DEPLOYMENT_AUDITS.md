# Audit Module Deployment Guide

## Overview

The Audit Tool module has been pushed to GitHub. If Railway is connected to the repository, deployment should trigger automatically.

## Post-Deployment Steps

### 1. Run Database Migrations

After deployment, run the new migrations:

```bash
# Via Railway CLI or SSH into the service
npm run migrate
```

This will create:
- `auth` schema with users, roles, tenants
- `audits` schema with all audit tables
- Seed data (default users and roles)

### 2. Set Environment Variables

Ensure these environment variables are set in Railway:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (generate a secure random string)
- `JWT_EXPIRES_IN` - Token expiration (default: `7d`)

**Optional:**
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (production, staging, development)
- `RUN_MIGRATIONS` - Set to `true` to auto-run migrations on startup

### 3. Verify Deployment

1. **Health Check:**
   ```
   GET https://your-app.railway.app/health
   ```
   Should return `OK`

2. **Database Connection:**
   ```
   GET https://your-app.railway.app/api/db/health
   ```
   Should return database status

3. **Login:**
   ```
   POST https://your-app.railway.app/api/auth/login
   Body: { "email": "admin@example.com", "password": "admin123" }
   ```
   Should return JWT token

### 4. Run Smoke Test

After deployment, verify functionality:

```bash
# Via Railway CLI or SSH
npm run audits:smoke
```

Expected output:
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ SMOKE TEST PASSED                                          ║
╚═══════════════════════════════════════════════════════════════╝
```

## Default Users

After migrations run, these users are available:

- **Admin**: `admin@example.com` / `admin123`
- **Lead Auditor**: `lead.auditor@example.com` / `auditor123`
- **Internal Assessor**: `assessor@example.com` / `assessor123`

**⚠️ IMPORTANT: Change these passwords in production!**

## Railway Auto-Deployment

If Railway is connected to the GitHub repository:
1. Push to `main` branch triggers deployment
2. Railway builds using Nixpacks
3. Runs `npm start` (from `railway.toml`)
4. Health check at `/health`

## Manual Deployment Steps

If auto-deployment is not enabled:

1. **Connect Railway to GitHub:**
   - Go to Railway dashboard
   - Create new project
   - Connect GitHub repository
   - Select `Edge-Document-Compliance-Tool` repository

2. **Set Environment Variables:**
   - Add `DATABASE_URL` (PostgreSQL service)
   - Add `JWT_SECRET` (generate secure random string)
   - Add other required variables

3. **Deploy:**
   - Railway will detect `railway.toml` and `Procfile`
   - Build will run automatically
   - Service will start

4. **Run Migrations:**
   - Use Railway CLI: `railway run npm run migrate`
   - Or SSH into service and run manually

## Troubleshooting

### Migrations Not Running

If migrations don't run automatically:
```bash
railway run npm run migrate
```

### Database Connection Issues

Check:
- `DATABASE_URL` is set correctly
- PostgreSQL service is running
- Network access is configured

### Authentication Not Working

Check:
- `JWT_SECRET` is set
- Migrations have run (users table exists)
- Default users were created

### Frontend Not Loading

Check:
- Frontend build completed successfully
- Static files are being served
- API routes are accessible

## Next Steps

After successful deployment:

1. Change default user passwords
2. Create production users
3. Configure audit module settings
4. Test full audit workflow
5. Set up monitoring and logging

## Support

For issues:
- Check `docs/INTEGRATION_ACCEPTANCE.md` for acceptance criteria
- Check `docs/API_AUDITS.md` for API documentation
- Run smoke test: `npm run audits:smoke`
