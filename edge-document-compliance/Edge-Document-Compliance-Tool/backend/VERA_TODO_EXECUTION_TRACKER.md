# Vera Execution Tracker - System-Wide Engine Repair

**Mission**: Complete repair, hardening, and expansion of Vera's self-contained AI LLM system.

**Status**: IN PROGRESS
**Started**: 2025-12-04
**Last Updated**: 2025-12-04 03:30 UTC

---

## Phase 1 – Deep File-System Scan & Reference Map

- [x] Scan all files in `backend/src/services/vera/` for DB usage, imports, exports - ✅ Completed via grep
- [ ] Scan all files in `backend/src/vera/` for legacy code, dead code
- [ ] Scan all files in `backend/src/routes/` for Vera-related routes
- [ ] Scan all files in `backend/src/scripts/` for ingestion/DB scripts
- [ ] Build complete dependency map of all Vera services
- [ ] Identify all external LLM calls (should be ZERO)
- [x] Identify all database connection mismatches - ✅ Found scripts checking for duplicates (intentional)
- [ ] Identify missing modules/imports
- [ ] Identify infinite loops or missing awaits
- [ ] Identify stale/duplicate engines

## Phase 2 – Database Connection Correction

- [ ] Fix DB usage in `backend/src/routes/parse.js` - Need to verify
- [ ] Fix DB usage in `backend/src/services/vera/VeraParserSupervisorService.js` - Need to verify
- [ ] Fix DB usage in `backend/src/services/vera/VeraVectorEngine.js` - Need to verify
- [ ] Fix DB usage in `backend/src/services/vera/VeraLearningRepository.ts` - Need to verify
- [x] Fix DB usage in regulatory ingestion scripts - ✅ Scripts are checking for duplicates (intentional)
- [x] Fix DB usage in standards ingestion scripts - ✅ Scripts are checking for duplicates (intentional)
- [ ] Fix DB usage in example ingestion scripts
- [ ] Fix DB usage in clause matching services
- [ ] Verify ALL services use correct DB helper (queryPostgres vs queryEdcatAI)
- [ ] Add validation checks to prevent future mismatches

## Phase 3 – Database Schema Reconciliation

- [ ] Audit all tables expected by `VeraCoreEngine.js`
- [ ] Audit all tables expected by `VeraMemoryService.ts`
- [ ] Audit all tables expected by `VeraTerminologyService.js`
- [ ] Audit all tables expected by `VeraQueryResponseService.js`
- [ ] Audit all tables expected by `VeraLearningRepository.ts`
- [ ] Compare expected schema vs actual Railway schema
- [x] Create migration for missing columns in `edcat.ai_conversation_history` - ✅ Migration 042 exists
- [x] Create migration for missing columns in `edcat.conversation_memory` - ✅ Migration 042 exists
- [x] Create migration for missing columns in `edcat.vera_query_response_bank` - ✅ Migration 042 exists
- [x] Create migration for missing columns in `edcat.vera_learned_corrections` - ✅ Migration 042 exists
- [x] Ensure `edcat.document_content_for_learning` table exists with correct schema - ✅ Migration 051 exists
- [x] Ensure `edcat.learning_examples` table exists with correct schema - ✅ Migration 051 exists
- [ ] Ensure `edcat.terms_and_definitions` table exists with correct schema
- [ ] Ensure all required indexes exist
- [ ] Run all migrations and verify success

## Phase 4 – Semantic Memory Repair

- [ ] Verify pgvector extension is available
- [ ] Fix embedding creation in `VeraSemanticMemory.js`
- [ ] Implement keyword fallback when pgvector unavailable
- [ ] Add missing column indexes for semantic search
- [ ] Verify vector dimensions match (1536)
- [ ] Fix learning document ingestion to create embeddings
- [ ] Test semantic search with and without pgvector

## Phase 5 – Intent System Repair

- [ ] Verify specialized intents fire first in `VeraCoreEngine.js`
- [ ] Fix intent classification in `VeraCoreEngine.js`
- [x] Ensure Q&A fast-path triggers correctly - ✅ Fixed in VeraCoreEngine.js
- [ ] Ensure terminology fast-path triggers correctly
- [ ] Fix context route to only run when needed
- [ ] Add debug messages for intent detection
- [ ] Test all intent types (self_diagnostic, term_definition, gap_analysis, etc.)
- [ ] Fix broken intent routes

