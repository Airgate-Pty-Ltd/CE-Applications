# Complete Database Table Architecture Summary

**Generated:** 2025-11-19  
**Purpose:** Comprehensive mapping of all database tables, their code connections, and identification of orphaned/missing tables

---

## Executive Summary

### PostgreSQL Database
- **Total Tables Defined:** 18 core tables
- **Tables with Code Connections:** 8 active tables
- **Orphaned Tables (No Code):** 10 tables
- **Missing Tables (Code but No Migration):** 0 critical

### EDCAT AI Database  
- **Total Tables Defined:** 30+ tables (including edcat schema)
- **Tables with Code Connections:** 20+ active tables
- **Orphaned Tables (No Code):** 10+ tables
- **Missing Tables (Code but No Migration):** 0 critical

---

## PostgreSQL Database Tables

### ✅ ACTIVE TABLES (With Code Connections)

#### 1. `public.standards`
- **Purpose:** Stores compliance standards, regulatory requirements, and customer requirements
- **Code Connections:**
  - `backend/src/routes/requirements.js` - SELECT, UPDATE (lines 64-81, 556-617, 720)
  - `backend/src/routes/upload.js` - INSERT, UPDATE (lines 147, 230)
  - `backend/src/routes/parse.js` - SELECT, UPDATE (lines 443, 830)
  - `backend/src/scripts/process-requirements-folder.js` - INSERT, UPDATE (lines 155, 252)
- **Status:** ✅ CRITICAL - Single source of truth for all standards

#### 2. `public.parsed_requirements`
- **Purpose:** Stores individual extracted requirements from standards
- **Code Connections:**
  - `backend/src/routes/requirements.js` - SELECT (lines 376, 472, 547)
  - `backend/src/routes/parse.js` - INSERT, UPDATE, SELECT (lines 482, 740, 764, 846)
  - `backend/src/routes/chat.js` - SELECT (lines 585, 611, 793, 916, 944, 1148)
  - `backend/src/services/veraConversationalEngine.js` - SELECT
- **Status:** ✅ CRITICAL - Stores all parsed requirements
- **⚠️ ISSUE:** Missing `clause_number` column (migration 007 should add it)

#### 3. `public.gap_analyses`
- **Purpose:** Stores gap analysis results
- **Code Connections:**
  - `backend/src/routes/gap.js` - INSERT, SELECT, UPDATE (lines 74, 331)
  - `backend/src/routes/admin.js` - SELECT
  - `backend/src/edcat/orchestrator.js` - INSERT (line 323)
- **Status:** ✅ ACTIVE

#### 4. `public.audit_trail`
- **Purpose:** Tracks EDCAT decisions for traceability
- **Code Connections:**
  - `backend/src/routes/gap.js` - INSERT (line 138)
  - `backend/src/edcat/auditTrail.js` - INSERT (line 49)
- **Status:** ✅ ACTIVE

#### 5. `public.tenants`
- **Purpose:** Client organizations
- **Code Connections:**
  - `backend/src/routes/predictions.js` - SELECT (line 11)
  - `backend/src/scripts/fix-all-schema-errors.js` - INSERT, UPDATE (lines 51, 81, 88)
- **Status:** ✅ ACTIVE

#### 6. `public.customer_procedures`
- **Purpose:** Extracted procedures from customer documents
- **Code Connections:**
  - Referenced in gap analysis and correlation engines
- **Status:** ✅ ACTIVE (limited usage)

#### 7. `public.customer_documents`
- **Purpose:** Document metadata and extracted text
- **Code Connections:**
  - Referenced in gap analysis workflows
- **Status:** ✅ ACTIVE (limited usage)

#### 8. `public.analysis_clarifications`
- **Purpose:** Q&A during gap analysis
- **Code Connections:**
  - Referenced in gap analysis workflows
- **Status:** ✅ ACTIVE (limited usage)

### ⚠️ ORPHANED TABLES (No Code Connections - Can Be Removed)

#### 1. `public.standard_files`
- **Status:** ⚠️ ORPHANED - Consolidated into `public.standards` (migration 006)
- **Action:** Should be dropped (migration 006 attempts this)
- **Why It Exists:** Legacy table from before consolidation

#### 2. `public.standard_files_content`
- **Status:** ⚠️ ORPHANED - Consolidated into `public.standards` (migration 006)
- **Action:** Should be dropped (migration 006 attempts this)
- **Why It Exists:** Legacy table from before consolidation

#### 3. `public.upload_files`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for future file upload tracking
- **Why It Exists:** Defined in migration 001 but never used

