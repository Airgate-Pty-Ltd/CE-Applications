# Manual Git Commands Guide

Since the PowerShell terminal connection is unreliable, use these commands manually.

## Current Changes to Commit

The following files have been modified/created:

### New Files:
- `backend/src/scripts/create-blueprint-tables.js` - Direct blueprint table creation
- `backend/src/scripts/diagnose-vera.js` - Vera diagnostic tool
- `backend/src/scripts/run-edcat-migration-only.js` - EDCAT AI migration only
- `create-blueprint-tables.ps1` - PowerShell helper for blueprint tables
- `diagnose-vera.ps1` - PowerShell helper for diagnostics
- `run-edcat-migration-only.ps1` - PowerShell helper for migration
- `NEXT_STEPS.md` - Next steps documentation
- `MANUAL_GIT_COMMANDS.md` - This file

### Modified Files:
- `backend/src/middleware/veraConversationMiddleware.js` - Fixed greeting detection and placeholder replacement
- `backend/src/services/veraConversationalEngine.js` - Fixed greeting handler to not treat all greetings as returning users
- `backend/src/routes/chat.js` - Added greeting fallback handling

## Git Commands to Run

Open PowerShell in the project directory and run:

```powershell
# 1. Check status
git status

# 2. Add all new and modified files
git add backend/src/scripts/create-blueprint-tables.js
git add backend/src/scripts/diagnose-vera.js
git add backend/src/scripts/run-edcat-migration-only.js
git add backend/src/middleware/veraConversationMiddleware.js
git add backend/src/services/veraConversationalEngine.js
git add backend/src/routes/chat.js
git add create-blueprint-tables.ps1
git add diagnose-vera.ps1
git add run-edcat-migration-only.ps1
git add NEXT_STEPS.md
git add MANUAL_GIT_COMMANDS.md

# OR add everything at once:
git add .

# 3. Commit with descriptive message
git commit -m "Fix: Vera greeting detection and blueprint table creation

- Fixed greeting detection to prioritize messages starting with greeting keywords
- Fixed greeting handler to only treat meaningful previous topics as returning users
- Added direct blueprint table creation script (bypasses SQL parsing issues)
- Added Vera diagnostic script to check database setup
- Improved error logging in conversation middleware
- Fixed placeholder replacement in greeting variants
- Added fallback handling for greetings in chat route"

# 4. Push to repository
git push origin main
```

## Alternative: Use Git GUI

If command line is problematic, you can also:

1. Use GitHub Desktop
2. Use VS Code's built-in Git interface
3. Use GitKraken or another Git GUI tool

Just make sure to:
- Stage all the files listed above
- Use the commit message provided
- Push to `origin/main`

## Troubleshooting PowerShell Issues

If PowerShell commands are freezing:

1. **Check for hanging processes:**
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*git*"}
   ```

2. **Try running commands one at a time** instead of chaining them

3. **Use Git Bash** instead of PowerShell:
   ```bash
   git status
   git add .
   git commit -m "Fix: Vera greeting detection and blueprint table creation"
   git push origin main
   ```

4. **Check if OneDrive is syncing** - this can sometimes cause file locking issues

5. **Run PowerShell as Administrator** if permission issues occur

## Verification

After pushing, verify on GitHub:
- All files are present in the repository
- Commit message is correct
- Changes are visible in the diff

