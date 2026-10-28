# Database Architecture Review

**Date:** 2025-11-19  
**Status:** Reviewing Connection Strings and Table Distribution

---

## 📊 Current State

### PostgreSQL Database (Customer Data DB)
**Environment Variable:** `DATABASE_URL`  
**Current Tables:** 13 tables

**Active Tables:**
1. ✅ `analysis_clarifications` - Q&A during analysis
2. ✅ `audit_trail` - Decision tracking
3. ✅ `customer_documents` - Customer documents
4. ✅ `customer_procedures` - Customer procedures
5. ✅ `document_content_for_learning` - Vera learning data
6. ✅ `extraction_history` - Parsing history
7. ✅ `gap_analyses` - Gap analysis results
8. ✅ `model_versions` - Model version tracking
9. ✅ `parsed_requirements` - All parsed requirements ⚠️
10. ✅ `regulatory_websites` - Regulatory sources ⚠️
11. ✅ `schema_migrations` - Migration tracking (system)
12. ✅ `standards` - Single source of truth ⚠️
13. ✅ `tenants` - Client organizations ⚠️

### EDCAT AI Database (Intelligence Engine)
**Environment Variable:** `EDCAT_AI_DATABASE_URL` (falls back to `DATABASE_URL` if not set)  
**Current Tables:** 24 tables

**Active Tables:**
1. ✅ `ai_clause_blueprint` - Clause blueprints
2. ✅ `ai_conversation_history` - Conversation history
3. ✅ `ai_conversation_state` - Conversation state
4. ✅ `ai_crosswalk_blueprint` - Crosswalk blueprints
5. ✅ `ai_persona` - AI personas
6. ✅ `ai_persona_profile` - AI persona profiles
7. ✅ `ai_policy` - AI policies
8. ✅ `ai_prompt` - AI prompts
9. ✅ `ai_router` - AI routing
10. ✅ `ai_standard` - Standard metadata for Vera ⚠️
11. ✅ `ai_template` - AI templates
12. ✅ `ai_tenant` - AI tenant config
13. ✅ `ai_validator` - AI validators
14. ✅ `audit_trail_decisions` - Decision tracking
15. ✅ `clause_correlation_matrix` - Requirement mapping
16. ✅ `document_content_for_learning` - Vera learning data ⚠️
17. ✅ `edcat_learning_events` - Learning opportunities
18. ✅ `example_documents` - Example documents
19. ⚠️ `extraction_history` - **DUPLICATE** (also in Postgres)
20. ⚠️ `model_versions` - **DUPLICATE** (also in Postgres)
21. ⚠️ `parsed_clauses` - **DUPLICATE** (Postgres has `parsed_requirements`)
22. ⚠️ `regulatory_websites` - **DUPLICATE** (also in Postgres)
23. ⚠️ `standards` - **DUPLICATE** (Postgres is source of truth)
24. ⚠️ `tenants` - **DUPLICATE** (also in Postgres)

---

## ⚠️ Issues Identified

### Duplicate Tables
These tables exist in **BOTH** databases but should only exist in PostgreSQL:

1. **`standards`** - Should ONLY be in PostgreSQL (source of truth)
2. **`tenants`** - Should ONLY be in PostgreSQL (customer data)
3. **`regulatory_websites`** - Should ONLY be in PostgreSQL
4. **`extraction_history`** - Should ONLY be in PostgreSQL
5. **`model_versions`** - Should ONLY be in PostgreSQL
6. **`document_content_for_learning`** - Should ONLY be in PostgreSQL
7. **`parsed_clauses`** vs `parsed_requirements` - These are duplicates, should consolidate

---

## 🔍 Connection String Verification

### PostgreSQL (Customer Data DB)
- **Environment Variable:** `DATABASE_URL`
- **Connection Function:** `queryPostgres()` from `backend/src/config/databases.js`
- **Pool:** `postgresPool`
- **Used By:**
  - `routes/requirements.js` - Standards CRUD
  - `routes/upload.js` - File uploads
  - `routes/parse.js` - Document parsing
  - `routes/gap.js` - Gap analysis
  - **ALL customer data operations**

