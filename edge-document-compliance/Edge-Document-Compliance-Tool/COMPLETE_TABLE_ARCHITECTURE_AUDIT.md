# Complete Table Architecture Audit

Generated: 2025-11-19T22:17:02.404Z

## Summary

- **PostgreSQL Tables**: 49 defined, 4 referenced, 45 orphaned
- **EDCAT AI Tables**: 63 defined, 41 referenced, 22 orphaned

## PostgreSQL Database

### All Defined Tables

- `ai_agents`  ⚠️ ORPHANED
- `ai_chat_log`  ⚠️ ORPHANED
- `ai_clause_blueprint`  ⚠️ ORPHANED
- `ai_conversation_history`  ⚠️ ORPHANED
- `ai_conversation_state`  ⚠️ ORPHANED
- `ai_crosswalk_blueprint`  ⚠️ ORPHANED
- `ai_doc_ref`  ⚠️ ORPHANED
- `ai_memories`  ⚠️ ORPHANED
- `ai_messages`  ⚠️ ORPHANED
- `ai_persona`  ⚠️ ORPHANED
- `ai_persona_profile`  ⚠️ ORPHANED
- `ai_policy`  ⚠️ ORPHANED
- `ai_prompt`  ⚠️ ORPHANED
- `ai_router`  ⚠️ ORPHANED
- `ai_sessions`  ⚠️ ORPHANED
- `ai_standard`  ⚠️ ORPHANED
- `ai_template`  ⚠️ ORPHANED
- `ai_tenant`  ⚠️ ORPHANED
- `ai_validator`  ⚠️ ORPHANED
- `analysis_clarifications` ✅ 
- `audit_logs_results`  ⚠️ ORPHANED
- `audit_trail` ✅ 
- `audit_trail_decisions`  ⚠️ ORPHANED
- `baseline_metrics`  ⚠️ ORPHANED
- `clause_correlation_matrix`  ⚠️ ORPHANED
- `conversation_context`  ⚠️ ORPHANED
- `customer_documents`  ⚠️ ORPHANED
- `customer_procedures`  ⚠️ ORPHANED
- `document_content_for_learning`  ⚠️ ORPHANED
- `edcat_learning_events`  ⚠️ ORPHANED
- `example_documents`  ⚠️ ORPHANED
- `extraction_history`  ⚠️ ORPHANED
- `gap_analyses` ✅ 
- `generated_reports`  ⚠️ ORPHANED
- `integration_logs`  ⚠️ ORPHANED
- `learned_patterns`  ⚠️ ORPHANED
- `model_versions`  ⚠️ ORPHANED
- `parsed_clauses`  ⚠️ ORPHANED
- `parsed_requirements` ✅ 
- `personality_learning_events`  ⚠️ ORPHANED
- `qa_pairs`  ⚠️ ORPHANED
- `regulatory_websites`  ⚠️ ORPHANED
- `standard_files`  ⚠️ ORPHANED
- `standards`  ⚠️ ORPHANED
- `sync_log`  ⚠️ ORPHANED
- `tenants`  ⚠️ ORPHANED
- `upload_files`  ⚠️ ORPHANED
- `user_feedback`  ⚠️ ORPHANED
- `users`  ⚠️ ORPHANED

### Table Connections

#### `a`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 16

**Files using this table:**

- `analyzer.js`:
  - Line 10: `UNKNOWN` - * Parse requirements from a standard document
- `learningEngine.js`:
  - Line 23: `UNKNOWN` - * Record feedback from a clarification response
- `src/edcat/parser/clauseParser.js`:
  - Line 13: `UNKNOWN` - * Extract requirements with clauses from a standard
- `src/routes/customers.js`:
  - Line 232: `UNKNOWN` - * Delete a customer (soft delete - sets status to 'deleted')
- `src/routes/documents.js`:
  - Line 14: `UNKNOWN` - * Generate a document draft from a clause
- `src/routes/i18n.js`:
  - Line 62: `UNKNOWN` - * Set/update a translation
- `src/routes/persona.js`:
  - Line 60: `UNKNOWN` - "Welcome back. Select a standard and target documents to begin."
- `src/routes/regulatory.js`:
  - Line 141: `UNKNOWN` - * Delete a regulatory website
- `src/routes/requirements.js`:
  - Line 585: `UNKNOWN` - * Delete a standard and its associated requirements and files
  - Line 660: `UNKNOWN` - * Update a standard (e.g., replace with newer version, update metadata)
- `src/routes/users.js`:
  - Line 225: `UNKNOWN` - * Delete a user (soft delete by setting is_active = false)
- `src/services/clauseExtractor.js`:
  - Line 180: `UNKNOWN` - * Extract clause number from a line, validating against structure
- `src/services/embeddingService.js`:
  - Line 21: `UNKNOWN` - * Build vocabulary from a collection of texts
- `src/services/noteFilter.js`:
  - Line 8: `UNKNOWN` - * Strip NOTE paragraphs from a block
- `src/services/requirementsFormatter.js`:
  - Line 8: `UNKNOWN` - * Format requirements into a structured hierarchical list
- `src/services/textExtractor.js`:
  - Line 14: `UNKNOWN` - * Extract text from a file

#### `account`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/requirementParser.js`:
  - Line 321: `UNKNOWN` - /shall take into account/i,

#### `actual`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/edcat/auditTrail.js`:
  - Line 82: `UNKNOWN` - * Update actual accuracy after feedback

#### `ai_clause_blueprint`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 2

**Files using this table:**

- `src/routes/chat.js`:
  - Line 483: `SELECT` - FROM ai_clause_blueprint
- `src/scripts/seed-edcat-personality.js`:
  - Line 571: `SELECT` - (SELECT COUNT(*) FROM ai_clause_blueprint WHERE tenant_id = $1) as clauses

#### `ai_conversation_memory`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 130: `SELECT` - FROM public.ai_conversation_memory
  - Line 168: `UPDATE` - `UPDATE public.ai_conversation_memory
  - Line 181: `SELECT` - `SELECT question_intent, standards_mentioned FROM public.ai_conversation_memory 

#### `ai_conversation_state`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 3

**Files using this table:**

- `EDCAT AIP/server/vera_conversation_middleware.ts`:
  - Line 116: `UNKNOWN` - 'select last_intent, context, last_topic from ai_conversation_state where tenant
- `src/middleware/veraConversationMiddleware.js`:
  - Line 180: `SELECT` - `SELECT last_intent, context, last_topic FROM ai_conversation_state
- `src/scripts/diagnose-vera.js`:
  - Line 102: `SELECT` - `SELECT COUNT(*) as count FROM ai_conversation_state WHERE tenant_id = $1`,

#### `ai_intelligence`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 53: `SELECT` - FROM public.ai_intelligence
  - Line 71: `UPDATE` - `UPDATE public.ai_intelligence

#### `ai_learning_patterns`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 189: `UPDATE` - `UPDATE public.ai_learning_patterns
  - Line 241: `SELECT` - FROM public.ai_learning_patterns

#### `ai_persona`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 564: `SELECT` - (SELECT COUNT(*) FROM ai_persona WHERE tenant_id = $1) as personas,

#### `ai_persona_profile`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 3

**Files using this table:**

- `EDCAT AIP/server/vera_conversation_middleware.ts`:
  - Line 102: `UNKNOWN` - 'select profile from ai_persona_profile where tenant_id=$1 and persona_code=$2',
- `src/middleware/veraConversationMiddleware.js`:
  - Line 164: `SELECT` - `SELECT profile FROM ai_persona_profile WHERE tenant_id = $1 AND persona_code = 
- `src/scripts/diagnose-vera.js`:
  - Line 37: `SELECT` - `SELECT persona_code, profile FROM ai_persona_profile WHERE tenant_id = $1 AND p

#### `ai_policy`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 9

**Files using this table:**

