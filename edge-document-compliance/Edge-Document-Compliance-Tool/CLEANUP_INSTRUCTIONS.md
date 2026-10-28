# How to Remove Orphaned Tables

**There is NO SQL console in Railway.** Use the API endpoint instead.

## ✅ Solution: API Endpoint

After Railway deploys, call this endpoint:

### Option 1: Browser Console
Open your browser's developer console (F12) on your Railway app and run:

```javascript
fetch('/api/admin/cleanup-orphaned-tables', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('✅ Cleanup Result:', data);
    console.log(`Removed ${data.removed} tables`);
    console.log(`${data.after} tables remaining`);
  });
```

### Option 2: curl (from your terminal)
```bash
curl -X POST https://your-app.railway.app/api/admin/cleanup-orphaned-tables
```

### Option 3: Postman or any HTTP client
- Method: POST
- URL: `https://your-app.railway.app/api/admin/cleanup-orphaned-tables`
- No body required

## Automatic Cleanup on Startup

To run cleanup automatically when the app starts, set this environment variable in Railway:

```
RUN_CLEANUP_ON_STARTUP=true
```

**Note:** This will run cleanup every time the app restarts, so only enable it once, then disable it.

## What Gets Removed

The cleanup removes **23 orphaned tables**:
- `standard_files`, `standard_files_content`, `upload_files`
- `generated_reports`, `user_feedback`, `audit_logs_results`
- `integration_logs`, `users`, `api_keys`, `assessments`
- `audit_logs`, `authorized_users`, `compliance_requirements`
- `documents`, `files`, `i18n_translations`, `industry_modules`
- `integrations`, `requirement_mapping`, `requirement_mappings`
- `user_permissions`, `regional_compliance_mappings`, `tenant_industry_modules`

## Expected Result

- **Before:** 35 tables
- **After:** ~12-14 active tables

## Response Format

The API returns:
```json
{
  "success": true,
  "message": "Cleanup completed successfully",
  "dropped": 23,
  "errors": 0,
  "before": 35,
  "after": 12,
  "removed": 23,
  "remainingTables": ["standards", "parsed_requirements", ...]
}
```

---

**That's it!** Just call the API endpoint after deployment.

