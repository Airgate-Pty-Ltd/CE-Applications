# Fix Parsing Functionality

**Issue:** `relation "parsed_requirements" does not exist`

## ✅ Solution: Create Table Via Environment Variable

Since you only have web access to Railway, use the automatic table creation option.

### Step 1: Go to Railway Dashboard
1. Open your Railway project
2. Click on your **service** (the one running your app)
3. Go to the **"Variables"** tab

### Step 2: Add Environment Variable
1. Click **"New Variable"** or **"Raw Editor"**
2. Add this variable:
   ```
   CREATE_PARSED_REQUIREMENTS_TABLE=true
   ```
3. Click **"Save"** or **"Update"**

### Step 3: Restart Your Service
1. Go to the **"Deployments"** tab
2. Click **"Redeploy"** or **"Restart"** on the latest deployment
3. Wait for the service to restart

### Step 4: Check Logs
1. Go to the **"Logs"** tab
2. Look for messages like:
   - `[index] 🔧 Ensuring public.parsed_requirements table exists...`
   - `✅ public.parsed_requirements table verified`

### Step 5: Remove the Environment Variable
After the table is created:
1. Go back to **"Variables"** tab
2. **Delete** `CREATE_PARSED_REQUIREMENTS_TABLE` or set it to `false`

## Alternative: Automatic Creation

The table should be created automatically on startup via:
- Migration 012: `create_parsed_requirements_table.sql`
- Startup script in `backend/index.js` → `ensureParsedRequirementsTable()`

If it's still not working, check Railway logs for errors during migration execution.

## What This Does

Creates the `public.parsed_requirements` table in PostgreSQL with all required columns:
- `id`, `standard_id`, `clause_number`, `clause_title`, `requirement_text`
- `clause_ref`, `sub_ref`, `full_ref`, `clause_path_depth`
- `subject_text`, `is_informative_note`, `is_recommendation`, `is_in_scope`
- Plus all other required columns for parsing

## Connection Details

- **Database:** PostgreSQL (Customer Data DB)
- **Connection:** `DATABASE_URL` environment variable
- **Query Function:** `queryPostgres()` from `backend/src/config/databases.js`
- **Table:** `public.parsed_requirements`

---

**This table is CRITICAL for parsing to work!**