#### 4. `public.generated_reports`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for report generation feature
- **Why It Exists:** Defined in migration 001 but feature not implemented

#### 5. `public.user_feedback`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for feedback collection
- **Why It Exists:** Defined in migration 001 but feature not implemented

#### 6. `public.audit_logs_results`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for audit logging
- **Why It Exists:** Defined in migration 001 but feature not implemented

#### 7. `public.integration_logs`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for integration tracking
- **Why It Exists:** Defined in migration 001 but feature not implemented

#### 8. `public.users`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for user management
- **Why It Exists:** Defined in migration 001 but feature not implemented

#### 9. `public.document_content_for_learning`
- **Status:** ⚠️ ORPHANED - No code references found in main routes
- **Action:** May be used by Vera learning system (check EDCAT AI connections)
- **Why It Exists:** Migrated from EDCAT AI DB for Vera's learning

#### 10. `public.parsed_clauses`
- **Status:** ⚠️ ORPHANED - Limited usage, mostly in services
- **Code Connections:**
  - `backend/src/services/parseService.js` - INSERT (line 54)
  - `backend/src/services/clauseCorrelationEngine.js` - SELECT (line 26)
- **Action:** Review if this is duplicate of `parsed_requirements`
- **Why It Exists:** Alternative table structure for parsed clauses

---

## EDCAT AI Database Tables

### ✅ ACTIVE TABLES (With Code Connections)

#### 1. `edcat.ai_agents`
- **Purpose:** AI personality profiles (Vera, Console Assistant)
- **Code Connections:**
  - `backend/src/scripts/seed-edcat-agent.js` - INSERT
  - `backend/src/scripts/seed-edcat-personality.js` - References
- **Status:** ✅ ACTIVE

#### 2. `edcat.ai_sessions`
- **Purpose:** AI conversation sessions
- **Code Connections:**
  - Referenced in conversation middleware
- **Status:** ✅ ACTIVE

#### 3. `edcat.ai_messages`
- **Purpose:** Individual messages in conversations
- **Code Connections:**
  - Referenced in conversation middleware
- **Status:** ✅ ACTIVE

#### 4. `edcat.ai_memories`
- **Purpose:** What EDCAT learns and remembers
- **Code Connections:**
  - Referenced in AI memory services
- **Status:** ✅ ACTIVE

#### 5. `ai_standard`
- **Purpose:** Standard metadata for Vera's blueprint system
- **Code Connections:**
  - `backend/src/scripts/load-vera-blueprints.js` - INSERT (line 84)
  - `backend/src/scripts/seed-edcat-personality.js` - INSERT (line 308)
- **Status:** ✅ ACTIVE

#### 6. `ai_clause_blueprint`
- **Purpose:** Clause blueprints for standards
- **Code Connections:**
  - `backend/src/routes/chat.js` - SELECT (line 483)
  - `backend/src/scripts/seed-edcat-personality.js` - INSERT (line 331)
- **Status:** ✅ ACTIVE

#### 7. `extraction_history`
- **Purpose:** Track parsing decisions
- **Code Connections:**
  - Referenced in learning engine
- **Status:** ✅ ACTIVE

#### 8. `clause_correlation_matrix`
- **Purpose:** Requirement ↔ Procedure mapping
- **Code Connections:**
  - `backend/src/services/clauseCorrelationEngine.js` - INSERT (line 116)
- **Status:** ✅ ACTIVE

#### 9. `edcat_learning_events`
- **Purpose:** Learning opportunities
- **Code Connections:**
  - `backend/src/services/parseService.js` - INSERT (line 93)
- **Status:** ✅ ACTIVE

#### 10. `model_versions`
- **Purpose:** System improvements over time
- **Code Connections:**
  - `backend/src/edcat/orchestrator.js` - SELECT (line 365)
- **Status:** ✅ ACTIVE

#### 11. `regulatory_websites`
- **Purpose:** Where standards come from
- **Code Connections:**
  - `backend/src/routes/regulatory.js` - INSERT, SELECT (lines 56, 141)
- **Status:** ✅ ACTIVE

#### 12. `example_documents`
- **Purpose:** High-quality example documents for learning
- **Code Connections:**
  - `backend/src/scripts/process-requirements-folder.js` - INSERT (line 311)
- **Status:** ✅ ACTIVE

#### 13. `document_content_for_learning`
- **Purpose:** Extracted text for Vera's learning
- **Code Connections:**
  - `backend/src/scripts/process-requirements-folder.js` - INSERT (line 571)
- **Status:** ✅ ACTIVE

### ⚠️ ORPHANED TABLES (No Code Connections)

#### 1. `baseline_metrics`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for model version tracking

