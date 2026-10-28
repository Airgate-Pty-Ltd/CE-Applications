# Load All Standards from Requirements Folder

## Current Situation

**Database:** Only 4 standards in `public.standards` table
- 2 actual standards (AS9100D, AS9100D - Copy)
- 2 mis-categorized (regulatory, customer_require)

**Files Available:** 40+ standards in `backend/EDCAT AIP/Requirements/Standards/`

## Solution: Run Process Requirements Folder Script

The `process-requirements-folder.js` script will:
1. Scan `backend/EDCAT AIP/Requirements/Standards/` folder
2. Extract text from each file (PDF, DOCX, XLSX, TXT)
3. Create/update standards in PostgreSQL `public.standards` table
4. Save file metadata to `public.standard_files` table
5. Extract content for Vera's learning database

## How to Run

### Option 1: PowerShell Script (Recommended)

```powershell
# Navigate to project root
cd "C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator"

# Run the process script
.\run-process-requirements-folder.ps1
```

### Option 2: Direct Node.js

```powershell
# Set environment variables
$env:DATABASE_URL = "your-postgres-connection-string"
$env:EDCAT_AI_DATABASE_URL = "your-edcat-ai-connection-string"

# Run the script
node backend/src/scripts/process-requirements-folder.js
```

## Expected Output

You should see:
```
📁 Processing Requirements Folder...
============================================================
[process-requirements] Requirements directory: ...\backend\EDCAT AIP\Requirements
[process-requirements] Standards directory: ...\backend\EDCAT AIP\Requirements\Standards
[process-requirements] Checking directories...
   Requirements dir exists: true
   Standards dir exists: true
[process-requirements] 📂 Standards: 40+ items

📚 Processing Standards folder...
[process-requirements] 📄 Processing: AS9100D.pdf (standards)
[process-requirements] ✅ Created standard in PostgreSQL: AS9100D
[process-requirements] 📄 Processing: ISO 9001-2015.pdf (standards)
[process-requirements] ✅ Created standard in PostgreSQL: ISO9001:2015
... (continues for all 40+ files)

📊 Processing Summary:
   Standards: 40+ processed, 0 errors
   Regulatory: 2 processed, 0 errors
   Customer: 1 processed, 0 errors

   Total: 43+ files processed, 0 errors
```

## After Processing

1. **Verify in Database:**
   ```sql
   SELECT COUNT(*) FROM public.standards;
   -- Should show 40+ standards
   
   SELECT code, name, sector, uploaded_at 
   FROM public.standards 
   ORDER BY uploaded_at DESC;
   ```

2. **Refresh Compliance Library:**
   - Reload the Compliance Library page
   - All 40+ standards should now appear in the dropdowns

3. **Parse Standards:**
   - Use the Parse tool to extract requirements from each standard
   - This will populate `public.parsed_requirements` table

## Troubleshooting

### If Script Fails

1. **Check Database Connection:**
   ```powershell
   # Verify DATABASE_URL is set
   echo $env:DATABASE_URL
   ```

2. **Check File Permissions:**
   - Ensure files in `Requirements/Standards/` are not locked by OneDrive
   - Close any applications that might have files open

3. **Check File Formats:**
   - Script supports: PDF, DOCX, DOC, XLSX, XLS, TXT
   - Other formats will be skipped

### If Standards Don't Appear After Processing

1. **Check uploaded_at:**
   ```sql
   SELECT code, uploaded_at 
   FROM public.standards 
   WHERE uploaded_at IS NULL;
   ```
   - Standards without `uploaded_at` won't appear in API
   - Fix: `UPDATE public.standards SET uploaded_at = NOW() WHERE uploaded_at IS NULL;`

2. **Check file_category:**
   - Standards need entries in `public.standard_files` with correct `file_category`
   - Verify: `SELECT standard_id, file_category FROM public.standard_files;`

## Database Path

**Complete Path:**
```
Compliance Library (Frontend)
  ↓
GET /api/requirements/standards?category=standard
  ↓
backend/src/routes/requirements.js
  ↓
queryPostgres() → PostgreSQL (DATABASE_URL)
  ↓
SELECT * FROM public.standards WHERE uploaded_at IS NOT NULL
```

**Table:** `public.standards` in PostgreSQL (DATABASE_URL)

