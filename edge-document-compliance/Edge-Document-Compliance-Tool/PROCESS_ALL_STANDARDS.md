# Process All 40 Standards from Requirements Folder

## Database Identification

**The dropdown uses:** EDCAT AI Database (`standards` table)
- Query: `/api/requirements/standards` → queries `standards` table via `queryEdcatAI`
- Location: EDCAT AI Intelligence DB (separate from Customer Data DB)

**The process script saves to:** EDCAT AI Database (`standards` table)
- Function: `createOrGetStandard()` uses `queryEdcatAI` ✅
- This is correct - both use the same database

## Current Status

- **10 standards** are in the database (shown in dropdown)
- **40 standards** are in `backend/EDCAT AIP/Requirements/Standards/` folder
- **30 standards** need to be processed and saved to the database

## Solution: Run Process Script

The `process-requirements-folder.js` script will:
1. Scan `backend/EDCAT AIP/Requirements/Standards/` folder
2. Extract text from each file (PDF, DOCX, XLSX, TXT)
3. Create/update standards in EDCAT AI DB (`standards` table)
4. Save file metadata to Customer Data DB (`standard_files` table)
5. Extract content for Vera's learning database

## PowerShell Commands

```powershell
# Navigate to project root
cd "C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator"

# Run the process script (sets both DB URLs)
.\run-process-requirements.ps1
```

## Expected Output

You should see:
```
📁 Processing Requirements Folder...
============================================================
[process-requirements] Requirements directory: C:\Users\oleab\...\backend\EDCAT AIP\Requirements
[process-requirements] Standards directory: C:\Users\oleab\...\backend\EDCAT AIP\Requirements\Standards
[process-requirements] Checking directories...
   Requirements dir exists: true
   Standards dir exists: true
[process-requirements] 📂 Standards: 40 items

📚 Processing Standards folder...
[process-requirements] 📄 Processing: AS9100D.pdf (standards)
[process-requirements] ✅ Created standard in EDCAT AI DB: AS9100D
[process-requirements] ✅ Stored file: AS9100D.pdf
... (repeats for all 40 files)

📊 Processing Summary:
   Standards: 40 processed, 0 errors
   Regulatory: 2 processed, 0 errors
   Customer: 1 processed, 0 errors
   Examples: 0 processed, 0 errors

   Total: 43 files processed, 0 errors
```

## After Processing

1. **Refresh the page** - The dropdown should now show all 40+ standards
2. **Check browser console** - Should see `[RequirementSelector] API returned 40 standards`
3. **Check server logs** - Should see `[requirements] ✓ Found 40 standards in standards table`

## Troubleshooting

If the script shows "0 items" or "Script completed successfully!" without processing:

1. **Check the path** - Verify files are in `backend/EDCAT AIP/Requirements/Standards/`
2. **Check file extensions** - Script supports: `.pdf`, `.doc`, `.docx`, `.xlsx`, `.txt`, `.pptx`
3. **Check database connections** - Both `EDCAT_AI_DATABASE_URL` and `DATABASE_URL` must be set
4. **Check console output** - The script now has detailed logging to show what it's doing

## Manual Verification

After running the script, verify in the database:

```sql
-- Connect to EDCAT AI DB
SELECT COUNT(*) FROM standards WHERE uploaded_at IS NOT NULL;
-- Should return 40+ (or however many you have)

SELECT code, name, uploaded_at FROM standards 
WHERE uploaded_at IS NOT NULL 
ORDER BY uploaded_at DESC;
-- Should list all your standards
```


