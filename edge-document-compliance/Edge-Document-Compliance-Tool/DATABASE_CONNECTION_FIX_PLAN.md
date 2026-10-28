# Database Connection Fix Plan

## Executive Summary

**Total Issues Found**: 39
- **Critical**: 12 incorrect database usage issues
- **Warning**: 12 potential cross-database queries (may be intentional)
- **Technical Debt**: 27 legacy connection code files

## Architecture Overview

### Two-Database System

1. **PostgreSQL Customer Data DB** (`DATABASE_URL`)
   - **Schema**: `public.*`
   - **Function**: `queryPostgres()`
   - **Purpose**: Customer documents, procedures, gap analyses, standards metadata

2. **EDCAT AI Intelligence DB** (`EDCAT_AI_DATABASE_URL`)
   - **Schema**: `edcat.*`
   - **Function**: `queryEdcatAI()`
   - **Purpose**: Vera AI operations, learning, conversation history, terminology

### Connection File
- **Primary**: `backend/src/config/databases.js`
  - Exports: `queryPostgres`, `queryEdcatAI`, `postgresPool`, `edcatPool`
  - Handles connection string validation and SSL configuration

---

## Issue Categories

### 1. CRITICAL: Incorrect Database Usage (12 issues)

**Problem**: Using wrong database function for table access

#### Files Requiring Immediate Fix:

1. **`src/routes/parse.js`** (2 issues)
   - **Issue**: `queryEdcatAI` used with `public.standards` table
   - **Impact**: May fail if EDCAT_AI_DATABASE_URL points to different database
   - **Fix**: Change to `queryPostgres` for `public.*` tables

2. **`src/scripts/consolidate-standards-tables.js`** (3 issues)
   - **Issue**: `queryEdcatAI` used with `public.standards`, `public.standard_files`, `public.parsed_requirements`
   - **Impact**: Script may not work correctly
   - **Fix**: Change all to `queryPostgres`

3. **`src/scripts/remove-duplicate-tables.js`** (1 issue)
   - **Issue**: `queryEdcatAI` used with `public.*` tables
   - **Fix**: Change to `queryPostgres`

4. **`src/scripts/remove-edcat-ai-duplicates.js`** (2 issues)
   - **Issue**: `queryEdcatAI` used with `public.*` tables
   - **Fix**: Change to `queryPostgres`

5. **`src/scripts/verify-database-connection-and-data.js`** (1 issue)
   - **Issue**: `queryEdcatAI` used with `public.standards`
   - **Fix**: Change to `queryPostgres`

6. **`src/services/vera/VeraParserSupervisorService.js`** (1 issue)
   - **Issue**: `queryEdcatAI` used with `public.standard_files`
   - **Fix**: Change to `queryPostgres`

7. **`src/services/vera/VeraVectorEngine.js`** (1 issue)
   - **Issue**: `queryEdcatAI` used with `public.compliance_requirements`
   - **Fix**: Change to `queryPostgres`

8. **`vera/seeds/contextualEnrichmentSeeds.ts`** (1 issue)
   - **Issue**: Complex query mixing `edcat.*` and `public.*` tables
   - **Fix**: Split into separate queries or verify cross-database join is intentional

---

### 2. WARNING: Potential Cross-Database Queries (12 issues)

**Note**: These may be intentional if both databases are on the same PostgreSQL instance (which they are in Railway). However, they should be documented or refactored for clarity.

**Files**:
- Same as above - marked as "warning" severity

**Recommendation**: 
- If databases are on same instance: Document the intentional cross-database access
- If databases are separate: Fix immediately (will fail)

---

### 3. TECHNICAL DEBT: Legacy Connection Code (27 files)

**Problem**: Files creating their own database pools instead of using centralized `databases.js`

#### Files to Refactor:

**High Priority** (Active Services):
1. `src/services/dbIntrospectService.js` - Used by admin routes
2. `src/database/db.js` - May be used by legacy routes
3. `src/database/migrate.js` - Migration runner

**Medium Priority** (Scripts):
4. `scripts/migrate.js`
5. `scripts/apply-schema.js`
6. `src/scripts/apply-fixed-schema.js`
7. `src/scripts/create-all-tables.js`
8. `src/scripts/create-blueprint-tables.js`
9. `src/scripts/create-standards-table-directly.js`
10. `src/scripts/run-migrations.js`
11. `src/scripts/run-edcat-migration-only.js`

**Low Priority** (Diagnostic/One-time scripts):
12-27. Various diagnostic and cleanup scripts

---

## Fix Plan

### Phase 1: Critical Fixes (Immediate - 2 hours)

**Goal**: Fix all incorrect database usage

