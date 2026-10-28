# How to Verify Vera is Working

## Quick Verification Steps

### 1. Check Railway Health Endpoint

**Endpoint:** `GET /api/vera/health` or `GET /api/vera/diagnostics/health`

**Via Browser:**
```
https://your-railway-app.railway.app/api/vera/health
```

**Via curl:**
```bash
curl https://your-railway-app.railway.app/api/vera/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-05T...",
  "databases": {
    "postgres": "connected",
    "edcat": "connected"
  },
  "tables": {
    "vera_query_response_bank": { "exists": true, "rowCount": 12 },
    "terms_and_definitions": { "exists": true, "rowCount": 69 },
    "standards": { "exists": true, "rowCount": 38 },
    "parsed_requirements": { "exists": true, "rowCount": 1000+ }
  }
}
```

### 2. Test Vera in Chat Interface

**Ask these questions:**

1. **"What is quality?"**
   - ✅ Should return: Full definition from Q&A bank
   - ❌ Bad: "I want to make sure I understand..." (clarification loop)

2. **"What is ISO 9001?"**
   - ✅ Should return: Explanation of ISO 9001 standard
   - ❌ Bad: Generic response or clarification loop

3. **"What is AS9100?"**
   - ✅ Should return: Explanation of AS9100 standard
   - ❌ Bad: "Based on what I can see..." (no actual data)

4. **"Can you see your database of standards?"**
   - ✅ Should return: Confirmation and list of standards
   - ❌ Bad: Clarification loop

5. **"Can you see your database of terms and definitions?"**
   - ✅ Should return: Confirmation and examples
   - ❌ Bad: Clarification loop

### 3. Check Railway Logs

**Look for these SUCCESS indicators:**
```
[db] ✅ Both database connections verified (Customer Data + EDCAT AI)
[VeraConversationalEngine] ✓ Loaded Vera knowledge from database
[VeraTerminologyService] ✓ Loaded 69 terms from file
[seed-vera] ✅ vera_query_response_bank populated
```

**Look for these ERROR indicators (should NOT appear):**
```
❌ column "response_template" does not exist
❌ column "answer" does not exist
❌ column "user_id" does not exist
❌ column s.standard_id does not exist
❌ null value in column "message" violates not-null constraint
```

### 4. Verify Database Queries Work

**Check Q&A Response Bank:**
```sql
SELECT COUNT(*) as total, 
       COUNT(CASE WHEN response_text IS NOT NULL AND response_text != '' THEN 1 END) as with_content
FROM edcat.vera_query_response_bank;
```

**Expected:** `total: 12+`, `with_content: 12+`

**Check Terms and Definitions:**
```sql
SELECT COUNT(*) FROM edcat.terms_and_definitions;
```

**Expected:** `69+` (or whatever was loaded)

**Check Standards:**
```sql
SELECT COUNT(*) FROM public.standards;
```

**Expected:** `38+` (or whatever was loaded)

---

## What "LLM Data" Means

**Important:** Vera does NOT require an external LLM to function.

**Vera's "Data" includes:**
1. **Q&A Response Bank** - Pre-written answers to common questions
2. **Terms & Definitions** - Quality terminology database
3. **Standards Database** - ISO 9001, AS9100, etc.
4. **Requirements Database** - Parsed clauses and requirements
5. **Learning Examples** - Approved examples and procedures

**Vera's LLM Integration:**
- **Optional** - Can enhance responses but not required
- **Default:** `VERA_LLM_PROVIDER=noop` (no external LLM)
- **With LLM:** `VERA_LLM_PROVIDER=local_http` + endpoint

**Current Status:**
- ✅ Vera has access to ALL her data sources
- ✅ All database queries work correctly
- ✅ Q&A responses are populated
- ✅ Terms and definitions accessible
- ✅ Standards and requirements accessible
- ⚠️ LLM integration is **optional** (not configured = normal)

---

## Troubleshooting

### If Vera Returns Clarification Loops

**Problem:** Vera keeps asking "Can you help me clarify?"

**Solution:**
1. Check Q&A response bank has content:
   ```sql
   SELECT COUNT(*) FROM edcat.vera_query_response_bank WHERE response_text IS NOT NULL;
   ```
2. Check for column mismatches in logs
3. Verify database connections are working

### If Vera Says "Based on what I can see..." (No Data)

**Problem:** Database queries returning empty results

**Solution:**
1. Check health endpoint for table row counts
2. Verify data was loaded (standards, requirements, terms)
3. Check database connection strings in Railway

### If Database Errors Appear

**Problem:** Column mismatches or SQL errors

**Solution:**
1. Check all migrations ran (070-077)
2. Verify column names match code expectations
3. Check Railway logs for migration errors

---

## Summary

**✅ Vera is WORKING if:**
- Health endpoint shows `"status": "ok"`
- Both databases show `"connected"`
- Table row counts > 0
- Vera answers questions directly (not clarification loops)
- No column mismatch errors in logs

**❌ Vera is NOT working if:**
- Health endpoint shows errors
- Databases show `"disconnected"`
- Table row counts = 0
- Vera only returns clarification loops
- Column mismatch errors in logs

---

**Current Status:** ✅ All fixes applied, Vera should be fully functional



