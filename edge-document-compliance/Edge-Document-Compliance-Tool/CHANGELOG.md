# Changelog

## [Unreleased]

### Fixed - Railway Healthcheck Failures

**Date:** 2025-11-13

**Changes:**
- Enforced Node.js 20.18.1+ to satisfy `undici@7.16.0` engine requirements
- Added `.nixpacks.toml` to pin Node 20 for Railway deployments
- Fixed port binding to use `Number(process.env.PORT || 8080)` and bind to `0.0.0.0`
- Simplified `/health` endpoint to return `200 OK` immediately without database checks
- Ensured SPA catch-all route excludes `/health` and `/api` routes
- Updated `Procfile` to use `npm start` for consistency
- Added `scripts/dev-check.sh` for local healthcheck verification

**Technical Details:**
- Root `package.json` now includes `engines.node: ">=20.18.1"`
- Server binds to `0.0.0.0` (not `localhost`) to accept external connections
- Health endpoint is registered before any middleware that could block it
- Railway healthcheck path remains `/health` and returns `200 OK` if process is running

**Acceptance Criteria:**
- ✅ No `EBADENGINE` warnings for `undici` during build
- ✅ Server binds to `process.env.PORT || 8080` on `0.0.0.0`
- ✅ `/health` returns `200 OK` without external dependencies
- ✅ Railway healthcheck succeeds within retry window