## Phase 6 – Engine Personality & Style Layer

- [ ] Enhance persona specification in `edcatPersonality.js`
- [ ] Add feminine, warm, professional tone
- [ ] Add British/Scottish linguistic influences
- [ ] Integrate persona with `VeraPersonaSpecificationService`
- [ ] Ensure personality comes from persona files (not hardcoded)
- [ ] Test persona application in responses
- [ ] Update greeting styles

## Phase 7 – Self-Diagnostic Engine Repair

- [ ] Verify all diagnostic intents fire correctly
- [ ] Fix `/api/vera/health` endpoint
- [ ] Ensure remedy suggestions load correctly
- [ ] Fix remedy learning logging
- [ ] Verify issues appear in `edcat.vera_debug_sessions`
- [ ] Test self-test functionality
- [ ] Verify debug history works
- [ ] Prevent diagnostic loops

## Phase 8 – Ingestion Pipeline Hardening

- [ ] Fix file path references in ingestion scripts
- [ ] Patch standards ingestion
- [ ] Patch regulatory ingestion
- [ ] Patch good example docs ingestion
- [ ] Patch bad example docs ingestion
- [ ] Patch customer docs ingestion
- [ ] Patch learning content ingestion
- [ ] Fix multimodal extraction
- [ ] Ensure all documents in "Requirements" folder are ingested
- [ ] Ensure "Approved" and "Bad" tags load into `example_documents`

## Phase 9 – Clause Reasoning & Regulatory Matching Fix

- [ ] Patch FAA 21.137a–o matching
- [ ] Fix CASA regulatory matching
- [ ] Fix EASA regulatory matching
- [ ] Fix ISO/AS clause mapping
- [ ] Fix cross-standard mapping
- [ ] Fix requirement relationships
- [ ] Load updated FAA 21.137 text into DB automatically

## Phase 10 – Q&A Response System Fix

- [x] Verify `VeraQueryResponseService.findBestMatch()` selects `response_text` - ✅ Already fixed
- [x] Ensure Q&A responses are returned directly (not through template) - ✅ Fixed in VeraCoreEngine.js
- [x] Fix `VeraCoreEngine.js` to extract `response_text` directly - ✅ Completed
- [x] Add NULL checks for `response_text` - ✅ Added with error logging
- [x] Fix chat route to handle Q&A responses - ✅ Completed in handleSpecificQuestion
- [x] Populate NULL `response_text` values via migration - ✅ Migration 055 created
- [ ] Test Q&A response flow end-to-end - Pending deployment test

## Phase 11 – Loop Avoidance & Routing Fix

- [ ] Verify `VeraLoopAvoidanceService` works correctly
- [ ] Fix time-based loop detection
- [ ] Prevent false positives in loop detection
- [ ] Fix routing to prevent all questions going to Six Sigma
- [ ] Test loop avoidance with various question types

## Phase 12 – Full End-to-End Test Harness

- [ ] Create test suite for Vera routing
- [ ] Create test suite for Vera intent detection
- [ ] Create test suite for Vera diagnostics
- [ ] Create test suite for Vera database connections
- [ ] Create health check test
- [ ] Run all tests and fix failures

## Phase 13 – Performance Pass

- [ ] Identify slow queries
- [ ] Add missing indexes
- [ ] Remove redundant scans
- [ ] Optimize unnecessary semantic loads
- [ ] Add index for `edcat.terms_and_definitions.acronym`
- [ ] Add indexes for frequently queried columns

## Phase 14 – Final Verification

- [ ] Run final Vera health check (`/api/vera/health`)
- [ ] Run end-to-end "ask Vera a question" test
- [ ] Run self-diagnostic test
- [ ] Run self-test if implemented
- [ ] Verify all TODO items are complete
- [ ] Document any remaining issues

---

## Verification Log

### Completed Items
- ✅ Q&A response extraction fixed in VeraCoreEngine.js
- ✅ Chat route Q&A handling fixed
- ✅ Migration path resolution fixed for Railway
- ✅ Scripts clarified (duplicate checks are intentional)

### Blocked Items
(None yet)

### Notes
- Scripts using queryEdcatAI for public.* tables are intentional - they're checking for duplicate tables in EDCAT AI DB
- Migration 055 (verify_qa_responses.sql) needs to run on Railway to populate NULL response_text values
- Need to continue systematic fixes through all phases