### EDCAT AI DB
- **Environment Variable:** `EDCAT_AI_DATABASE_URL` (falls back to `DATABASE_URL`)
- **Connection Function:** `queryEdcatAI()` from `backend/src/config/databases.js`
- **Pool:** `edcatPool`
- **Used By:**
  - `services/veraConversationalEngine.js` - Vera AI
  - `services/clauseCorrelationEngine.js` - Correlation
  - `services/edcatPersonality.js` - AI personality
  - **ALL AI/learning operations**

---

## 🎯 Expected Architecture

### PostgreSQL (Customer Data DB) - SINGLE SOURCE OF TRUTH
**Should have:**
- ✅ `standards` - All compliance standards
- ✅ `parsed_requirements` - All parsed requirements
- ✅ `tenants` - Client organizations
- ✅ `gap_analyses` - Analysis results
- ✅ `audit_trail` - Decision tracking
- ✅ `customer_documents` - Customer documents
- ✅ `customer_procedures` - Customer procedures
- ✅ `analysis_clarifications` - Q&A
- ✅ `regulatory_websites` - Regulatory sources
- ✅ `document_content_for_learning` - Learning data
- ✅ `extraction_history` - Parsing history
- ✅ `model_versions` - Model versions
- ✅ `parsed_clauses` - Should this exist? (duplicate of parsed_requirements?)

**Should NOT have:**
- ✅ No AI-specific tables (those belong in EDCAT AI DB)

### EDCAT AI DB - AI/LEARNING ONLY
**Should have:**
- ✅ `ai_*` tables - All AI personality/system tables
- ✅ `clause_correlation_matrix` - Requirement mapping
- ✅ `edcat_learning_events` - Learning opportunities
- ✅ `example_documents` - Example documents
- ✅ `audit_trail_decisions` - Decision tracking

**Should NOT have:**
- ❌ `standards` - DUPLICATE (Postgres is source of truth)
- ❌ `tenants` - DUPLICATE (Postgres has customer data)
- ❌ `regulatory_websites` - DUPLICATE (Postgres has it)
- ❌ `extraction_history` - DUPLICATE (Postgres has it)
- ❌ `model_versions` - DUPLICATE (Postgres has it)
- ❌ `document_content_for_learning` - DUPLICATE (Postgres has it)
- ❌ `parsed_clauses` - DUPLICATE (Postgres has parsed_requirements)

---

## ✅ Verification Checklist

### Connection Strings
- [ ] Verify `DATABASE_URL` points to PostgreSQL (Customer Data DB)
- [ ] Verify `EDCAT_AI_DATABASE_URL` points to EDCAT AI DB (or is same as DATABASE_URL)
- [ ] Check if both databases are actually the same database (common in Railway)

### Table Distribution
- [ ] Remove duplicate tables from EDCAT AI DB:
  - [ ] `standards`
  - [ ] `tenants`
  - [ ] `regulatory_websites`
  - [ ] `extraction_history`
  - [ ] `model_versions`
  - [ ] `document_content_for_learning`
  - [ ] `parsed_clauses` (if `parsed_requirements` is the correct one)

### Code Verification
- [ ] Verify all code uses `queryPostgres()` for customer data
- [ ] Verify all code uses `queryEdcatAI()` for AI operations
- [ ] Check if any code is querying duplicate tables

---

## 🔧 Recommendations

1. **Remove duplicate tables from EDCAT AI DB** - These should only exist in PostgreSQL
2. **Verify connection strings** - Are both databases actually separate, or the same?
3. **Consolidate `parsed_clauses` vs `parsed_requirements`** - Which one should be used?
4. **Update migrations** - Remove table creation for duplicates in EDCAT AI DB

---

**Next Steps:**
1. Check Railway environment variables to see if `EDCAT_AI_DATABASE_URL` is set or if it falls back to `DATABASE_URL`
2. Remove duplicate tables from EDCAT AI DB
3. Verify all code paths use correct database

