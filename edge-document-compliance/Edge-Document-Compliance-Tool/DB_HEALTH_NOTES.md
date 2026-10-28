# Database Health Notes

## Migration Fix: Statement 23 - customer_procedures.tenant_id

**Date:** 2025-11-18  
**Issue:** Statement 23 in `001_postgres_customer_data.sql` was failing with "column tenant_id does not exist"

### Root Cause

The `customer_procedures` table definition in the migration includes `tenant_id`, but if the table was created by a legacy schema (e.g., `database/schema.sql` or `database/schema_fixed.sql`), it may not have the `tenant_id` column. When the migration tried to create an index on `tenant_id` (Statement 23), it failed because the column didn't exist.

### Solution Applied

**Case A: tenant_id is actively used** ✅

The application actively uses `tenant_id` for multi-tenant isolation:
- `backend/src/middleware/enterpriseMiddleware.js` - Tenant isolation middleware
- `backend/src/routes/chat.js` - Uses `tenant_id` for Vera conversations
- Multiple tables in the migration use `tenant_id` for tenant scoping

**Fix:**
1. Added `ALTER TABLE customer_procedures ADD COLUMN IF NOT EXISTS tenant_id` before index creation
2. Added UPDATE statement to populate `tenant_id` for existing rows using the default tenant
3. Created index with `WHERE tenant_id IS NOT NULL` to handle nullable legacy data gracefully

### Migration Changes

**File:** `migrations/001_postgres_customer_data.sql`

**Before Statement 23:**
```sql
CREATE INDEX IF NOT EXISTS idx_procedures_tenant ON customer_procedures(tenant_id);
```

**After (with safety checks):**
```sql
-- Ensure tenant_id column exists before creating index (for compatibility with legacy schema)
ALTER TABLE customer_procedures ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Update existing rows to have a tenant_id if NULL (use default tenant)
UPDATE customer_procedures 
SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Organization' LIMIT 1)
WHERE tenant_id IS NULL 
  AND EXISTS (SELECT 1 FROM tenants WHERE name = 'Default Organization')
  AND EXISTS (SELECT 1 FROM customer_procedures WHERE tenant_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_procedures_tenant ON customer_procedures(tenant_id) WHERE tenant_id IS NOT NULL;
```

### Multi-Tenant Architecture

The Customer Data DB uses `tenant_id` for:
- **users** - Users belong to tenants
- **upload_files** - Files are scoped to tenants
- **customer_documents** - Documents belong to tenants
- **customer_procedures** - Procedures belong to tenants (via documents)
- **gap_analyses** - Analyses are scoped to tenants
- **generated_reports** - Reports belong to tenants
- **audit_logs_results** - Audit logs are scoped to tenants
- **integration_logs** - Integration logs are scoped to tenants

### Idempotency

The migration is now fully idempotent:
- ✅ Safe to run on fresh databases
- ✅ Safe to run on existing databases with legacy schema
- ✅ Handles missing columns gracefully
- ✅ Updates existing data without breaking constraints
- ✅ Uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` patterns

### Expected Result

After this fix, `001_postgres_customer_data.sql` should complete with **0 errors**:
- Statement 23 will succeed because `tenant_id` column is guaranteed to exist before index creation
- Existing data is migrated to have `tenant_id` values
- Index is created successfully with nullable handling

