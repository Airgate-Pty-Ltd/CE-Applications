# Database Consolidation Plan

## Current Problem

**Both databases have duplicate tables:**
- PostgreSQL (Customer Data DB): `standards`, `standard_files`, `parsed_requirements`
- EDCAT AI DB: `standards`, `standard_files`, `parsed_requirements`

This causes:
1. **Data Duplication**: Same data stored in 2 places
2. **Sync Issues**: Data can get out of sync
3. **Confusion**: Unclear which database is source of truth
4. **Maintenance Burden**: Updates must happen in 2 places

## Desired Architecture

### Option 1: Single Source of Truth (PostgreSQL) - RECOMMENDED

**PostgreSQL (Customer Data DB) = SINGLE SOURCE OF TRUTH**
- All Compliance Library uploads go to PostgreSQL
- `standards` table in PostgreSQL only
- `standard_files` table in PostgreSQL only
- `parsed_requirements` table in PostgreSQL only

**EDCAT AI DB = READ-ONLY VIEW FOR VERA**
- Vera reads from PostgreSQL via views or direct queries
- OR: EDCAT AI DB is removed entirely, Vera queries PostgreSQL directly

**Benefits:**
- ✅ Single source of truth
- ✅ No sync issues
- ✅ Simpler architecture
- ✅ Easier maintenance

### Option 2: PostgreSQL Primary, EDCAT AI Sync

**PostgreSQL (Customer Data DB) = PRIMARY**
- All uploads go to PostgreSQL first
- `standards`, `standard_files`, `parsed_requirements` in PostgreSQL

**EDCAT AI DB = SYNCED COPY**
- Automatic sync from PostgreSQL to EDCAT AI DB
- Vera reads from EDCAT AI DB (for performance/isolation)
- Sync happens on INSERT/UPDATE/DELETE

**Benefits:**
- ✅ Clear primary database
- ✅ Vera has isolated read access
- ⚠️ Requires sync mechanism
- ⚠️ More complex

## Implementation Plan (Option 1 - Recommended)

### Step 1: Identify Current Data

```sql
-- Check PostgreSQL
SELECT COUNT(*) FROM public.standards;
SELECT COUNT(*) FROM public.standard_files;
SELECT COUNT(*) FROM public.parsed_requirements;

-- Check EDCAT AI DB
SELECT COUNT(*) FROM public.standards;
SELECT COUNT(*) FROM public.standard_files;
SELECT COUNT(*) FROM public.parsed_requirements;
```

### Step 2: Consolidate Data

1. **Merge standards tables:**
   - Compare `standards` in both databases
   - Keep PostgreSQL as source of truth
   - If EDCAT AI has unique records, migrate to PostgreSQL
   - Drop `standards` table from EDCAT AI DB

2. **Merge standard_files tables:**
   - Compare `standard_files` in both databases
   - Keep PostgreSQL as source of truth
   - If EDCAT AI has unique records, migrate to PostgreSQL
   - Drop `standard_files` table from EDCAT AI DB

3. **Merge parsed_requirements tables:**
   - Compare `parsed_requirements` in both databases
   - Keep PostgreSQL as source of truth
   - If EDCAT AI has unique records, migrate to PostgreSQL
   - Drop `parsed_requirements` table from EDCAT AI DB

### Step 3: Update Code

**All upload/insert operations → PostgreSQL only:**
- `backend/src/routes/upload.js` → Already uses PostgreSQL for `standard_files`
- `backend/src/routes/parse.js` → Update to use PostgreSQL for `parsed_requirements`
- `backend/src/scripts/process-requirements-folder.js` → Already uses PostgreSQL for `standard_files`

**All read operations → PostgreSQL only:**
- `backend/src/routes/requirements.js` → Update to read from PostgreSQL only
- `backend/src/routes/parse.js` → Update to read from PostgreSQL only
- Vera AI → Update to read from PostgreSQL (or use views)

### Step 4: Create Views (Optional - for Vera)

If Vera needs isolated access, create views in EDCAT AI DB that point to PostgreSQL:

```sql
-- In EDCAT AI DB, create views that query PostgreSQL
CREATE VIEW standards AS 
SELECT * FROM dblink('dbname=postgres host=...', 
  'SELECT * FROM public.standards') AS t(...);

-- Or use foreign data wrappers
CREATE EXTENSION postgres_fdw;
CREATE SERVER postgres_server FOREIGN DATA WRAPPER postgres_fdw 
  OPTIONS (host '...', dbname 'postgres');
CREATE FOREIGN TABLE standards (...)
  SERVER postgres_server OPTIONS (schema_name 'public', table_name 'standards');
```

## Migration Script

See `backend/src/scripts/consolidate-standards-tables.js` for automated migration.

## Rollback Plan

1. Keep EDCAT AI DB tables as backup (rename to `_backup`)
2. Test thoroughly before dropping tables
3. Keep migration logs

## Timeline

1. **Week 1**: Identify and document all differences
2. **Week 2**: Create migration script and test
3. **Week 3**: Run migration in staging
4. **Week 4**: Update code to use PostgreSQL only
5. **Week 5**: Deploy to production and monitor

