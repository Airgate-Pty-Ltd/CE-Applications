# Deploy Vera Knowledge Database Fix

## Changes Made

1. **Added Learning Tables to Migration** (`migrations/002_edcat_ai_intelligence.sql`)
   - Added `document_content_for_learning` table
   - Added `example_documents` table
   - These tables store Vera's learning data

2. **Fixed Standards Query** (`backend/src/routes/chat.js`)
   - Updated to filter out placeholder standards
   - Only shows user-uploaded or Vera-learned standards
   - Added customer requirements query

3. **Improved Vera's Capability Display** (`backend/src/services/veraConversationalEngine.js`)
   - Always shows credentials even if not loaded from DB
   - Better error messages for missing tables

## PowerShell Deployment Commands

Run these commands in PowerShell from the project root:

```powershell
# Check what files were changed
git status

# Add all changed files
git add migrations/002_edcat_ai_intelligence.sql
git add backend/src/routes/chat.js
git add backend/src/services/veraConversationalEngine.js

# Commit with descriptive message
git commit -m "Fix: Add Vera learning tables to migration and fix knowledge database queries

- Add document_content_for_learning and example_documents tables to EDCAT AI migration
- Fix standards query to filter out placeholders and show only user-uploaded/Vera-learned standards
- Add customer requirements query so Vera can see parsed requirements
- Improve capability query to always show credentials
- Update all context objects to include customerRequirements
- Enhanced error messages for missing learning tables"

# Push to repository
git push origin main
```

## After Deployment

1. **Wait for Railway to deploy** - The migration will run automatically
2. **Verify tables exist** - Check Railway logs to confirm `document_content_for_learning` and `example_documents` tables were created
3. **Test Vera** - Ask Vera about her knowledge database - she should now see:
   - Standards you've uploaded
   - Customer requirements
   - Regulatory websites
   - Her learning database status

## Verification

After deployment, you can test by asking Vera:
- "Vera, what standards do you know?"
- "Vera, check your knowledge database"
- "Vera, list your credentials"

She should now be able to see and report on her knowledge pool.

