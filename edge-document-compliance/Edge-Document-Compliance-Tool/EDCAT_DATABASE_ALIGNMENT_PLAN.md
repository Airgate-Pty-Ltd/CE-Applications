# EDCAT Database Alignment Plan

**Status:** 🚧 In Progress  
**Goal:** Align Vera's database and intelligence layers with documented architecture

---

## ✅ Completed

### Phase 0: Orientation
- ✅ Located documentation files (`DATABASE_CONNECTION_AUDIT.md`, `VERA_ARCHITECTURE_AND_CAPABILITIES.md`)
- ✅ Verified database configuration (`backend/src/config/databases.js`)
- ✅ Verified migration runner (`backend/src/database/twoDatabaseMigrations.js`)
- ✅ Confirmed migrations run on startup (`backend/index.js`)

### Phase 1: Migration Alignment
- ✅ Created migration 072: `072_ensure_all_edcat_tables.sql`
  - Ensures all required edcat.* tables exist
  - Adds missing columns to existing tables
  - Idempotent and safe to run multiple times
- ✅ Wired migration 072 into `twoDatabaseMigrations.js`
- ✅ Created inventory script: `backend/src/scripts/inventory-edcat-tables.js`

---

## 🚧 In Progress

### Phase 2: Verify Migration Execution
- ⏳ Enhanced logging in migration runner
- ⏳ Verify migrations run correctly on Railway

### Phase 3: Consolidated Ingestion
- ⏳ Create `npm run edcat:init` command
- ⏳ Consolidate all seed scripts into single entry point

### Phase 4: Enhanced Health Checks
- ⏳ Enhance `VeraSelfTestService` to check table existence and row counts
- ⏳ Update `/api/vera/health` endpoint

---

## 📋 Next Steps

1. **Test Migration 072** - Run on Railway and verify all tables are created
2. **Create Consolidated Ingestion Script** - Single command to populate all EDCAT tables
3. **Enhance Health Checks** - Make table status visible via API
4. **Documentation** - Update architecture docs with verification steps

---

## Files Created/Modified

- ✅ `backend/migrations/072_ensure_all_edcat_tables.sql` - Comprehensive table creation
- ✅ `backend/src/database/twoDatabaseMigrations.js` - Added migration 072
- ✅ `backend/src/scripts/inventory-edcat-tables.js` - Table inventory script
- ⏳ `backend/src/scripts/edcat-init.js` - Consolidated ingestion (TODO)
- ⏳ Enhanced health check service (TODO)

---

**Last Updated:** December 2024

