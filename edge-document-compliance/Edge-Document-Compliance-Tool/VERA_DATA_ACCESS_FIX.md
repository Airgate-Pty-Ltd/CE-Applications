# Vera Data Access Fix Guide

## Problem
Vera cannot see:
- Database of standards
- Terms and definitions
- Requirements from added folders

## Root Cause Analysis

### Issue 1: Database Connection Failures
**Error:** `ECONNREFUSED` - Database connections are being refused

**Possible Causes:**
1. `DATABASE_URL` environment variable not set
2. `EDCAT_AI_DATABASE_URL` environment variable not set
3. Database server not running (local development)
4. Connection strings incorrect
5. SSL configuration issues (Railway)

### Issue 2: Empty Tables
Even if connections work, tables might be empty:
- `public.standards` - No standards loaded
- `edcat.terms_and_definitions` - No terms ingested
- `public.parsed_requirements` - No requirements parsed
- `edcat.document_content_for_learning` - No documents ingested

### Issue 3: Schema Mismatches
Queries might be looking for columns that don't exist:
- Column name mismatches (e.g., `term` vs `term_name`)
- Missing columns
- Wrong table names

---

## Diagnostic Steps

### Step 1: Check Database Connections

Run the diagnostic script:
```bash
node backend/src/scripts/diagnose-vera-data-access.js
```

**Expected Output:**
- ✅ Tables exist
- ✅ Data counts shown
- ✅ Sample data displayed

**If you see `ECONNREFUSED`:**
- Check environment variables are set
- Verify database server is running
- Check connection strings

### Step 2: Verify Environment Variables

**Required Variables:**
- `DATABASE_URL` - Customer Data Database
- `EDCAT_AI_DATABASE_URL` - EDCAT AI Database (falls back to DATABASE_URL if not set)

**Check in Railway:**
1. Go to Railway dashboard
2. Select your service
3. Go to Variables tab
4. Verify both URLs are set

**Check Locally:**
```bash
# Windows PowerShell
$env:DATABASE_URL
$env:EDCAT_AI_DATABASE_URL

# Or check .env file
cat .env
```

### Step 3: Check Table Existence and Data

**Run SQL queries directly:**

**Customer Data DB (public schema):**
```sql
-- Check standards
SELECT COUNT(*) FROM public.standards;
SELECT code, name FROM public.standards LIMIT 5;

-- Check parsed_requirements
SELECT COUNT(*) FROM public.parsed_requirements;
SELECT clause_number, requirement_text FROM public.parsed_requirements LIMIT 3;

-- Check compliance_requirements
SELECT COUNT(*) FROM public.compliance_requirements;
```

**EDCAT AI DB (edcat schema):**
```sql
-- Check terms
SELECT COUNT(*) FROM edcat.terms_and_definitions;
SELECT term_name, definition FROM edcat.terms_and_definitions LIMIT 5;

-- Check learning documents
SELECT COUNT(*) FROM edcat.document_content_for_learning;
SELECT standard_code, content_text FROM edcat.document_content_for_learning LIMIT 3;
```

---

## Fixes

### Fix 1: Populate Standards

If `public.standards` is empty:

**Option A: Upload via UI**
1. Go to Requirements page
2. Upload standard PDFs
3. Standards will be created automatically

**Option B: Run ingestion script**
```bash
npm run ingest:requirements
```

**Option C: Manual SQL insert**
```sql
INSERT INTO public.standards (code, name, file_category, is_active)
VALUES 
  ('AS9100D', 'AS9100D Quality Management Systems', 'standard', true),
  ('ISO9001:2015', 'ISO 9001:2015 Quality Management Systems', 'standard', true);
```

### Fix 2: Populate Terms and Definitions

If `edcat.terms_and_definitions` is empty:

**Run ingestion script:**
```bash
npm run ingest:terms
```

**Or manually from JSON file:**
```bash
# The script reads from:
# backend/EDCAT AIP/seed/vera_manufacturing_terminology.json
# Or from database if file doesn't exist
```