- `EDCAT AIP/server/chat_middleware.ts`:
  - Line 11: `UNKNOWN` - const rules = await pg.oneOrNone('select content from ai_policy where tenant_id=
- `src/middleware/veraMiddleware.js`:
  - Line 30: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.follow.rules
- `src/routes/chat.js`:
  - Line 441: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.follow.rules
- `src/scripts/seed-edcat-personality.js`:
  - Line 566: `SELECT` - (SELECT COUNT(*) FROM ai_policy WHERE tenant_id = $1) as policies,
- `src/services/veraConversationalEngine.js`:
  - Line 34: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.expert.crede
  - Line 43: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.knowledge.te
  - Line 52: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.knowledge.ba
  - Line 61: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.enhanced.int
  - Line 718: `SELECT` - FROM ai_policy

#### `ai_prompt`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 7

**Files using this table:**

- `EDCAT AIP/server/chat_middleware.ts`:
  - Line 12: `UNKNOWN` - const sys = await pg.oneOrNone(`select content from ai_prompt where tenant_id=$1
- `EDCAT AIP/server/vera_chat_handler_example.ts`:
  - Line 25: `UNKNOWN` - "select content from ai_prompt where tenant_id=$1 and persona_code='vera' and ki
- `src/middleware/veraMiddleware.js`:
  - Line 35: `SELECT` - `SELECT content FROM ai_prompt
- `src/routes/chat.js`:
  - Line 446: `SELECT` - `SELECT content FROM ai_prompt
- `src/scripts/seed-edcat-personality.js`:
  - Line 124: `UPDATE` - `UPDATE ai_prompt
  - Line 287: `UPDATE` - `UPDATE ai_prompt
  - Line 565: `SELECT` - (SELECT COUNT(*) FROM ai_prompt WHERE tenant_id = $1) as prompts,

#### `ai_router`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 2

**Files using this table:**

- `src/routes/chat.js`:
  - Line 1107: `SELECT` - `SELECT rules FROM ai_router
- `src/scripts/seed-edcat-personality.js`:
  - Line 569: `SELECT` - (SELECT COUNT(*) FROM ai_router WHERE tenant_id = $1) as routers,

#### `ai_standard`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 2

**Files using this table:**

- `src/scripts/remove-edcat-ai-duplicates.js`:
  - Line 100: `SELECT` - const count = await queryEdcatAI('SELECT COUNT(*) as count FROM public.ai_standa
- `src/scripts/seed-edcat-personality.js`:
  - Line 570: `SELECT` - (SELECT COUNT(*) FROM ai_standard WHERE tenant_id = $1) as standards,

#### `ai_template`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 567: `SELECT` - (SELECT COUNT(*) FROM ai_template WHERE tenant_id = $1) as templates,

#### `ai_tenant`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 2

**Files using this table:**

- `src/scripts/diagnose-vera.js`:
  - Line 21: `SELECT` - `SELECT tenant_id, name FROM ai_tenant WHERE tenant_id = $1`,
- `src/scripts/seed-edcat-personality.js`:
  - Line 25: `SELECT` - `SELECT tenant_id FROM ai_tenant WHERE name = 'Default EDCAT Tenant' LIMIT 1`

#### `ai_validator`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 568: `SELECT` - (SELECT COUNT(*) FROM ai_validator WHERE tenant_id = $1) as validators,

#### `all`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/database/migrations/001_initial_schema.js`:
  - Line 108: `UNKNOWN` - // Drop schemas (this will cascade delete all tables)
- `src/services/learningEngine.js`:
  - Line 297: `UNKNOWN` - // Update all gap_analyzer_tunings with new terminology

#### `analysis`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `clarificationEngine.js`:
  - Line 59: `UNKNOWN` - * Identify ambiguous areas from analysis results
- `learningEngine.js`:
  - Line 47: `UNKNOWN` - // Update analysis with feedback rating

#### `analysis_clarifications`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 3

**Files using this table:**

- `database.js`:
  - Line 344: `SELECT` - 'SELECT * FROM analysis_clarifications WHERE clarification_id = $1',
  - Line 352: `SELECT` - `SELECT * FROM analysis_clarifications
  - Line 363: `UPDATE` - `UPDATE analysis_clarifications

#### `analyzeComplianceGaps`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/complianceGapAnalyzer.js`:
  - Line 442: `UNKNOWN` - * @param {Object} analysisResults - Results from analyzeComplianceGaps

#### `api_keys`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 2

**Files using this table:**

- `src/middleware/enterpriseMiddleware.js`:
  - Line 75: `SELECT` - FROM api_keys
  - Line 108: `UPDATE` - `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,

#### `array`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/veraConversationalEngine.js`:
  - Line 1296: `UNKNOWN` - * Get random response from array

#### `audit`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/edcat/learning/learningSystem.js`:
  - Line 26: `UNKNOWN` - // Update audit trail with actual accuracy

#### `audit_trail`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 2

**Files using this table:**

- `src/routes/admin.js`:
  - Line 60: `SELECT` - `SELECT COUNT(*) as count FROM public.audit_trail
- `src/routes/gap.js`:
  - Line 135: `UNKNOWN` - // Insert feedback into public.audit_trail (or create a feedback table if needed

#### `audit_trail_decisions`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 3

**Files using this table:**

- `src/edcat/auditTrail.js`:
  - Line 89: `UPDATE` - `UPDATE audit_trail_decisions
  - Line 107: `SELECT` - `SELECT * FROM audit_trail_decisions
  - Line 128: `SELECT` - let queryText = `SELECT * FROM audit_trail_decisions WHERE actor = $1`;

#### `authorized_users`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `src/routes/users.js`:
  - Line 30: `SELECT` - FROM public.authorized_users
  - Line 89: `SELECT` - `SELECT user_id FROM public.authorized_users WHERE username = $1 OR email = $2`,
  - Line 186: `UPDATE` - `UPDATE public.authorized_users
  - Line 232: `UPDATE` - `UPDATE public.authorized_users

#### `AVG`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/services/capaSystem.js`:
  - Line 223: `SELECT` - `SELECT AVG(EXTRACT(DAY FROM closed_at - created_at)) as avg_days
- `src/services/kpiMetrics.js`:
  - Line 71: `SELECT` - `SELECT AVG(total_score) as avg_score

#### `backend`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `scripts/apply-schema.js`:
  - Line 25: `UNKNOWN` - // Path to complete-schema.sql (from backend/scripts to backend/src/database/sch

#### `backup`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `src/scripts/restore-standard-files.js`:
  - Line 2: `UNKNOWN` - * Restore standard_files from backup
- `src/scripts/restore-standards-from-backup.js`:
  - Line 2: `UNKNOWN` - * Restore standards data from backup table to public.standards
  - Line 23: `UNKNOWN` - // Get column names from backup table
  - Line 46: `UNKNOWN` - console.log('\nRestoring data from backup...');

#### `BACKUP`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/restore-standard-files.js`:
  - Line 8: `SELECT` - console.log('=== RESTORING STANDARD_FILES FROM BACKUP ===\n');
- `src/scripts/restore-standards-from-backup.js`:
  - Line 8: `SELECT` - console.log('=== RESTORING STANDARDS FROM BACKUP ===\n');

#### `BEGIN`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 6

**Files using this table:**

- `src/scripts/create-standard-files-table.js`:
  - Line 97: `UNKNOWN` - await queryPostgres('BEGIN');
- `src/scripts/test-all-database-connections.js`:
  - Line 97: `UNKNOWN` - await queryPostgres('BEGIN');
  - Line 159: `UNKNOWN` - await queryEdcatAI('BEGIN');
  - Line 341: `UNKNOWN` - await queryEdcatAI('BEGIN');
  - Line 373: `UNKNOWN` - await queryPostgres('BEGIN');
  - Line 398: `UNKNOWN` - await queryEdcatAI('BEGIN');

#### `beginning`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/clauseAwareParser.js`:
  - Line 504: `UNKNOWN` - // Remove sub-clause markers from beginning

#### `both`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/routes/learning.js`:
  - Line 36: `UNKNOWN` - // Get pending tunings from both analyzer types
- `src/scripts/consolidate-standards-tables.js`:
  - Line 2: `UNKNOWN` - * Consolidate standards tables from both databases into PostgreSQL only
- `src/scripts/restore-standards-from-backup.js`:
  - Line 70: `UNKNOWN` - // Get columns from both tables to match them

#### `by`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/users.js`:
  - Line 225: `UNKNOWN` - * Delete a user (soft delete by setting is_active = false)

#### `c`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/database/repos/requirements.repo.js`:
  - Line 56: `SELECT` - `SELECT c.clause_id, c.title, c.level, c.text, c.modality, c.char_start, c.char_
  - Line 78: `SELECT` - `SELECT c.clause_id, c.title, c.level, c.text, c.modality

#### `CAPA`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/capa.js`:
  - Line 36: `UNKNOWN` - // Update CAPA status

#### `capa_effectiveness_checks`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 3

**Files using this table:**

- `src/services/capaSystem.js`:
  - Line 200: `SELECT` - FROM capa_effectiveness_checks
  - Line 234: `SELECT` - (SELECT COUNT(*) FROM capa_effectiveness_checks cec
  - Line 237: `SELECT` - (SELECT COUNT(*) FROM capa_effectiveness_checks cec

#### `capa_id`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/capaSystem.js`:
  - Line 199: `SELECT` - `SELECT capa_id, status

#### `capa_records`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 10

**Files using this table:**

- `src/services/capaSystem.js`:
  - Line 115: `SELECT` - FROM capa_records
  - Line 164: `UPDATE` - `UPDATE capa_records
  - Line 173: `SELECT` - `SELECT * FROM capa_records
  - Line 189: `SELECT` - FROM capa_records
  - Line 224: `SELECT` - FROM capa_records
  - Line 235: `UNKNOWN` - JOIN capa_records cr ON cec.capa_id = cr.id
  - Line 238: `UNKNOWN` - JOIN capa_records cr ON cec.capa_id = cr.id
- `src/services/edcatQMSIntegration.js`:
  - Line 103: `SELECT` - `SELECT * FROM capa_records WHERE customer_id = $1`,
- `src/services/kpiMetrics.js`:
  - Line 94: `SELECT` - FROM capa_records
  - Line 162: `SELECT` - FROM capa_records

#### `CASCADE`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 40

**Files using this table:**

- `index.js`:
  - Line 96: `DELETE` - standard_id UUID NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
- `src/database/migrations/003_verify_and_fix_schema.js`:
  - Line 47: `DELETE` - standard_id UUID NOT NULL REFERENCES compliance_lib.standards(standard_id) ON DE
  - Line 61: `DELETE` - requirement_id UUID NOT NULL REFERENCES compliance_lib.requirements(requirement_
  - Line 109: `DELETE` - document_id UUID NOT NULL REFERENCES customer_data.documents(document_id) ON DEL
  - Line 122: `DELETE` - procedure_id UUID NOT NULL REFERENCES customer_data.procedures(procedure_id) ON 
  - Line 155: `DELETE` - analysis_id UUID NOT NULL REFERENCES customer_data.gap_analyses(analysis_id) ON 
- `src/database/migrations/004_add_learning_tables.js`:
  - Line 38: `DELETE` - trace_id UUID NOT NULL REFERENCES customer_data.gap_analysis_traces(id) ON DELET
- `src/database/schema.js`:
  - Line 289: `DELETE` - ON DELETE CASCADE`
- `src/routes/customers.js`:
  - Line 276: `DELETE` - document_id UUID NOT NULL REFERENCES ${schemaName}.documents(document_id) ON DEL
  - Line 286: `DELETE` - standard_id UUID NOT NULL REFERENCES public.compliance_standards(standard_id) ON
  - Line 302: `DELETE` - requirement_id UUID NOT NULL REFERENCES public.compliance_requirements(requireme
  - Line 303: `DELETE` - procedure_id UUID NOT NULL REFERENCES ${schemaName}.procedures(procedure_id) ON 
  - Line 304: `DELETE` - analysis_id UUID REFERENCES ${schemaName}.gap_analyses(analysis_id) ON DELETE CA
  - Line 314: `DELETE` - analysis_id UUID NOT NULL REFERENCES ${schemaName}.gap_analyses(analysis_id) ON 
  - Line 315: `DELETE` - requirement_id UUID NOT NULL REFERENCES public.compliance_requirements(requireme
  - Line 338: `DELETE` - trace_id UUID NOT NULL REFERENCES ${schemaName}.ai_learning_traces(trace_id) ON 
- `src/scripts/create-all-tables.js`:
  - Line 81: `DELETE` - standard_id UUID REFERENCES public.standards(standard_id) ON DELETE CASCADE,
  - Line 95: `DELETE` - ADD COLUMN IF NOT EXISTS standard_id UUID REFERENCES compliance_lib.standards(st
  - Line 119: `DELETE` - standard_id UUID NOT NULL REFERENCES compliance_lib.standards(standard_id) ON DE
  - Line 133: `DELETE` - requirement_id UUID NOT NULL REFERENCES compliance_lib.requirements(requirement_
  - Line 181: `DELETE` - document_id UUID NOT NULL REFERENCES customer_data.documents(document_id) ON DEL
  - Line 194: `DELETE` - procedure_id UUID NOT NULL REFERENCES customer_data.procedures(procedure_id) ON 
  - Line 227: `DELETE` - analysis_id UUID NOT NULL REFERENCES customer_data.gap_analyses(analysis_id) ON 
  - Line 340: `DELETE` - trace_id UUID NOT NULL REFERENCES customer_data.gap_analysis_traces(id) ON DELET
- `src/scripts/create-blueprint-tables.js`:
  - Line 17: `DELETE` - tenant_id UUID NOT NULL REFERENCES ai_tenant(tenant_id) ON DELETE CASCADE,
  - Line 35: `DELETE` - tenant_id UUID NOT NULL REFERENCES ai_tenant(tenant_id) ON DELETE CASCADE,
  - Line 36: `DELETE` - standard_id UUID NOT NULL REFERENCES ai_standard(id) ON DELETE CASCADE,
  - Line 52: `DELETE` - tenant_id UUID NOT NULL REFERENCES ai_tenant(tenant_id) ON DELETE CASCADE,
  - Line 53: `DELETE` - standard_id UUID NOT NULL REFERENCES ai_standard(id) ON DELETE CASCADE,
- `src/scripts/ensure-parsed-requirements-table-robust.js`:
  - Line 80: `DELETE` - standard_id UUID NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
- `src/scripts/ensure-parsed-requirements-table.js`:
  - Line 40: `DELETE` - standard_id UUID NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
- `src/scripts/fix-all-schema-errors.js`:
  - Line 206: `DELETE` - await queryPostgres(`ALTER TABLE public.gap_analyses ADD COLUMN IF NOT EXISTS te
  - Line 245: `DELETE` - await queryPostgres(`ALTER TABLE public.customer_procedures ADD COLUMN IF NOT EX
  - Line 277: `DELETE` - analysis_id UUID REFERENCES public.gap_analyses(id) ON DELETE CASCADE,
- `src/scripts/verify-tables.js`:
  - Line 98: `DELETE` - standard_id UUID NOT NULL REFERENCES compliance_lib.standards(standard_id) ON DE
  - Line 153: `DELETE` - requirement_id UUID NOT NULL REFERENCES compliance_lib.requirements(requirement_
  - Line 181: `DELETE` - document_id UUID NOT NULL REFERENCES customer_data.documents(document_id) ON DEL
  - Line 192: `DELETE` - procedure_id UUID NOT NULL REFERENCES customer_data.procedures(procedure_id) ON 
  - Line 221: `DELETE` - analysis_id UUID NOT NULL REFERENCES customer_data.gap_analyses(analysis_id) ON 
  - Line 247: `DELETE` - trace_id UUID NOT NULL REFERENCES customer_data.gap_analysis_traces(id) ON DELET

#### `clarification`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `clarificationEngine.js`:
  - Line 95: `UNKNOWN` - // Update clarification record
- `learningEngine.js`:
  - Line 9: `UNKNOWN` - * Record a learning event from clarification feedback

#### `clause`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/services/clauseAwareParser.js`:
  - Line 275: `UNKNOWN` - console.log(`   📝 Stripped ${notes.length} NOTE(s) from clause ${parentClause}`
- `src/services/documentDraftingEngine.js`:
  - Line 21: `UNKNOWN` - * Generate document from clause
- `src/services/noteFilter.js`:
  - Line 3: `UNKNOWN` - * Removes NOTE paragraphs from clause content

#### `clause_correlation_matrix`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 7

**Files using this table:**

- `src/routes/predictions.js`:
  - Line 25: `SELECT` - FROM clause_correlation_matrix ccm
- `src/services/advancedAI/anomalyDetectionEngine.js`:
  - Line 67: `SELECT` - FROM clause_correlation_matrix
  - Line 233: `SELECT` - FROM clause_correlation_matrix
- `src/services/auditPrepExporter.js`:
  - Line 46: `UNKNOWN` - LEFT JOIN clause_correlation_matrix ccm ON pc.id = ccm.clause_id
- `src/services/capaSystem.js`:
  - Line 28: `UNKNOWN` - LEFT JOIN clause_correlation_matrix ccm
- `src/services/clauseCorrelationEngine.js`:
  - Line 186: `SELECT` - FROM clause_correlation_matrix ccm
- `src/services/reportGenerator.js`:
  - Line 39: `SELECT` - FROM clause_correlation_matrix ccm

#### `clause_id`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/database/repos/requirements.repo.js`:
  - Line 41: `SELECT` - SELECT clause_id, title, level, text, modality, char_start, char_end
- `src/routes/chat.js`:
  - Line 482: `SELECT` - `SELECT clause_id, label, parent_clause_id, ontology_tags

#### `clause_number`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/routes/chat.js`:
  - Line 610: `SELECT` - `SELECT clause_number, COUNT(*) as count
- `src/services/clauseQuery.js`:
  - Line 83: `SELECT` - `SELECT clause_number, clause_title, requirement_text, confidence,
- `src/services/veraConversationalEngine.js`:
  - Line 332: `SELECT` - `SELECT clause_number, clause_title, requirement_text, confidence

#### `clause_ref`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/parse.js`:
  - Line 846: `SELECT` - SELECT clause_ref FROM public.parsed_requirements

#### `clauses`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `src/routes/documents.js`:
  - Line 3: `UNKNOWN` - * Generate procedures, work instructions, forms from clauses
- `src/scripts/load-vera-blueprints.js`:
  - Line 103: `UNKNOWN` - // Insert clauses
- `src/scripts/seed-edcat-personality.js`:
  - Line 327: `UNKNOWN` - // Insert clauses
- `src/services/documentDraftingEngine.js`:
  - Line 3: `UNKNOWN` - * Auto-generates procedures, work instructions, forms from clauses

#### `closed_at`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/capaSystem.js`:
  - Line 223: `SELECT` - `SELECT AVG(EXTRACT(DAY FROM closed_at - created_at)) as avg_days

#### `COALESCE`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/parse.js`:
  - Line 831: `SELECT` - `SELECT COALESCE(total_clauses, total_requirements, 0) as total_clauses FROM pub

#### `column_name`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 19

**Files using this table:**

- `src/scripts/audit-postgres-tables.js`:
  - Line 48: `SELECT` - SELECT column_name, data_type, is_nullable, column_default
- `src/scripts/check-standards-table-exists.js`:
  - Line 76: `SELECT` - SELECT column_name, data_type, is_nullable
- `src/scripts/create-standard-files-table.js`:
  - Line 26: `SELECT` - SELECT column_name, data_type, is_nullable
  - Line 84: `SELECT` - SELECT column_name, data_type, is_nullable
- `src/scripts/diagnose-postgres-errors.js`:
  - Line 66: `SELECT` - SELECT column_name, data_type, is_nullable
- `src/scripts/diagnose-upload-issue.js`:
  - Line 45: `SELECT` - SELECT column_name, data_type
- `src/scripts/ensure-parsed-requirements-table-robust.js`:
  - Line 29: `SELECT` - SELECT column_name, data_type
- `src/scripts/find-all-standards-tables.js`:
  - Line 152: `SELECT` - SELECT column_name
- `src/scripts/fix-all-schema-errors.js`:
  - Line 69: `SELECT` - SELECT column_name, is_nullable
- `src/scripts/restore-standard-files.js`:
  - Line 12: `SELECT` - SELECT column_name
  - Line 20: `SELECT` - SELECT column_name
- `src/scripts/restore-standards-from-backup.js`:
  - Line 25: `SELECT` - SELECT column_name
  - Line 72: `SELECT` - SELECT column_name
  - Line 80: `SELECT` - SELECT column_name
- `src/scripts/test-all-database-connections.js`:
  - Line 222: `SELECT` - SELECT column_name, data_type
- `src/scripts/test-upload-flow.js`:
  - Line 20: `SELECT` - SELECT column_name, data_type, is_nullable
  - Line 46: `SELECT` - SELECT column_name, data_type, is_nullable
- `src/scripts/verify-database-connections-complete.js`:
  - Line 116: `SELECT` - SELECT column_name, data_type, is_nullable
- `src/scripts/verify-standards-table-exists.js`:
  - Line 42: `SELECT` - SELECT column_name, data_type, is_nullable

#### `compliance`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 124: `UNKNOWN` - console.log('\n✅ Cleanup complete! Removed Examples-based standards from complia
- `src/services/requirementParser.js`:
  - Line 3: `UNKNOWN` - * Learns to extract requirements from compliance documents with high accuracy

#### `compliance_lib`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/scripts/ingest-knowledge-pack.js`:
  - Line 178: `SELECT` - FROM compliance_lib.learning_embeddings
- `src/services/complianceGapAnalyzer.js`:
  - Line 50: `SELECT` - FROM compliance_lib.requirements
  - Line 63: `SELECT` - `SELECT standard_id, code, name FROM compliance_lib.standards WHERE standard_id 

#### `compliance_requirements`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 11

**Files using this table:**

- `database.js`:
  - Line 83: `SELECT` - 'SELECT * FROM compliance_requirements WHERE requirement_id = $1',
  - Line 91: `SELECT` - `SELECT * FROM compliance_requirements
  - Line 113: `UPDATE` - `UPDATE compliance_requirements
  - Line 237: `SELECT` - SELECT requirement_id FROM compliance_requirements
- `src/routes/chat.js`:
  - Line 164: `SELECT` - FROM public.compliance_requirements cr
  - Line 865: `SELECT` - `SELECT COUNT(*) as count FROM public.compliance_requirements WHERE standard_id 
- `src/routes/parse.js`:
  - Line 958: `SELECT` - `SELECT COUNT(*) as count FROM public.compliance_requirements WHERE standard_id 
- `src/services/clauseQuery.js`:
  - Line 26: `SELECT` - FROM compliance_requirements
  - Line 86: `SELECT` - FROM compliance_requirements
  - Line 110: `SELECT` - FROM compliance_requirements
  - Line 153: `SELECT` - FROM compliance_requirements

#### `compliance_standards`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 7

**Files using this table:**

- `database.js`:
  - Line 56: `SELECT` - 'SELECT * FROM compliance_standards WHERE code = $1',
  - Line 75: `SELECT` - 'SELECT * FROM compliance_standards ORDER BY name'
- `src/database/schema.js`:
  - Line 19: `UNKNOWN` - 'standards',  // Changed from compliance_standards
  - Line 244: `UNKNOWN` - console.log('[schema] ⚠️  standards table missing, rebuilding from compliance_st
  - Line 267: `SELECT` - FROM public.compliance_standards
  - Line 338: `UNKNOWN` - 'DROP TABLE IF EXISTS standards CASCADE',  // Changed from compliance_standards
- `src/services/learningEngine.js`:
  - Line 96: `UNKNOWN` - LEFT JOIN public.compliance_standards ps

#### `confidence`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `clarificationEngine.js`:
  - Line 81: `UNKNOWN` - // Update confidence based on response
- `learningEngine.js`:
  - Line 189: `UNKNOWN` - * Batch learning: Process all recent clarifications and update confidence scores

#### `config`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 6

**Files using this table:**

- `src/middleware/veraMiddleware.js`:
  - Line 30: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.follow.rules
- `src/routes/chat.js`:
  - Line 441: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.follow.rules
- `src/services/veraConversationalEngine.js`:
  - Line 34: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.expert.crede
  - Line 43: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.knowledge.te
  - Line 52: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.knowledge.ba
  - Line 61: `SELECT` - `SELECT config FROM ai_policy WHERE tenant_id = $1 AND name = 'vera.enhanced.int

#### `configuration`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/industryModules/industryFactory.js`:
  - Line 85: `UNKNOWN` - // Update configuration

#### `consideration`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/requirementParser.js`:
  - Line 322: `UNKNOWN` - /shall take into consideration/i

#### `content`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 7

**Files using this table:**

- `EDCAT AIP/server/chat_middleware.ts`:
  - Line 11: `UNKNOWN` - const rules = await pg.oneOrNone('select content from ai_policy where tenant_id=
  - Line 12: `UNKNOWN` - const sys = await pg.oneOrNone(`select content from ai_prompt where tenant_id=$1
- `EDCAT AIP/server/vera_chat_handler_example.ts`:
  - Line 25: `UNKNOWN` - "select content from ai_prompt where tenant_id=$1 and persona_code='vera' and ki
- `src/middleware/veraMiddleware.js`:
  - Line 35: `SELECT` - `SELECT content FROM ai_prompt
- `src/routes/chat.js`:
  - Line 446: `SELECT` - `SELECT content FROM ai_prompt
- `src/routes/parse.js`:
  - Line 185: `UNKNOWN` - // Determine file type from metadata if available, otherwise guess from content
- `src/services/clauseAwareParser.js`:
  - Line 271: `UNKNOWN` - // Step 1: Strip NOTES from content

#### `context`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/routes/chat.js`:
  - Line 500: `UNKNOWN` - // Get Vera rules from context (loaded by middleware)
- `src/services/veraConversationalEngine.js`:
  - Line 396: `UNKNOWN` - // Extract standard and customer ID from context if available
  - Line 417: `UNKNOWN` - // Get customer ID from context (this would come from the request)

#### `conversation`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 8

**Files using this table:**

- `EDCAT AIP/server/vera_chat_handler_example.ts`:
  - Line 33: `UNKNOWN` - // update conversation state
  - Line 76: `UNKNOWN` - // Update conversation state with a lightweight summary; you can improve this
- `src/middleware/veraConversationMiddleware.js`:
  - Line 284: `UNKNOWN` - * Update conversation state
- `src/routes/chat.js`:
  - Line 205: `UNKNOWN` - // Check for conversational response first (from conversation middleware)
  - Line 214: `UNKNOWN` - // Update conversation state
  - Line 244: `UNKNOWN` - // Update conversation state
  - Line 405: `UNKNOWN` - // Update conversation state for LLM responses
- `src/services/aiMemoryService.js`:
  - Line 166: `UNKNOWN` - // Update conversation memory

#### `correction`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/parser-training.js`:
  - Line 352: `UNKNOWN` - // Learn from correction

#### `corrections`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/routes/parser-training.js`:
  - Line 83: `UNKNOWN` - // Learn from corrections
  - Line 92: `UNKNOWN` - // Extract patterns from corrections
- `src/services/requirementParser.js`:
  - Line 65: `UNKNOWN` - learned_patterns: {},    // Patterns learned from corrections

#### `COUNT`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 167

**Files using this table:**

- `index.js`:
  - Line 207: `SELECT` - const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.st
- `src/database/twoDatabaseMigrations.js`:
  - Line 165: `SELECT` - SELECT COUNT(*) as count
- `src/routes/admin.js`:
  - Line 60: `SELECT` - `SELECT COUNT(*) as count FROM public.audit_trail
  - Line 66: `SELECT` - `SELECT COUNT(*) as count FROM public.gap_analyses
  - Line 125: `SELECT` - const finalCheck = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
- `src/routes/chat.js`:
  - Line 585: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements
  - Line 793: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1
  - Line 865: `SELECT` - `SELECT COUNT(*) as count FROM public.compliance_requirements WHERE standard_id 
  - Line 916: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1
  - Line 944: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1
  - Line 983: `SELECT` - `SELECT COUNT(*) as count FROM parsed_clauses WHERE standard_id = $1`,
  - Line 1148: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1
  - Line 1190: `SELECT` - `SELECT COUNT(*) as count FROM parsed_requirements WHERE standard_id = $1`,
- `src/routes/diagnostics.js`:
  - Line 117: `SELECT` - const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 124: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
- `src/routes/parse.js`:
  - Line 482: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1
  - Line 958: `SELECT` - `SELECT COUNT(*) as count FROM public.compliance_requirements WHERE standard_id 
- `src/routes/requirements.js`:
  - Line 541: `SELECT` - SELECT COUNT(*) as count FROM public.standards
  - Line 547: `SELECT` - SELECT COUNT(*) as count FROM public.parsed_requirements
- `src/routes/test-db.js`:
  - Line 32: `SELECT` - const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.st
  - Line 41: `SELECT` - const migrationsResult = await queryPostgres('SELECT COUNT(*) as count FROM sche
- `src/scripts/audit-all-tables.js`:
  - Line 100: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns
  - Line 119: `SELECT` - const countResult = await queryPostgres(`SELECT COUNT(*) as count FROM ${fullNam
  - Line 155: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns
  - Line 174: `SELECT` - const countResult = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${fullName
- `src/scripts/audit-postgres-tables.js`:
  - Line 43: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${fullName}`);
  - Line 69: `SELECT` - SELECT COUNT(*) as count FROM ${fullName} WHERE code IS NULL OR TRIM(code) = ''
  - Line 93: `SELECT` - SELECT COUNT(*) as count
  - Line 107: `SELECT` - SELECT COUNT(*) as count FROM ${fullName} WHERE standard_id IS NULL
  - Line 118: `SELECT` - SELECT COUNT(*) as count
  - Line 215: `SELECT` - const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 216: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 217: `SELECT` - const linkedStandards = await queryPostgres('SELECT COUNT(DISTINCT standard_id) 
  - Line 231: `SELECT` - SELECT COUNT(*) as count
- `src/scripts/check-all-schemas.js`:
  - Line 40: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${schemaName}.$
- `src/scripts/check-edcat-ai-tables.js`:
  - Line 28: `SELECT` - const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${t.table_schema
- `src/scripts/check-postgres-duplicate-tables.js`:
  - Line 29: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${t.table_schem
  - Line 46: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${t.table_schem
- `src/scripts/check-standards-table-exists.js`:
  - Line 89: `SELECT` - const count = await pool.query('SELECT COUNT(*) as count FROM public.standards')
- `src/scripts/cleanup-all-duplicate-tables.js`:
  - Line 34: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns
  - Line 53: `SELECT` - const countResult = await queryPostgres(`SELECT COUNT(*) as count FROM ${fullNam
  - Line 76: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns
  - Line 95: `SELECT` - const countResult = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${fullName
- `src/scripts/cleanup-backup-tables.js`:
  - Line 29: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${tableN
- `src/scripts/cleanup-duplicate-tables.js`:
  - Line 62: `SELECT` - const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${table.table_na
  - Line 79: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${table.
- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 168: `SELECT` - `SELECT COUNT(*) as total,
- `src/scripts/comprehensive-system-audit.js`:
  - Line 88: `SELECT` - const countResult = await queryPostgres(`SELECT COUNT(*) as count FROM ${table.n
  - Line 183: `SELECT` - SELECT COUNT(*) as count FROM public.standards WHERE id = $1
  - Line 331: `SELECT` - const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 332: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 333: `SELECT` - const requirementsCount = await queryPostgres('SELECT COUNT(*) as count FROM pub
  - Line 341: `SELECT` - SELECT COUNT(DISTINCT sf.standard_id) as count
- `src/scripts/create-standards-table-directly.js`:
  - Line 84: `SELECT` - const count = await pool.query('SELECT COUNT(*) as count FROM public.standards')
- `src/scripts/diagnose-complete-connection.js`:
  - Line 61: `SELECT` - const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 68: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 75: `SELECT` - const reqsCount = await queryPostgres('SELECT COUNT(*) as count FROM public.pars
  - Line 140: `SELECT` - SELECT COUNT(*) as count
  - Line 235: `SELECT` - const standardsTotal = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 236: `SELECT` - const filesTotal = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 238: `SELECT` - SELECT COUNT(DISTINCT s.id) as count
- `src/scripts/diagnose-postgres-errors.js`:
  - Line 43: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${schemaName}.$
  - Line 96: `SELECT` - const count = await queryPostgres('SELECT COUNT(*) as count FROM public.standard
  - Line 122: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${backup
  - Line 136: `SELECT` - const publicStandards = await queryPostgres('SELECT COUNT(*) as count FROM publi
- `src/scripts/diagnose-standards-display.js`:
  - Line 129: `SELECT` - SELECT COUNT(*) as count
- `src/scripts/diagnose-standards-not-loading.js`:
  - Line 23: `SELECT` - SELECT COUNT(*) as count
  - Line 52: `SELECT` - SELECT COUNT(*) as count
  - Line 61: `SELECT` - SELECT COUNT(*) as count
  - Line 106: `SELECT` - SELECT COUNT(DISTINCT sf.standard_id) as count
  - Line 115: `SELECT` - SELECT COUNT(*) as count
  - Line 124: `SELECT` - SELECT COUNT(*) as count
  - Line 226: `SELECT` - SELECT COUNT(DISTINCT sf.standard_id) as count
- `src/scripts/diagnose-standards-visibility.js`:
  - Line 20: `SELECT` - SELECT COUNT(*) as count FROM public.standards
  - Line 55: `SELECT` - SELECT COUNT(*) as count FROM public.standard_files
  - Line 61: `SELECT` - SELECT COUNT(*) as count FROM public.standard_files WHERE standard_id IS NOT NUL
- `src/scripts/diagnose-upload-issue.js`:
  - Line 70: `SELECT` - const totalCount = await pool.query('SELECT COUNT(*) as count FROM public.standa
  - Line 76: `SELECT` - SELECT COUNT(*) as count
  - Line 85: `SELECT` - SELECT COUNT(*) as count
- `src/scripts/diagnose-vera.js`:
  - Line 102: `SELECT` - `SELECT COUNT(*) as count FROM ai_conversation_state WHERE tenant_id = $1`,
- `src/scripts/diagnose-zero-standards.js`:
  - Line 16: `SELECT` - const standardsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM standar
  - Line 19: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 22: `SELECT` - const uniqueStandardsWithFiles = await queryPostgres('SELECT COUNT(DISTINCT stan
- `src/scripts/ensure-parsed-requirements-table.js`:
  - Line 28: `SELECT` - SELECT COUNT(*) as count FROM public.parsed_requirements
- `src/scripts/find-all-standards-tables.js`:
  - Line 24: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_sc
  - Line 37: `SELECT` - `SELECT COUNT(*) as count FROM ${table.table_schema}.${table.table_name}`
  - Line 77: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_sc
  - Line 89: `SELECT` - `SELECT COUNT(*) as count FROM ${table.table_schema}.${table.table_name}`
  - Line 150: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${table.table_s
- `src/scripts/find-standards-table-schema.js`:
  - Line 49: `SELECT` - const test1 = await pool.query('SELECT COUNT(*) as count FROM standards');
  - Line 57: `SELECT` - const test2 = await pool.query('SELECT COUNT(*) as count FROM public.standards')
- `src/scripts/fix-postgres-errors.js`:
  - Line 51: `SELECT` - const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 52: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 134: `SELECT` - SELECT COUNT(*) as count
  - Line 154: `SELECT` - SELECT COUNT(*) as count
- `src/scripts/identify-all-standards-tables.js`:
  - Line 20: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_sc
  - Line 39: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${table.table_s
  - Line 58: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_sc
  - Line 77: `SELECT` - const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${table.table_sc
- `src/scripts/ingest-knowledge-pack.js`:
  - Line 176: `SELECT` - SELECT COUNT(*) as count,
- `src/scripts/migrate-document-content-to-postgres.js`:
  - Line 54: `SELECT` - SELECT COUNT(*) as count FROM document_content_for_learning
  - Line 67: `SELECT` - SELECT COUNT(*) as count FROM public.document_content_for_learning
  - Line 193: `SELECT` - SELECT COUNT(*) as count FROM public.document_content_for_learning
- `src/scripts/remove-dead-end-tables.js`:
  - Line 61: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${tableN
  - Line 110: `SELECT` - const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${fullName}`);
- `src/scripts/remove-duplicate-tables.js`:
  - Line 28: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${tableN
  - Line 56: `SELECT` - const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM public.${tableNa
- `src/scripts/remove-edcat-ai-duplicates.js`:
  - Line 24: `SELECT` - const pgStandards = await queryPostgres('SELECT COUNT(*) as count FROM public.st
  - Line 25: `SELECT` - const pgFiles = await queryPostgres('SELECT COUNT(*) as count FROM public.standa
  - Line 47: `SELECT` - const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM public.${tableNa
  - Line 100: `SELECT` - const count = await queryEdcatAI('SELECT COUNT(*) as count FROM public.ai_standa
- `src/scripts/restore-standard-files.js`:
  - Line 53: `SELECT` - const after = await queryPostgres('SELECT COUNT(*) as count FROM public.standard
- `src/scripts/restore-standards-from-backup.js`:
  - Line 12: `SELECT` - SELECT COUNT(*) as count
  - Line 36: `SELECT` - const currentCheck = await queryPostgres(`SELECT COUNT(*) as count FROM public.s
  - Line 54: `SELECT` - const afterRestore = await queryPostgres(`SELECT COUNT(*) as count FROM public.s
  - Line 59: `SELECT` - SELECT COUNT(*) as count
  - Line 66: `SELECT` - const filesCurrent = await queryPostgres(`SELECT COUNT(*) as count FROM public.s
  - Line 103: `SELECT` - const afterFilesRestore = await queryPostgres(`SELECT COUNT(*) as count FROM pub
- `src/scripts/run-migrations.js`:
  - Line 176: `SELECT` - SELECT COUNT(*) as count
- `src/scripts/seed-edcat-personality.js`:
  - Line 564: `SELECT` - (SELECT COUNT(*) FROM ai_persona WHERE tenant_id = $1) as personas,
  - Line 565: `SELECT` - (SELECT COUNT(*) FROM ai_prompt WHERE tenant_id = $1) as prompts,
  - Line 566: `SELECT` - (SELECT COUNT(*) FROM ai_policy WHERE tenant_id = $1) as policies,
  - Line 567: `SELECT` - (SELECT COUNT(*) FROM ai_template WHERE tenant_id = $1) as templates,
  - Line 568: `SELECT` - (SELECT COUNT(*) FROM ai_validator WHERE tenant_id = $1) as validators,
  - Line 569: `SELECT` - (SELECT COUNT(*) FROM ai_router WHERE tenant_id = $1) as routers,
  - Line 570: `SELECT` - (SELECT COUNT(*) FROM ai_standard WHERE tenant_id = $1) as standards,
  - Line 571: `SELECT` - (SELECT COUNT(*) FROM ai_clause_blueprint WHERE tenant_id = $1) as clauses
- `src/scripts/test-all-database-connections.js`:
  - Line 79: `SELECT` - const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.st
  - Line 156: `SELECT` - const countResult = await queryEdcatAI('SELECT COUNT(*) as count FROM standards'
  - Line 218: `SELECT` - const countResult = await queryEdcatAI('SELECT COUNT(*) as count FROM parsed_req
- `src/scripts/test-upload-flow.js`:
  - Line 155: `SELECT` - SELECT COUNT(*) as count FROM public.standards
  - Line 177: `SELECT` - SELECT COUNT(*) as count FROM public.standard_files
  - Line 183: `SELECT` - SELECT COUNT(*) as count FROM public.standard_files WHERE standard_id IS NOT NUL
- `src/scripts/verify-database-connection-and-data.js`:
  - Line 61: `SELECT` - const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.st
  - Line 82: `SELECT` - SELECT COUNT(*) as count
  - Line 143: `SELECT` - const edcatCount = await queryEdcatAI('SELECT COUNT(*) as count FROM public.stan
- `src/scripts/verify-database-connections-complete.js`:
  - Line 53: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${table}
  - Line 69: `SELECT` - const standards = await queryPostgres('SELECT COUNT(*) as count FROM public.stan
  - Line 70: `SELECT` - const files = await queryPostgres('SELECT COUNT(*) as count FROM public.standard
  - Line 71: `SELECT` - const requirements = await queryPostgres('SELECT COUNT(*) as count FROM public.p
  - Line 91: `SELECT` - SELECT COUNT(*) as count
- `src/scripts/verify-database-connections.js`:
  - Line 37: `SELECT` - const filesCount = await query('SELECT COUNT(*) as count FROM standard_files');
  - Line 69: `SELECT` - const count = await query(`SELECT COUNT(*) as count FROM ${table}`);
  - Line 102: `SELECT` - const standardsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM standar
  - Line 144: `SELECT` - const reqsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM parsed_requi
  - Line 170: `SELECT` - const learningCount = await queryEdcatAI('SELECT COUNT(*) as count FROM document
- `src/scripts/verify-standards-table-contents.js`:
  - Line 50: `SELECT` - const totalCount = await queryPostgres(`SELECT COUNT(*) as count FROM public.sta
  - Line 56: `SELECT` - SELECT COUNT(*) as count
  - Line 65: `SELECT` - SELECT COUNT(*) as count
  - Line 125: `SELECT` - SELECT COUNT(*) as count FROM public.standard_files
  - Line 130: `SELECT` - SELECT COUNT(DISTINCT standard_id) as count
- `src/scripts/verify-standards-table-exists.js`:
  - Line 55: `SELECT` - const count = await pool.query('SELECT COUNT(*) as count FROM public.standards')
- `src/scripts/verify-vera-tables.js`:
  - Line 38: `SELECT` - const countResult = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${tableNam
- `src/seeds/standards.js`:
  - Line 100: `SELECT` - 'SELECT COUNT(*) as count FROM public.standards WHERE code IS NOT NULL'
- `src/services/capaSystem.js`:
  - Line 114: `SELECT` - `SELECT COUNT(*) as count
  - Line 234: `SELECT` - (SELECT COUNT(*) FROM capa_effectiveness_checks cec
  - Line 237: `SELECT` - (SELECT COUNT(*) FROM capa_effectiveness_checks cec
- `src/services/documentManagement.js`:
  - Line 225: `SELECT` - `SELECT COUNT(*) as count
- `src/services/kpiMetrics.js`:
  - Line 161: `SELECT` - `SELECT COUNT(*) as count
  - Line 170: `SELECT` - `SELECT COUNT(*) as count
  - Line 178: `SELECT` - `SELECT COUNT(*) as count
- `src/services/trainingManagement.js`:
  - Line 138: `SELECT` - `SELECT COUNT(*) as count
  - Line 161: `SELECT` - `SELECT COUNT(*) as count
- `src/services/veraConversationalEngine.js`:
  - Line 667: `SELECT` - SELECT COUNT(DISTINCT COALESCE(standard_code, standard_id::text)) as count
  - Line 675: `SELECT` - SELECT COUNT(*) as count FROM example_documents
  - Line 681: `SELECT` - SELECT COUNT(DISTINCT file_id) as count FROM document_content_for_learning
  - Line 717: `SELECT` - SELECT COUNT(*) as count

#### `cp`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `database.js`:
  - Line 199: `SELECT` - `SELECT cp.* FROM customer_procedures cp
- `src/services/clauseCorrelationEngine.js`:
  - Line 46: `SELECT` - `SELECT cp.* FROM customer_procedures cp
- `src/services/trainingManagement.js`:
  - Line 13: `SELECT` - `SELECT cp.id as procedure_id,

#### `crashing`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `index.js`:
  - Line 259: `UNKNOWN` - // This prevents route loading errors from crashing the server

#### `CREATE`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `scripts/apply-schema.js`:
  - Line 127: `UNKNOWN` - * Extract table names from CREATE TABLE statements
- `src/database/schema.js`:
  - Line 159: `UNKNOWN` - * Extract table name from CREATE TABLE statement

#### `crosswalk`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/load-vera-blueprints.js`:
  - Line 127: `UNKNOWN` - // Insert crosswalk targets
- `src/scripts/seed-edcat-personality.js`:
  - Line 349: `UNKNOWN` - // Insert crosswalk targets

#### `current_database`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 5

**Files using this table:**

- `src/routes/admin.js`:
  - Line 105: `SELECT` - const dbCheck = await queryPostgres('SELECT current_database() as db, COUNT(*) a
- `src/routes/db-status.js`:
  - Line 20: `SELECT` - const dbResult = await queryPostgres('SELECT current_database(), current_user, v
- `src/scripts/create-all-tables.js`:
  - Line 38: `SELECT` - const testResult = await client.query('SELECT current_database(), current_user, 
- `src/scripts/verify-database-connection-and-data.js`:
  - Line 43: `SELECT` - const pgResult = await queryPostgres('SELECT current_database() as db_name, curr
  - Line 129: `SELECT` - const edcatResult = await queryEdcatAI('SELECT current_database() as db_name, cu

#### `Customer`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/routes/chat.js`:
  - Line 152: `UNKNOWN` - // Get customer requirements (from Customer Data DB: compliance_requirements tab
- `src/scripts/test-all-database-connections.js`:
  - Line 270: `UNKNOWN` - // Test 2: Can we read files from Customer Data DB?

#### `CUSTOMER`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/edcat/orchestrator.js`:
  - Line 254: `UNKNOWN` - // Retrieve all customer procedures, documents, policies from CUSTOMER DATA DB

#### `customer_data`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/complianceGapAnalyzer.js`:
  - Line 71: `SELECT` - FROM customer_data.documents

#### `customer_documents`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 5

**Files using this table:**

- `database.js`:
  - Line 171: `SELECT` - 'SELECT * FROM customer_documents WHERE customer_id = $1 ORDER BY uploaded_at DE
  - Line 200: `UNKNOWN` - JOIN customer_documents cd ON cp.document_id = cd.document_id
- `src/edcat/orchestrator.js`:
  - Line 276: `SELECT` - FROM customer_documents
- `src/services/clauseCorrelationEngine.js`:
  - Line 47: `UNKNOWN` - JOIN customer_documents cd ON cp.document_id = cd.id
- `src/services/trainingManagement.js`:
  - Line 17: `UNKNOWN` - JOIN customer_documents cd ON cp.document_id = cd.id

#### `customer_id`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `src/middleware/customerContext.js`:
  - Line 36: `SELECT` - `SELECT customer_id, customer_name, schema_name, status
- `src/routes/customers.js`:
  - Line 125: `SELECT` - SELECT customer_id, revision, customer_name, company_name, contact_email, schema
  - Line 165: `SELECT` - `SELECT customer_id, revision, customer_name, company_name, contact_email, schem
  - Line 173: `SELECT` - `SELECT customer_id, revision, customer_name, company_name, contact_email, schem

#### `customer_procedures`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 5

**Files using this table:**

- `database.js`:
  - Line 191: `SELECT` - 'SELECT * FROM customer_procedures WHERE document_id = $1',
  - Line 199: `SELECT` - `SELECT cp.* FROM customer_procedures cp
- `src/edcat/orchestrator.js`:
  - Line 263: `SELECT` - FROM customer_procedures
- `src/services/clauseCorrelationEngine.js`:
  - Line 46: `SELECT` - `SELECT cp.* FROM customer_procedures cp
- `src/services/trainingManagement.js`:
  - Line 16: `SELECT` - FROM customer_procedures cp

#### `customers`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 12

**Files using this table:**

- `src/middleware/customerContext.js`:
  - Line 37: `SELECT` - FROM public.customers
- `src/routes/chat.js`:
  - Line 62: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
- `src/routes/customers.js`:
  - Line 126: `SELECT` - FROM public.customers
  - Line 166: `SELECT` - FROM public.customers
  - Line 174: `SELECT` - FROM public.customers
  - Line 239: `UPDATE` - `UPDATE public.customers SET status = 'deleted' WHERE customer_id = $1`,
- `src/routes/feedback.js`:
  - Line 30: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
  - Line 112: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
  - Line 193: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
- `src/routes/learning.js`:
  - Line 26: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
  - Line 92: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
  - Line 134: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,

#### `d`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/database/repos/docs.repo.js`:
  - Line 28: `SELECT` - SELECT d.id, d.title, d.type, d.customer_id,

#### `data`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-agent.js`:
  - Line 10: `UNKNOWN` - - Answer only from data in Postgres and approved packs

#### `database`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 22

**Files using this table:**

- `config/storage.js`:
  - Line 123: `UNKNOWN` - console.log(`[storage] ✅ Retrieved file from database for standard ${standardId}
- `src/middleware/veraConversationMiddleware.js`:
  - Line 160: `UNKNOWN` - // Load persona from database (with fallback to seed)
  - Line 169: `UNKNOWN` - console.log('[vera-conversation] ✓ Loaded persona from database');
- `src/routes/chat.js`:
  - Line 1093: `UNKNOWN` - // Try to load system prompts from database to get better responses
  - Line 1181: `UNKNOWN` - console.error('[chat] Error loading prompts from database:', dbError.message);
- `src/routes/parse.js`:
  - Line 115: `UNKNOWN` - throw new Error('standardId required when reading from database storage');
  - Line 157: `UNKNOWN` - * NEW FUNCTION: Read file content from database blob storage
  - Line 160: `UNKNOWN` - console.log(`📖 Reading file from database blob storage (standardId: ${standardI
  - Line 163: `UNKNOWN` - // Query the file content from database
  - Line 183: `UNKNOWN` - console.log(`✅ Retrieved ${fileSize} bytes from database`);
  - Line 224: `UNKNOWN` - console.error(`❌ Error reading from database: ${error.message}`);
  - Line 611: `UNKNOWN` - // Pass standardId if reading from database
- `src/routes/parser-training.js`:
  - Line 315: `UNKNOWN` - // Get the requirement from database
- `src/scripts/check-all-standards.js`:
  - Line 12: `UNKNOWN` - console.log('1️⃣ Getting ALL standards from database...');
- `src/scripts/diagnose-zero-standards.js`:
  - Line 4: `UNKNOWN` - * This script traces the exact logic flow from database to frontend
- `src/services/complianceGapAnalyzer.js`:
  - Line 350: `UNKNOWN` - * @param {Array} documents - Document objects from database
- `src/services/veraConversationalEngine.js`:
  - Line 17: `UNKNOWN` - // Load Vera knowledge from database (with file system fallback)
  - Line 28: `UNKNOWN` - * Load Vera knowledge from database
  - Line 68: `UNKNOWN` - console.log('[VeraConversationalEngine] ✓ Loaded Vera knowledge from database');
  - Line 70: `UNKNOWN` - console.warn('[VeraConversationalEngine] Could not load knowledge from database:
  - Line 102: `UNKNOWN` - // Try to load from database first, fall back to files
  - Line 329: `UNKNOWN` - // Try to retrieve the clause from database

#### `databases`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/database/connection.js`:
  - Line 108: `UNKNOWN` - // Re-export database functions from databases.js
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 9: `UNKNOWN` - // Import directly from databases.js to avoid DATABASE_URL requirement

#### `DB`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 6

**Files using this table:**

- `EDCAT AIP/server/examples/chat_handler.ts`:
  - Line 20: `UNKNOWN` - // 1) Load configuration from DB (pseudo-code)
- `src/routes/parse.js`:
  - Line 202: `UNKNOWN` - console.log(`✅ Extracted ${pdfData.numpages} pages from PDF (from DB)`);
  - Line 212: `UNKNOWN` - console.log(`✅ Extracted text from DOCX (from DB)`);
  - Line 217: `UNKNOWN` - console.log(`✅ Read ${text.length} characters from TXT (from DB)`);
- `src/services/veraConversationalEngine.js`:
  - Line 538: `UNKNOWN` - // Add expert credentials (always show, even if not loaded from DB)
  - Line 581: `UNKNOWN` - // Default credentials if not loaded from DB/files

#### `default`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/fix-all-schema-errors.js`:
  - Line 66: `UNKNOWN` - // Insert default tenant if it doesn't exist (with key)

#### `deleted`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/customers.js`:
  - Line 239: `UPDATE` - `UPDATE public.customers SET status = 'deleted' WHERE customer_id = $1`,

#### `did`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/comprehensive-system-audit.js`:
  - Line 168: `UPDATE` - throw new Error('UPDATE did not update row');
  - Line 190: `DELETE` - throw new Error('DELETE did not remove row');

#### `DISTINCT`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 22

**Files using this table:**

- `src/routes/chat.js`:
  - Line 69: `SELECT` - `SELECT DISTINCT ON (file_name) document_id, file_name, file_type, file_path, up
  - Line 111: `SELECT` - `SELECT DISTINCT ON (LOWER(TRIM(s.code)))
  - Line 156: `SELECT` - `SELECT DISTINCT
- `src/routes/diagnostics.js`:
  - Line 204: `SELECT` - SELECT DISTINCT ON (standard_id)
- `src/scripts/check-category-filtering.js`:
  - Line 12: `SELECT` - SELECT DISTINCT ON (standard_id)
- `src/scripts/check-standards-with-files.js`:
  - Line 13: `SELECT` - SELECT DISTINCT standard_id
  - Line 51: `SELECT` - SELECT DISTINCT ON (LOWER(TRIM(s.code)))
- `src/scripts/comprehensive-system-audit.js`:
  - Line 290: `SELECT` - SELECT DISTINCT ON (standard_id)
- `src/scripts/debug-standards-filtering.js`:
  - Line 68: `SELECT` - SELECT DISTINCT standard_id
- `src/scripts/diagnose-complete-connection.js`:
  - Line 156: `SELECT` - SELECT DISTINCT ON (standard_id)
- `src/scripts/diagnose-standards-display.js`:
  - Line 82: `SELECT` - SELECT DISTINCT ON (sf.standard_id)
- `src/scripts/diagnose-standards-not-loading.js`:
  - Line 141: `SELECT` - SELECT DISTINCT ON (standard_id)
- `src/scripts/diagnose-standards-visibility.js`:
  - Line 87: `SELECT` - SELECT DISTINCT s.id, s.code, s.name, COUNT(sf.id) as file_count
  - Line 122: `SELECT` - SELECT DISTINCT standard_id
- `src/scripts/diagnose-zero-standards.js`:
  - Line 54: `SELECT` - SELECT DISTINCT ON (standard_id)
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 93: `SELECT` - SELECT DISTINCT
- `src/scripts/test-api-endpoint.js`:
  - Line 27: `SELECT` - SELECT DISTINCT ON (standard_id)
- `src/scripts/verify-database-connections.js`:
  - Line 42: `SELECT` - SELECT DISTINCT standard_id, COUNT(*) as file_count
  - Line 194: `SELECT` - SELECT DISTINCT standard_id
- `src/services/documentManagement.js`:
  - Line 207: `SELECT` - `SELECT DISTINCT email, employee_name
- `src/services/trainingManagement.js`:
  - Line 124: `SELECT` - `SELECT DISTINCT pc.clause_number, pc.clause_title, pc.requirement_type
- `src/services/veraConversationalEngine.js`:
  - Line 687: `SELECT` - SELECT DISTINCT

#### `doc_index`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/database/repos/docs.repo.js`:
  - Line 30: `SELECT` - FROM edcat.doc_index i

#### `document`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/services/clauseExtractor.js`:
  - Line 17: `UNKNOWN` - * Build clause structure from document
- `src/services/complianceGapAnalyzer.js`:
  - Line 400: `UNKNOWN` - console.error(`Error extracting text from document ${doc.document_id}:`, error.m

#### `document_approvals`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 1

**Files using this table:**

- `src/services/documentManagement.js`:
  - Line 195: `SELECT` - `SELECT * FROM document_approvals WHERE doc_id = $1`,

#### `document_content_for_learning`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 13

**Files using this table:**

- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 205: `UNKNOWN` - console.log('   Deleting from document_content_for_learning...');
- `src/scripts/migrate-document-content-to-postgres.js`:
  - Line 5: `UNKNOWN` - * 1. Reads all data from document_content_for_learning in EDCAT AI DB
  - Line 54: `SELECT` - SELECT COUNT(*) as count FROM document_content_for_learning
  - Line 67: `SELECT` - SELECT COUNT(*) as count FROM public.document_content_for_learning
  - Line 92: `SELECT` - FROM document_content_for_learning
  - Line 193: `SELECT` - SELECT COUNT(*) as count FROM public.document_content_for_learning
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 99: `SELECT` - FROM document_content_for_learning dcl
- `src/scripts/verify-database-connections.js`:
  - Line 170: `SELECT` - const learningCount = await queryEdcatAI('SELECT COUNT(*) as count FROM document
- `src/services/veraConversationalEngine.js`:
  - Line 668: `SELECT` - FROM document_content_for_learning
  - Line 681: `SELECT` - SELECT COUNT(DISTINCT file_id) as count FROM document_content_for_learning
  - Line 691: `SELECT` - FROM document_content_for_learning dcl
- `src/services/veraDocumentLearningService.js`:
  - Line 39: `UNKNOWN` - JOIN document_content_for_learning dcl ON ed.file_id = dcl.file_id
  - Line 147: `UNKNOWN` - JOIN document_content_for_learning dcl ON ed.file_id = dcl.file_id

#### `document_id`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/complianceGapAnalyzer.js`:
  - Line 70: `SELECT` - SELECT document_id, file_name, file_path, file_type, uploaded_at

#### `document_versions`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 1

**Files using this table:**

- `src/services/documentManagement.js`:
  - Line 191: `SELECT` - `SELECT * FROM document_versions WHERE doc_id = $1 ORDER BY archived_at DESC`,

#### `documents`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 9

**Files using this table:**

- `src/database/repos/docs.repo.js`:
  - Line 31: `UNKNOWN` - JOIN public.documents d ON d.id = i.document_id
- `src/routes/customers.js`:
  - Line 273: `UNKNOWN` - // Customer procedures extracted from documents
- `src/scripts/fix-all-schema-errors.js`:
  - Line 132: `UPDATE` - await queryPostgres(`UPDATE public.standard_files SET file_category = 'documents
  - Line 132: `UPDATE` - await queryPostgres(`UPDATE public.standard_files SET file_category = 'documents
  - Line 373: `UPDATE` - await queryEdcatAI(`UPDATE public.standard_files SET file_category = 'documents'
  - Line 373: `UPDATE` - await queryEdcatAI(`UPDATE public.standard_files SET file_category = 'documents'
- `src/scripts/process-requirements-folder.js`:
  - Line 3: `UNKNOWN` - * Automatically scans, uploads, parses, and learns from documents in Requirement
- `src/services/complianceGapAnalyzer.js`:
  - Line 106: `UNKNOWN` - // Extract text from documents (simplified - in production, use proper parsing)
  - Line 349: `UNKNOWN` - * Extract text from documents

#### `DOCX`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/routes/parse.js`:
  - Line 139: `UNKNOWN` - console.log(`✅ Extracted text from DOCX`);
  - Line 212: `UNKNOWN` - console.log(`✅ Extracted text from DOCX (from DB)`);
- `src/routes/upload.js`:
  - Line 79: `UNKNOWN` - console.log(`[upload] ✅ Extracted text from DOCX`);

#### `draft`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/documentManagement.js`:
  - Line 81: `UPDATE` - `UPDATE qms_documents SET status = 'draft' WHERE id = $1`,

#### `duplicate`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/cleanup-duplicate-tables.js`:
  - Line 87: `UNKNOWN` - console.log(`      ✅ Postgres table has data - safe to delete duplicate`);
  - Line 91: `DELETE` - console.log(`      ❌ CANNOT DELETE duplicate - Postgres table doesn't exist or i

#### `duplicates`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/cleanup-duplicate-tables.js`:
  - Line 9: `UNKNOWN` - * SOLUTION: Delete duplicates from EDCAT AI DB and ensure all data is in Postgre
  - Line 95: `UNKNOWN` - // Step 5: Delete duplicates (with confirmation prompt simulation)

#### `each`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/migrate-document-content-to-postgres.js`:
  - Line 103: `UNKNOWN` - // Step 5: Insert each record into PostgreSQL

#### `EASA`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/online/adapters/easa.js`:
  - Line 3: `UNKNOWN` - * Fetches PDF documents from EASA website
- `src/online/adapters/easa.ts`:
  - Line 3: `UNKNOWN` - * Fetches PDF documents from EASA website

#### `eCFR`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/online/adapters/ecfr.js`:
  - Line 3: `UNKNOWN` - * Fetches regulations from eCFR.gov
- `src/online/adapters/ecfr.ts`:
  - Line 3: `UNKNOWN` - * Fetches regulations from eCFR.gov

#### `EDCAT`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 46

**Files using this table:**

- `src/database/twoDatabaseMigrations.js`:
  - Line 227: `UNKNOWN` - // Step 3: Cleanup duplicates from EDCAT AI DB
  - Line 241: `UNKNOWN` - // Step 4: Remove duplicate tables from EDCAT AI DB (more aggressive cleanup)
  - Line 269: `UNKNOWN` - // Step 6: Remove dead-end tables from EDCAT AI DB
  - Line 279: `UNKNOWN` - console.error('❌ Remove dead-ends from EDCAT AI failed:', error.message);
- `src/edcat/orchestrator.js`:
  - Line 341: `UNKNOWN` - analysisResult.standardCode || null,  // standard_code from EDCAT AI
  - Line 363: `UNKNOWN` - // Get from EDCAT AI DB
- `src/edcat/parser/clauseParser.js`:
  - Line 23: `UNKNOWN` - // Get standard metadata from EDCAT AI DB
  - Line 35: `UNKNOWN` - // Get all requirements for this standard from EDCAT AI DB
- `src/middleware/veraMiddleware.js`:
  - Line 4: `UNKNOWN` - * Based on server/chat_middleware.ts from EDCAT AIP package
- `src/routes/parse.js`:
  - Line 436: `UNKNOWN` - // Get standard from EDCAT AI DB (where standards are stored)
- `src/routes/regulatory.js`:
  - Line 53: `UNKNOWN` - // Insert new website into EDCAT AI DB (regulatory_websites)
  - Line 95: `UNKNOWN` - // Fetch from EDCAT AI DB (regulatory_websites)
- `src/scripts/audit-all-tables.js`:
  - Line 148: `UNKNOWN` - // Get all tables from EDCAT AI DB
  - Line 211: `UNKNOWN` - console.log('\n\n⚠️  DUPLICATE TABLES (Should be removed from EDCAT AI DB)');
- `src/scripts/cleanup-all-duplicate-tables.js`:
  - Line 7: `UNKNOWN` - * 3. Removes duplicates from EDCAT AI DB
  - Line 70: `UNKNOWN` - // Get ALL tables from EDCAT AI DB
- `src/scripts/cleanup-duplicate-tables.js`:
  - Line 9: `UNKNOWN` - * SOLUTION: Delete duplicates from EDCAT AI DB and ensure all data is in Postgre
  - Line 96: `UNKNOWN` - console.log('\n5️⃣  Deleting duplicate tables from EDCAT AI DB...');
  - Line 97: `UNKNOWN` - console.log('   ⚠️  This will permanently delete these tables from EDCAT AI DB!'
  - Line 102: `UNKNOWN` - console.log(`   🗑️  Dropping ${table.table_name} from EDCAT AI DB...`);
- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 122: `UNKNOWN` - console.log(`   ✅ Deleted ${deletedStandards.rowCount || 0} standards from EDCAT
  - Line 257: `UNKNOWN` - console.log(`   ✅ Deleted ${deletedStandards.rowCount || 0} standards from EDCAT
- `src/scripts/cleanup-standards-without-files.js`:
  - Line 27: `UNKNOWN` - // Step 1: Get all standards from EDCAT AI DB
  - Line 28: `UNKNOWN` - console.log('\n📋 Step 1: Getting all standards from EDCAT AI DB...');
- `src/scripts/consolidate-standards-tables.js`:
  - Line 7: `UNKNOWN` - * 3. Drops duplicate tables from EDCAT AI DB (or renames as backup)
  - Line 68: `UNKNOWN` - console.log(`\n1. Migrate ${uniqueInEdcat.length} unique standards from EDCAT AI
  - Line 73: `UNKNOWN` - console.log(`\n2. Migrate ${uniqueFilesInEdcat.length} unique files from EDCAT A
- `src/scripts/map-all-tables-static.js`:
  - Line 201: `UNKNOWN` - console.log('\n\n⚠️  DUPLICATE TABLES (Should be removed from EDCAT AI DB)');
- `src/scripts/migrate-document-content-to-postgres.js`:
  - Line 2: `UNKNOWN` - * Migrate document_content_for_learning from EDCAT AI DB to PostgreSQL
  - Line 14: `UNKNOWN` - console.log('\n📦 Migrating document_content_for_learning from EDCAT AI DB to Po
  - Line 72: `UNKNOWN` - // Step 4: Fetch all records from EDCAT AI DB in batches
  - Line 73: `UNKNOWN` - console.log('📥 Step 4: Fetching records from EDCAT AI DB...');
  - Line 122: `UNKNOWN` - // Map standard_id from EDCAT AI DB to PostgreSQL standard_id
- `src/scripts/process-requirements-folder.js`:
  - Line 216: `UNKNOWN` - console.log(`[process-requirements] Note: Could not update EDCAT AI standards (e
- `src/scripts/remove-dead-end-tables.js`:
  - Line 80: `UNKNOWN` - // Check and remove from EDCAT AI DB
- `src/scripts/remove-duplicate-tables.js`:
  - Line 2: `UNKNOWN` - * Remove duplicate standards tables from EDCAT AI DB
  - Line 13: `SELECT` - console.log('=== REMOVING DUPLICATE TABLES FROM EDCAT AI DB ===\n');
  - Line 87: `UNKNOWN` - console.log(`  ✓ ${tableName} successfully removed from EDCAT AI DB`);
- `src/scripts/remove-edcat-ai-duplicates.js`:
  - Line 2: `UNKNOWN` - * Remove duplicate standards and standard_files tables from EDCAT AI DB
  - Line 9: `SELECT` - console.log('=== REMOVING DUPLICATE TABLES FROM EDCAT AI DB ===\n');
  - Line 112: `UNKNOWN` - console.log('✓ Duplicate tables removed from EDCAT AI DB');
- `src/scripts/seed-edcat-personality.js`:
  - Line 3: `UNKNOWN` - * Loads all personality data from JSON seed files into EDCAT AI database
- `src/scripts/test-all-database-connections.js`:
  - Line 82: `UNKNOWN` - // First get a valid standard_id from EDCAT AI DB
  - Line 261: `UNKNOWN` - // Test 1: Can we read standards from EDCAT AI DB?
  - Line 279: `UNKNOWN` - // Test 3: Can we read requirements from EDCAT AI DB?
  - Line 360: `UNKNOWN` - // Get a valid standard_id from EDCAT AI DB

#### `embeddings`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/ingest-knowledge-pack.js`:
  - Line 3: `UNKNOWN` - * Converts learning_blocks into embeddings and stores them for the parser
- `src/services/embeddingService.js`:
  - Line 3: `UNKNOWN` - * Converts learning blocks and text into embeddings for semantic search and AI c

#### `employee_competencies`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 4

**Files using this table:**

- `src/services/kpiMetrics.js`:
  - Line 118: `UNKNOWN` - LEFT JOIN employee_competencies ec ON e.id = ec.employee_id
  - Line 180: `UNKNOWN` - LEFT JOIN employee_competencies ec ON e.id = ec.employee_id
- `src/services/trainingManagement.js`:
  - Line 110: `UNKNOWN` - LEFT JOIN employee_competencies ec ON emp.id = ec.employee_id
  - Line 139: `SELECT` - FROM employee_competencies ec

#### `employees`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 4

**Files using this table:**

- `src/services/documentManagement.js`:
  - Line 208: `SELECT` - FROM employees
- `src/services/kpiMetrics.js`:
  - Line 117: `SELECT` - FROM employees e
  - Line 179: `SELECT` - FROM employees e
- `src/services/trainingManagement.js`:
  - Line 109: `SELECT` - FROM employees emp

#### `environment`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/drop-tables-now.js`:
  - Line 31: `UNKNOWN` - // Get DATABASE_URL from environment

#### `example`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/cleanup-standards-without-files.js`:
  - Line 166: `UNKNOWN` - console.log(`   ℹ️  Could not delete example records (table may not exist)`);
- `src/services/veraDocumentLearningService.js`:
  - Line 3: `UNKNOWN` - * Allows Vera to learn from example documents and generate similar documents

#### `example_documents`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 7

**Files using this table:**

- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 214: `UNKNOWN` - console.log('   Deleting from example_documents...');
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 100: `UNKNOWN` - LEFT JOIN example_documents ed ON ed.file_id = dcl.file_id
- `src/services/veraConversationalEngine.js`:
  - Line 675: `SELECT` - SELECT COUNT(*) as count FROM example_documents
  - Line 692: `UNKNOWN` - LEFT JOIN example_documents ed ON ed.file_id = dcl.file_id
- `src/services/veraDocumentLearningService.js`:
  - Line 38: `SELECT` - FROM example_documents ed
  - Line 146: `SELECT` - FROM example_documents ed
  - Line 175: `UPDATE` - `UPDATE example_documents

#### `examples`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/veraDocumentLearningService.js`:
  - Line 62: `UNKNOWN` - * Get document structure patterns from examples

#### `Examples`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 12

**Files using this table:**

- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 9: `UNKNOWN` - * 2. Finds all standards that were created only from Examples folder
  - Line 36: `UNKNOWN` - console.log('   Checking EDCAT AI DB for standards that might have been created 
  - Line 50: `UNKNOWN` - // Identify standards that look like they came from Examples folder
  - Line 77: `UNKNOWN` - console.log(`\n   ⚠️  Found ${examplesStandards.length} standards that appear to
  - Line 137: `UNKNOWN` - // Step 1: Find all files from Examples folder
  - Line 138: `UNKNOWN` - console.log('\n📋 Step 1: Finding files from Examples folder...');
  - Line 145: `UNKNOWN` - console.log(`   Found ${exampleFiles.rows.length} files from Examples folder`);
  - Line 148: `UNKNOWN` - console.log('\n✅ No files from Examples folder found. Nothing to clean up.');
  - Line 158: `UNKNOWN` - // Step 2: Find standards that only have files from Examples folder
  - Line 159: `UNKNOWN` - console.log('\n📋 Step 2: Finding standards created from Examples folder...');
  - Line 164: `UNKNOWN` - // Check which standards ONLY have files from Examples (should be deleted)
  - Line 177: `UNKNOWN` - // This standard only has files from Examples - should be deleted

#### `Excel`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/upload.js`:
  - Line 96: `UNKNOWN` - console.log(`[upload] ✅ Extracted text from Excel`);

#### `executable`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/database/twoDatabaseMigrations.js`:
  - Line 26: `UNKNOWN` - * Split SQL into executable statements
- `src/scripts/run-edcat-migration-only.js`:
  - Line 19: `UNKNOWN` - * Split SQL into executable statements (handles dollar-quoted strings)
- `src/scripts/run-migrations.js`:
  - Line 21: `UNKNOWN` - * Split SQL into executable statements (handles DO $$ blocks and dollar-quoted s

#### `existing`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/routes/parse.js`:
  - Line 648: `UNKNOWN` - // Delete existing requirements if force re-parse
  - Line 737: `UNKNOWN` - // Update existing requirement with all new fields including sub-refs
- `src/scripts/seed-edcat-personality.js`:
  - Line 122: `UNKNOWN` - // Update existing

#### `EXISTS`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 57

**Files using this table:**

- `src/database/schema.js`:
  - Line 171: `SELECT` - `SELECT EXISTS (
- `src/routes/diagnostics.js`:
  - Line 103: `SELECT` - SELECT EXISTS (
- `src/scripts/audit-postgres-tables.js`:
  - Line 168: `SELECT` - SELECT EXISTS (
- `src/scripts/check-standards-table-exists.js`:
  - Line 64: `SELECT` - SELECT EXISTS (
- `src/scripts/cleanup-backup-tables.js`:
  - Line 21: `SELECT` - SELECT EXISTS (
- `src/scripts/cleanup-edcat-ai-backups.js`:
  - Line 19: `SELECT` - SELECT EXISTS (
- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 27: `SELECT` - `SELECT EXISTS (
- `src/scripts/cleanup-standards-without-files.js`:
  - Line 50: `SELECT` - SELECT EXISTS (
- `src/scripts/comprehensive-system-audit.js`:
  - Line 80: `SELECT` - SELECT EXISTS (
- `src/scripts/create-standard-files-table.js`:
  - Line 14: `SELECT` - SELECT EXISTS (
- `src/scripts/create-standards-table-directly.js`:
  - Line 99: `SELECT` - SELECT EXISTS (
- `src/scripts/diagnose-complete-connection.js`:
  - Line 41: `SELECT` - SELECT EXISTS (
- `src/scripts/diagnose-postgres-errors.js`:
  - Line 88: `SELECT` - SELECT EXISTS (
  - Line 137: `SELECT` - const publicFilesExists = await queryPostgres(`SELECT EXISTS (SELECT FROM inform
- `src/scripts/diagnose-standards-visibility.js`:
  - Line 44: `SELECT` - SELECT EXISTS (
- `src/scripts/diagnose-upload-issue.js`:
  - Line 29: `SELECT` - SELECT EXISTS (
- `src/scripts/diagnose-zero-standards.js`:
  - Line 32: `SELECT` - SELECT EXISTS (
- `src/scripts/ensure-parsed-requirements-table-robust.js`:
  - Line 17: `SELECT` - SELECT EXISTS (
- `src/scripts/ensure-parsed-requirements-table.js`:
  - Line 14: `SELECT` - SELECT EXISTS (
- `src/scripts/fix-all-schema-errors.js`:
  - Line 20: `SELECT` - SELECT EXISTS (
  - Line 99: `SELECT` - SELECT EXISTS (
  - Line 136: `SELECT` - SELECT EXISTS (
  - Line 144: `SELECT` - SELECT EXISTS (
  - Line 175: `SELECT` - SELECT EXISTS (
  - Line 199: `SELECT` - SELECT EXISTS (
  - Line 238: `SELECT` - SELECT EXISTS (
  - Line 256: `SELECT` - SELECT EXISTS (
  - Line 265: `SELECT` - SELECT EXISTS (
  - Line 327: `SELECT` - SELECT EXISTS (
  - Line 338: `SELECT` - SELECT EXISTS (
  - Line 387: `SELECT` - SELECT EXISTS (
- `src/scripts/fix-postgres-errors.js`:
  - Line 23: `SELECT` - SELECT EXISTS (
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 58: `SELECT` - SELECT EXISTS (
- `src/scripts/remove-dead-end-tables.js`:
  - Line 53: `SELECT` - SELECT EXISTS (
  - Line 88: `SELECT` - SELECT EXISTS (
  - Line 97: `SELECT` - SELECT EXISTS (
- `src/scripts/remove-duplicate-tables.js`:
  - Line 47: `SELECT` - SELECT EXISTS (
  - Line 77: `SELECT` - SELECT EXISTS (
- `src/scripts/remove-edcat-ai-duplicates.js`:
  - Line 39: `SELECT` - SELECT EXISTS (
  - Line 69: `SELECT` - SELECT EXISTS (
  - Line 92: `SELECT` - SELECT EXISTS (
- `src/scripts/test-all-database-connections.js`:
  - Line 63: `SELECT` - SELECT EXISTS (
  - Line 140: `SELECT` - SELECT EXISTS (
  - Line 202: `SELECT` - SELECT EXISTS (
- `src/scripts/test-api-endpoint.js`:
  - Line 17: `SELECT` - SELECT EXISTS (
- `src/scripts/test-upload-flow.js`:
  - Line 35: `SELECT` - SELECT EXISTS (
- `src/scripts/verify-database-connection-and-data.js`:
  - Line 50: `SELECT` - SELECT EXISTS (
  - Line 135: `SELECT` - SELECT EXISTS (
- `src/scripts/verify-database-connections-complete.js`:
  - Line 45: `SELECT` - SELECT EXISTS (
- `src/scripts/verify-database-connections.js`:
  - Line 27: `SELECT` - SELECT EXISTS (
  - Line 63: `SELECT` - SELECT EXISTS (
  - Line 92: `SELECT` - SELECT EXISTS (
  - Line 134: `SELECT` - SELECT EXISTS (
  - Line 164: `SELECT` - SELECT EXISTS (
- `src/scripts/verify-standards-table-contents.js`:
  - Line 15: `SELECT` - SELECT EXISTS (
- `src/scripts/verify-standards-table-exists.js`:
  - Line 29: `SELECT` - SELECT EXISTS (
- `src/services/industryModules/industryFactory.js`:
  - Line 18: `SELECT` - `SELECT EXISTS (

#### `FAILED`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/comprehensive-system-audit.js`:
  - Line 171: `UPDATE` - console.log(`   ❌ UPDATE FAILED: ${error.message}`);
  - Line 193: `DELETE` - console.log(`   ❌ DELETE FAILED: ${error.message}`);

#### `feedback`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/edcat/learning/learningSystem.js`:
  - Line 3: `UNKNOWN` - * Continuously improves from feedback and usage patterns
- `src/edcat/orchestrator.js`:
  - Line 37: `UNKNOWN` - * 6. Learn from feedback (improvement)
- `src/routes/gap.js`:
  - Line 135: `UNKNOWN` - // Insert feedback into public.audit_trail (or create a feedback table if needed

#### `file`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 5

**Files using this table:**

- `setup-db.js`:
  - Line 53: `UNKNOWN` - // Read schema from file or use inline
- `src/scripts/cleanup-standards-without-files.js`:
  - Line 185: `UNKNOWN` - console.log(`   ⚠️  Could not delete file records: ${fileError.message}`);
- `src/scripts/process-requirements-folder.js`:
  - Line 42: `UNKNOWN` - * Extract text from file
- `src/services/parseService.js`:
  - Line 27: `UNKNOWN` - throw new Error('No text extracted from file');
- `src/services/veraConversationalEngine.js`:
  - Line 77: `UNKNOWN` - * Load Vera knowledge from file system (fallback)

#### `file_category`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/diagnose-standards-not-loading.js`:
  - Line 88: `SELECT` - SELECT file_category, COUNT(*) as count

#### `file_content`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `config/storage.js`:
  - Line 113: `SELECT` - `SELECT file_content, file_size FROM public.standard_files_content WHERE standar
- `src/routes/parse.js`:
  - Line 167: `SELECT` - `SELECT file_content, file_size, file_name as filename

#### `file_path`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/routes/parse.js`:
  - Line 514: `SELECT` - `SELECT file_path FROM public.standards
- `src/routes/requirements.js`:
  - Line 617: `SELECT` - `SELECT file_path FROM public.standards WHERE id = $1`,
- `src/routes/upload.js`:
  - Line 470: `SELECT` - 'SELECT file_path FROM public.standard_files WHERE id = $1',

#### `filename`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 7

**Files using this table:**

- `scripts/migrate.js`:
  - Line 126: `SELECT` - `SELECT filename, checksum FROM public.${LEDGER_TABLE}`
- `src/database/migrate-on-startup.js`:
  - Line 53: `SELECT` - 'SELECT filename FROM edcat.migrations WHERE filename = $1',
- `src/routes/upload.js`:
  - Line 290: `UNKNOWN` - // Determine standard code and name from filename or use generic
- `src/scripts/process-requirements-folder.js`:
  - Line 304: `UNKNOWN` - // Extract standard code from filename if not provided
  - Line 326: `UNKNOWN` - * Extract standard code from filename or folder path
  - Line 472: `UNKNOWN` - // Extract standard code from filename and folder path
- `src/scripts/run-migration.js`:
  - Line 37: `SELECT` - 'SELECT filename FROM edcat.migrations WHERE filename = $1',

#### `filePath`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `config/storage.js`:
  - Line 65: `UNKNOWN` - // Use provided filename or extract from filePath

#### `files`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 200: `UNKNOWN` - // Step 3: Delete files from standard_files
  - Line 222: `UNKNOWN` - // Delete files from standard_files
- `src/services/veraConversationalEngine.js`:
  - Line 96: `UNKNOWN` - console.log('[VeraConversationalEngine] ✓ Loaded Vera knowledge from files (fall
  - Line 98: `UNKNOWN` - console.warn('[VeraConversationalEngine] Could not load knowledge from files:', 

#### `filesystem`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `config/storage.js`:
  - Line 131: `UNKNOWN` - console.log(`[storage] ✅ Retrieved file from filesystem: ${filePath} (${buffer.l

#### `fk`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/dbIntrospectService.js`:
  - Line 282: `SELECT` - FROM fk

#### `formatRequirementsList`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/services/requirementsFormatter.js`:
  - Line 113: `UNKNOWN` - * @param {Object} structuredRequirements - Output from formatRequirementsList
  - Line 155: `UNKNOWN` - * @param {Object} structuredRequirements - Output from formatRequirementsList
  - Line 201: `UNKNOWN` - * @param {Object} structuredRequirements - Output from formatRequirementsList

#### `from`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 17

**Files using this table:**

- `src/routes/regulatory.js`:
  - Line 147: `UNKNOWN` - // Delete from EDCAT AI DB (regulatory_websites)
- `src/routes/upload.js`:
  - Line 483: `UNKNOWN` - // Delete from database (Customer Data DB)
- `src/scripts/audit-all-tables.js`:
  - Line 222: `DELETE` - console.log(`     → DELETE from EDCAT AI DB (use Postgres version)`);
- `src/scripts/cleanup-all-duplicate-tables.js`:
  - Line 126: `DELETE` - console.log(`     → Action: DELETE from EDCAT AI DB`);
  - Line 142: `DELETE` - console.log(`     → Action: DELETE from EDCAT AI DB (should only exist in Postgr
- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 100: `UNKNOWN` - // Delete from document_content_for_learning
  - Line 108: `UNKNOWN` - // Delete from example_documents
  - Line 204: `UNKNOWN` - // Delete from document_content_for_learning first (foreign key)
  - Line 213: `UNKNOWN` - // Delete from example_documents
  - Line 235: `UNKNOWN` - // Delete from document_content_for_learning (by standard_id)
  - Line 243: `UNKNOWN` - // Delete from example_documents (by standard_id)
- `src/scripts/cleanup-standards-without-files.js`:
  - Line 136: `UNKNOWN` - // Delete from parsed_requirements (EDCAT AI DB)
  - Line 143: `UNKNOWN` - // Delete from document_content_for_learning (EDCAT AI DB)
  - Line 156: `UNKNOWN` - // Delete from example_documents (EDCAT AI DB)
  - Line 169: `UNKNOWN` - // Delete from standards table (EDCAT AI DB)
  - Line 176: `UNKNOWN` - // Delete from standard_files (Customer Data DB) if it exists
- `src/scripts/map-all-tables-static.js`:
  - Line 210: `DELETE` - console.log(`     → Action: DELETE from EDCAT AI DB`);

#### `FROM`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 79

**Files using this table:**

- `src/routes/diagnostics.js`:
  - Line 104: `SELECT` - SELECT FROM information_schema.tables
- `src/routes/parse.js`:
  - Line 652: `DELETE` - await queryPostgres(`DELETE FROM public.compliance_requirements WHERE standard_i
- `src/routes/requirements.js`:
  - Line 612: `DELETE` - await queryPostgres(`DELETE FROM public.parsed_requirements WHERE standard_id = 
  - Line 638: `DELETE` - await queryPostgres(`DELETE FROM public.standards WHERE id = $1`, [standardId]);
- `src/routes/upload.js`:
  - Line 484: `DELETE` - await queryPostgres('DELETE FROM public.standard_files WHERE id = $1', [fileId])
- `src/scripts/audit-postgres-tables.js`:
  - Line 169: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/cleanup-all-duplicate-tables.js`:
  - Line 161: `DELETE` - console.log('\n\n🗑️  TABLES TO DELETE FROM EDCAT AI DB:');
- `src/scripts/cleanup-backup-tables.js`:
  - Line 22: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/cleanup-edcat-ai-backups.js`:
  - Line 20: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 28: `SELECT` - SELECT FROM information_schema.tables
  - Line 102: `DELETE` - `DELETE FROM document_content_for_learning
  - Line 110: `DELETE` - `DELETE FROM example_documents
  - Line 118: `DELETE` - `DELETE FROM standards
  - Line 207: `DELETE` - `DELETE FROM document_content_for_learning
  - Line 216: `DELETE` - `DELETE FROM example_documents
  - Line 224: `DELETE` - `DELETE FROM public.standard_files
  - Line 237: `DELETE` - `DELETE FROM document_content_for_learning
  - Line 245: `DELETE` - `DELETE FROM example_documents
  - Line 253: `DELETE` - `DELETE FROM standards
- `src/scripts/cleanup-standards-without-files.js`:
  - Line 51: `SELECT` - SELECT FROM information_schema.tables
  - Line 138: `DELETE` - `DELETE FROM parsed_requirements WHERE standard_id = $1`,
  - Line 146: `DELETE` - `DELETE FROM document_content_for_learning
  - Line 159: `DELETE` - `DELETE FROM example_documents
  - Line 171: `DELETE` - `DELETE FROM standards WHERE id = $1`,
  - Line 180: `DELETE` - `DELETE FROM public.standard_files WHERE standard_id = $1`,
- `src/scripts/comprehensive-system-audit.js`:
  - Line 81: `SELECT` - SELECT FROM information_schema.tables
  - Line 179: `DELETE` - await queryPostgres(`DELETE FROM public.standards WHERE id = $1`, [testId]);
- `src/scripts/comprehensive-table-audit.js`:
  - Line 132: `SELECT` - // SELECT FROM table
- `src/scripts/create-standard-files-table.js`:
  - Line 15: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/diagnose-complete-connection.js`:
  - Line 42: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/diagnose-postgres-errors.js`:
  - Line 89: `SELECT` - SELECT FROM information_schema.tables
  - Line 137: `SELECT` - const publicFilesExists = await queryPostgres(`SELECT EXISTS (SELECT FROM inform
- `src/scripts/diagnose-standards-visibility.js`:
  - Line 45: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/diagnose-zero-standards.js`:
  - Line 33: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/ensure-parsed-requirements-table-robust.js`:
  - Line 18: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/ensure-parsed-requirements-table.js`:
  - Line 15: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/find-standards-table-schema.js`:
  - Line 50: `SELECT` - console.log(`   ✅ SELECT FROM standards: ${test1.rows[0].count} rows`);
  - Line 52: `SELECT` - console.log(`   ❌ SELECT FROM standards: ${e.message}`);
  - Line 58: `SELECT` - console.log(`   ✅ SELECT FROM public.standards: ${test2.rows[0].count} rows`);
  - Line 60: `SELECT` - console.log(`   ❌ SELECT FROM public.standards: ${e.message}`);
- `src/scripts/fix-all-schema-errors.js`:
  - Line 21: `SELECT` - SELECT FROM information_schema.tables
  - Line 100: `SELECT` - SELECT FROM information_schema.tables
  - Line 137: `SELECT` - SELECT FROM information_schema.columns
  - Line 145: `SELECT` - SELECT FROM information_schema.columns
  - Line 176: `SELECT` - SELECT FROM information_schema.columns
  - Line 200: `SELECT` - SELECT FROM information_schema.tables
  - Line 239: `SELECT` - SELECT FROM information_schema.tables
  - Line 257: `SELECT` - SELECT FROM information_schema.tables
  - Line 266: `SELECT` - SELECT FROM information_schema.columns
  - Line 328: `SELECT` - SELECT FROM information_schema.tables
  - Line 339: `SELECT` - SELECT FROM information_schema.tables
  - Line 388: `SELECT` - SELECT FROM information_schema.columns
- `src/scripts/fix-all-standards-issues.js`:
  - Line 46: `DELETE` - await pool.query('DELETE FROM public.standards WHERE id = $1', [id]);
- `src/scripts/fix-postgres-errors.js`:
  - Line 24: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 59: `SELECT` - SELECT FROM information_schema.tables
  - Line 64: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/remove-duplicate-tables.js`:
  - Line 48: `SELECT` - SELECT FROM information_schema.tables
  - Line 78: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/remove-edcat-ai-duplicates.js`:
  - Line 40: `SELECT` - SELECT FROM information_schema.tables
  - Line 70: `SELECT` - SELECT FROM information_schema.tables
  - Line 93: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/test-all-database-connections.js`:
  - Line 64: `SELECT` - SELECT FROM information_schema.tables
  - Line 141: `SELECT` - SELECT FROM information_schema.tables
  - Line 203: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/test-api-endpoint.js`:
  - Line 18: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/test-upload-flow.js`:
  - Line 36: `SELECT` - SELECT FROM information_schema.tables
  - Line 135: `DELETE` - await queryPostgres(`DELETE FROM public.standard_files WHERE id = $1`, [fileId])
  - Line 136: `DELETE` - await queryPostgres(`DELETE FROM public.standards WHERE id = $1`, [created.id]);
- `src/scripts/verify-database-connection-and-data.js`:
  - Line 51: `SELECT` - SELECT FROM information_schema.tables
  - Line 136: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/verify-database-connections-complete.js`:
  - Line 46: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/verify-database-connections.js`:
  - Line 28: `SELECT` - SELECT FROM information_schema.tables
  - Line 64: `SELECT` - SELECT FROM information_schema.tables
  - Line 93: `SELECT` - SELECT FROM information_schema.tables
  - Line 135: `SELECT` - SELECT FROM information_schema.tables
  - Line 165: `SELECT` - SELECT FROM information_schema.tables
- `src/scripts/verify-standards-table-contents.js`:
  - Line 16: `SELECT` - SELECT FROM information_schema.tables
- `src/services/industryModules/industryFactory.js`:
  - Line 19: `SELECT` - SELECT FROM information_schema.tables
  - Line 121: `DELETE` - `DELETE FROM tenant_industry_modules

#### `gap`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/routes/capa.js`:
  - Line 7: `UNKNOWN` - // Auto-generate CAPA from gap/clause
- `src/services/capaSystem.js`:
  - Line 13: `UNKNOWN` - console.log(`[CAPA] Generating CAPA from gap ${gapId}...`);

#### `gap_analyses`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 13

**Files using this table:**

- `database.js`:
  - Line 235: `UNKNOWN` - JOIN gap_analyses ga ON ga.analysis_id = $1
  - Line 287: `UPDATE` - `UPDATE gap_analyses
  - Line 298: `SELECT` - 'SELECT * FROM gap_analyses WHERE analysis_id = $1',
  - Line 306: `SELECT` - 'SELECT * FROM gap_analyses WHERE customer_id = $1 ORDER BY analyzed_at DESC',
- `src/database/schema.js`:
  - Line 189: `UPDATE` - `UPDATE public.gap_analyses
- `src/routes/admin.js`:
  - Line 66: `SELECT` - `SELECT COUNT(*) as count FROM public.gap_analyses
- `src/routes/gap.js`:
  - Line 177: `SELECT` - `SELECT * FROM public.gap_analyses
  - Line 323: `UNKNOWN` - // Try to get learning data from gap_analyses table (which exists in public sche
  - Line 332: `SELECT` - FROM public.gap_analyses
- `src/scripts/fix-all-schema-errors.js`:
  - Line 212: `UPDATE` - UPDATE public.gap_analyses
  - Line 219: `UPDATE` - UPDATE public.gap_analyses
- `src/services/edcatQMSIntegration.js`:
  - Line 89: `SELECT` - `SELECT * FROM gap_analyses
- `src/services/kpiMetrics.js`:
  - Line 51: `SELECT` - FROM gap_analyses

#### `gaps`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/edcatQMSIntegration.js`:
  - Line 3: `UNKNOWN` - * Orchestrates end-to-end workflow from gaps → CAPA → procedures → training → KP

#### `greeting`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/chat.js`:
  - Line 209: `UNKNOWN` - // Handle greeting responses (from greeting engine)

#### `i`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 3

**Files using this table:**

- `src/services/internationalization/i18nManager.js`:
  - Line 25: `SELECT` - `SELECT translated_text FROM i18n_translations
  - Line 33: `SELECT` - `SELECT translated_text FROM i18n_translations
  - Line 56: `SELECT` - FROM i18n_translations

#### `if`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/pull-vera-learning-standards.js`:
  - Line 154: `UNKNOWN` - // Update if it doesn't have uploaded_at (was a seed standard)
- `src/services/textSanitizer.js`:
  - Line 35: `UNKNOWN` - // Only join if it looks like a word break (capital after lowercase)

#### `im`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/industryModules/industryFactory.js`:
  - Line 136: `SELECT` - `SELECT im.module_code, im.module_name, im.industry_sector,

#### `in`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/routes/requirements.js`:
  - Line 718: `UNKNOWN` - // Update in EDCAT AI DB
- `src/scripts/process-requirements-folder.js`:
  - Line 197: `UNKNOWN` - // Also create/update in EDCAT AI DB for Vera's learning (if table exists)

#### `indexname`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/audit-postgres-tables.js`:
  - Line 193: `SELECT` - SELECT indexname
- `src/scripts/verify-vera-tables.js`:
  - Line 89: `SELECT` - SELECT indexname

#### `individual`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `scripts/apply-schema.js`:
  - Line 65: `UNKNOWN` - * Split SQL content into individual statements
- `setup-db.js`:
  - Line 73: `UNKNOWN` - // Split schema into individual statements
- `src/database/migrations/001_initial_schema.js`:
  - Line 29: `UNKNOWN` - // Split schema into individual statements

#### `industry_modules`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 2

**Files using this table:**

- `src/services/industryModules/industryFactory.js`:
  - Line 34: `SELECT` - FROM industry_modules
  - Line 139: `UNKNOWN` - JOIN industry_modules im ON tim.module_id = im.id

#### `information_schema`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 93

**Files using this table:**

- `scripts/apply-schema.js`:
  - Line 235: `SELECT` - FROM information_schema.tables
- `setup-db.js`:
  - Line 127: `SELECT` - FROM information_schema.tables
- `src/database/migrate.js`:
  - Line 187: `SELECT` - FROM information_schema.tables
- `src/database/schema.js`:
  - Line 173: `SELECT` - FROM information_schema.tables
  - Line 412: `SELECT` - FROM information_schema.tables
- `src/database/twoDatabaseMigrations.js`:
  - Line 166: `SELECT` - FROM information_schema.tables
- `src/routes/customers.js`:
  - Line 49: `SELECT` - `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
- `src/routes/db-status.js`:
  - Line 41: `SELECT` - FROM information_schema.tables
- `src/routes/test-db.js`:
  - Line 23: `SELECT` - FROM information_schema.tables
- `src/scripts/apply-fixed-schema.js`:
  - Line 65: `SELECT` - FROM information_schema.tables
- `src/scripts/audit-all-tables.js`:
  - Line 100: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns
  - Line 102: `SELECT` - FROM information_schema.tables t
  - Line 155: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns
  - Line 157: `SELECT` - FROM information_schema.tables t
- `src/scripts/audit-postgres-tables.js`:
  - Line 20: `SELECT` - FROM information_schema.tables
  - Line 49: `SELECT` - FROM information_schema.columns
  - Line 149: `SELECT` - FROM information_schema.table_constraints AS tc
  - Line 150: `UNKNOWN` - JOIN information_schema.key_column_usage AS kcu
  - Line 153: `UNKNOWN` - JOIN information_schema.constraint_column_usage AS ccu
- `src/scripts/check-all-schemas.js`:
  - Line 13: `SELECT` - FROM information_schema.schemata
  - Line 30: `SELECT` - FROM information_schema.tables
- `src/scripts/check-edcat-ai-tables.js`:
  - Line 13: `SELECT` - FROM information_schema.tables
  - Line 57: `SELECT` - FROM information_schema.tables
- `src/scripts/check-postgres-duplicate-tables.js`:
  - Line 13: `SELECT` - FROM information_schema.tables
- `src/scripts/check-standards-table-exists.js`:
  - Line 30: `SELECT` - FROM information_schema.schemata
  - Line 47: `SELECT` - FROM information_schema.tables
  - Line 65: `SELECT` - SELECT 1 FROM information_schema.tables
  - Line 77: `SELECT` - FROM information_schema.columns
  - Line 140: `SELECT` - FROM information_schema.tables
- `src/scripts/cleanup-all-duplicate-tables.js`:
  - Line 34: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns
  - Line 36: `SELECT` - FROM information_schema.tables t
  - Line 76: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns
  - Line 78: `SELECT` - FROM information_schema.tables t
- `src/scripts/cleanup-duplicate-tables.js`:
  - Line 26: `SELECT` - FROM information_schema.tables
  - Line 46: `SELECT` - FROM information_schema.tables
  - Line 114: `SELECT` - FROM information_schema.tables
- `src/scripts/create-all-tables.js`:
  - Line 404: `SELECT` - FROM information_schema.tables
- `src/scripts/create-blueprint-tables.js`:
  - Line 81: `SELECT` - FROM information_schema.tables
  - Line 103: `SELECT` - FROM information_schema.tables
- `src/scripts/create-standard-files-table.js`:
  - Line 27: `SELECT` - FROM information_schema.columns
  - Line 85: `SELECT` - FROM information_schema.columns
- `src/scripts/create-standards-table-directly.js`:
  - Line 100: `SELECT` - SELECT 1 FROM information_schema.columns
- `src/scripts/diagnose-postgres-errors.js`:
  - Line 16: `SELECT` - FROM information_schema.schemata
  - Line 33: `SELECT` - FROM information_schema.tables
  - Line 67: `SELECT` - FROM information_schema.columns
  - Line 112: `SELECT` - FROM information_schema.tables
- `src/scripts/diagnose-upload-issue.js`:
  - Line 30: `SELECT` - SELECT 1 FROM information_schema.tables
  - Line 46: `SELECT` - FROM information_schema.columns
- `src/scripts/drop-standard-files-tables.js`:
  - Line 16: `SELECT` - FROM information_schema.tables
  - Line 60: `SELECT` - FROM information_schema.tables
- `src/scripts/drop-tables-now.js`:
  - Line 54: `SELECT` - FROM information_schema.tables
  - Line 87: `SELECT` - FROM information_schema.tables
- `src/scripts/ensure-parsed-requirements-table-robust.js`:
  - Line 30: `SELECT` - FROM information_schema.columns
- `src/scripts/find-all-standards-tables.js`:
  - Line 24: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_sc
  - Line 25: `SELECT` - FROM information_schema.tables t
  - Line 60: `SELECT` - FROM information_schema.schemata
  - Line 77: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_sc
  - Line 78: `SELECT` - FROM information_schema.tables t
  - Line 116: `SELECT` - FROM information_schema.columns
  - Line 137: `SELECT` - FROM information_schema.tables
  - Line 153: `SELECT` - FROM information_schema.columns
- `src/scripts/find-standards-table-schema.js`:
  - Line 29: `SELECT` - FROM information_schema.tables
- `src/scripts/fix-all-schema-errors.js`:
  - Line 70: `SELECT` - FROM information_schema.columns
- `src/scripts/identify-all-standards-tables.js`:
  - Line 20: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_sc
  - Line 21: `SELECT` - FROM information_schema.tables t
  - Line 58: `SELECT` - (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_sc
  - Line 59: `SELECT` - FROM information_schema.tables t
- `src/scripts/learnNightly.js`:
  - Line 161: `SELECT` - FROM information_schema.schemata
- `src/scripts/remove-dead-end-tables.js`:
  - Line 54: `SELECT` - SELECT 1 FROM information_schema.tables
  - Line 89: `SELECT` - SELECT 1 FROM information_schema.tables
  - Line 98: `SELECT` - SELECT 1 FROM information_schema.tables
- `src/scripts/restore-standard-files.js`:
  - Line 13: `SELECT` - FROM information_schema.columns
  - Line 21: `SELECT` - FROM information_schema.columns
- `src/scripts/restore-standards-from-backup.js`:
  - Line 26: `SELECT` - FROM information_schema.columns
  - Line 73: `SELECT` - FROM information_schema.columns
  - Line 81: `SELECT` - FROM information_schema.columns
- `src/scripts/run-edcat-migration-only.js`:
  - Line 150: `SELECT` - FROM information_schema.tables
- `src/scripts/run-migrations.js`:
  - Line 161: `SELECT` - FROM information_schema.tables
  - Line 177: `SELECT` - FROM information_schema.tables
- `src/scripts/test-all-database-connections.js`:
  - Line 223: `SELECT` - FROM information_schema.columns
- `src/scripts/test-upload-flow.js`:
  - Line 21: `SELECT` - FROM information_schema.columns
  - Line 47: `SELECT` - FROM information_schema.columns
- `src/scripts/verify-database-connection-and-data.js`:
  - Line 109: `SELECT` - FROM information_schema.tables
- `src/scripts/verify-database-connections-complete.js`:
  - Line 117: `SELECT` - FROM information_schema.columns
- `src/scripts/verify-standards-table-contents.js`:
  - Line 36: `SELECT` - FROM information_schema.columns
- `src/scripts/verify-standards-table-exists.js`:
  - Line 31: `SELECT` - FROM information_schema.tables
  - Line 43: `SELECT` - FROM information_schema.columns
- `src/scripts/verify-tables.js`:
  - Line 22: `SELECT` - FROM information_schema.schemata
  - Line 45: `SELECT` - FROM information_schema.tables
  - Line 321: `SELECT` - FROM information_schema.tables
- `src/scripts/verify-vera-tables.js`:
  - Line 31: `SELECT` - FROM information_schema.columns
- `src/services/dbIntrospectService.js`:
  - Line 340: `SELECT` - FROM information_schema.table_constraints tc
  - Line 341: `UNKNOWN` - JOIN information_schema.key_column_usage kcu

#### `integrations`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 1

**Files using this table:**

- `src/services/integrations/integrationMarketplace.js`:
  - Line 265: `UPDATE` - `UPDATE integrations SET last_sync_at = NOW() WHERE id = $1`,

#### `intelligence`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 177: `UNKNOWN` - // Update intelligence based on feedback

#### `into`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/migrate-document-content-to-postgres.js`:
  - Line 145: `UNKNOWN` - // Insert into PostgreSQL

#### `INTO`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 118

**Files using this table:**

- `config/storage.js`:
  - Line 69: `INSERT` - `INSERT INTO public.standard_files_content (standard_id, file_content, file_size
- `database.js`:
  - Line 65: `INSERT` - `INSERT INTO compliance_standards (code, name, sector, version, model_version_us
  - Line 102: `INSERT` - `INSERT INTO compliance_requirements
  - Line 126: `INSERT` - `INSERT INTO extraction_history
  - Line 146: `INSERT` - `INSERT INTO model_versions (version, baseline_accuracy, reason_for_update)
  - Line 161: `INSERT` - `INSERT INTO customer_documents (customer_id, file_name, file_path, file_size)
  - Line 181: `INSERT` - `INSERT INTO customer_procedures (document_id, procedure_text, confidence)
  - Line 211: `INSERT` - `INSERT INTO requirement_mappings
  - Line 249: `INSERT` - `INSERT INTO gap_analyses
  - Line 324: `INSERT` - `INSERT INTO analysis_clarifications
- `EDCAT AIP/server/seed_loader.ts`:
  - Line 14: `INSERT` - INSERT INTO ai_policy (tenant_id, name, content)
  - Line 21: `INSERT` - INSERT INTO ai_prompt (tenant_id, persona_code, kind, name, content)
  - Line 32: `INSERT` - INSERT INTO ai_standard (tenant_id, code, revision, title, authority, citation_s
  - Line 41: `INSERT` - INSERT INTO ai_clause_blueprint (tenant_id, standard_id, clause_id, label, paren
  - Line 49: `INSERT` - INSERT INTO ai_crosswalk_blueprint (tenant_id, standard_id, target_family)
- `EDCAT AIP/server/vera_chat_handler_example.ts`:
  - Line 35: `INSERT` - INSERT INTO ai_conversation_state (tenant_id, session_id, persona_code, last_int
  - Line 83: `INSERT` - INSERT INTO ai_conversation_state (tenant_id, session_id, persona_code, last_int
- `scripts/migrate.js`:
  - Line 183: `INSERT` - INSERT INTO public.${LEDGER_TABLE} (filename, checksum)
- `src/database/migrate-on-startup.js`:
  - Line 73: `INSERT` - 'INSERT INTO edcat.migrations(filename) VALUES ($1)',
- `src/database/migrate.js`:
  - Line 43: `INSERT` - 'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NO
- `src/database/repos/regs.repo.js`:
  - Line 14: `INSERT` - INSERT INTO edcat.reg_sources(authority, reg_id, label, url)
  - Line 29: `INSERT` - INSERT INTO edcat.reg_packs(source_id, version, hash, meta, raw_text, pack_yaml)
  - Line 50: `INSERT` - `INSERT INTO edcat.reg_clauses(pack_id, clause_id, title, level, text, modality,
  - Line 80: `INSERT` - INSERT INTO edcat.crawl_runs(started_at, finished_at, ok_count, fail_count, flag
- `src/database/schema.js`:
  - Line 247: `INSERT` - INSERT INTO public.standards (
- `src/edcat/auditTrail.js`:
  - Line 49: `INSERT` - `INSERT INTO audit_trail_decisions (
- `src/edcat/orchestrator.js`:
  - Line 323: `INSERT` - `INSERT INTO gap_analyses (
- `src/middleware/enterpriseMiddleware.js`:
  - Line 199: `INSERT` - `INSERT INTO audit_logs
- `src/middleware/veraConversationMiddleware.js`:
  - Line 289: `INSERT` - `INSERT INTO ai_conversation_state (tenant_id, session_id, persona_code, last_in
- `src/online/discovery/ApiDiscovery.js`:
  - Line 146: `INSERT` - `INSERT INTO edcat.reg_api_endpoints(source_id, kind, base_url, openapi_url, ope
- `src/routes/audit.js`:
  - Line 16: `INSERT` - `INSERT INTO mock_audit_sessions (id, customer_id, standard_id, total_questions)
  - Line 31: `INSERT` - `INSERT INTO audit_questions (session_id, clause_id, clause_number, clause_title
  - Line 77: `INSERT` - `INSERT INTO mock_audit_responses (session_id, question_id, user_response, corre
  - Line 102: `INSERT` - `INSERT INTO mock_audit_reports (session_id, total_score, pass_fail, generated_a
- `src/routes/customers.js`:
  - Line 85: `INSERT` - `INSERT INTO public.customers (customer_id, revision, customer_name, company_nam
- `src/routes/feedback.js`:
  - Line 58: `INSERT` - `INSERT INTO ${schemaName}.parser_feedback
  - Line 140: `INSERT` - `INSERT INTO ${schemaName}.gap_analysis_feedback
- `src/routes/gap.js`:
  - Line 74: `INSERT` - `INSERT INTO public.gap_analyses
  - Line 138: `INSERT` - `INSERT INTO public.audit_trail
- `src/routes/parse.js`:
  - Line 764: `INSERT` - `INSERT INTO public.parsed_requirements
- `src/routes/regulatory.js`:
  - Line 56: `INSERT` - `INSERT INTO regulatory_websites
- `src/routes/upload.js`:
  - Line 147: `INSERT` - `INSERT INTO public.standards (id, code, name, sector, uploaded_at)
- `src/routes/users.js`:
  - Line 102: `INSERT` - `INSERT INTO public.authorized_users
  - Line 276: `INSERT` - `INSERT INTO public.user_permissions
- `src/scripts/comprehensive-system-audit.js`:
  - Line 123: `INSERT` - INSERT INTO public.standards (code, name, sector, uploaded_at)
- `src/scripts/create-standard-files-table.js`:
  - Line 100: `INSERT` - INSERT INTO public.standard_files
- `src/scripts/fix-all-schema-errors.js`:
  - Line 79: `INSERT` - INSERT INTO public.tenants (name, key, industry, region)
  - Line 86: `INSERT` - INSERT INTO public.tenants (name, industry, region)
- `src/scripts/ingest-knowledge-pack.js`:
  - Line 65: `INSERT` - INSERT INTO compliance_lib.learning_embeddings (
- `src/scripts/load-vera-blueprints.js`:
  - Line 37: `INSERT` - `INSERT INTO ai_policy (tenant_id, name, config)
  - Line 53: `INSERT` - `INSERT INTO ai_prompt (tenant_id, persona_code, kind, name, content, version)
  - Line 84: `INSERT` - `INSERT INTO ai_standard (tenant_id, code, revision, title, authority, citation_
  - Line 108: `INSERT` - `INSERT INTO ai_clause_blueprint (tenant_id, standard_id, clause_id, label, pare
  - Line 131: `INSERT` - `INSERT INTO ai_crosswalk_blueprint (tenant_id, standard_id, target_family)
- `src/scripts/migrate-document-content-to-postgres.js`:
  - Line 147: `INSERT` - INSERT INTO public.document_content_for_learning (
- `src/scripts/process-requirements-folder.js`:
  - Line 155: `INSERT` - `INSERT INTO public.standards (id, code, name, authority_source, sector, uploade
  - Line 170: `INSERT` - `INSERT INTO public.standards (id, code, name, sector, uploaded_at, is_active)
  - Line 207: `INSERT` - `INSERT INTO standards (id, code, name, sector, uploaded_at, is_active)
  - Line 311: `INSERT` - `INSERT INTO example_documents (file_id, standard_id, file_name, category, stand
  - Line 571: `INSERT` - `INSERT INTO document_content_for_learning
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 177: `INSERT` - `INSERT INTO standards (id, code, name, sector, uploaded_at, total_clauses)
- `src/scripts/restore-standard-files.js`:
  - Line 47: `INSERT` - INSERT INTO public.standard_files (${columnList})
- `src/scripts/restore-standards-from-backup.js`:
  - Line 48: `INSERT` - INSERT INTO public.standards (${columnNames})
  - Line 97: `INSERT` - INSERT INTO public.standard_files (${columnList})
- `src/scripts/run-migration.js`:
  - Line 54: `INSERT` - 'INSERT INTO edcat.migrations(filename) VALUES ($1)',
- `src/scripts/seed-edcat-agent.js`:
  - Line 42: `INSERT` - `INSERT INTO edcat.ai_agents(code, name, system_prompt, persona_json, capabiliti
- `src/scripts/seed-edcat-personality.js`:
  - Line 30: `INSERT` - `INSERT INTO ai_tenant (tenant_id, name) VALUES ($1, 'Default EDCAT Tenant')`,
  - Line 52: `INSERT` - `INSERT INTO ai_persona (
  - Line 109: `INSERT` - `INSERT INTO ai_prompt (tenant_id, persona_code, kind, name, content, version)
  - Line 151: `INSERT` - `INSERT INTO ai_policy (tenant_id, name, config)
  - Line 182: `INSERT` - `INSERT INTO ai_template (tenant_id, name, kind, template)
  - Line 230: `INSERT` - `INSERT INTO ai_validator (tenant_id, name, config)
  - Line 259: `INSERT` - `INSERT INTO ai_policy (tenant_id, name, config)
  - Line 281: `INSERT` - `INSERT INTO ai_prompt (tenant_id, persona_code, kind, name, content, version)
  - Line 308: `INSERT` - `INSERT INTO ai_standard (tenant_id, code, revision, title, authority, citation_
  - Line 331: `INSERT` - `INSERT INTO ai_clause_blueprint (tenant_id, standard_id, clause_id, label, pare
  - Line 353: `INSERT` - `INSERT INTO ai_crosswalk_blueprint (tenant_id, standard_id, target_family)
  - Line 389: `INSERT` - `INSERT INTO ai_router (tenant_id, name, rules)
  - Line 402: `INSERT` - `INSERT INTO ai_policy (tenant_id, name, config)
  - Line 423: `INSERT` - `INSERT INTO ai_persona_profile (tenant_id, persona_code, profile)
  - Line 439: `INSERT` - `INSERT INTO ai_policy (tenant_id, name, config)
  - Line 453: `INSERT` - `INSERT INTO ai_policy (tenant_id, name, config)
  - Line 469: `INSERT` - `INSERT INTO ai_policy (tenant_id, name, config)
  - Line 484: `INSERT` - `INSERT INTO ai_policy (tenant_id, name, config)
  - Line 498: `INSERT` - `INSERT INTO ai_policy (tenant_id, name, config)
  - Line 512: `INSERT` - `INSERT INTO ai_policy (tenant_id, name, config)
- `src/scripts/test-all-database-connections.js`:
  - Line 100: `INSERT` - INSERT INTO public.standard_files
  - Line 162: `INSERT` - INSERT INTO standards
  - Line 344: `INSERT` - INSERT INTO standards (id, code, name, sector, uploaded_at)
  - Line 376: `INSERT` - INSERT INTO public.standard_files
  - Line 401: `INSERT` - INSERT INTO parsed_requirements
- `src/scripts/test-upload-flow.js`:
  - Line 67: `INSERT` - `INSERT INTO public.standards (id, code, name, sector, uploaded_at)
  - Line 97: `INSERT` - `INSERT INTO public.standard_files
- `src/seeds/standards.js`:
  - Line 116: `INSERT` - `INSERT INTO public.standards (code, name, authority_source, description, sector
- `src/services/aiMemoryService.js`:
  - Line 23: `INSERT` - `INSERT INTO public.ai_intelligence
  - Line 107: `INSERT` - `INSERT INTO public.ai_conversation_memory
  - Line 219: `INSERT` - `INSERT INTO public.ai_learning_patterns
- `src/services/capaSystem.js`:
  - Line 44: `INSERT` - `INSERT INTO capa_records
  - Line 70: `INSERT` - `INSERT INTO capa_actions
  - Line 88: `INSERT` - `INSERT INTO capa_effectiveness_checks
- `src/services/clauseCorrelationEngine.js`:
  - Line 116: `INSERT` - `INSERT INTO clause_correlation_matrix
- `src/services/documentManagement.js`:
  - Line 16: `INSERT` - `INSERT INTO qms_documents
  - Line 64: `INSERT` - `INSERT INTO document_approvals
  - Line 113: `INSERT` - `INSERT INTO document_distribution
  - Line 143: `INSERT` - `INSERT INTO document_versions
- `src/services/industryModules/industryFactory.js`:
  - Line 97: `INSERT` - `INSERT INTO tenant_industry_modules (tenant_id, module_id, configuration)
- `src/services/integrations/integrationMarketplace.js`:
  - Line 21: `INSERT` - `INSERT INTO integrations (integration_type, integration_name, tenant_id, config
  - Line 253: `INSERT` - `INSERT INTO integration_logs (integration_id, event_type, status, payload)
- `src/services/internationalization/i18nManager.js`:
  - Line 76: `INSERT` - `INSERT INTO i18n_translations
  - Line 123: `INSERT` - `INSERT INTO regional_compliance_mappings
- `src/services/learningEngine.js`:
  - Line 245: `INSERT` - `INSERT INTO ${schemaName}.${tuningTable}
  - Line 335: `INSERT` - `INSERT INTO ${schemaName}.learning_events
- `src/services/parseService.js`:
  - Line 54: `INSERT` - `INSERT INTO parsed_clauses
  - Line 93: `INSERT` - `INSERT INTO edcat_learning_events
- `src/services/regulatoryIntelligenceHub.js`:
  - Line 187: `INSERT` - `INSERT INTO regulatory_updates
- `src/services/trainingManagement.js`:
  - Line 29: `INSERT` - `INSERT INTO training_records
  - Line 56: `INSERT` - `INSERT INTO training_completions
  - Line 82: `INSERT` - `INSERT INTO employee_competencies

#### `JSON`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 3: `UNKNOWN` - * Loads all personality data from JSON seed files into EDCAT AI database

#### `keyword`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `learningEngine.js`:
  - Line 196: `UNKNOWN` - // Update keyword confidence scores

#### `knowledge`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 6

**Files using this table:**

- `src/services/knowledgePackLoader.js`:
  - Line 50: `UNKNOWN` - * Extract learning blocks from knowledge pack
  - Line 74: `UNKNOWN` - * Extract document relationships from knowledge pack
  - Line 94: `UNKNOWN` - * Extract clause mappings from knowledge pack
  - Line 134: `UNKNOWN` - * Get standards metadata from knowledge pack
- `src/services/requirementParser.js`:
  - Line 816: `UNKNOWN` - // Find similar requirements from knowledge pack
  - Line 835: `UNKNOWN` - // Add keywords from knowledge pack

#### `knowledge_value`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 52: `SELECT` - `SELECT knowledge_value, confidence_score, usage_count, success_count, failure_c

#### `last`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/middleware/enterpriseMiddleware.js`:
  - Line 106: `UNKNOWN` - // Update last used

#### `last_hash`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/regs.ingest.js`:
  - Line 186: `SELECT` - const r = await query(`SELECT last_hash FROM edcat.reg_sources WHERE id = $1`, [

#### `last_intent`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `EDCAT AIP/server/vera_conversation_middleware.ts`:
  - Line 116: `UNKNOWN` - 'select last_intent, context, last_topic from ai_conversation_state where tenant
- `src/middleware/veraConversationMiddleware.js`:
  - Line 180: `SELECT` - `SELECT last_intent, context, last_topic FROM ai_conversation_state

#### `last_used_at`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 69: `UNKNOWN` - // Update last_used_at

#### `LATERAL`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/dbIntrospectService.js`:
  - Line 269: `UNKNOWN` - JOIN LATERAL generate_subscripts(con.conkey, 1) WITH ORDINALITY AS ks(subscript,

#### `learning`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 5

**Files using this table:**

- `src/edcat/learning/learningSystem.js`:
  - Line 12: `UNKNOWN` - * Record feedback and update learning
- `src/scripts/cleanup-standards-without-files.js`:
  - Line 153: `UNKNOWN` - console.log(`   ℹ️  Could not delete learning records (table may not exist)`);
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 87: `UNKNOWN` - // Step 2: Get all unique standards from learning tables
- `src/services/embeddingService.js`:
  - Line 185: `UNKNOWN` - * Build vocabulary from learning blocks (for TF-IDF)
- `src/services/knowledgePackLoader.js`:
  - Line 114: `UNKNOWN` - * Extract audit evidence structure from learning blocks

#### `loaded`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/veraConversationalEngine.js`:
  - Line 545: `UNKNOWN` - // Show credentials from loaded data if available, otherwise show default list

#### `local`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `config/storage.js`:
  - Line 126: `UNKNOWN` - // Read from local filesystem

#### `main`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 507: `UNKNOWN` - // Seed enhanced intents (if different from main intent router)

#### `MAX`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/gap.js`:
  - Line 331: `SELECT` - `SELECT MAX(analysis_date) as last_run, COUNT(*) as total_analyses

#### `message`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 7

**Files using this table:**

- `src/middleware/veraConversationMiddleware.js`:
  - Line 81: `UNKNOWN` - * Detect intent from message
  - Line 205: `UNKNOWN` - user_tone_hint: null // Could be inferred from message
- `src/routes/chat.js`:
  - Line 511: `UNKNOWN` - // Try to find standard from message or context
  - Line 516: `UNKNOWN` - // Extract standard code and revision from message
  - Line 739: `UNKNOWN` - // Extract potential standard codes from message (AS9100, ISO 9001, etc.)
  - Line 1117: `UNKNOWN` - // Detect intent from message
- `src/services/veraConversationalEngine.js`:
  - Line 509: `UNKNOWN` - // Extract clause or requirement from message

#### `metadata`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/routes/parse.js`:
  - Line 185: `UNKNOWN` - // Determine file type from metadata if available, otherwise guess from content
- `src/routes/requirements.js`:
  - Line 660: `UNKNOWN` - * Update a standard (e.g., replace with newer version, update metadata)

#### `migration`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 5

**Files using this table:**

- `src/scripts/comprehensive-table-audit.js`:
  - Line 5: `UNKNOWN` - * 1. Extracts all table names from migration files
  - Line 21: `UNKNOWN` - // STEP 1: Extract all tables from migration files
  - Line 256: `UNKNOWN` - console.log('\n📋 Step 1: Extracting tables from migration files...');
- `src/scripts/map-all-tables-static.js`:
  - Line 138: `UNKNOWN` - console.log('\n📋 Step 1: Extracting tables from migration files...');
- `src/scripts/seed-edcat-agent.js`:
  - Line 40: `UNKNOWN` - // Insert or update the agent (schema should already exist from migration)

#### `migrations`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 5

**Files using this table:**

- `src/database/migrate-on-startup.js`:
  - Line 53: `SELECT` - 'SELECT filename FROM edcat.migrations WHERE filename = $1',
- `src/scripts/cleanup-all-duplicate-tables.js`:
  - Line 5: `UNKNOWN` - * 1. Lists ALL tables in both databases (not just from migrations)
- `src/scripts/map-all-tables-static.js`:
  - Line 4: `UNKNOWN` - * Maps ALL tables from migrations and codebase to their connections
  - Line 137: `UNKNOWN` - // Extract tables from migrations
- `src/scripts/run-migration.js`:
  - Line 37: `SELECT` - 'SELECT filename FROM edcat.migrations WHERE filename = $1',

#### `missed`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/parser-training.js`:
  - Line 367: `UNKNOWN` - // Learn keywords from missed requirement

#### `mock_audit_reports`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 2

**Files using this table:**

- `src/services/kpiMetrics.js`:
  - Line 72: `SELECT` - FROM mock_audit_reports
  - Line 171: `SELECT` - FROM mock_audit_reports

#### `mock_audit_responses`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 1

**Files using this table:**

- `src/routes/audit.js`:
  - Line 92: `SELECT` - const resp = await query(`SELECT score, correct FROM mock_audit_responses WHERE 

#### `mock_audit_sessions`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 1

**Files using this table:**

- `src/routes/audit.js`:
  - Line 98: `UPDATE` - `UPDATE mock_audit_sessions SET completed_at = NOW(), final_score = $2 WHERE id 

#### `model`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `EDCAT AIP/server/examples/extract_handler.ts`:
  - Line 30: `UNKNOWN` - // Parse JSONL blocks from model output

#### `model_versions`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 3

**Files using this table:**

- `database.js`:
  - Line 138: `SELECT` - 'SELECT * FROM model_versions ORDER BY created_at DESC LIMIT 1'
- `learningEngine.js`:
  - Line 216: `SELECT` - 'SELECT * FROM model_versions ORDER BY created_at'
- `src/edcat/orchestrator.js`:
  - Line 365: `SELECT` - `SELECT version FROM model_versions

#### `multiple`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `learningEngine.js`:
  - Line 79: `UNKNOWN` - * Analyzes patterns from multiple clarifications

#### `new`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/routes/parse.js`:
  - Line 761: `UNKNOWN` - // Insert new requirement with all new fields including sub-refs
- `src/routes/regulatory.js`:
  - Line 53: `UNKNOWN` - // Insert new website into EDCAT AI DB (regulatory_websites)

#### `NOW`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 26

**Files using this table:**

- `database.js`:
  - Line 40: `SELECT` - await compliancePool.query('SELECT NOW()');
  - Line 43: `SELECT` - await customerPool.query('SELECT NOW()');
- `setup-db.js`:
  - Line 70: `SELECT` - await client.query('SELECT NOW()');
- `src/config/databases.js`:
  - Line 42: `SELECT` - const pg = await postgresPool.query('SELECT NOW() as now');
  - Line 43: `SELECT` - const edcat = await edcatPool.query('SELECT NOW() as now');
- `src/database/connection.js`:
  - Line 50: `SELECT` - postgresPool.query('SELECT NOW()'),
  - Line 51: `SELECT` - edcatPool.query('SELECT NOW()')
- `src/database/db.js`:
  - Line 47: `SELECT` - pool.query('SELECT NOW()')
- `src/database/schema.js`:
  - Line 314: `SELECT` - await query('SELECT NOW()');
- `src/routes/db-status.js`:
  - Line 26: `SELECT` - await queryPostgres('SELECT NOW()');
- `src/routes/diagnostics.js`:
  - Line 85: `SELECT` - const pgTest = await queryPostgres('SELECT NOW() as time');
  - Line 92: `SELECT` - const edcatTest = await queryEdcatAI('SELECT NOW() as time');
- `src/routes/test-db.js`:
  - Line 18: `SELECT` - await queryPostgres('SELECT NOW()');
- `src/scripts/comprehensive-system-audit.js`:
  - Line 38: `SELECT` - const pgTest = await queryPostgres('SELECT NOW() as current_time, current_databa
  - Line 52: `SELECT` - const aiTest = await queryEdcatAI('SELECT NOW() as current_time, current_databas
- `src/scripts/diagnose-complete-connection.js`:
  - Line 16: `SELECT` - const pgTest = await queryPostgres('SELECT NOW() as time');
  - Line 24: `SELECT` - const edcatTest = await queryEdcatAI('SELECT NOW() as time');
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 39: `SELECT` - const testResult = await edcatPool.query('SELECT NOW() as now, current_database(
- `src/scripts/test-all-database-connections.js`:
  - Line 19: `SELECT` - const result = await queryPostgres('SELECT NOW() as current_time, current_databa
  - Line 40: `SELECT` - const result = await queryEdcatAI('SELECT NOW() as current_time, current_databas
- `src/scripts/verify-database-connections-complete.js`:
  - Line 18: `SELECT` - const result = await queryPostgres('SELECT NOW() as time, current_database() as 
  - Line 30: `SELECT` - const result = await queryEdcatAI('SELECT NOW() as time, current_database() as d
- `src/scripts/verify-database-connections.js`:
  - Line 21: `SELECT` - const customerResult = await query('SELECT NOW() as time, current_database() as 
  - Line 86: `SELECT` - const edcatResult = await queryEdcatAI('SELECT NOW() as time, current_database()
- `src/scripts/verify-tables.js`:
  - Line 16: `SELECT` - await query('SELECT NOW()');
- `src/scripts/verify-vera-tables.js`:
  - Line 19: `SELECT` - await queryEdcatAI('SELECT NOW()');

#### `npm`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/database/migrate.js`:
  - Line 220: `UNKNOWN` - // This script is called from npm start, so it must exit

#### `nsp`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/dbIntrospectService.js`:
  - Line 217: `SELECT` - SELECT nsp.nspname AS table_schema, cls.relname AS table_name

#### `of`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/regulatoryIntelligenceHub.js`:
  - Line 205: `UNKNOWN` - for (const update of updates) {

#### `operation`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/comprehensive-system-audit.js`:
  - Line 155: `UPDATE` - console.log('3. Testing UPDATE operation...');
  - Line 177: `DELETE` - console.log('4. Testing DELETE operation...');

#### `or`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/scripts/load-vera-blueprints.js`:
  - Line 82: `UNKNOWN` - // Insert or update standard
- `src/scripts/seed-edcat-agent.js`:
  - Line 40: `UNKNOWN` - // Insert or update the agent (schema should already exist from migration)
- `src/scripts/seed-edcat-personality.js`:
  - Line 306: `UNKNOWN` - // Insert or update standard

#### `p`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/database/repos/requirements.repo.js`:
  - Line 14: `SELECT` - `SELECT p.id

#### `page`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `EDCAT AIP/server/examples/ingest_customer_doc.ts`:
  - Line 7: `UNKNOWN` - *  - Parses the document, chunks into page/line snippets, computes sha256, store

#### `parent`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/requirementClassifier.js`:
  - Line 155: `UNKNOWN` - // Even if they don't repeat "shall", they inherit requirement status from paren

#### `parsed_clauses`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 10

**Files using this table:**

- `src/routes/chat.js`:
  - Line 983: `SELECT` - `SELECT COUNT(*) as count FROM parsed_clauses WHERE standard_id = $1`,
- `src/routes/predictions.js`:
  - Line 26: `UNKNOWN` - JOIN parsed_clauses pc ON ccm.clause_id = pc.id
- `src/services/auditPrepExporter.js`:
  - Line 37: `SELECT` - `SELECT * FROM parsed_clauses WHERE standard_id = $1 ORDER BY clause_number`,
  - Line 45: `SELECT` - FROM parsed_clauses pc
- `src/services/capaSystem.js`:
  - Line 27: `SELECT` - FROM parsed_clauses pc
- `src/services/clauseCorrelationEngine.js`:
  - Line 26: `SELECT` - 'SELECT * FROM parsed_clauses WHERE standard_id = $1 ORDER BY clause_number',
  - Line 187: `UNKNOWN` - JOIN parsed_clauses pc ON ccm.clause_id = pc.id
- `src/services/documentDraftingEngine.js`:
  - Line 29: `SELECT` - 'SELECT * FROM parsed_clauses WHERE id = $1',
- `src/services/reportGenerator.js`:
  - Line 40: `UNKNOWN` - JOIN parsed_clauses pc ON ccm.clause_id = pc.id
- `src/services/trainingManagement.js`:
  - Line 125: `SELECT` - FROM parsed_clauses pc

#### `parsed_requirements`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 30

**Files using this table:**

- `src/edcat/parser/clauseParser.js`:
  - Line 42: `SELECT` - FROM parsed_requirements
- `src/routes/chat.js`:
  - Line 585: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements
  - Line 611: `SELECT` - FROM public.parsed_requirements
  - Line 793: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1
  - Line 916: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1
  - Line 944: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1
  - Line 1148: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1
  - Line 1190: `SELECT` - `SELECT COUNT(*) as count FROM parsed_requirements WHERE standard_id = $1`,
- `src/routes/parse.js`:
  - Line 482: `SELECT` - `SELECT COUNT(*) as count FROM public.parsed_requirements WHERE standard_id = $1
  - Line 740: `UPDATE` - `UPDATE public.parsed_requirements
  - Line 846: `SELECT` - SELECT clause_ref FROM public.parsed_requirements
- `src/routes/requirements.js`:
  - Line 376: `SELECT` - FROM public.parsed_requirements
  - Line 472: `SELECT` - FROM public.parsed_requirements r
  - Line 547: `SELECT` - SELECT COUNT(*) as count FROM public.parsed_requirements
  - Line 557: `UNKNOWN` - LEFT JOIN public.parsed_requirements pr ON s.id = pr.standard_id
- `src/scripts/check-all-standards-in-database.js`:
  - Line 94: `SELECT` - FROM public.parsed_requirements
- `src/scripts/comprehensive-system-audit.js`:
  - Line 333: `SELECT` - const requirementsCount = await queryPostgres('SELECT COUNT(*) as count FROM pub
- `src/scripts/consolidate-standards-tables.js`:
  - Line 58: `SELECT` - const edcatReqs = await queryEdcatAI('SELECT id, standard_id, clause_ref, requir
- `src/scripts/diagnose-complete-connection.js`:
  - Line 75: `SELECT` - const reqsCount = await queryPostgres('SELECT COUNT(*) as count FROM public.pars
- `src/scripts/ensure-parsed-requirements-table.js`:
  - Line 28: `SELECT` - SELECT COUNT(*) as count FROM public.parsed_requirements
- `src/scripts/test-all-database-connections.js`:
  - Line 218: `SELECT` - const countResult = await queryEdcatAI('SELECT COUNT(*) as count FROM parsed_req
- `src/scripts/verify-database-connections-complete.js`:
  - Line 71: `SELECT` - const requirements = await queryPostgres('SELECT COUNT(*) as count FROM public.p
- `src/scripts/verify-database-connections.js`:
  - Line 144: `SELECT` - const reqsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM parsed_requi
  - Line 151: `UNKNOWN` - LEFT JOIN parsed_requirements pr ON pr.standard_id = s.id
- `src/services/learningEngine.js`:
  - Line 141: `UNKNOWN` - JOIN parsed_requirements cr
- `src/services/metricsService.js`:
  - Line 21: `SELECT` - FROM parsed_requirements
  - Line 30: `SELECT` - FROM parsed_requirements
  - Line 41: `SELECT` - FROM parsed_requirements
  - Line 52: `SELECT` - FROM parsed_requirements
- `src/services/veraConversationalEngine.js`:
  - Line 333: `SELECT` - FROM public.parsed_requirements

#### `parsing`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/pull-vera-learning-standards.js`:
  - Line 17: `UNKNOWN` - * Main function to pull learning standards into parsing tool

#### `Parsing`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/pull-vera-learning-standards.js`:
  - Line 2: `UNKNOWN` - * Pull Vera's Learning Standards into Parsing Tool
  - Line 20: `UNKNOWN` - console.log('\n📚 Pulling Vera\'s Learning Standards into Parsing Tool...\n');

#### `path`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/parse.js`:
  - Line 207: `UNKNOWN` - // For DOCX, need to write buffer to temp file (mammoth reads from path)

#### `pattern`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 187: `UNKNOWN` - // Update pattern confidence based on feedback

#### `pattern_value`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 240: `SELECT` - `SELECT pattern_value, confidence, success_count, match_count

#### `pc`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `src/routes/predictions.js`:
  - Line 24: `SELECT` - `SELECT pc.clause_number, COUNT(*) AS gap_count
- `src/services/auditPrepExporter.js`:
  - Line 43: `SELECT` - `SELECT pc.clause_number, pc.clause_title, pc.common_gaps,
- `src/services/capaSystem.js`:
  - Line 17: `SELECT` - `SELECT pc.id as clause_id,
- `src/services/reportGenerator.js`:
  - Line 36: `SELECT` - `SELECT pc.id as requirement_id, ccm.procedure_id, ccm.confidence_score as match

#### `PDF`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 6

**Files using this table:**

- `src/routes/parse.js`:
  - Line 133: `UNKNOWN` - console.log(`✅ Extracted ${pdfData.numpages} pages from PDF`);
  - Line 202: `UNKNOWN` - console.log(`✅ Extracted ${pdfData.numpages} pages from PDF (from DB)`);
- `src/routes/upload.js`:
  - Line 73: `UNKNOWN` - console.log(`[upload] ✅ Extracted ${data.numpages} pages from PDF`);
- `src/services/requirementParser.js`:
  - Line 762: `UNKNOWN` - console.log(`✓ Extracted ${text.length} characters from PDF`);
- `src/services/textExtractor.js`:
  - Line 3: `UNKNOWN` - * Extracts text from PDF, Word, Excel, and TXT files
- `src/services/textSanitizer.js`:
  - Line 8: `UNKNOWN` - * Sanitize raw text extracted from PDF/DOCX

#### `persona_code`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/diagnose-vera.js`:
  - Line 37: `SELECT` - `SELECT persona_code, profile FROM ai_persona_profile WHERE tenant_id = $1 AND p

#### `personalities`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 42: `UNKNOWN` - * Seed personalities from personalities.json

#### `pg_attrdef`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/dbIntrospectService.js`:
  - Line 242: `UNKNOWN` - LEFT JOIN pg_attrdef def

#### `pg_attribute`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/services/dbIntrospectService.js`:
  - Line 239: `SELECT` - FROM pg_attribute att
  - Line 270: `UNKNOWN` - JOIN pg_attribute att
  - Line 273: `UNKNOWN` - JOIN pg_attribute att_ref

#### `pg_class`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `src/services/dbIntrospectService.js`:
  - Line 218: `SELECT` - FROM pg_class cls
  - Line 240: `UNKNOWN` - JOIN pg_class cls ON cls.oid = att.attrelid
  - Line 265: `UNKNOWN` - JOIN pg_class rel ON rel.oid = con.conrelid
  - Line 267: `UNKNOWN` - JOIN pg_class rel_ref ON rel_ref.oid = con.confrelid

#### `pg_constraint`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/dbIntrospectService.js`:
  - Line 264: `SELECT` - FROM pg_constraint con

#### `pg_index`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/dbIntrospectService.js`:
  - Line 234: `SELECT` - FROM pg_index idx

#### `pg_indexes`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `setup-db.js`:
  - Line 142: `SELECT` - FROM pg_indexes
- `src/scripts/audit-postgres-tables.js`:
  - Line 194: `SELECT` - FROM pg_indexes
- `src/scripts/verify-vera-tables.js`:
  - Line 90: `SELECT` - FROM pg_indexes

#### `pg_namespace`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `src/services/dbIntrospectService.js`:
  - Line 219: `UNKNOWN` - JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
  - Line 241: `UNKNOWN` - JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
  - Line 266: `UNKNOWN` - JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  - Line 268: `UNKNOWN` - JOIN pg_namespace nsp_ref ON nsp_ref.oid = rel_ref.relnamespace

#### `pg_tables`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/db-status.js`:
  - Line 118: `SELECT` - FROM pg_tables

#### `physical`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/routes/requirements.js`:
  - Line 614: `UNKNOWN` - // Delete physical file if it exists (file_path is now in standards table)
  - Line 629: `UNKNOWN` - console.log(`⚠️  Could not delete physical file: ${fsErr.message}`);
- `src/routes/upload.js`:
  - Line 486: `UNKNOWN` - // Delete physical file

#### `Postgres`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/database/twoDatabaseMigrations.js`:
  - Line 265: `UNKNOWN` - console.error('❌ Remove dead-ends from Postgres failed:', error.message);

#### `PostgreSQL`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 14

**Files using this table:**

- `src/database/twoDatabaseMigrations.js`:
  - Line 255: `UNKNOWN` - // Step 5: Remove dead-end tables from PostgreSQL
- `src/routes/chat.js`:
  - Line 109: `UNKNOWN` - // Vera reads from PostgreSQL, but can write learning data to EDCAT AI DB
- `src/routes/requirements.js`:
  - Line 45: `UNKNOWN` - // Query standards from PostgreSQL
  - Line 345: `UNKNOWN` - * CRITICAL FIX: Queries parsed_requirements from PostgreSQL (single source of tr
  - Line 352: `UNKNOWN` - // CRITICAL FIX: Query parsed_requirements from PostgreSQL (single source of tru
- `src/scripts/audit-all-tables.js`:
  - Line 93: `UNKNOWN` - // Get all tables from PostgreSQL
- `src/scripts/cleanup-all-duplicate-tables.js`:
  - Line 28: `UNKNOWN` - // Get ALL tables from PostgreSQL
- `src/scripts/consolidate-standards-tables.js`:
  - Line 2: `UNKNOWN` - * Consolidate standards tables from both databases into PostgreSQL only
  - Line 6: `UNKNOWN` - * 2. Merges unique records into PostgreSQL
  - Line 16: `UNKNOWN` - console.log('⚠️  This script will consolidate standards tables into PostgreSQL o
- `src/scripts/identify-all-standards-tables.js`:
  - Line 111: `UNKNOWN` - console.log(`   - EDCAT AI DB should READ from PostgreSQL (or be removed)`);
  - Line 112: `UNKNOWN` - console.log(`   - OR: Keep EDCAT AI DB for Vera, but sync from PostgreSQL`);
- `src/scripts/migrate-document-content-to-postgres.js`:
  - Line 103: `UNKNOWN` - // Step 5: Insert each record into PostgreSQL
- `src/scripts/remove-dead-end-tables.js`:
  - Line 45: `UNKNOWN` - // Check and remove from PostgreSQL

#### `previous`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `EDCAT AIP/server/vera_chat_handler_example.ts`:
  - Line 23: `UNKNOWN` - // load Vera system prompt (from previous pack)

#### `procedure`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/training.js`:
  - Line 7: `UNKNOWN` - // Create training from procedure

#### `profile`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `EDCAT AIP/server/vera_conversation_middleware.ts`:
  - Line 102: `UNKNOWN` - 'select profile from ai_persona_profile where tenant_id=$1 and persona_code=$2',
- `src/middleware/veraConversationMiddleware.js`:
  - Line 164: `SELECT` - `SELECT profile FROM ai_persona_profile WHERE tenant_id = $1 AND persona_code = 

#### `project`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/database/schema.js`:
  - Line 14: `UNKNOWN` - // Path to schema.sql from project root

#### `prompts_system`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 80: `UNKNOWN` - * Seed prompts from prompts_system.json and prompts_more.json

#### `public`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 11

**Files using this table:**

- `scripts/migrate.js`:
  - Line 126: `SELECT` - `SELECT filename, checksum FROM public.${LEDGER_TABLE}`
- `src/app.js`:
  - Line 159: `UNKNOWN` - // Serve static files from public directory (AFTER API routes to avoid conflicts
- `src/routes/diagnostics.js`:
  - Line 295: `UNKNOWN` - // Get all standards from public schema
- `src/scripts/cleanup-backup-tables.js`:
  - Line 29: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${tableN
- `src/scripts/cleanup-duplicate-tables.js`:
  - Line 79: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${table.
- `src/scripts/diagnose-postgres-errors.js`:
  - Line 122: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${backup
- `src/scripts/remove-dead-end-tables.js`:
  - Line 61: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${tableN
- `src/scripts/remove-duplicate-tables.js`:
  - Line 28: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${tableN
  - Line 56: `SELECT` - const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM public.${tableNa
- `src/scripts/remove-edcat-ai-duplicates.js`:
  - Line 47: `SELECT` - const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM public.${tableNa
- `src/scripts/verify-database-connections-complete.js`:
  - Line 53: `SELECT` - const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${table}

#### `qms_documents`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 11

**Files using this table:**

- `src/services/documentManagement.js`:
  - Line 41: `SELECT` - `SELECT * FROM qms_documents WHERE id = $1`,
  - Line 49: `UPDATE` - `UPDATE qms_documents SET status = 'under_review' WHERE id = $1`,
  - Line 81: `UPDATE` - `UPDATE qms_documents SET status = 'draft' WHERE id = $1`,
  - Line 96: `SELECT` - `SELECT * FROM qms_documents WHERE id = $1`,
  - Line 103: `UPDATE` - `UPDATE qms_documents
  - Line 133: `SELECT` - `SELECT * FROM qms_documents WHERE id = $1`,
  - Line 158: `UPDATE` - `UPDATE qms_documents
  - Line 187: `SELECT` - `SELECT * FROM qms_documents WHERE id = $1`,
  - Line 226: `SELECT` - FROM qms_documents
- `src/services/edcatQMSIntegration.js`:
  - Line 127: `SELECT` - `SELECT * FROM qms_documents WHERE customer_id = $1`,
- `src/services/kpiMetrics.js`:
  - Line 141: `SELECT` - FROM qms_documents

#### `queries`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/veraConversationalEngine.js`:
  - Line 1087: `UNKNOWN` - * Handle regulatory update queries

#### `query`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/requirements.js`:
  - Line 680: `UNKNOWN` - // Build update query dynamically

#### `question_intent`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 181: `SELECT` - `SELECT question_intent, standards_mentioned FROM public.ai_conversation_memory 

#### `random`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/audit.js`:
  - Line 7: `UNKNOWN` - // Start mock audit: create session and seed questions from random clauses

#### `reg_clauses`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/database/repos/requirements.repo.js`:
  - Line 42: `SELECT` - FROM edcat.reg_clauses
  - Line 57: `SELECT` - FROM edcat.reg_clauses c
  - Line 79: `SELECT` - FROM edcat.reg_clauses c

#### `reg_packs`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/database/repos/requirements.repo.js`:
  - Line 15: `SELECT` - FROM edcat.reg_packs p
  - Line 58: `UNKNOWN` - JOIN edcat.reg_packs p ON p.id = c.pack_id
  - Line 80: `UNKNOWN` - JOIN edcat.reg_packs p ON p.id = c.pack_id

#### `reg_sources`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 5

**Files using this table:**

- `src/database/repos/regs.repo.js`:
  - Line 91: `UPDATE` - UPDATE edcat.reg_sources
- `src/database/repos/requirements.repo.js`:
  - Line 16: `UNKNOWN` - JOIN edcat.reg_sources s ON s.id = p.source_id
  - Line 59: `UNKNOWN` - JOIN edcat.reg_sources s ON s.id = p.source_id
  - Line 81: `UNKNOWN` - JOIN edcat.reg_sources s ON s.id = p.source_id
- `src/routes/regs.ingest.js`:
  - Line 186: `SELECT` - const r = await query(`SELECT last_hash FROM edcat.reg_sources WHERE id = $1`, [

#### `regional_compliance_mappings`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 1

**Files using this table:**

- `src/services/internationalization/i18nManager.js`:
  - Line 102: `SELECT` - FROM regional_compliance_mappings

#### `regulatory_websites`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 2

**Files using this table:**

- `src/routes/chat.js`:
  - Line 192: `SELECT` - FROM regulatory_websites
- `src/routes/regulatory.js`:
  - Line 149: `UPDATE` - `UPDATE regulatory_websites

#### `request`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/middleware/customerContext.js`:
  - Line 3: `UNKNOWN` - * Extracts customer ID from request and adds customer schema info to req.custome
  - Line 9: `UNKNOWN` - * Middleware to extract customer context from request
- `src/routes/upload.js`:
  - Line 466: `DELETE` - console.log(`[upload] DELETE request: fileId=${fileId}`);

#### `requirement`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 8

**Files using this table:**

- `analyzer.js`:
  - Line 151: `UNKNOWN` - // Extract key terms from requirement
  - Line 213: `UNKNOWN` - * Extract keyword (shall, must, etc.) from requirement text
- `clarificationEngine.js`:
  - Line 101: `UNKNOWN` - // Update requirement mapping if procedure exists
  - Line 125: `UNKNOWN` - // Update requirement confidence in compliance library
- `learningEngine.js`:
  - Line 100: `UNKNOWN` - // Extract keywords from requirement and procedure
- `src/services/complianceGapAnalyzer.js`:
  - Line 274: `UNKNOWN` - // Extract key terms from requirement
- `src/services/noteFilter.js`:
  - Line 4: `UNKNOWN` - * NOTES are excluded from requirement text but can be stored separately
- `src/services/requirementParser.js`:
  - Line 646: `UNKNOWN` - * Extract primary keyword from requirement

#### `requirement_id`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `database.js`:
  - Line 237: `SELECT` - SELECT requirement_id FROM compliance_requirements
- `src/services/complianceGapAnalyzer.js`:
  - Line 49: `SELECT` - `SELECT requirement_id, clause_number, requirement_text, keyword, confidence

#### `requirement_mappings`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `database.js`:
  - Line 223: `UPDATE` - `UPDATE requirement_mappings
  - Line 234: `SELECT` - `SELECT rm.* FROM requirement_mappings rm

#### `requirements`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 5

**Files using this table:**

- `src/scripts/check-all-standards.js`:
  - Line 50: `UNKNOWN` - // 4. Apply the ACTUAL filtering logic from requirements.js
  - Line 51: `UNKNOWN` - console.log('\n3️⃣ Applying ACTUAL filtering logic from requirements.js...');
  - Line 62: `UNKNOWN` - // Apply the filter logic from requirements.js
- `src/scripts/check-category-filtering.js`:
  - Line 53: `UNKNOWN` - // Simulate the mapping logic from requirements.js
- `src/scripts/test-api-endpoint.js`:
  - Line 10: `UNKNOWN` - // Simulate the exact logic from requirements.js

#### `Requirements`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/fix-postgres-errors.js`:
  - Line 4: `UNKNOWN` - * 2. Re-process files from Requirements folder to restore data
  - Line 59: `UNKNOWN` - console.log('   Data needs to be restored by processing files from Requirements 

#### `retrieval`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/chat.js`:
  - Line 638: `UNKNOWN` - ? `[Source: ${targetStandard.code} p? L?–L?]` // Placeholder - would use actual 

#### `retrieval_templates`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 161: `UNKNOWN` - * Seed templates from retrieval_templates.json and extraction_templates.json

#### `returned`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/comprehensive-system-audit.js`:
  - Line 199: `INSERT` - throw new Error('INSERT returned no rows');

#### `rm`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `database.js`:
  - Line 234: `SELECT` - `SELECT rm.* FROM requirement_mappings rm

#### `ROLLBACK`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 12

**Files using this table:**

- `src/scripts/create-standard-files-table.js`:
  - Line 105: `UNKNOWN` - await queryPostgres('ROLLBACK');
  - Line 108: `UNKNOWN` - await queryPostgres('ROLLBACK');
- `src/scripts/test-all-database-connections.js`:
  - Line 105: `UNKNOWN` - await queryPostgres('ROLLBACK');
  - Line 116: `UNKNOWN` - await queryPostgres('ROLLBACK');
  - Line 167: `UNKNOWN` - await queryEdcatAI('ROLLBACK');
  - Line 178: `UNKNOWN` - await queryEdcatAI('ROLLBACK');
  - Line 348: `UNKNOWN` - await queryEdcatAI('ROLLBACK');
  - Line 351: `UNKNOWN` - await queryEdcatAI('ROLLBACK');
  - Line 380: `UNKNOWN` - await queryPostgres('ROLLBACK');
  - Line 383: `UNKNOWN` - await queryPostgres('ROLLBACK');
  - Line 405: `UNKNOWN` - await queryEdcatAI('ROLLBACK');
  - Line 408: `UNKNOWN` - await queryEdcatAI('ROLLBACK');

#### `routing_policies`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 365: `UNKNOWN` - * Seed routing policies from routing_policies.json and intent_router.json

#### `row`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/comprehensive-system-audit.js`:
  - Line 168: `UPDATE` - throw new Error('UPDATE did not update row');

#### `rules`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/chat.js`:
  - Line 1107: `SELECT` - `SELECT rules FROM ai_router

#### `s`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/verify-database-connections.js`:
  - Line 149: `SELECT` - SELECT s.code, COUNT(pr.id) as req_count

#### `SAE`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/textSanitizer.js`:
  - Line 50: `UNKNOWN` - .replace(/^\s*Downloaded from SAE.*$/gmi, '')

#### `schema`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/database/schema.js`:
  - Line 359: `UNKNOWN` - console.log('[schema] 🔨 Creating tables from schema.sql...');

#### `schema_fixed`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/apply-fixed-schema.js`:
  - Line 4: `UNKNOWN` - * This script applies the production-ready schema from schema_fixed.sql

#### `schema_migrations`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/database/migrate.js`:
  - Line 36: `SELECT` - const result = await client.query('SELECT version FROM schema_migrations ORDER B
- `src/routes/db-status.js`:
  - Line 58: `SELECT` - FROM schema_migrations
- `src/routes/test-db.js`:
  - Line 41: `SELECT` - const migrationsResult = await queryPostgres('SELECT COUNT(*) as count FROM sche

#### `schema_name`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 14

**Files using this table:**

- `src/routes/chat.js`:
  - Line 62: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
- `src/routes/customers.js`:
  - Line 49: `SELECT` - `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
- `src/routes/feedback.js`:
  - Line 30: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
  - Line 112: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
  - Line 193: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
- `src/routes/learning.js`:
  - Line 26: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
  - Line 92: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
  - Line 134: `SELECT` - `SELECT schema_name FROM public.customers WHERE customer_id = $1 LIMIT 1`,
- `src/scripts/check-all-schemas.js`:
  - Line 12: `SELECT` - SELECT schema_name
- `src/scripts/check-standards-table-exists.js`:
  - Line 29: `SELECT` - SELECT schema_name
- `src/scripts/diagnose-postgres-errors.js`:
  - Line 15: `SELECT` - SELECT schema_name
- `src/scripts/find-all-standards-tables.js`:
  - Line 59: `SELECT` - SELECT schema_name
- `src/scripts/learnNightly.js`:
  - Line 160: `SELECT` - `SELECT schema_name
- `src/scripts/verify-tables.js`:
  - Line 21: `SELECT` - SELECT schema_name

#### `schemaname`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `setup-db.js`:
  - Line 141: `SELECT` - SELECT schemaname, indexname

#### `score`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/audit.js`:
  - Line 92: `SELECT` - const resp = await query(`SELECT score, correct FROM mock_audit_responses WHERE 

#### `scripts`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/process-requirements-folder.js`:
  - Line 31: `UNKNOWN` - // So we need: ../../EDCAT AIP/Requirements (up 2 levels from scripts to backend

#### `sector`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/routes/predictions.js`:
  - Line 11: `SELECT` - const cust = await query(`SELECT sector FROM tenants WHERE id = $1`, [customerId
- `src/scripts/verify-database-connection-and-data.js`:
  - Line 67: `SELECT` - SELECT sector, COUNT(*) as count

#### `seed`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/middleware/veraConversationMiddleware.js`:
  - Line 45: `UNKNOWN` - console.log('[vera-conversation] ✓ Loaded persona and intent router from seed fi
- `src/services/complianceGapFrameworkLoader.js`:
  - Line 31: `UNKNOWN` - * Load all frameworks from seed files

#### `separate`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/services/listAtomizer.js`:
  - Line 3: `UNKNOWN` - * Detects and atomizes list items (a., b., c., 1., 2., etc.) into separate requi
  - Line 15: `UNKNOWN` - * Atomize a clause's content into separate list items

#### `SET`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 52

**Files using this table:**

- `config/storage.js`:
  - Line 71: `UPDATE` - ON CONFLICT (standard_id) DO UPDATE SET
- `EDCAT AIP/server/seed_loader.ts`:
  - Line 16: `UPDATE` - ON CONFLICT (tenant_id, name) DO UPDATE SET content=EXCLUDED.content
  - Line 23: `UPDATE` - ON CONFLICT (tenant_id, persona_code, kind, name) DO UPDATE SET content=EXCLUDED
  - Line 34: `UPDATE` - ON CONFLICT (tenant_id, code, revision) DO UPDATE SET title=EXCLUDED.title, auth
  - Line 43: `UPDATE` - ON CONFLICT (tenant_id, standard_id, clause_id) DO UPDATE SET label=EXCLUDED.lab
- `EDCAT AIP/server/vera_chat_handler_example.ts`:
  - Line 38: `UPDATE` - DO UPDATE SET last_intent=EXCLUDED.last_intent, context=EXCLUDED.context, last_t
  - Line 86: `UPDATE` - DO UPDATE SET last_intent=EXCLUDED.last_intent, context=EXCLUDED.context, last_t
- `scripts/migrate.js`:
  - Line 186: `UPDATE` - DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW()
- `src/database/repos/regs.repo.js`:
  - Line 17: `UPDATE` - DO UPDATE SET label = EXCLUDED.label, url = EXCLUDED.url
- `src/edcat/orchestrator.js`:
  - Line 330: `UPDATE` - ON CONFLICT (analysis_id) DO UPDATE SET
- `src/middleware/veraConversationMiddleware.js`:
  - Line 292: `UPDATE` - DO UPDATE SET last_intent = EXCLUDED.last_intent,
- `src/online/discovery/ApiDiscovery.js`:
  - Line 149: `UPDATE` - DO UPDATE SET openapi_url = EXCLUDED.openapi_url,
- `src/routes/customers.js`:
  - Line 287: `DELETE` - document_id UUID REFERENCES ${schemaName}.documents(document_id) ON DELETE SET N
  - Line 316: `DELETE` - procedure_id UUID REFERENCES ${schemaName}.procedures(procedure_id) ON DELETE SE
- `src/routes/upload.js`:
  - Line 149: `UPDATE` - ON CONFLICT (code) DO UPDATE SET
- `src/scripts/fix-all-schema-errors.js`:
  - Line 115: `DELETE` - standard_id UUID REFERENCES public.standards(id) ON DELETE SET NULL,
  - Line 287: `DELETE` - standard_id UUID REFERENCES public.standards(id) ON DELETE SET NULL,
  - Line 353: `DELETE` - standard_id UUID REFERENCES public.standards(id) ON DELETE SET NULL,
- `src/scripts/ingest-knowledge-pack.js`:
  - Line 76: `UPDATE` - DO UPDATE SET
- `src/scripts/load-vera-blueprints.js`:
  - Line 40: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
  - Line 56: `UPDATE` - DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
  - Line 87: `UPDATE` - DO UPDATE SET title = EXCLUDED.title, authority = EXCLUDED.authority, metadata =
  - Line 111: `UPDATE` - DO UPDATE SET label = EXCLUDED.label, parent_clause_id = EXCLUDED.parent_clause_
- `src/scripts/migrate-document-content-to-postgres.js`:
  - Line 25: `DELETE` - standard_id UUID REFERENCES public.standards(id) ON DELETE SET NULL,
- `src/scripts/process-requirements-folder.js`:
  - Line 157: `UPDATE` - ON CONFLICT (code) DO UPDATE SET
  - Line 172: `UPDATE` - ON CONFLICT (code) DO UPDATE SET
  - Line 313: `UPDATE` - ON CONFLICT (file_id) DO UPDATE SET
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 179: `UPDATE` - ON CONFLICT (code) DO UPDATE SET
- `src/scripts/seed-edcat-agent.js`:
  - Line 45: `UPDATE` - DO UPDATE SET
- `src/scripts/seed-edcat-personality.js`:
  - Line 56: `UPDATE` - DO UPDATE SET
  - Line 154: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
  - Line 185: `UPDATE` - DO UPDATE SET kind = EXCLUDED.kind, template = EXCLUDED.template, updated_at = N
  - Line 233: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
  - Line 262: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
  - Line 311: `UPDATE` - DO UPDATE SET title = EXCLUDED.title, authority = EXCLUDED.authority, metadata =
  - Line 334: `UPDATE` - DO UPDATE SET label = EXCLUDED.label, parent_clause_id = EXCLUDED.parent_clause_
  - Line 392: `UPDATE` - DO UPDATE SET rules = EXCLUDED.rules, updated_at = NOW()`,
  - Line 405: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
  - Line 426: `UPDATE` - DO UPDATE SET profile = EXCLUDED.profile, updated_at = NOW()`,
  - Line 442: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
  - Line 456: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
  - Line 472: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
  - Line 487: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
  - Line 501: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
  - Line 515: `UPDATE` - DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
- `src/scripts/test-upload-flow.js`:
  - Line 69: `UPDATE` - ON CONFLICT (code) DO UPDATE SET
- `src/services/aiMemoryService.js`:
  - Line 28: `UPDATE` - DO UPDATE SET
- `src/services/clauseCorrelationEngine.js`:
  - Line 122: `UPDATE` - DO UPDATE SET
- `src/services/internationalization/i18nManager.js`:
  - Line 80: `UPDATE` - DO UPDATE SET
  - Line 127: `UPDATE` - DO UPDATE SET
- `src/services/parseService.js`:
  - Line 60: `UPDATE` - DO UPDATE SET
- `src/services/regulatoryIntelligenceHub.js`:
  - Line 190: `UPDATE` - ON CONFLICT (authority, code) DO UPDATE SET last_detected_at = NOW()`,

#### `siblings`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/listAtomizer.js`:
  - Line 216: `UNKNOWN` - // Flatten children into siblings, providing full_ref

#### `slides`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/process-requirements-folder.js`:
  - Line 73: `UNKNOWN` - // PowerPoint files - extract text from slides (basic extraction)

#### `source`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/database/repos/regs.repo.js`:
  - Line 87: `UNKNOWN` - * Update source after crawl

#### `SQL`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/map-all-tables-static.js`:
  - Line 17: `UNKNOWN` - // Extract all CREATE TABLE statements from SQL files

#### `standard`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 10

**Files using this table:**

- `src/edcat/analysis/gapAnalyzer.js`:
  - Line 13: `UNKNOWN` - * @param {Array} requirements - Requirements from standard
- `src/edcat/orchestrator.js`:
  - Line 66: `UNKNOWN` - details: `Extracted ${requirements.length} requirements with clauses from standa
  - Line 79: `UNKNOWN` - throw new Error('No requirements extracted from standard');
- `src/routes/chat.js`:
  - Line 536: `UNKNOWN` - // Try to get revision from standard name or use default
- `src/routes/parse.js`:
  - Line 36: `UNKNOWN` - // Build search terms from standard code/name
  - Line 813: `UNKNOWN` - // Update standard requirement count in PostgreSQL (single source of truth)
- `src/scripts/load-vera-blueprints.js`:
  - Line 82: `UNKNOWN` - // Insert or update standard
- `src/scripts/seed-edcat-personality.js`:
  - Line 306: `UNKNOWN` - // Insert or update standard
- `src/services/clauseAwareParser.js`:
  - Line 31: `UNKNOWN` - * Generate deterministic SHA256 ID from standard + full_ref + normalized text
- `src/services/parseService.js`:
  - Line 84: `UNKNOWN` - // Update standard metadata

#### `standard_files`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 79

**Files using this table:**

- `src/routes/diagnostics.js`:
  - Line 124: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 137: `SELECT` - FROM public.standard_files
  - Line 158: `UNKNOWN` - LEFT JOIN public.standard_files sf ON s.id = sf.standard_id
  - Line 176: `SELECT` - FROM public.standard_files sf
  - Line 207: `SELECT` - FROM public.standard_files
  - Line 227: `SELECT` - AND (s.uploaded_at IS NOT NULL OR EXISTS (SELECT 1 FROM public.standard_files WH
- `src/routes/upload.js`:
  - Line 470: `SELECT` - 'SELECT file_path FROM public.standard_files WHERE id = $1',
- `src/scripts/audit-postgres-tables.js`:
  - Line 216: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 217: `SELECT` - const linkedStandards = await queryPostgres('SELECT COUNT(DISTINCT standard_id) 
  - Line 234: `SELECT` - AND EXISTS (SELECT 1 FROM public.standard_files sf WHERE sf.standard_id = s.id)
- `src/scripts/check-all-standards-in-database.js`:
  - Line 45: `SELECT` - FROM public.standard_files
- `src/scripts/check-all-standards.js`:
  - Line 44: `SELECT` - FROM public.standard_files
- `src/scripts/check-category-filtering.js`:
  - Line 15: `SELECT` - FROM public.standard_files
- `src/scripts/check-standards-with-files.js`:
  - Line 14: `SELECT` - FROM public.standard_files
- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 170: `SELECT` - FROM public.standard_files
  - Line 200: `UNKNOWN` - // Step 3: Delete files from standard_files
  - Line 201: `UNKNOWN` - console.log('\n🗑️  Step 3: Deleting files from standard_files...');
  - Line 222: `UNKNOWN` - // Delete files from standard_files
  - Line 228: `UNKNOWN` - console.log(`   ✅ Deleted ${deletedFiles.rowCount || 0} files from standard_file
- `src/scripts/cleanup-standards-without-files.js`:
  - Line 59: `UNKNOWN` - // Get all files from standard_files table
  - Line 62: `SELECT` - FROM public.standard_files
- `src/scripts/comprehensive-system-audit.js`:
  - Line 292: `SELECT` - FROM public.standard_files
  - Line 332: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 342: `SELECT` - FROM public.standard_files sf
- `src/scripts/consolidate-standards-tables.js`:
  - Line 42: `SELECT` - const edcatFiles = await queryEdcatAI('SELECT id, file_name, standard_id, file_c
- `src/scripts/debug-standards-filtering.js`:
  - Line 48: `SELECT` - FROM public.standard_files
  - Line 69: `SELECT` - FROM public.standard_files
- `src/scripts/diagnose-complete-connection.js`:
  - Line 68: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 93: `UNKNOWN` - LEFT JOIN public.standard_files sf ON s.id = sf.standard_id
  - Line 118: `SELECT` - FROM public.standard_files sf
  - Line 141: `SELECT` - FROM public.standard_files
  - Line 159: `SELECT` - FROM public.standard_files
  - Line 192: `SELECT` - AND (s.uploaded_at IS NOT NULL OR EXISTS (SELECT 1 FROM public.standard_files WH
  - Line 236: `SELECT` - const filesTotal = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 240: `UNKNOWN` - INNER JOIN public.standard_files sf ON s.id = sf.standard_id
- `src/scripts/diagnose-postgres-errors.js`:
  - Line 96: `SELECT` - const count = await queryPostgres('SELECT COUNT(*) as count FROM public.standard
  - Line 137: `SELECT` - const publicFilesExists = await queryPostgres(`SELECT EXISTS (SELECT FROM inform
- `src/scripts/diagnose-standards-display.js`:
  - Line 64: `UNKNOWN` - LEFT JOIN public.standard_files sf ON s.id = sf.standard_id
  - Line 85: `SELECT` - FROM public.standard_files sf
  - Line 130: `SELECT` - FROM public.standard_files
- `src/scripts/diagnose-standards-not-loading.js`:
  - Line 53: `SELECT` - FROM public.standard_files
  - Line 62: `SELECT` - FROM public.standard_files
  - Line 89: `SELECT` - FROM public.standard_files
  - Line 107: `SELECT` - FROM public.standard_files sf
  - Line 116: `SELECT` - FROM public.standard_files sf
  - Line 126: `SELECT` - WHERE NOT EXISTS (SELECT 1 FROM public.standard_files sf WHERE sf.standard_id = 
  - Line 144: `SELECT` - FROM public.standard_files
  - Line 201: `SELECT` - AND (s.uploaded_at IS NOT NULL OR EXISTS (SELECT 1 FROM public.standard_files WH
  - Line 227: `SELECT` - FROM public.standard_files sf
- `src/scripts/diagnose-standards-visibility.js`:
  - Line 55: `SELECT` - SELECT COUNT(*) as count FROM public.standard_files
  - Line 61: `SELECT` - SELECT COUNT(*) as count FROM public.standard_files WHERE standard_id IS NOT NUL
  - Line 70: `SELECT` - FROM public.standard_files
  - Line 89: `UNKNOWN` - LEFT JOIN public.standard_files sf ON sf.standard_id = s.id
  - Line 123: `SELECT` - FROM public.standard_files
  - Line 166: `UNKNOWN` - console.log('   → OR: Update standard_files entries to set standard_id');
- `src/scripts/diagnose-zero-standards.js`:
  - Line 19: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 22: `SELECT` - const uniqueStandardsWithFiles = await queryPostgres('SELECT COUNT(DISTINCT stan
  - Line 57: `SELECT` - FROM public.standard_files
- `src/scripts/fix-all-schema-errors.js`:
  - Line 132: `UPDATE` - await queryPostgres(`UPDATE public.standard_files SET file_category = 'documents
  - Line 373: `UPDATE` - await queryEdcatAI(`UPDATE public.standard_files SET file_category = 'documents'
- `src/scripts/fix-postgres-errors.js`:
  - Line 52: `SELECT` - const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
  - Line 135: `SELECT` - FROM public.standard_files sf
  - Line 157: `SELECT` - SELECT 1 FROM public.standard_files sf WHERE sf.standard_id = s.id
- `src/scripts/remove-edcat-ai-duplicates.js`:
  - Line 25: `SELECT` - const pgFiles = await queryPostgres('SELECT COUNT(*) as count FROM public.standa
- `src/scripts/restore-standard-files.js`:
  - Line 53: `SELECT` - const after = await queryPostgres('SELECT COUNT(*) as count FROM public.standard
- `src/scripts/restore-standards-from-backup.js`:
  - Line 66: `SELECT` - const filesCurrent = await queryPostgres(`SELECT COUNT(*) as count FROM public.s
  - Line 103: `SELECT` - const afterFilesRestore = await queryPostgres(`SELECT COUNT(*) as count FROM pub
- `src/scripts/test-all-database-connections.js`:
  - Line 79: `SELECT` - const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.st
- `src/scripts/test-api-endpoint.js`:
  - Line 30: `SELECT` - FROM public.standard_files
- `src/scripts/test-upload-flow.js`:
  - Line 177: `SELECT` - SELECT COUNT(*) as count FROM public.standard_files
  - Line 183: `SELECT` - SELECT COUNT(*) as count FROM public.standard_files WHERE standard_id IS NOT NUL
- `src/scripts/verify-database-connections-complete.js`:
  - Line 70: `SELECT` - const files = await queryPostgres('SELECT COUNT(*) as count FROM public.standard
  - Line 92: `SELECT` - FROM public.standard_files sf
- `src/scripts/verify-database-connections.js`:
  - Line 37: `SELECT` - const filesCount = await query('SELECT COUNT(*) as count FROM standard_files');
  - Line 43: `SELECT` - FROM standard_files
  - Line 195: `SELECT` - FROM standard_files
- `src/scripts/verify-standards-table-contents.js`:
  - Line 125: `SELECT` - SELECT COUNT(*) as count FROM public.standard_files
  - Line 131: `SELECT` - FROM public.standard_files
  - Line 140: `SELECT` - FROM public.standard_files

#### `standard_files_backup_`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/scripts/restore-standard-files.js`:
  - Line 49: `SELECT` - FROM public.standard_files_backup_1763495825770
- `src/scripts/restore-standards-from-backup.js`:
  - Line 60: `SELECT` - FROM public.standard_files_backup_1763495825770
  - Line 99: `SELECT` - FROM public.standard_files_backup_1763495825770

#### `standard_files_content`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `config/storage.js`:
  - Line 113: `SELECT` - `SELECT file_content, file_size FROM public.standard_files_content WHERE standar
  - Line 151: `SELECT` - `SELECT 1 FROM public.standard_files_content WHERE standard_id = $1 LIMIT 1`,

#### `standard_id`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/scripts/cleanup-standards-without-files.js`:
  - Line 61: `SELECT` - SELECT standard_id, file_path, file_name, file_category
- `src/scripts/diagnose-standards-visibility.js`:
  - Line 69: `SELECT` - SELECT standard_id, file_name, file_category, COUNT(*) as file_count
- `src/services/complianceGapAnalyzer.js`:
  - Line 63: `SELECT` - `SELECT standard_id, code, name FROM compliance_lib.standards WHERE standard_id 

#### `standards`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 125

**Files using this table:**

- `index.js`:
  - Line 207: `SELECT` - const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.st
- `src/edcat/parser/clauseParser.js`:
  - Line 3: `UNKNOWN` - * Extracts requirements with clauses from standards
- `src/routes/admin.js`:
  - Line 105: `SELECT` - const dbCheck = await queryPostgres('SELECT current_database() as db, COUNT(*) a
  - Line 125: `SELECT` - const finalCheck = await queryPostgres('SELECT COUNT(*) as count FROM public.sta
- `src/routes/chat.js`:
  - Line 117: `SELECT` - FROM public.standards s
  - Line 165: `UNKNOWN` - JOIN public.standards s ON s.id = cr.standard_id
  - Line 1133: `UNKNOWN` - return `I can extract requirements from standards. To extract:\n\n1. Upload a st
- `src/routes/diagnostics.js`:
  - Line 117: `SELECT` - const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 157: `SELECT` - FROM public.standards s
  - Line 177: `UNKNOWN` - LEFT JOIN public.standards s ON sf.standard_id = s.id
  - Line 223: `SELECT` - FROM public.standards s
- `src/routes/parse.js`:
  - Line 168: `SELECT` - FROM public.standards
  - Line 442: `SELECT` - FROM public.standards
  - Line 510: `UNKNOWN` - // Strategy 1: Get file_path from standards table (CONSOLIDATED)
  - Line 514: `SELECT` - `SELECT file_path FROM public.standards
  - Line 522: `UNKNOWN` - console.log(`✅ Found file from standards table: ${filePath}`);
  - Line 816: `UPDATE` - `UPDATE public.standards
  - Line 831: `SELECT` - `SELECT COALESCE(total_clauses, total_requirements, 0) as total_clauses FROM pub
- `src/routes/requirements.js`:
  - Line 53: `UNKNOWN` - console.log(`[requirements] 🔍 Querying standards from public.standards table${c
  - Line 75: `SELECT` - FROM public.standards s
  - Line 120: `UNKNOWN` - // FIXED: fileCategoryMap is no longer needed - file_category comes directly fro
  - Line 129: `UNKNOWN` - let fileCategory = row.file_category || 'standard'; // Use file_category from st
  - Line 142: `UNKNOWN` - console.log(`[requirements] 🔍 BUG DETECTION: Row ${idx + 1} (${row.code}): file
  - Line 283: `UNKNOWN` - // Removed fileCategoryMap - file_category comes directly from standards table
  - Line 473: `UNKNOWN` - JOIN public.standards s ON r.standard_id = s.id
  - Line 541: `SELECT` - SELECT COUNT(*) as count FROM public.standards
  - Line 556: `SELECT` - FROM public.standards s
  - Line 617: `SELECT` - `SELECT file_path FROM public.standards WHERE id = $1`,
  - Line 720: `UPDATE` - `UPDATE standards
- `src/routes/test-db.js`:
  - Line 32: `SELECT` - const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.st
- `src/routes/upload.js`:
  - Line 132: `UPDATE` - `UPDATE public.standards SET uploaded_at = COALESCE(uploaded_at, NOW()) WHERE id
  - Line 166: `UPDATE` - `UPDATE public.standards SET uploaded_at = COALESCE(uploaded_at, NOW()) WHERE id
  - Line 230: `UPDATE` - `UPDATE public.standards
  - Line 433: `SELECT` - FROM public.standards
- `src/scripts/audit-postgres-tables.js`:
  - Line 97: `SELECT` - SELECT 1 FROM public.standards s WHERE s.id = sf.standard_id
  - Line 122: `SELECT` - SELECT 1 FROM public.standards s WHERE s.id = pr.standard_id
  - Line 215: `SELECT` - const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 232: `SELECT` - FROM public.standards s
- `src/scripts/check-all-standards-in-database.js`:
  - Line 23: `SELECT` - FROM public.standards
- `src/scripts/check-all-standards.js`:
  - Line 21: `SELECT` - FROM standards
- `src/scripts/check-standards-table-exists.js`:
  - Line 89: `SELECT` - const count = await pool.query('SELECT COUNT(*) as count FROM public.standards')
- `src/scripts/check-standards-with-files.js`:
  - Line 56: `SELECT` - FROM standards s
- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 116: `UNKNOWN` - // Delete standards
  - Line 230: `UNKNOWN` - // Step 4: Delete standards that only had Examples files
  - Line 251: `UNKNOWN` - // Delete standards
- `src/scripts/cleanup-standards-without-files.js`:
  - Line 125: `UNKNOWN` - // Step 5: Delete standards and related data
  - Line 174: `UNKNOWN` - console.log(`   ✓ Deleted standard ${standardCode} from standards table`);
- `src/scripts/comprehensive-system-audit.js`:
  - Line 158: `UPDATE` - UPDATE public.standards
  - Line 183: `SELECT` - SELECT COUNT(*) as count FROM public.standards WHERE id = $1
  - Line 281: `SELECT` - FROM public.standards
  - Line 331: `SELECT` - const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 343: `UNKNOWN` - INNER JOIN public.standards s ON sf.standard_id = s.id
- `src/scripts/consolidate-standards-tables.js`:
  - Line 23: `SELECT` - const edcatStandards = await queryEdcatAI('SELECT id, code, name, sector, upload
- `src/scripts/create-standards-table-directly.js`:
  - Line 84: `SELECT` - const count = await pool.query('SELECT COUNT(*) as count FROM public.standards')
- `src/scripts/debug-standards-filtering.js`:
  - Line 21: `SELECT` - FROM standards
- `src/scripts/diagnose-complete-connection.js`:
  - Line 61: `SELECT` - const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 92: `SELECT` - FROM public.standards s
  - Line 119: `UNKNOWN` - LEFT JOIN public.standards s ON sf.standard_id = s.id
  - Line 188: `SELECT` - FROM public.standards s
  - Line 235: `SELECT` - const standardsTotal = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 239: `SELECT` - FROM public.standards s
- `src/scripts/diagnose-postgres-errors.js`:
  - Line 136: `SELECT` - const publicStandards = await queryPostgres('SELECT COUNT(*) as count FROM publi
- `src/scripts/diagnose-standards-display.js`:
  - Line 63: `SELECT` - FROM public.standards s
  - Line 106: `SELECT` - FROM public.standards s
- `src/scripts/diagnose-standards-not-loading.js`:
  - Line 24: `SELECT` - FROM public.standards
  - Line 108: `UNKNOWN` - INNER JOIN public.standards s ON sf.standard_id = s.id
  - Line 118: `SELECT` - AND NOT EXISTS (SELECT 1 FROM public.standards s WHERE s.id = sf.standard_id)
  - Line 125: `SELECT` - FROM public.standards s
  - Line 165: `SELECT` - FROM public.standards s
  - Line 198: `SELECT` - FROM public.standards s
  - Line 228: `UNKNOWN` - INNER JOIN public.standards s ON sf.standard_id = s.id
- `src/scripts/diagnose-standards-visibility.js`:
  - Line 20: `SELECT` - SELECT COUNT(*) as count FROM public.standards
  - Line 88: `SELECT` - FROM public.standards s
  - Line 137: `SELECT` - FROM public.standards s
- `src/scripts/diagnose-upload-issue.js`:
  - Line 70: `SELECT` - const totalCount = await pool.query('SELECT COUNT(*) as count FROM public.standa
  - Line 77: `SELECT` - FROM public.standards
  - Line 86: `SELECT` - FROM public.standards
  - Line 114: `SELECT` - FROM public.standards
- `src/scripts/diagnose-zero-standards.js`:
  - Line 16: `SELECT` - const standardsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM standar
  - Line 93: `SELECT` - FROM standards s
- `src/scripts/find-standards-table-schema.js`:
  - Line 49: `SELECT` - const test1 = await pool.query('SELECT COUNT(*) as count FROM standards');
  - Line 57: `SELECT` - const test2 = await pool.query('SELECT COUNT(*) as count FROM public.standards')
- `src/scripts/fix-all-schema-errors.js`:
  - Line 185: `UPDATE` - UPDATE public.standards
  - Line 397: `UPDATE` - UPDATE public.standards
- `src/scripts/fix-all-standards-issues.js`:
  - Line 59: `UPDATE` - UPDATE public.standards
  - Line 71: `UPDATE` - UPDATE public.standards
  - Line 83: `UPDATE` - UPDATE public.standards
  - Line 92: `UPDATE` - UPDATE public.standards
  - Line 102: `UPDATE` - UPDATE public.standards
  - Line 120: `SELECT` - FROM public.standards
- `src/scripts/fix-postgres-errors.js`:
  - Line 51: `SELECT` - const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public
  - Line 138: `SELECT` - SELECT 1 FROM public.standards s WHERE s.id = sf.standard_id
  - Line 155: `SELECT` - FROM public.standards s
- `src/scripts/process-requirements-folder.js`:
  - Line 106: `UPDATE` - `UPDATE public.standards SET uploaded_at = COALESCE(uploaded_at, NOW()) WHERE id
  - Line 252: `UPDATE` - `UPDATE public.standards
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 157: `UPDATE` - `UPDATE standards
- `src/scripts/remove-edcat-ai-duplicates.js`:
  - Line 24: `SELECT` - const pgStandards = await queryPostgres('SELECT COUNT(*) as count FROM public.st
- `src/scripts/restore-standards-from-backup.js`:
  - Line 36: `SELECT` - const currentCheck = await queryPostgres(`SELECT COUNT(*) as count FROM public.s
  - Line 54: `SELECT` - const afterRestore = await queryPostgres(`SELECT COUNT(*) as count FROM public.s
- `src/scripts/test-all-database-connections.js`:
  - Line 156: `SELECT` - const countResult = await queryEdcatAI('SELECT COUNT(*) as count FROM standards'
  - Line 288: `UNKNOWN` - // Test 4: Can we join standards with files (cross-database check)?
- `src/scripts/test-api-endpoint.js`:
  - Line 58: `SELECT` - FROM standards s
- `src/scripts/test-upload-flow.js`:
  - Line 117: `SELECT` - FROM public.standards s
  - Line 155: `SELECT` - SELECT COUNT(*) as count FROM public.standards
- `src/scripts/verify-database-connection-and-data.js`:
  - Line 61: `SELECT` - const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.st
  - Line 68: `SELECT` - FROM public.standards
  - Line 83: `SELECT` - FROM public.standards
  - Line 143: `SELECT` - const edcatCount = await queryEdcatAI('SELECT COUNT(*) as count FROM public.stan
- `src/scripts/verify-database-connections-complete.js`:
  - Line 69: `SELECT` - const standards = await queryPostgres('SELECT COUNT(*) as count FROM public.stan
  - Line 95: `SELECT` - SELECT 1 FROM public.standards s WHERE s.id = sf.standard_id
- `src/scripts/verify-database-connections.js`:
  - Line 102: `SELECT` - const standardsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM standar
  - Line 150: `SELECT` - FROM standards s
- `src/scripts/verify-railway-ui-data.js`:
  - Line 75: `SELECT` - FROM public.standards
- `src/scripts/verify-standards-table-contents.js`:
  - Line 50: `SELECT` - const totalCount = await queryPostgres(`SELECT COUNT(*) as count FROM public.sta
  - Line 57: `SELECT` - FROM public.standards
  - Line 66: `SELECT` - FROM public.standards
  - Line 84: `SELECT` - FROM public.standards
  - Line 109: `SELECT` - FROM public.standards
  - Line 168: `UPDATE` - console.log('   Fix: UPDATE public.standards SET uploaded_at = NOW() WHERE uploa
- `src/scripts/verify-standards-table-exists.js`:
  - Line 55: `SELECT` - const count = await pool.query('SELECT COUNT(*) as count FROM public.standards')
- `src/seeds/standards.js`:
  - Line 100: `SELECT` - 'SELECT COUNT(*) as count FROM public.standards WHERE code IS NOT NULL'
- `src/services/auditPrepExporter.js`:
  - Line 28: `SELECT` - 'SELECT * FROM standards WHERE id = $1',
- `src/services/learningEngine.js`:
  - Line 41: `UNKNOWN` - LEFT JOIN standards ps
- `src/services/parseService.js`:
  - Line 3: `UNKNOWN` - * Extracts clauses from standards using TextExtractor and clause-aware parsing
  - Line 86: `UPDATE` - 'UPDATE standards SET total_clauses = $1, updated_at = NOW() WHERE id = $2',

#### `Standards`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/admin.js`:
  - Line 94: `UNKNOWN` - * Processes all documents from Standards, Regulatory, and Customer folders

#### `standards_backup_`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/restore-standards-from-backup.js`:
  - Line 13: `SELECT` - FROM public.standards_backup_1763495824478
  - Line 50: `SELECT` - FROM public.standards_backup_1763495824478

#### `statements`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `scripts/apply-schema.js`:
  - Line 315: `UNKNOWN` - // Split into statements
- `src/database/schema.js`:
  - Line 47: `UNKNOWN` - * Split SQL into statements

#### `stray`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/textSanitizer.js`:
  - Line 30: `UNKNOWN` - // Join stray intra-word linebreaks: "D\nelivery" -> "Delivery"

#### `structure`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/clauseExtractor.js`:
  - Line 171: `UNKNOWN` - // Add all clauses from structure to valid clauses

#### `structured`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/online/Normalizer.js`:
  - Line 3: `UNKNOWN` - * Segments text into structured clauses
- `src/online/Normalizer.ts`:
  - Line 3: `UNKNOWN` - * Segments text into structured clauses
- `src/services/requirementsFormatter.js`:
  - Line 3: `UNKNOWN` - * Formats extracted requirements into structured lists similar to:

#### `sub`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/clauseQuery.js`:
  - Line 36: `UNKNOWN` - // Separate main clause from sub-items

#### `successful`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 212: `UNKNOWN` - * Learn from successful patterns

#### `table`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/scripts/test-all-database-connections.js`:
  - Line 78: `UNKNOWN` - // Try to read from table
  - Line 155: `UNKNOWN` - // Try to read from table
  - Line 217: `UNKNOWN` - // Try to read from table

#### `table_name`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 20

**Files using this table:**

- `scripts/apply-schema.js`:
  - Line 234: `SELECT` - SELECT table_name
- `src/database/schema.js`:
  - Line 411: `SELECT` - SELECT table_name
- `src/scripts/apply-fixed-schema.js`:
  - Line 64: `SELECT` - SELECT table_name
- `src/scripts/check-all-schemas.js`:
  - Line 29: `SELECT` - SELECT table_name
- `src/scripts/check-standards-table-exists.js`:
  - Line 46: `SELECT` - SELECT table_name
  - Line 139: `SELECT` - SELECT table_name
- `src/scripts/cleanup-duplicate-tables.js`:
  - Line 25: `SELECT` - SELECT table_name
  - Line 45: `SELECT` - SELECT table_name
  - Line 113: `SELECT` - SELECT table_name
- `src/scripts/create-blueprint-tables.js`:
  - Line 80: `SELECT` - SELECT table_name
  - Line 102: `SELECT` - SELECT table_name
- `src/scripts/diagnose-postgres-errors.js`:
  - Line 32: `SELECT` - SELECT table_name
  - Line 111: `SELECT` - SELECT table_name
- `src/scripts/drop-standard-files-tables.js`:
  - Line 15: `SELECT` - SELECT table_name
  - Line 59: `SELECT` - SELECT table_name
- `src/scripts/drop-tables-now.js`:
  - Line 53: `SELECT` - SELECT table_name
  - Line 86: `SELECT` - SELECT table_name
- `src/scripts/run-edcat-migration-only.js`:
  - Line 149: `SELECT` - SELECT table_name
- `src/scripts/run-migrations.js`:
  - Line 160: `SELECT` - SELECT table_name
- `src/scripts/verify-database-connection-and-data.js`:
  - Line 108: `SELECT` - SELECT table_name

#### `table_schema`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 13

**Files using this table:**

- `setup-db.js`:
  - Line 126: `SELECT` - SELECT table_schema, table_name
- `src/database/migrate.js`:
  - Line 186: `SELECT` - SELECT table_schema, table_name
- `src/routes/db-status.js`:
  - Line 40: `SELECT` - SELECT table_schema, table_name
- `src/routes/test-db.js`:
  - Line 22: `SELECT` - SELECT table_schema, table_name
- `src/scripts/audit-postgres-tables.js`:
  - Line 19: `SELECT` - SELECT table_schema, table_name
- `src/scripts/check-edcat-ai-tables.js`:
  - Line 12: `SELECT` - SELECT table_schema, table_name
  - Line 56: `SELECT` - SELECT table_schema, table_name
- `src/scripts/check-postgres-duplicate-tables.js`:
  - Line 12: `SELECT` - SELECT table_schema, table_name
- `src/scripts/create-all-tables.js`:
  - Line 403: `SELECT` - SELECT table_schema, table_name
- `src/scripts/find-all-standards-tables.js`:
  - Line 136: `SELECT` - SELECT table_schema, table_name
- `src/scripts/find-standards-table-schema.js`:
  - Line 28: `SELECT` - SELECT table_schema, table_name
- `src/scripts/verify-tables.js`:
  - Line 44: `SELECT` - SELECT table_schema, table_name
  - Line 320: `SELECT` - SELECT table_schema, table_name

#### `target`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/advancedAI/anomalyDetectionEngine.js`:
  - Line 169: `UNKNOWN` - recommendation: 'Escalate overdue CAPAs and update target completion dates'

#### `target_standard_code`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/internationalization/i18nManager.js`:
  - Line 101: `SELECT` - `SELECT target_standard_code, mapping_type, confidence_score, notes

#### `templates`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/bulk-train-parser.js`:
  - Line 3: `UNKNOWN` - * Load training examples from templates to rapidly train the parser

#### `tenant_id`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/diagnose-vera.js`:
  - Line 21: `SELECT` - `SELECT tenant_id, name FROM ai_tenant WHERE tenant_id = $1`,
- `src/scripts/seed-edcat-personality.js`:
  - Line 25: `SELECT` - `SELECT tenant_id FROM ai_tenant WHERE name = 'Default EDCAT Tenant' LIMIT 1`

#### `tenant_industry_modules`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 2

**Files using this table:**

- `src/services/industryModules/industryFactory.js`:
  - Line 87: `UPDATE` - `UPDATE tenant_industry_modules
  - Line 138: `SELECT` - FROM tenant_industry_modules tim

#### `tenants`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 4

**Files using this table:**

- `src/routes/predictions.js`:
  - Line 11: `SELECT` - const cust = await query(`SELECT sector FROM tenants WHERE id = $1`, [customerId
- `src/scripts/fix-all-schema-errors.js`:
  - Line 51: `UPDATE` - UPDATE public.tenants
  - Line 81: `SELECT` - WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE name = 'Default Organizatio
  - Line 88: `SELECT` - WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE name = 'Default Organizatio

#### `TEXT`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/database/migrations/003_verify_and_fix_schema.js`:
  - Line 81: `UNKNOWN` - reason_for_update TEXT,
- `src/scripts/create-all-tables.js`:
  - Line 153: `UNKNOWN` - reason_for_update TEXT,
- `src/scripts/verify-tables.js`:
  - Line 171: `UNKNOWN` - reason_for_update TEXT,

#### `the`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 18

**Files using this table:**

- `EDCAT AIP/server/chat_middleware.ts`:
  - Line 3: `UNKNOWN` - /** Injects Vera's follow rules into the chat flow and enforces guardrails. */
- `EDCAT AIP/server/examples/chat_handler.ts`:
  - Line 77: `UNKNOWN` - return res.status(200).json({ text: 'I could not produce a fully‑cited answer fr
- `EDCAT AIP/server/vera_conversation_middleware.ts`:
  - Line 127: `UNKNOWN` - // directly (for simple small talk) or blend them into the LLM prompt.
- `src/database/connection.js`:
  - Line 95: `UNKNOWN` - * Get a client from the pool for transactions
- `src/database/db.js`:
  - Line 84: `UNKNOWN` - * Get a client from the pool for transactions
- `src/middleware/veraMiddleware.js`:
  - Line 3: `UNKNOWN` - * Injects Vera's follow rules into the chat flow and enforces guardrails
- `src/routes/parse.js`:
  - Line 474: `UNKNOWN` - hint: 'If the standard was already parsed, try re-parsing from the Parse tab.'
- `src/routes/requirements.js`:
  - Line 119: `UNKNOWN` - // All standards returned from the query are guaranteed to have files
- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 5: `UNKNOWN` - * from the Examples folder. Examples should NOT be in the compliance library.
  - Line 10: `UNKNOWN` - * 3. Removes those files and standards from the database
  - Line 82: `UNKNOWN` - console.log('\n   🗑️  These will be removed from the compliance library...');
- `src/scripts/diagnose-vera.js`:
  - Line 139: `UNKNOWN` - console.log('   This will load all of Vera\'s knowledge into the database.\n');
- `src/scripts/ensure-parsed-requirements-table-robust.js`:
  - Line 3: `UNKNOWN` - * This can be run manually or called from the parse route
- `src/scripts/fix-all-standards-issues.js`:
  - Line 43: `UNKNOWN` - // Keep the first one, delete the rest
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 79: `UNKNOWN` - console.log('   Run that script first to process documents from the Requirements
- `src/scripts/seed-edcat-agent.js`:
  - Line 40: `UNKNOWN` - // Insert or update the agent (schema should already exist from migration)
- `src/services/clauseExtractor.js`:
  - Line 5: `UNKNOWN` - * 1. Building a clause structure map from the document
- `src/services/veraConversationalEngine.js`:
  - Line 417: `UNKNOWN` - // Get customer ID from context (this would come from the request)

#### `them`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 179: `UNKNOWN` - // Find related intelligence entries and update them

#### `these`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/cleanup-duplicate-tables.js`:
  - Line 97: `UNKNOWN` - console.log('   ⚠️  This will permanently delete these tables from EDCAT AI DB!'
- `src/scripts/cleanup-examples-folder-errors.js`:
  - Line 84: `UNKNOWN` - // Delete these standards

#### `this`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/middleware/enterpriseMiddleware.js`:
  - Line 17: `UNKNOWN` - message: 'Too many requests from this IP, please try again later.',
- `src/services/clauseAwareParser.js`:
  - Line 244: `UNKNOWN` - // Extract requirements from this clause's content

#### `three`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/edcat/orchestrator.js`:
  - Line 304: `UNKNOWN` - * Categorize mappings into three groups

#### `title`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/services/requirementsFormatter.js`:
  - Line 58: `UNKNOWN` - // Update title if we have one and it's not set
- `src/services/trainingManagement.js`:
  - Line 75: `SELECT` - 'SELECT title FROM training_records WHERE id = $1',

#### `today`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/persona.js`:
  - Line 62: `UNKNOWN` - morning: ["Good morning. Ready to dig into today's clauses?"],

#### `tool_policies`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 142: `UNKNOWN` - * Seed policies from tool_policies.json

#### `tr`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/advancedAI/anomalyDetectionEngine.js`:
  - Line 111: `SELECT` - `SELECT tr.id, tr.title, tr.scheduled_date, tr.status,

#### `training_completions`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 1

**Files using this table:**

- `src/services/advancedAI/anomalyDetectionEngine.js`:
  - Line 114: `UNKNOWN` - LEFT JOIN training_completions tc ON tr.id = tc.training_id

#### `training_records`

- **Database**: PostgreSQL
- **Defined**: ✅ YES
- **Code References**: 5

**Files using this table:**

- `src/services/advancedAI/anomalyDetectionEngine.js`:
  - Line 113: `SELECT` - FROM training_records tr
- `src/services/edcatQMSIntegration.js`:
  - Line 115: `SELECT` - `SELECT * FROM training_records WHERE customer_id = $1`,
- `src/services/trainingManagement.js`:
  - Line 75: `SELECT` - 'SELECT title FROM training_records WHERE id = $1',
  - Line 140: `UNKNOWN` - JOIN training_records tr ON ec.training_id = tr.id
  - Line 162: `SELECT` - FROM training_records

#### `translated_text`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/services/internationalization/i18nManager.js`:
  - Line 25: `SELECT` - `SELECT translated_text FROM i18n_translations
  - Line 33: `SELECT` - `SELECT translated_text FROM i18n_translations

#### `translation_key`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/internationalization/i18nManager.js`:
  - Line 55: `SELECT` - `SELECT translation_key, translated_text

#### `tuning`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/learning.js`:
  - Line 106: `UNKNOWN` - // Update tuning as approved

#### `twoDatabaseMigrations`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/run-migrations.js`:
  - Line 22: `UNKNOWN` - * This is the same function from twoDatabaseMigrations.js
  - Line 115: `UNKNOWN` - // Use the proper SQL splitting function from twoDatabaseMigrations.js

#### `txid_current_if_assigned`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/database/migrations/001_initial_schema.js`:
  - Line 48: `SELECT` - const inTransaction = await client.query('SELECT txid_current_if_assigned()');

#### `TXT`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/routes/parse.js`:
  - Line 144: `UNKNOWN` - console.log(`✅ Read ${text.length} characters from TXT`);
  - Line 217: `UNKNOWN` - console.log(`✅ Read ${text.length} characters from TXT (from DB)`);

#### `under_review`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/documentManagement.js`:
  - Line 49: `UPDATE` - `UPDATE qms_documents SET status = 'under_review' WHERE id = $1`,

#### `UNNEST`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/database/repos/requirements.repo.js`:
  - Line 37: `SELECT` - where += ` AND EXISTS (SELECT 1 FROM UNNEST(modality) m WHERE m = ANY($${params.

#### `upload`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/scripts/diagnose-complete-connection.js`:
  - Line 3: `UNKNOWN` - * from upload to display in compliance library
- `src/scripts/diagnose-upload-issue.js`:
  - Line 108: `UNKNOWN` - // Test the actual query from upload.js

#### `uploaded`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/routes/upload.js`:
  - Line 61: `UNKNOWN` - // HELPER: Extract text from uploaded file
  - Line 459: `DELETE` - // DELETE /api/upload/:fileId - Delete uploaded file

#### `uploaded_at`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/routes/upload.js`:
  - Line 164: `UNKNOWN` - // Update uploaded_at if NULL
- `src/scripts/process-requirements-folder.js`:
  - Line 104: `UNKNOWN` - // Update uploaded_at if it's NULL

#### `url`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/chat.js`:
  - Line 191: `SELECT` - `SELECT url, name, regulatory_body as agency

#### `user`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `learningEngine.js`:
  - Line 42: `UNKNOWN` - * Record accuracy feedback from user rating
- `src/routes/users.js`:
  - Line 134: `UNKNOWN` - * Update user details and access rights

#### `user_id`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/users.js`:
  - Line 89: `SELECT` - `SELECT user_id FROM public.authorized_users WHERE username = $1 OR email = $2`,

#### `user_question`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/aiMemoryService.js`:
  - Line 129: `SELECT` - `SELECT user_question, ai_response, response_type, user_satisfaction, was_helpfu

#### `validators`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/seed-edcat-personality.js`:
  - Line 198: `UNKNOWN` - * Seed validators from validators.json, validators_extras.json, and validators_e

#### `various`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 2

**Files using this table:**

- `src/middleware/customerContext.js`:
  - Line 17: `UNKNOWN` - // Extract customer ID from various sources
- `src/middleware/enterpriseMiddleware.js`:
  - Line 125: `UNKNOWN` - // Get tenant ID from various sources

#### `Vera`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 5

**Files using this table:**

- `src/routes/chat.js`:
  - Line 104: `UNKNOWN` - // Only return standards that have been uploaded by the user OR pulled from Vera
  - Line 677: `UNKNOWN` - // Add next-step suggestions (from Vera rules)
- `src/scripts/pull-vera-learning-standards.js`:
  - Line 4: `UNKNOWN` - * This script extracts standards from Vera's learning database tables
  - Line 162: `UNKNOWN` - [`${standardCode} (from Vera learning)`, existing.id]
  - Line 173: `UNKNOWN` - const standardName = `${standardCode} (from Vera learning)`;

#### `verified`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/routes/chat.js`:
  - Line 592: `UNKNOWN` - return `⚠️ **Retrieval Required**\n\nI cannot answer about clause ${requestedCla

#### `version`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `src/database/migrate.js`:
  - Line 36: `SELECT` - const result = await client.query('SELECT version FROM schema_migrations ORDER B
- `src/edcat/orchestrator.js`:
  - Line 365: `SELECT` - `SELECT version FROM model_versions
- `src/routes/db-status.js`:
  - Line 57: `SELECT` - SELECT version, executed_at
- `src/services/dbIntrospectService.js`:
  - Line 215: `SELECT` - const versionResult = await client.query('SELECT version() AS version');

#### `was`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/regulatoryIntelligenceHub.js`:
  - Line 215: `UNKNOWN` - html: `<p>A new update was detected:</p>

#### `whitelisted`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `scripts/refresh-regs.js`:
  - Line 3: `UNKNOWN` - * Fetches and processes regulations from whitelisted sources
- `scripts/refresh-regs.ts`:
  - Line 3: `UNKNOWN` - * Fetches and processes regulations from whitelisted sources
- `src/online/RegCrawler.js`:
  - Line 3: `UNKNOWN` - * Fetches regulations from whitelisted sources, parses, normalizes, and stores a
- `src/online/RegCrawler.ts`:
  - Line 3: `UNKNOWN` - * Fetches regulations from whitelisted sources, parses, normalizes, and stores a

#### `with`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 4

**Files using this table:**

- `src/routes/upload.js`:
  - Line 142: `UNKNOWN` - // First, try to insert with ON CONFLICT if unique constraint exists
- `src/scripts/process-requirements-folder.js`:
  - Line 151: `UNKNOWN` - // Try insert with authority_source first
- `src/scripts/test-all-database-connections.js`:
  - Line 81: `UNKNOWN` - // Try to write to table (test insert with rollback)
  - Line 158: `UNKNOWN` - // Try to write to table (test insert with rollback)

#### `without`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/scripts/fix-all-schema-errors.js`:
  - Line 84: `UNKNOWN` - // Key is nullable or doesn't exist, insert without it

#### `Word`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/requirementParser.js`:
  - Line 774: `UNKNOWN` - console.log(`✓ Extracted ${text.length} characters from Word document`);

#### `words`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 1

**Files using this table:**

- `src/services/embeddingService.js`:
  - Line 48: `UNKNOWN` - * Tokenize text into words

#### `works`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 8

**Files using this table:**

- `src/scripts/comprehensive-system-audit.js`:
  - Line 165: `UPDATE` - console.log('   ✅ UPDATE works');
  - Line 187: `DELETE` - console.log('   ✅ DELETE works');
- `src/scripts/test-all-database-connections.js`:
  - Line 349: `INSERT` - return { success: true, message: 'Standards INSERT works' };
  - Line 381: `INSERT` - return { success: true, message: 'standard_files INSERT works' };
  - Line 406: `INSERT` - return { success: true, message: 'parsed_requirements INSERT works' };
  - Line 420: `SELECT` - message: `Standards SELECT works (found ${result.rows.length} records)`
  - Line 431: `SELECT` - message: `parsed_requirements SELECT works (found ${result.rows.length} records)
  - Line 442: `SELECT` - message: `standard_files SELECT works (found ${result.rows.length} records)`

#### `your`

- **Database**: PostgreSQL
- **Defined**: ❌ NO
- **Code References**: 3

**Files using this table:**

- `src/middleware/veraConversationMiddleware.js`:
  - Line 234: `UNKNOWN` - "Perfect! Ready to dive into your compliance work?",
- `src/routes/chat.js`:
  - Line 309: `UNKNOWN` - "Perfect! Ready to dive into your compliance work?",
- `src/services/veraConversationalEngine.js`:
  - Line 817: `UNKNOWN` - "Perfect! Ready to dive into your compliance work?",


## EDCAT AI Database

### All Defined Tables

- `ai_chat_log`  ⚠️ ORPHANED
- `ai_clause_blueprint` ✅ 
- `ai_conversation_history`  ⚠️ ORPHANED
- `ai_conversation_state` ✅ 
- `ai_crosswalk_blueprint`  ⚠️ ORPHANED
- `ai_doc_ref`  ⚠️ ORPHANED
- `ai_persona` ✅ 
- `ai_persona_profile` ✅ 
- `ai_policy` ✅ 
- `ai_prompt` ✅ 
- `ai_router` ✅ 
- `ai_standard` ✅ 
- `ai_template` ✅ 
- `ai_tenant` ✅ 
- `ai_validator` ✅ 
- `api_keys` ✅ 
- `audit_logs`  ⚠️ ORPHANED
- `audit_questions`  ⚠️ ORPHANED
- `audit_trail_decisions` ✅ 
- `baseline_metrics`  ⚠️ ORPHANED
- `capa_actions`  ⚠️ ORPHANED
- `capa_effectiveness_checks` ✅ 
- `capa_records` ✅ 
- `clause_correlation_matrix` ✅ 
- `customer_documents` ✅ 
- `customer_procedures` ✅ 
- `document_approvals` ✅ 
- `document_content_for_learning` ✅ 
- `document_distribution`  ⚠️ ORPHANED
- `document_versions` ✅ 
- `edcat.ai_agents`  ⚠️ ORPHANED
- `edcat.ai_memories`  ⚠️ ORPHANED
- `edcat.ai_messages`  ⚠️ ORPHANED
- `edcat.ai_sessions`  ⚠️ ORPHANED
- `edcat.personality_learning_events`  ⚠️ ORPHANED
- `edcat.qa_pairs`  ⚠️ ORPHANED
- `edcat_learning_events`  ⚠️ ORPHANED
- `employee_competencies` ✅ 
- `employees` ✅ 
- `example_documents` ✅ 
- `extraction_history`  ⚠️ ORPHANED
- `i` ✅ 
- `industry_modules` ✅ 
- `integration_logs`  ⚠️ ORPHANED
- `integrations` ✅ 
- `learned_patterns`  ⚠️ ORPHANED
- `mock_audit_reports` ✅ 
- `mock_audit_responses` ✅ 
- `mock_audit_sessions` ✅ 
- `model_versions` ✅ 
- `parsed_clauses` ✅ 
- `qms_documents` ✅ 
- `regional_compliance_mappings` ✅ 
- `regulatory_updates`  ⚠️ ORPHANED
- `regulatory_websites` ✅ 
- `standard_files` ✅ 
- `standards` ✅ 
- `sync_log`  ⚠️ ORPHANED
- `tenant_industry_modules` ✅ 
- `tenants` ✅ 
- `training_completions` ✅ 
- `training_records` ✅ 
- `upload_files`  ⚠️ ORPHANED

### Orphaned Tables (Can Be Removed)

**PostgreSQL:**

- `ai_agents`
- `ai_chat_log`
- `ai_clause_blueprint`
- `ai_conversation_history`
- `ai_conversation_state`
- `ai_crosswalk_blueprint`
- `ai_doc_ref`
- `ai_memories`
- `ai_messages`
- `ai_persona`
- `ai_persona_profile`
- `ai_policy`
- `ai_prompt`
- `ai_router`
- `ai_sessions`
- `ai_standard`
- `ai_template`
- `ai_tenant`
- `ai_validator`
- `audit_logs_results`
- `audit_trail_decisions`
- `baseline_metrics`
- `clause_correlation_matrix`
- `conversation_context`
- `customer_documents`
- `customer_procedures`
- `document_content_for_learning`
- `edcat_learning_events`
- `example_documents`
- `extraction_history`
- `generated_reports`
- `integration_logs`
- `learned_patterns`
- `model_versions`
- `parsed_clauses`
- `personality_learning_events`
- `qa_pairs`
- `regulatory_websites`
- `standard_files`
- `standards`
- `sync_log`
- `tenants`
- `upload_files`
- `user_feedback`
- `users`

**EDCAT AI:**

- `ai_chat_log`
- `ai_conversation_history`
- `ai_crosswalk_blueprint`
- `ai_doc_ref`
- `audit_logs`
- `audit_questions`
- `baseline_metrics`
- `capa_actions`
- `document_distribution`
- `edcat.ai_agents`
- `edcat.ai_memories`
- `edcat.ai_messages`
- `edcat.ai_sessions`
- `edcat.personality_learning_events`
- `edcat.qa_pairs`
- `edcat_learning_events`
- `extraction_history`
- `integration_logs`
- `learned_patterns`
- `regulatory_updates`
- `sync_log`
- `upload_files`

