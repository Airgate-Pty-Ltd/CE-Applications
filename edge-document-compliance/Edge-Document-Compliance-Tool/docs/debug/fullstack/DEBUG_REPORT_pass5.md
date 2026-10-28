# Debug Report - Pass 5: Build/Deploy Config

**Date**: 2025-01-13  
**Focus**: Nixpacks config, Node version, start scripts, build warnings

## Evidence Collection

### Build Configuration

**File**: `.nixpacks.toml`
- Node version: Not explicitly set (Nixpacks detects Node 22 from package.json)
- Start command: `npm start`

**File**: `package.json` (root)
- `engines.node`: `>=20.18.1`
- `start`: `cd backend && node src/server.js`
- `postinstall`: `cd backend && npm install --omit=dev`

**File**: `Procfile`
- `web: npm start`

**File**: `backend/package.json`
- No engines field (inherits from root)
- Dependencies include `multer@^1.4.5-lts.1` (deprecated)

### Build Warnings (from Railway logs)

1. **Multer Deprecation**:
   ```
   npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x.
   ```

2. **Production Config Warning**:
   ```
   npm warn config production Use `--omit=dev` instead.
   ```

### Node Version

**Nixpacks Detection**: Node 22.11.0 (from logs)
**Package.json Requirement**: `>=20.18.1`
**Status**: ✅ Compatible

### Start Script Analysis

**Root package.json**:
- `start`: `cd backend && node src/server.js` ✅ Correct
- No dev server in production ✅

**Backend package.json**:
- `start`: `node src/server.js` ✅ Correct
- `dev`: `nodemon src/server.js` ✅ Dev only

### Build Process

1. Nixpacks detects Node 22
2. Runs `npm ci` (or `npm install`)
3. Runs `postinstall`: `cd backend && npm install --omit=dev`
4. Runs `npm start`: `cd backend && node src/server.js`
5. Server starts successfully ✅

## Root Cause Analysis

### Issues Identified

1. **Multer Deprecation Warning** ⚠️ (Non-blocking)
   - Multer 1.x has known vulnerabilities
   - Upgrade to 2.x recommended but not blocking
   - Can be addressed in separate commit

2. **Production Config Warning** ⚠️ (Non-blocking)
   - `npm install --production` deprecated
   - Using `--omit=dev` is correct
   - Warning is from npm, not our code

3. **No Explicit Node Version in .nixpacks.toml** ✅ (Working)
   - Nixpacks correctly detects Node 22 from package.json
   - No need to explicitly set if detection works

## Evidence Files

- `.nixpacks.toml`: Build configuration
- `package.json`: Root and backend package configs
- `Procfile`: Process definition
- Railway build logs: Show successful build with warnings

## Next Steps

See `TODO_pass5.md` for optional improvements.

