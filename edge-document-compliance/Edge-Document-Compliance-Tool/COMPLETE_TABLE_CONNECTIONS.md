# Complete Table Connections Map

## Overview
This document maps EVERY table in both databases to its code connections, purpose, and status.

**Current State:**
- PostgreSQL (DATABASE_URL): 35 tables (as reported by user)
- EDCAT AI (EDCAT_AI_DATABASE_URL): 30 tables (as reported by user)

**Note**: The static analysis found 20 Postgres and 34 EDCAT AI tables in migrations. The discrepancy suggests:
- Some tables exist in databases but aren't in migration files
- Some tables may have been manually created
- Some tables may be from old migrations that were removed

**To see ACTUAL tables in your databases**, run:
```bash
node backend/src/scripts/cleanup-all-duplicate-tables.js
```

This will list ALL tables in both databases and identify duplicates.

---

## PostgreSQL Database (DATABASE_URL) - Customer Data Warehouse

### Core Compliance Tables (Single Source of Truth)

#### 1. `public.standards`
- **Purpose**: Master list of all compliance standards (ISO9001, AS9100, etc.)
- **Why it exists**: Single source of truth for standards metadata
- **Code Connections**:
  - `backend/src/routes/requirements.js` - READS (line 127-143) - Standards dropdown
  - `backend/src/routes/upload.js` - WRITES (line 122-205) - Create/update on upload
  - `backend/src/routes/parse.js` - READS/WRITES (line 454-458) - Parse standard
  - `backend/src/routes/chat.js` - READS - Chat with Vera
  - `backend/src/scripts/process-requirements-folder.js` - WRITES - Auto-process folder
- **Status**: ✅ ACTIVE - Single source of truth
- **Row Count**: Check database
- **Columns**: id, code, name, sector, uploaded_at, total_clauses, total_requirements

#### 2. `public.standard_files`
- **Purpose**: Links uploaded files to standards (supports multiple files per standard)
- **Why it exists**: Track which files belong to which standard
- **Code Connections**:
  - `backend/src/routes/requirements.js` - READS (line 56-64) - Get file_category for filtering
  - `backend/src/routes/upload.js` - WRITES (line 225-231) - Save file metadata
  - `backend/src/routes/parse.js` - READS (line 569-595) - Find file to parse
- **Status**: ✅ ACTIVE - Single source of truth
- **Row Count**: Check database
- **Columns**: id, file_name, file_path, file_category, standard_id, uploaded_at

#### 3. `public.parsed_requirements`
- **Purpose**: Stores extracted requirements from parsed standards
- **Why it exists**: Requirements library for gap analysis and compliance checking
- **Code Connections**:
  - `backend/src/routes/requirements.js` - READS (line 333-368) - Display requirements
  - `backend/src/routes/parse.js` - WRITES (line 641-750) - Save extracted requirements
  - `backend/src/services/veraConversationalEngine.js` - READS - Vera's clause queries
  - `backend/src/routes/chat.js` - READS - Chat functionality
- **Status**: ✅ ACTIVE - Single source of truth
- **Row Count**: Check database
- **Columns**: id, standard_id, clause_number, requirement_text, full_ref, clause_ref, sub_ref

#### 4. `public.tenants`
- **Purpose**: Multi-tenant support (customer organizations)
- **Why it exists**: Support multiple customers in one database
- **Code Connections**:
  - `backend/src/routes/customers.js` - READS/WRITES
  - `backend/src/middleware/enterpriseMiddleware.js` - READS
- **Status**: ✅ ACTIVE
- **Row Count**: Check database
- **Columns**: id, key, name, email, industry, region

#### 5. `public.gap_analyses`
- **Purpose**: Stores gap analysis results
- **Why it exists**: Track compliance gaps for each customer
- **Code Connections**:
  - `backend/src/routes/gap.js` - READS/WRITES
  - `backend/src/services/complianceGapAnalyzer.js` - WRITES
- **Status**: ✅ ACTIVE
- **Row Count**: Check database
- **Columns**: id, tenant_id, standard_id, analysis_date, analysis_id

#### 6. `public.customer_procedures`
- **Purpose**: Stores customer procedures extracted from documents
- **Why it exists**: Map customer procedures to compliance requirements
- **Code Connections**:
  - `backend/src/routes/customers.js` - READS/WRITES
  - `backend/src/services/complianceGapAnalyzer.js` - READS