1. **Fix `src/routes/parse.js`**
   ```javascript
   // BEFORE:
   const result = await queryEdcatAI(`SELECT ... FROM public.standards`);
   
   // AFTER:
   const result = await queryPostgres(`SELECT ... FROM public.standards`);
   ```

2. **Fix `src/services/vera/VeraParserSupervisorService.js`**
   ```javascript
   // BEFORE:
   const files = await queryEdcatAI(`SELECT ... FROM public.standard_files`);
   
   // AFTER:
   const files = await queryPostgres(`SELECT ... FROM public.standard_files`);
   ```

3. **Fix `src/services/vera/VeraVectorEngine.js`**
   ```javascript
   // BEFORE:
   const reqs = await queryEdcatAI(`SELECT ... FROM public.compliance_requirements`);
   
   // AFTER:
   const reqs = await queryPostgres(`SELECT ... FROM public.compliance_requirements`);
   ```

4. **Fix all scripts in `src/scripts/`**
   - `consolidate-standards-tables.js`
   - `remove-duplicate-tables.js`
   - `remove-edcat-ai-duplicates.js`
   - `verify-database-connection-and-data.js`

**Testing**: Run each fixed file/route and verify database access works

---

### Phase 2: Legacy Code Refactoring (4 hours)

**Goal**: Consolidate all database connections to use `databases.js`

1. **Refactor Active Services** (High Priority)
   - `src/services/dbIntrospectService.js`
   - `src/database/db.js`
   - `src/database/migrate.js`

2. **Refactor Migration Scripts** (Medium Priority)
   - Update all migration scripts to use `queryPostgres`/`queryEdcatAI`

3. **Document Legacy Scripts** (Low Priority)
   - Add comments to diagnostic scripts explaining why they use legacy code
   - Or refactor if they're still actively used

**Pattern for Refactoring**:
```javascript
// BEFORE:
import pg from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ...
});

// AFTER:
import { queryPostgres, queryEdcatAI } from '../config/databases.js';
// Use queryPostgres() or queryEdcatAI() directly
```

---

### Phase 3: Validation & Testing (2 hours)

1. **Create Connection Test Script**
   ```javascript
   // Test both databases are accessible
   await queryPostgres('SELECT NOW()');
   await queryEdcatAI('SELECT NOW()');
   ```

2. **Verify Table Access**
   - Test all critical tables are accessible
   - Verify schema matches expectations

3. **Integration Tests**
   - Test routes that use database
   - Test Vera services that query databases
   - Test migration scripts

---

### Phase 4: Documentation (1 hour)

1. **Update Architecture Docs**
   - Document which tables are in which database
   - Document when cross-database queries are allowed
   - Add connection troubleshooting guide

2. **Add Code Comments**
   - Comment any intentional cross-database queries
   - Document why legacy code exists (if kept)

---

## Implementation Priority

### 🔴 CRITICAL (Do First)
1. Fix `src/routes/parse.js` - Used by production routes
2. Fix `src/services/vera/VeraParserSupervisorService.js` - Used by Vera
3. Fix `src/services/vera/VeraVectorEngine.js` - Used by Vera

### 🟡 HIGH (Do Next)
4. Fix all scripts in `src/scripts/` that use wrong database
5. Refactor `src/services/dbIntrospectService.js`
6. Refactor `src/database/db.js`

### 🟢 MEDIUM (Do When Time Permits)
7. Refactor migration scripts
8. Refactor diagnostic scripts
9. Add comprehensive tests

### ⚪ LOW (Nice to Have)
10. Document all cross-database queries
11. Add connection health monitoring
12. Create connection pool monitoring dashboard

---

## Expected Outcomes

After fixes:
- ✅ All `public.*` tables accessed via `queryPostgres`
- ✅ All `edcat.*` tables accessed via `queryEdcatAI`
- ✅ No legacy connection code in active services
- ✅ Clear documentation of database architecture
- ✅ Reduced connection errors and improved reliability

---

## Risk Assessment

**Low Risk**:
- Fixing incorrect database usage (straightforward find/replace)
- Refactoring scripts (not used in production)

**Medium Risk**:
- Refactoring active services (requires testing)
- Changing migration scripts (may affect deployments)

**Mitigation**:
- Test all changes in development first
- Keep backups of original files
- Deploy fixes incrementally
- Monitor error logs after deployment

---

## Success Metrics

- Zero "relation does not exist" errors
- Zero "connection pool not initialized" errors
- All database queries use correct connection function
- All active services use centralized `databases.js`
- Connection health checks pass 100%

---

## Next Steps

1. ✅ Audit complete (this document)
2. ⏳ Review and approve fix plan
3. ⏳ Begin Phase 1 fixes
4. ⏳ Test fixes
5. ⏳ Deploy fixes
6. ⏳ Monitor for errors
7. ⏳ Continue with Phase 2-4

