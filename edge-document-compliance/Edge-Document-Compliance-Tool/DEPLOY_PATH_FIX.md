# Deploy Path Fix for Requirements Folder

## Problem
The script was looking for Requirements folder at the wrong path:
- Script location: `backend/src/scripts/process-requirements-folder.js`
- Was looking for: `../../../EDCAT AIP/Requirements` (from root)
- Should look for: `../../EDCAT AIP/Requirements` (from backend folder)

## Fix
Changed path from `../../../EDCAT AIP/Requirements` to `../../EDCAT AIP/Requirements`

## Files Found
- ✅ Standards folder: 39 files (33 PDFs, 6 DOCX)
- ✅ Regulatory folder: 2 PDFs  
- ✅ Customer folder: 1 XLSX file

## PowerShell Deployment Commands

```powershell
# Navigate to project root
cd "C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator"

# Add the changed file
git add backend/src/scripts/process-requirements-folder.js

# Commit
git commit -m "Fix: Correct path to Requirements folder in process script - Changed from ../../../ to ../../ to correctly resolve backend/EDCAT AIP/Requirements - Script will now find all 39 standards, 2 regulations, and 1 customer requirement"

# Push
git push origin main
```

## After Deployment
Run the process script to load all files:
```powershell
node backend/src/scripts/process-requirements-folder.js
```

This will process:
- 39 standards from Standards folder
- 2 regulations from Regulatory folder
- 1 customer requirement from Customer folder


