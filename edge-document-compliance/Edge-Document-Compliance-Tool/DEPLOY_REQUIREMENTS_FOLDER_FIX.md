# Deploy Requirements Folder Processing Fix

## Problem
Files processed from the Requirements folders (Standards, Regulatory, Customer) were not showing up in the compliance library because:
1. `file_category` was not being set when storing files
2. Standards were being created in the wrong database (Customer Data DB instead of EDCAT AI DB)

## Fix
1. **Fixed `storeFileInDatabase`** to set `file_category` correctly:
   - 'standards' → 'standard'
   - 'regulatory' → 'regulatory'  
   - 'customer' → 'customer_requirements'

2. **Fixed `createOrGetStandard`** to create standards in EDCAT AI DB (where `/api/requirements/standards` queries from) and set `uploaded_at`

## What This Means
After deployment, when you run `process-requirements-folder.js`:
- ✅ Files will have `file_category` set correctly
- ✅ Standards will be created in EDCAT AI DB with `uploaded_at` set
- ✅ All 40 standards, 2 regulations, and 1 customer requirement will be visible in the compliance library

## Important: Re-process Existing Files
If you've already run `process-requirements-folder.js` before this fix, you need to:
1. Re-run the script to update existing files with `file_category`
2. Or manually update existing files in the database

## PowerShell Deployment Commands

```powershell
# Navigate to project root
cd "C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator"

# Add the changed file
git add backend/src/scripts/process-requirements-folder.js

# Commit
git commit -m "Fix: Requirements folder processing now sets file_category and creates standards in EDCAT AI DB - Set file_category when storing files (standards/regulatory/customer_requirements) - Create standards in EDCAT AI DB instead of Customer Data DB - Set uploaded_at so standards appear in compliance library - All 40 standards, 2 regulations, 1 customer requirement will now be visible"

# Push
git push origin main
```

## After Deployment
1. **Re-run the process script** to update existing files:
   ```powershell
   node backend/src/scripts/process-requirements-folder.js
   ```
2. **Check the compliance library** - all files should now be visible
3. **Verify standards appear** in the standards dropdown


