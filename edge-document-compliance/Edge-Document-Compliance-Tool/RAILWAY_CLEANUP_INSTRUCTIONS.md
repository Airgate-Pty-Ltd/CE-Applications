# How to Clean Up Orphaned Tables in Railway (Web Dashboard Only)

Since you only have web access to Railway, use the automatic cleanup option.

## ✅ Solution: Set Environment Variable

### Step 1: Go to Railway Dashboard
1. Open your Railway project
2. Click on your **service** (the one running your app)
3. Go to the **"Variables"** tab

### Step 2: Add Environment Variable
1. Click **"New Variable"** or **"Raw Editor"**
2. Add this variable:
   ```
   RUN_CLEANUP_ON_STARTUP=true
   ```
3. Click **"Save"** or **"Update"**

### Step 3: Restart Your Service
1. Go to the **"Deployments"** tab
2. Click **"Redeploy"** or **"Restart"** on the latest deployment
3. Wait for the service to restart

### Step 4: Check Logs
1. Go to the **"Logs"** tab
2. Look for messages like:
   - `[index] 🗑️  Running cleanup of orphaned tables on startup...`
   - `✅ Cleanup completed: Removed X tables, Y tables remaining`

### Step 5: Remove the Environment Variable (IMPORTANT!)
After cleanup runs successfully:
1. Go back to **"Variables"** tab
2. **Delete** or set `RUN_CLEANUP_ON_STARTUP` to `false`
3. This prevents cleanup from running on every restart

## What Gets Removed

The cleanup removes **23 orphaned tables**:
- standard_files, standard_files_content, upload_files
- generated_reports, user_feedback, audit_logs_results
- integration_logs, users, api_keys, assessments
- audit_logs, authorized_users, compliance_requirements
- documents, files, i18n_translations, industry_modules
- integrations, requirement_mapping, requirement_mappings
- user_permissions, regional_compliance_mappings, tenant_industry_modules

## Expected Result

- **Before:** 35 tables
- **After:** ~12-14 active tables

## Verify in Railway

After cleanup runs, check your database in Railway:
1. Go to your **Postgres service**
2. Click **"Data"** tab
3. You should see only ~12-14 tables instead of 35

---

**That's it!** Just set the environment variable, restart, and the cleanup will run automatically.