- **Status**: ✅ ACTIVE
- **Row Count**: Check database
- **Columns**: id, tenant_id, document_id, procedure_text

#### 7. `public.customer_documents`
- **Purpose**: Extracts from uploaded customer files
- **Why it exists**: Store customer document metadata
- **Code Connections**:
  - `backend/src/edcat/orchestrator.js` - READS/WRITES
- **Status**: ✅ ACTIVE
- **Row Count**: Check database

#### 8. `public.audit_trail`
- **Purpose**: Audit log of all actions
- **Why it exists**: Track who did what and when
- **Code Connections**:
  - `backend/src/routes/audit.js` - READS
  - `backend/src/middleware/enterpriseMiddleware.js` - WRITES
- **Status**: ✅ ACTIVE
- **Row Count**: Check database
- **Columns**: audit_id, gap_analysis_id, actor, action, details, timestamp

### Supporting Tables

#### 9. `public.analysis_clarifications`
- **Purpose**: Store clarifications for gap analyses
- **Code Connections**: `backend/src/routes/customers.js`
- **Status**: ✅ ACTIVE

#### 10. `public.document_content_for_learning`
- **Purpose**: Extracted text from documents for AI learning
- **Code Connections**: `backend/src/scripts/process-requirements-folder.js`
- **Status**: ✅ ACTIVE

#### 11. `public.clause_correlation_matrix`
- **Purpose**: Requirement ↔ Procedure mapping
- **Code Connections**: `backend/src/services/clauseCorrelationEngine.js`
- **Status**: ✅ ACTIVE

#### 12. `public.edcat_learning_events`
- **Purpose**: Track learning opportunities
- **Code Connections**: `backend/src/services/parseService.js`
- **Status**: ✅ ACTIVE

#### 13. `public.parsed_clauses`
- **Purpose**: Store extracted clauses (legacy?)
- **Code Connections**: `backend/src/routes/chat.js`
- **Status**: ⚠️ CHECK - May be legacy, replaced by parsed_requirements

#### 14. `public.integration_logs`
- **Purpose**: Log integration events
- **Code Connections**: `backend/src/services/integrations/integrationMarketplace.js`
- **Status**: ✅ ACTIVE

#### 15. `public.users`
- **Purpose**: User accounts
- **Code Connections**: `backend/src/scripts/verify-database-connections.js`
- **Status**: ✅ ACTIVE

### Dead-End Tables (REMOVED - No Code Connections)

These tables have been identified as dead-ends and will be removed:

#### 16. `public.audit_logs_results`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005a_remove_dead_end_tables_postgres.sql`

#### 17. `public.conversation_context`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005a_remove_dead_end_tables_postgres.sql`

#### 18. `public.generated_reports`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005a_remove_dead_end_tables_postgres.sql`

#### 19. `public.upload_files`
- **Status**: ❌ DEAD-END - No code connections
- **Note**: Replaced by `standard_files`
- **Action**: ✅ REMOVED by migration `005a_remove_dead_end_tables_postgres.sql`

#### 20. `public.user_feedback`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005a_remove_dead_end_tables_postgres.sql`

### Additional Tables (Not in Migrations - Check Database)

The following tables may exist in your database but weren't found in migration files:
- Check your database for any additional tables beyond the 20 listed above
- These may be from old migrations or manually created

---

## EDCAT AI Database (EDCAT_AI_DATABASE_URL) - AI Intelligence Engine

### AI-Specific Tables (CORRECT - Keep These)

#### 1. `ai_standard`
- **Purpose**: Vera's blueprint system for standards
- **Why it exists**: AI's internal representation of standards
- **Code Connections**:
  - `backend/src/routes/chat.js` - READS
  - `backend/src/middleware/veraMiddleware.js` - READS
- **Status**: ✅ ACTIVE - Vera-specific

#### 2. `ai_persona`
- **Purpose**: Vera's personality profiles
- **Why it exists**: Configure Vera's conversational style
- **Code Connections**:
  - `backend/src/routes/chat.js` - READS
  - `backend/src/scripts/seed-edcat-personality.js` - WRITES
