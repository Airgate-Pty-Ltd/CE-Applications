# Database Schema Fixes - Summary

## Date: 2025-11-18

## Root Cause Analysis

The Railway deployment was failing with multiple database schema errors:

1. **gap_analyses**: Indexes and foreign keys referenced `analysis_id` column before it was created
2. **audit_trail**: Table was missing entirely, causing FK constraint failures
3. **tenants**: Seed scripts didn't provide required `key` column (NOT NULL constraint violation)
4. **standard_files**: Missing `file_category` column, `file_id` vs `id` confusion, VARCHAR length issues
5. **customer_procedures**: `tenant_id` index created before column existed

## Files Changed

### 1. `migrations/001_postgres_customer_data.sql`

**gap_analyses fixes:**
- Changed `analysis_id` from `UNIQUE` constraint in CREATE TABLE to nullable, then added UNIQUE constraint via DO block after populating values
- Made `tenant_id` nullable initially, then set to NOT NULL only after all rows have values
- Added proper DO blocks to ensure columns exist before creating indexes
- Added logic to populate `tenant_id` from default tenant if NULL

**audit_trail fixes:**
- Added complete `audit_trail` table definition (was missing)
- Uses `gap_analysis_id` as FK to `gap_analyses(id)` (primary key)
- Includes `analysis_id` column for code compatibility (populated from gap_analyses)
- All indexes wrapped in DO blocks to check table existence first

**tenants fixes:**
- Updated seed INSERT to use `ON CONFLICT (key) DO NOTHING` instead of just WHERE NOT EXISTS
- Ensures `key` is always provided (required NOT NULL column)

**standard_files fixes:**
- Increased `file_type` from VARCHAR(50) to VARCHAR(100) to avoid "value too long" errors
- All index creation wrapped in DO blocks to check column existence
- Proper DO block syntax for column type changes

**customer_procedures fixes:**
- Wrapped `tenant_id` index creation in DO block to check column existence
- Added proper FK constraint creation with existence checks

### 2. `migrations/000_init_schema.sql`

**tenants seed fix:**
- Changed `ON CONFLICT (name)` to `ON CONFLICT (key)` to match UNIQUE constraint
- Added comment explaining why `key` is required

## Key Schema Decisions

### gap_analyses
- **Primary Key**: `id` (UUID)
- **Compatibility Column**: `analysis_id` (UUID, UNIQUE, nullable initially, populated from `id`)
- **Multi-tenant**: `tenant_id` (UUID, NOT NULL after migration, FK to tenants)
- **Analysis Date**: `analysis_date` (TIMESTAMP, DEFAULT NOW())

### audit_trail
- **Primary Key**: `audit_id` (UUID)
- **Foreign Key**: `gap_analysis_id` → `gap_analyses(id)` (references primary key)
- **Compatibility**: `analysis_id` (populated from gap_analyses for code compatibility)
- **No FK on analysis_id**: Avoids circular dependency issues

### tenants
- **Primary Key**: `id` (UUID)
- **Required**: `key` (VARCHAR(255), UNIQUE, NOT NULL) - tenant identifier/slug
- **Optional**: `email` (VARCHAR(255), UNIQUE, nullable)
- **Multi-tenant fields**: `industry`, `region` (both nullable)

### standard_files
- **Primary Key**: `id` (UUID) - migrated from `file_id` if exists
- **Required**: `file_name` (VARCHAR(255)), `file_path` (TEXT), `file_category` (VARCHAR(100))
- **File Type**: `file_type` (VARCHAR(100)) - increased from VARCHAR(50)
- **Nullable**: `standard_id` (UUID) - files can exist without standards initially

### customer_procedures
- **Primary Key**: `id` (UUID)
- **Multi-tenant**: `tenant_id` (UUID, nullable initially, FK to tenants)
- **Document Link**: `document_id` (UUID, FK to customer_documents)

## Migration Idempotency

All migrations are now idempotent:

1. **CREATE TABLE IF NOT EXISTS** - Won't fail if table exists
2. **ALTER TABLE ... ADD COLUMN IF NOT EXISTS** - Won't fail if column exists
3. **DO $$ blocks** - Check column/constraint existence before creating
4. **CREATE INDEX IF NOT EXISTS** - Won't fail if index exists
5. **ON CONFLICT DO NOTHING** - Seed inserts won't fail on duplicates

## Testing Checklist

After deployment, verify:

- [ ] `public.gap_analyses` table exists with `id`, `analysis_id`, `tenant_id`, `analysis_date` columns
- [ ] `public.audit_trail` table exists with `gap_analysis_id` FK to `gap_analyses(id)`
- [ ] `public.tenants` table has default tenant with `key = 'default-org'`
- [ ] `public.standard_files` table exists with `id` (not `file_id`), `file_category`, `file_type` VARCHAR(100)
- [ ] `public.customer_procedures` table has `tenant_id` column and index
- [ ] No errors in Railway logs about missing columns or relations
- [ ] File uploads work without "value too long" or "column does not exist" errors

## Deployment Notes

Railway will automatically:
1. Run `npm ci` to install dependencies
2. Run `npm start` which calls `node backend/index.js`
3. `backend/index.js` calls `initializeTwoDatabases()` which:
   - Reads `migrations/001_postgres_customer_data.sql`
   - Executes all SQL statements against PostgreSQL
   - Handles errors gracefully (idempotent operations)

The migration should complete successfully even if tables/columns already exist.

