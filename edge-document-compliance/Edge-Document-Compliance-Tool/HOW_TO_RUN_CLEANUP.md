# How to Run Cleanup Migration

The cleanup migration removes 23 orphaned tables from PostgreSQL.

## Option 1: Via API Endpoint (Recommended)

After deployment, call the API endpoint:

```bash
curl -X POST https://your-railway-app.railway.app/api/admin/cleanup-orphaned-tables
```

Or use any HTTP client (Postman, browser console, etc.):

```javascript
fetch('/api/admin/cleanup-orphaned-tables', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

## Option 2: Run Script Locally

If you have local database access:

```powershell
.\run-cleanup-now.ps1
```

Or directly:

```bash
node backend/src/scripts/run-cleanup-migration-now.js
```

## Option 3: Automatic on Deployment

The migration **should** run automatically on Railway deployment via `twoDatabaseMigrations.js`, but if it doesn't, use Option 1.

---

## What Gets Removed

The cleanup removes these **23 orphaned tables**:

1. `standard_files` - Consolidated into standards
2. `standard_files_content` - Consolidated into standards
3. `upload_files` - No code connections
4. `generated_reports` - No code connections
5. `user_feedback` - No code connections
6. `audit_logs_results` - No code connections
7. `integration_logs` - No code connections
8. `users` - No code connections
9. `api_keys` - No code connections
10. `assessments` - No code connections
11. `audit_logs` - No code connections
12. `authorized_users` - No code connections
13. `compliance_requirements` - No code connections
14. `documents` - No code connections
15. `files` - No code connections
16. `i18n_translations` - No code connections
17. `industry_modules` - No code connections
18. `integrations` - No code connections
19. `requirement_mapping` - No code connections
20. `requirement_mappings` - No code connections
21. `user_permissions` - No code connections
22. `regional_compliance_mappings` - No code connections
23. `tenant_industry_modules` - No code connections

## Expected Result

**Before:** 35 tables  
**After:** ~12-14 active tables

## Active Tables (Preserved)

1. ✅ `standards` - Single source of truth
2. ✅ `parsed_requirements` - All parsed requirements
3. ✅ `gap_analyses` - Gap analysis results
4. ✅ `audit_trail` - Decision tracking
5. ✅ `tenants` - Client organizations
6. ✅ `customer_procedures` - Customer procedures
7. ✅ `customer_documents` - Customer documents
8. ✅ `analysis_clarifications` - Q&A during analysis
9. ✅ `parsed_clauses` - Parsed clauses
10. ✅ `regulatory_websites` - Regulatory sources
11. ✅ `document_content_for_learning` - Vera learning data
12. ✅ `extraction_history` - Parsing history
13. ✅ `model_versions` - Model version tracking
14. ✅ `schema_migrations` - Migration tracking (system table)

---

**Status:** ✅ Ready to run