#### 2. `audit_trail_decisions`
- **Status:** ⚠️ ORPHANED - No code references found (may be duplicate of `audit_trail`)
- **Action:** Review if this is duplicate or needed

#### 3. `learned_patterns`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for learning system

#### 4. `sync_log`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for sync tracking

#### 5. `edcat.qa_pairs`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for Q&A learning

#### 6. `edcat.personality_learning_events`
- **Status:** ⚠️ ORPHANED - No code references found
- **Action:** Review if needed for personality learning

---

## Critical Issues Found

### 1. Missing `clause_number` Column in `parsed_requirements`
- **Error:** `column "clause_number" of relation "parsed_requirements" does not exist`
- **Location:** `backend/src/routes/parse.js` line 765
- **Fix:** Migration 007 should add this, but it's not being created
- **Action:** Ensure migration 007 runs or add column directly

### 2. Duplicate Table Structures
- `parsed_clauses` vs `parsed_requirements` - Both exist, unclear which is primary
- `audit_trail` (Postgres) vs `audit_trail_decisions` (EDCAT AI) - Similar purpose

### 3. Orphaned Tables from Consolidation
- `standard_files` and `standard_files_content` should be dropped (migration 006)
- These tables are still being created by migration 001

---

## Recommendations

### Immediate Actions

1. **Fix `clause_number` Column:**
   - Run migration 007 or add column directly
   - Verify `parsed_requirements` table has all required columns

2. **Remove Orphaned Tables:**
   - Drop `public.standard_files` (consolidated into `standards`)
   - Drop `public.standard_files_content` (consolidated into `standards`)
   - Review and drop other orphaned tables if not needed

3. **Clean Up Migration 001:**
   - Remove `CREATE TABLE` statements for `standard_files` and `standard_files_content`
   - These are now handled by migration 006

### Long-term Actions

1. **Document Table Purpose:**
   - Add comments to each table explaining its purpose
   - Document which routes/services use each table

2. **Consolidate Duplicate Tables:**
   - Decide on primary table for `parsed_clauses` vs `parsed_requirements`
   - Consolidate `audit_trail` tables if they serve the same purpose

3. **Implement Table Usage Tracking:**
   - Add logging to track which tables are actually used
   - Periodically audit and remove unused tables

---

## Table-to-Code Connection Map

### PostgreSQL Core Tables

| Table | Primary Routes | Primary Services | Operations |
|-------|---------------|-----------------|------------|
| `standards` | `requirements.js`, `upload.js`, `parse.js` | `process-requirements-folder.js` | SELECT, INSERT, UPDATE |
| `parsed_requirements` | `requirements.js`, `parse.js`, `chat.js` | `veraConversationalEngine.js` | SELECT, INSERT, UPDATE |
| `gap_analyses` | `gap.js`, `admin.js` | `orchestrator.js` | SELECT, INSERT, UPDATE |
| `audit_trail` | `gap.js` | `auditTrail.js` | INSERT |
| `tenants` | `predictions.js` | - | SELECT |
| `customer_procedures` | - | Correlation engines | SELECT |
| `customer_documents` | - | Gap analysis | SELECT |
| `analysis_clarifications` | - | Gap analysis | SELECT, INSERT |

### EDCAT AI Core Tables

| Table | Primary Routes | Primary Services | Operations |
|-------|---------------|-----------------|------------|
| `ai_standard` | - | `load-vera-blueprints.js`, `seed-edcat-personality.js` | INSERT, SELECT |
| `ai_clause_blueprint` | `chat.js` | `seed-edcat-personality.js` | INSERT, SELECT |
| `extraction_history` | - | Learning engine | INSERT |
| `clause_correlation_matrix` | - | `clauseCorrelationEngine.js` | INSERT, SELECT |
| `regulatory_websites` | `regulatory.js` | - | INSERT, SELECT |
| `example_documents` | - | `process-requirements-folder.js` | INSERT |
| `document_content_for_learning` | - | `process-requirements-folder.js` | INSERT |

---

## Next Steps

1. ✅ **Completed:** Extracted all tables from migrations
2. ✅ **Completed:** Searched codebase for table references
3. 🔄 **In Progress:** Mapping each table to code connections
4. ⏳ **Pending:** Generate removal plan for orphaned tables
5. ⏳ **Pending:** Create migration to remove orphaned tables
6. ⏳ **Pending:** Fix `clause_number` column issue

---

## Files Generated

- `COMPLETE_TABLE_ARCHITECTURE_AUDIT.md` - Detailed audit with all references
- `DATABASE_TABLE_ARCHITECTURE_SUMMARY.md` - This summary document

