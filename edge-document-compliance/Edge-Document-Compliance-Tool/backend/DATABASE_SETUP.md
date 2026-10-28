# Database Setup Guide

## Quick Setup

Run the automated setup script:

```bash
cd backend
npm run setup-db
```

Or directly:

```bash
cd backend
node setup-db.js
```

## Prerequisites

1. **Railway PostgreSQL configured**
   - Create PostgreSQL service on Railway
   - Copy connection string

2. **Environment file configured**
   - Copy `.env.example` to `.env`
   - Add your Railway `DATABASE_URL`:
     ```
     DATABASE_URL=postgresql://user:password@host:5432/database
     ```

3. **Dependencies installed**
   ```bash
   npm install
   ```

## What the Script Does

1. ✅ Connects to Railway PostgreSQL using `DATABASE_URL` from `.env`
2. ✅ Creates 2 schemas:
   - `compliance_lib` (4 tables)
   - `customer_data` (5 tables)
3. ✅ Creates all 9 tables with proper foreign keys
4. ✅ Creates all indices for performance
5. ✅ Verifies setup and shows summary

## Expected Output

```
╔════════════════════════════════════════════════════════════════╗
║  COMPLIANCE GAP - DATABASE SETUP SCRIPT                       ║
║  Creating schemas and 9 tables in Railway PostgreSQL          ║
╚════════════════════════════════════════════════════════════════╝

📝 Starting database setup...

✅ Connected to database

✅ Created: compliance_lib
✅ Created: compliance_lib.standards
✅ Created: compliance_lib.requirements
✅ Created: compliance_lib.extraction_history
✅ Created: compliance_lib.model_versions
✅ Created: customer_data
✅ Created: customer_data.documents
✅ Created: customer_data.procedures
✅ Created: customer_data.requirement_mappings
✅ Created: customer_data.gap_analyses
✅ Created: customer_data.analysis_clarifications

✅ Executed 25 statements (0 skipped)

📊 Tables created:

   ✓ compliance_lib.extraction_history
   ✓ compliance_lib.model_versions
   ✓ compliance_lib.requirements
   ✓ compliance_lib.standards
   ✓ customer_data.analysis_clarifications
   ✓ customer_data.documents
   ✓ customer_data.gap_analyses
   ✓ customer_data.procedures
   ✓ customer_data.requirement_mappings

✅ Total tables: 9

📊 Indices created: 15

╔════════════════════════════════════════════════════════════════╗
║  DATABASE SETUP COMPLETE!                                     ║
║  All schemas and tables ready to use.                          ║
║  Your Railway PostgreSQL is now configured.                    ║
╚════════════════════════════════════════════════════════════════╝
```

## Troubleshooting

### Error: "DATABASE_URL is not defined"

**Solution:** Make sure `.env` file exists in `backend/` directory with:
```
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Error: "Connection refused" or "ECONNREFUSED"

**Solution:** 
1. Check Railway PostgreSQL is running
2. Verify connection string is correct
3. Check network/firewall settings

### Error: "relation already exists"

**Solution:** This is OK! The script uses `CREATE IF NOT EXISTS` so it's safe to run multiple times. Existing tables won't be affected.

### Error: "SSL required"

**Solution:** Make sure `DATABASE_URL` includes SSL parameters, or the script will add them automatically for production.

## Manual Setup (Alternative)

If you prefer to set up manually:

1. Go to Railway → PostgreSQL → Connect → Query
2. Copy contents of `src/database/schema/complete-schema.sql`
3. Paste and run in Railway query editor
4. Verify with:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema IN ('compliance_lib', 'customer_data')
   ORDER BY table_schema, table_name;
   ```

## Verification

After setup, verify tables exist:

```bash
# Connect to Railway PostgreSQL
psql $DATABASE_URL

# Run verification query
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema IN ('compliance_lib', 'customer_data')
ORDER BY table_schema, table_name;
```

Should return 9 tables.

## Re-running Setup

The script is **idempotent** - safe to run multiple times. It uses `CREATE IF NOT EXISTS` so:
- ✅ Won't duplicate tables
- ✅ Won't break existing data
- ✅ Can update schema if needed

## Next Steps

After database setup:
1. ✅ Database ready
2. Start backend: `npm run dev`
3. Test health endpoint: `http://localhost:5000/health`
4. Begin building API routes

