# Fix: Examples Folder Should Not Create Standards

## Problem
The `process-requirements-folder.js` script was incorrectly processing files from the `Examples/` folder and adding them as standards to the compliance library. This caused many errors because Examples folder contains procedures, work instructions, forms, and attachments that should NOT be in the compliance library.

## Solution

### 1. Fixed Process Script
- **File**: `backend/src/scripts/process-requirements-folder.js`
- **Change**: Removed Examples folder processing from the main script
- **Result**: Only `Standards/`, `Regulatory/`, and `Customer/` folders are now processed

### 2. Created Cleanup Script
- **File**: `backend/src/scripts/cleanup-examples-folder-errors.js`
- **Purpose**: Removes all incorrectly added standards and files from Examples folder
- **What it does**:
  1. Finds all files in `standard_files` where `file_path` contains "Examples"
  2. Finds all standards that were created only from Examples folder
  3. Deletes those files and standards from the database
  4. Cleans up related data in `example_documents` and `document_content_for_learning` tables

### 3. PowerShell Script
- **File**: `run-cleanup-examples.ps1`
- **Purpose**: Easy way to run the cleanup script

## How to Clean Up

### Step 1: Run the Cleanup Script
```powershell
.\run-cleanup-examples.ps1
```

Or manually:
```bash
node backend/src/scripts/cleanup-examples-folder-errors.js
```

### Step 2: Verify Cleanup
The script will show:
- How many files were found from Examples folder
- How many standards will be deleted
- Confirmation of deletions

### Step 3: Re-run Process Script (if needed)
After cleanup, you can safely re-run the process script:
```powershell
.\run-process-requirements.ps1
```

This will now only process:
- ✅ Standards/ folder
- ✅ Regulatory/ folder  
- ✅ Customer/ folder
- ❌ Examples/ folder (skipped)

## Folder Structure

```
Requirements/
├── Standards/        # Standard documents (ISO 9001, AS9100, etc.) - PROCESSED ✅
├── Regulatory/       # Regulatory documents (FAA, FDA, etc.) - PROCESSED ✅
├── Customer/         # Customer-specific documents - PROCESSED ✅
└── Examples/         # Good example documents for learning - NOT PROCESSED ❌
                      # Examples should NOT be added to compliance library
                      # They are for Vera's learning system only
```

## Important Notes

- **Examples folder is for learning only**: Documents in Examples folder should be used by Vera's learning system, not added to the compliance library
- **Standards should only come from Standards folder**: Only actual standard documents should be in the compliance library
- **Cleanup is safe**: The cleanup script only removes items that came from Examples folder, it won't affect legitimate standards