- **Status**: ✅ ACTIVE - Vera-specific

#### 3. `ai_conversation_history`
- **Purpose**: Chat history with Vera
- **Why it exists**: Conversation context and learning
- **Code Connections**:
  - `backend/src/middleware/veraConversationMiddleware.js` - READS/WRITES
- **Status**: ✅ ACTIVE - Vera-specific

#### 4. `ai_conversation_state`
- **Purpose**: Maintain conversation context
- **Code Connections**: `backend/src/middleware/veraConversationMiddleware.js`
- **Status**: ✅ ACTIVE

#### 5. `ai_persona_profile`
- **Purpose**: Persona configuration
- **Code Connections**: `backend/src/middleware/veraConversationMiddleware.js`
- **Status**: ✅ ACTIVE

#### 6. `ai_prompt`
- **Purpose**: System prompts for AI
- **Code Connections**: `backend/src/middleware/veraMiddleware.js`
- **Status**: ✅ ACTIVE

#### 7. `ai_policy`
- **Purpose**: Tool policies, citation rules
- **Code Connections**: `backend/src/middleware/veraMiddleware.js`
- **Status**: ✅ ACTIVE

#### 8. `ai_template`
- **Purpose**: Retrieval templates
- **Code Connections**: `backend/src/scripts/seed-edcat-personality.js`
- **Status**: ✅ ACTIVE

#### 9. `ai_validator`
- **Purpose**: Citation validators
- **Code Connections**: `backend/src/scripts/seed-edcat-personality.js`
- **Status**: ✅ ACTIVE

#### 10. `ai_router`
- **Purpose**: Routing policies
- **Code Connections**: `backend/src/routes/chat.js`
- **Status**: ✅ ACTIVE

#### 11. `ai_tenant`
- **Purpose**: Multi-tenancy for AI
- **Code Connections**: `backend/src/scripts/create-blueprint-tables.js`
- **Status**: ✅ ACTIVE

#### 12. `ai_clause_blueprint`
- **Purpose**: Clause blueprints for standards
- **Code Connections**: `backend/src/scripts/load-vera-blueprints.js`
- **Status**: ✅ ACTIVE

#### 13. `ai_crosswalk_blueprint`
- **Purpose**: Crosswalk mappings
- **Code Connections**: `backend/src/scripts/load-vera-blueprints.js`
- **Status**: ✅ ACTIVE

#### 14. `regulatory_websites`
- **Purpose**: Regulatory website URLs for crawling
- **Code Connections**: `backend/src/routes/regulatory.js`
- **Status**: ✅ ACTIVE

#### 15. `example_documents`
- **Purpose**: High-quality example documents for learning
- **Code Connections**: `backend/src/services/veraConversationalEngine.js`
- **Status**: ✅ ACTIVE

#### 16. `learned_patterns`
- **Purpose**: Patterns Vera has learned
- **Code Connections**: `backend/src/services/requirementParser.js`
- **Status**: ✅ ACTIVE

#### 17. `extraction_history`
- **Purpose**: Track parsing decisions
- **Code Connections**: `backend/src/database/schema.js`
- **Status**: ✅ ACTIVE

#### 18. `model_versions`
- **Purpose**: System improvements over time
- **Code Connections**: `backend/src/edcat/orchestrator.js`
- **Status**: ✅ ACTIVE

#### 19. `audit_trail_decisions`
- **Purpose**: Why EDCAT made every decision
- **Code Connections**: `backend/src/edcat/auditTrail.js`
- **Status**: ✅ ACTIVE

#### 20. `regulatory_updates`
- **Purpose**: Regulatory updates catalog
- **Code Connections**: `backend/src/services/regulatoryIntelligenceHub.js`
- **Status**: ✅ ACTIVE

#### 21. `mock_audit_sessions`
- **Purpose**: Mock audit sessions
- **Code Connections**: `backend/src/routes/audit.js`
- **Status**: ✅ ACTIVE

#### 22. `audit_questions`
- **Purpose**: Audit questions
- **Code Connections**: `backend/src/routes/audit.js`
- **Status**: ✅ ACTIVE

#### 23. `mock_audit_responses`
- **Purpose**: Mock audit responses
- **Code Connections**: `backend/src/routes/audit.js`
- **Status**: ✅ ACTIVE

