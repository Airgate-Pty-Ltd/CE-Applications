# TODO - Pass 5: Build/Deploy Config

## Acceptance Criteria

### 1. Node Version ✅ (WORKING)
- **Status**: Nixpacks detects Node 22 correctly
- **Action**: None needed (working as expected)
- **Acceptance**: ✅ Confirmed

### 2. Start Script ✅ (CORRECT)
- **Status**: `npm start` launches backend correctly
- **Action**: None needed
- **Acceptance**: ✅ Confirmed

### 3. Build Warnings ⚠️ (NON-BLOCKING)
- **Multer Deprecation**: Warning only, not blocking
- **Production Config**: npm warning, not our code
- **Action**: Optional - upgrade multer in separate commit
- **Acceptance**: Build succeeds despite warnings

### 4. Postinstall Script ✅ (CORRECT)
- **Status**: Uses `--omit=dev` (correct)
- **Action**: None needed
- **Acceptance**: ✅ Confirmed

## Testable Tasks

### Task 1: Verify Build Process (OPTIONAL)
**Test**: Run build locally
```bash
npm ci
npm run postinstall
npm start
```

**Acceptance**: Build completes, server starts

### Task 2: Upgrade Multer (OPTIONAL - Separate Commit)
**File**: `backend/package.json`

**Fix**: Upgrade to multer v2
```json
"multer": "^2.0.0"
```

**Then**: Update upload route to use new API if needed

**Acceptance**: 
- No deprecation warnings
- Uploads still work
- Security vulnerabilities patched

**Note**: This is optional and can be done separately. Not blocking deployment.

## Verification Commands

```bash
# 1. Verify start script
npm start
# Expected: Server starts on port 8080

# 2. Verify build
npm ci
# Expected: Dependencies install successfully

# 3. Check for critical errors
npm audit
# Expected: Only multer warning (non-critical)
```

## Notes

- All build/deploy config is correct
- Warnings are non-blocking
- Multer upgrade can be done separately if desired
- No critical issues found

