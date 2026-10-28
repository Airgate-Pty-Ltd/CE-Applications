# Root Cause: Duplicate Standards Tables

## Problem Identified

**Both databases have duplicate tables with identical data:**
- PostgreSQL: `standards` (39 rows), `standard_files` (114 rows), `parsed_requirements` (17 rows)
- EDCAT AI DB: `standards` (39 rows), `standard_files` (114 rows), `parsed_requirements` (17 rows)

**Current Code Behavior:**
- `requirements.js` → Reads `standards` from EDCAT AI DB
- `upload.js` → Creates `standards` in EDCAT AI DB
- `parse.js` → Reads/writes `standards` and `parsed_requirements` from EDCAT AI DB
- `requirements.js` → Reads `standard_files` from PostgreSQL (Customer Data DB)

**This causes:**
1. Data duplication (same data in 2 places)
2. Sync issues (data can get out of sync)
3. Confusion about which database is source of truth
4. Maintenance burden (updates must happen in 2 places)

## Solution: PostgreSQL as Single Source of Truth

**PostgreSQL (Customer Data DB) = SINGLE SOURCE OF TRUTH**
- All Compliance Library uploads → PostgreSQL only
- All standards data → PostgreSQL only
- All file metadata → PostgreSQL only
- All parsed requirements → PostgreSQL only

**EDCAT AI DB = READ-ONLY FOR VERA (or removed)**
- Vera can read from PostgreSQL directly
- OR: Keep EDCAT AI tables as read-only views/backups
- No writes to EDCAT AI DB for standards data

## Files That Need Updates

1. **backend/src/routes/requirements.js**
   - Change `queryEdcatAI` for `standards` → `queryPostgres`
   - Change `queryEdcatAI` for `parsed_requirements` → `queryPostgres`
   - Keep `queryPostgres` for `standard_files` (already correct)

2. **backend/src/routes/upload.js**
   - Change `queryEdcatAI` for `standards` → `queryPostgres`
   - Already uses `queryPostgres` for `standard_files` (correct)

3. **backend/src/routes/parse.js**
   - Change `queryEdcatAI` for `standards` → `queryPostgres`
   - Change `queryEdcatAI` for `parsed_requirements` → `queryPostgres`
   - Change `queryPostgres` for `standard_files_content` → Keep as is (correct)

4. **backend/src/scripts/process-requirements-folder.js**
   - Change `queryEdcatAI` for `standards` → `queryPostgres`
   - Already uses `queryPostgres` for `standard_files` (correct)

## Migration Steps

1. ✅ Verify data is identical (DONE - consolidation script confirms)
2. ⏳ Update code to use PostgreSQL only
3. ⏳ Test thoroughly
4. ⏳ Deploy to production
5. ⏳ Monitor for issues
6. ⏳ (Optional) Drop/rename duplicate tables in EDCAT AI DB

## Benefits

- ✅ Single source of truth (no confusion)
- ✅ No sync issues (data in one place)
- ✅ Simpler architecture
- ✅ Easier maintenance
- ✅ Vera can read from PostgreSQL directly