**Check if file exists:**
```bash
# Windows
dir "backend\EDCAT AIP\seed\vera_manufacturing_terminology.json"

# Linux/Mac
ls backend/EDCAT\ AIP/seed/vera_manufacturing_terminology.json
```

### Fix 3: Parse Requirements

If `public.parsed_requirements` is empty:

**Option A: Parse via UI**
1. Go to Parse page
2. Select a standard
3. Click "Parse Requirements"
4. Wait for parsing to complete

**Option B: Run parsing script**
```bash
# Check if script exists
node backend/src/scripts/process-requirements-folder.js
```

### Fix 4: Ingest Learning Documents

If `edcat.document_content_for_learning` is empty:

**Upload documents via Learning page:**
1. Go to Learning page
2. Upload documents
3. Documents will be processed and stored

**Or check if documents are in folders:**
- Documents should be in standard folders
- Scripts should process them automatically

---

## Common Query Issues

### Issue: Column Name Mismatches

**Problem:** Code queries `term` but table has `term_name`

**Fix:** Check actual column names:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'edcat' 
  AND table_name = 'terms_and_definitions';
```

**Then update queries in:**
- `VeraTerminologyService.js` - Line 65-74
- `VeraContextOrchestrator.ts` - Line 196

### Issue: Wrong Table Names

**Problem:** Code queries `compliance_standards` but table is `standards`

**Fix:** All queries should use:
- `public.standards` (not `compliance_standards`)
- `public.parsed_requirements` (not `requirements`)
- `edcat.terms_and_definitions` (not `terms`)

### Issue: Missing JOIN Conditions

**Problem:** Queries fail because JOIN conditions are wrong

**Example from `VeraContextOrchestrator.ts` line 249:**
```typescript
// WRONG:
LEFT JOIN public.standards s ON pr.standard_id = s.standard_id

// CORRECT:
LEFT JOIN public.standards s ON pr.standard_id = s.id
```

**Fix:** Check all JOIN conditions match actual foreign keys

---

## Verification Checklist

After applying fixes, verify:

- [ ] Database connections work (`checkConnections()` returns success)
- [ ] `public.standards` has data (at least 1 standard)
- [ ] `edcat.terms_and_definitions` has data (at least 10 terms)
- [ ] `public.parsed_requirements` has data (at least 1 requirement)
- [ ] `edcat.document_content_for_learning` has data (if documents were uploaded)
- [ ] Vera can answer questions about standards
- [ ] Vera can define terms (e.g., "What is APQP?")
- [ ] Vera can explain clauses (e.g., "What is AS9100D clause 8.7?")

---

## Quick Test Queries

Test if Vera can see data:

**1. Test Standards:**
```javascript
// In VeraCoreEngine or chat route
const standards = await queryPostgres('SELECT code, name FROM public.standards LIMIT 5');
console.log('Standards:', standards.rows);
```

**2. Test Terms:**
```javascript
const terms = await queryEdcatAI('SELECT term_name, definition FROM edcat.terms_and_definitions LIMIT 5');
console.log('Terms:', terms.rows);
```

**3. Test Requirements:**
```javascript
const reqs = await queryPostgres('SELECT clause_number, requirement_text FROM public.parsed_requirements LIMIT 3');
console.log('Requirements:', reqs.rows);
```

---

## Next Steps

1. **Run diagnostic script** to identify specific issues
2. **Check environment variables** are set correctly
3. **Verify tables exist** and have data
4. **Run ingestion scripts** to populate empty tables
5. **Test Vera's queries** with sample questions
6. **Check logs** for specific query errors

---

## Support

If issues persist:
1. Check Railway logs for connection errors
2. Verify database URLs in Railway dashboard
3. Run diagnostic script and share output
4. Check if migrations ran successfully
5. Verify data was actually uploaded/ingested

---

**Last Updated:** December 2024

