# Database Schema Files

## Recommended: Use Complete Schema

**Use `complete-schema.sql`** - This is the single, comprehensive schema file that includes:
- Both schemas (compliance_lib and customer_data)
- All 9 tables with proper foreign keys and CASCADE deletes
- All indices for optimal performance
- Verification queries included

## Setup Instructions

### Option 1: Railway PostgreSQL (Recommended)

1. Go to Railway dashboard → Your PostgreSQL service
2. Click **"Connect"** → **"Query"**
3. Copy entire contents of `complete-schema.sql`
4. Paste into query box
5. Click **"Run"**
6. Verify with the verification query at the bottom of the file

### Option 2: Local PostgreSQL (Docker)

```bash
# Start PostgreSQL
docker-compose up -d

# Connect and run schema
psql -h localhost -U postgres -d compliance_gap -f backend/src/database/schema/complete-schema.sql
```

### Option 3: Separate Schema Files

If you prefer to run schemas separately:
1. Run `compliance-lib.sql` first
2. Then run `customer-data.sql`

**Note:** The separate files are maintained for reference, but `complete-schema.sql` is the authoritative version.

## Verification

After running the schema, verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema IN ('compliance_lib', 'customer_data')
ORDER BY table_schema, table_name;
```

Should return 9 tables:
- compliance_lib.standards
- compliance_lib.requirements
- compliance_lib.extraction_history
- compliance_lib.model_versions
- customer_data.documents
- customer_data.procedures
- customer_data.requirement_mappings
- customer_data.gap_analyses
- customer_data.analysis_clarifications

## Schema Overview

### compliance_lib (4 tables)
- **standards** - Compliance standards (ISO 9001, AS9100D, etc.)
- **requirements** - Individual clauses from standards
- **extraction_history** - Track confidence improvements
- **model_versions** - Track AI model improvements

### customer_data (5 tables)
- **documents** - Uploaded customer files
- **procedures** - Extracted procedures from documents
- **requirement_mappings** - Links requirements to procedures
- **gap_analyses** - Analysis results
- **analysis_clarifications** - Clarification Q&A records

## Features

- ✅ Uses `CREATE TABLE IF NOT EXISTS` (safe to re-run)
- ✅ Foreign keys with `ON DELETE CASCADE`
- ✅ Comprehensive indices for performance
- ✅ Generated columns for calculated fields
- ✅ Check constraints for data validation

