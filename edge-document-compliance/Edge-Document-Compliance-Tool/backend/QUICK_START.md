# Quick Start - Database Setup

## Step 1: Configure Environment

Make sure `backend/.env` exists with your Railway DATABASE_URL:

```bash
cd backend
cp .env.example .env
# Edit .env and add your Railway connection string
```

Your `.env` should have:
```
DATABASE_URL=postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:5432/railway
```

## Step 2: Install Dependencies

```bash
cd backend
npm install
```

## Step 3: Run Setup Script

```bash
node setup-db.js
```

Or use npm script:
```bash
npm run setup-db
```

## Expected Output

You should see:
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

### Error: "Cannot find module 'pg'"
```bash
cd backend
npm install
```

### Error: "Cannot read DATABASE_URL"
- Make sure `backend/.env` exists
- Check it has `DATABASE_URL=postgresql://...`
- Verify no extra spaces or quotes

### Error: "connect ECONNREFUSED"
- Check DATABASE_URL is correct (copy from Railway again)
- Make sure Railway PostgreSQL service is running
- Wait 30 seconds and try again
- Check firewall/network settings

### Error: "relation already exists"
- This is OK! Script is idempotent
- Tables already exist, nothing to do
- You can safely ignore this

## Step 4: Verify Setup

After successful setup, verify tables exist:

```bash
# Option 1: Use Railway Query Editor
# Go to Railway → PostgreSQL → Connect → Query
# Run:
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema IN ('compliance_lib', 'customer_data')
ORDER BY table_schema, table_name;
```

Should return 9 tables.

## Step 5: Git Commit

Once setup is successful:

```bash
cd ..
git add backend/setup-db.js backend/package.json backend/DATABASE_SETUP.md
git commit -m "Add: Database schema setup script"
git push origin main
```

## Next Steps

Once you see "✅ Total tables: 9", you're ready for:

1. ✅ Database setup complete
2. Next: Create connection.js
3. Next: Create parser.js
4. Next: Create analyzer.js

Tell me: **"9 tables created! Ready for connection.js"** and I'll create the next files!