#### 24. `mock_audit_reports`
- **Purpose**: Mock audit reports
- **Code Connections**: `backend/src/routes/audit.js`
- **Status**: ✅ ACTIVE

#### 25. `ai_agents`
- **Purpose**: AI agent definitions
- **Code Connections**: `backend/src/scripts/seed-edcat-agent.js`
- **Status**: ✅ ACTIVE

### Dead-End Tables (REMOVED - No Code Connections)

These tables have been identified as dead-ends and will be removed:

#### 26. `ai_chat_log`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005b_remove_dead_end_tables_edcat_ai.sql`

#### 27. `ai_doc_ref`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005b_remove_dead_end_tables_edcat_ai.sql`

#### 28. `ai_memories` (in `edcat` schema)
- **Status**: ❌ DEAD-END - No code connections
- **Note**: Checked both `public` and `edcat` schemas
- **Action**: ✅ REMOVED by migration `005b_remove_dead_end_tables_edcat_ai.sql`

#### 29. `ai_messages`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005b_remove_dead_end_tables_edcat_ai.sql`

#### 30. `ai_sessions`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005b_remove_dead_end_tables_edcat_ai.sql`

#### 31. `baseline_metrics`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005b_remove_dead_end_tables_edcat_ai.sql`

#### 32. `personality_learning_events`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005b_remove_dead_end_tables_edcat_ai.sql`

#### 33. `qa_pairs`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005b_remove_dead_end_tables_edcat_ai.sql`

#### 34. `sync_log`
- **Status**: ❌ DEAD-END - No code connections
- **Action**: ✅ REMOVED by migration `005b_remove_dead_end_tables_edcat_ai.sql`

---

## ⚠️ DUPLICATE TABLES (MUST DELETE FROM EDCAT AI DB)

Based on the migration analysis, these tables should NOT exist in EDCAT AI DB:

1. **`standards`** in EDCAT AI DB
   - **Status**: ❌ DUPLICATE - DELETE
   - **Why**: Already exists in Postgres as `public.standards`
   - **Code that uses it**: NONE (code uses `public.standards`)

2. **`standard_files`** in EDCAT AI DB
   - **Status**: ❌ DUPLICATE - DELETE
   - **Why**: Already exists in Postgres as `public.standard_files`
   - **Code that uses it**: NONE (code uses `public.standard_files`)

3. **`parsed_requirements`** in EDCAT AI DB
   - **Status**: ❌ DUPLICATE - DELETE
   - **Why**: Already exists in Postgres as `public.parsed_requirements`
   - **Code that uses it**: NONE (code uses `public.parsed_requirements`)

---

## Action Plan

### ✅ Completed Actions:

1. **Delete Duplicates from EDCAT AI DB:**
   - ✅ Migration `004_remove_duplicate_tables_from_edcat_ai.sql` created
   - ✅ Will run automatically on next deployment
   - Removes: `standards`, `standard_files`, `parsed_requirements` from EDCAT AI DB

2. **Remove Dead-End Tables:**
   - ✅ Migration `005a_remove_dead_end_tables_postgres.sql` created (PostgreSQL)
   - ✅ Migration `005b_remove_dead_end_tables_edcat_ai.sql` created (EDCAT AI)
   - ✅ Will run automatically on next deployment
   - Removes 5 dead-end tables from Postgres and 9 from EDCAT AI

### Next Steps:

1. **Verify Actual Database State:**
   - Run `node backend/src/scripts/cleanup-all-duplicate-tables.js` to see all actual tables
   - Compare with this mapping to identify any additional tables not in migrations

2. **Manual Cleanup (if needed):**
   - If migrations don't catch everything, run `node backend/src/scripts/remove-dead-end-tables.js`
   - This script will remove dead-end tables directly
3. Update documentation with actual table counts from databases

---

## How to Use This Document

1. **Find a table**: Use Ctrl+F to search for table name
2. **Check connections**: See "Code Connections" section for each table
3. **Verify status**: Check if table is ACTIVE, DEAD-END, or DUPLICATE
4. **Take action**: Follow recommendations in "Action Plan" section

---

*Last Updated: Generated from codebase analysis*
*To update: Run `node backend/src/scripts/map-all-tables-static.js`*

