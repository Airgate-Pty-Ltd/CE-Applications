# Vera Behavior Fix - Detailed TODO List

## Problems Identified
1. CQE questions loop to same Six Sigma DMAIC response
2. Clause questions never query `parsed_requirements`
3. Standards listing returns architecture template instead of DB query
4. Debug 0331 doesn't actually introspect
5. Gap analysis doesn't use gap tables
6. Conversation summary not implemented
7. New standard/not parsed falls back to CQE blob

## TODO List

### Phase 1: Fix CQE vs DMAIC Intent Separation
- [ ] **File**: `backend/src/services/vera/VeraIntentService.js` or `VeraIntentClassifier.js`
- [ ] **Action**: Add distinct topic detection for CQE vs Six Sigma DMAIC
- [ ] **Action**: Create `topic: "CQE"` vs `topic: "six_sigma"` with `sub_intent` separation
- [ ] **Action**: Ensure "CQE" routes to CQE-specific content, "DMAIC" routes to Six Sigma content
- [ ] **File**: `backend/src/services/vera/VeraQualityReasoningService.js`
- [ ] **Action**: Separate CQE definition from DMAIC explanation
- [ ] **Action**: Remove DMAIC follow-up from CQE responses
- [ ] **Action**: Add loop-avoidance logic to check last response similarity

### Phase 2: Wire Clause Questions to parsed_requirements
- [ ] **File**: `backend/src/services/vera/VeraClauseLookupService.js` (exists, verify usage)
- [ ] **Action**: Ensure `getStandardClause()` is called for clause questions
- [ ] **File**: `backend/src/services/vera/VeraRegulatoryReasoningService.js`
- [ ] **Action**: Verify it uses `VeraClauseLookupService.getStandardClause()`
- [ ] **Action**: Add standard resolution by name/alias
- [ ] **File**: Intent classification
- [ ] **Action**: Detect clause patterns like "clause 8.7", "what does 8.7 require"
- [ ] **Action**: Extract clause number and standard name
- [ ] **Action**: Route to regulatory reasoning with clause lookup

### Phase 3: Implement Standards Listing Handler
- [ ] **File**: `backend/src/services/vera/VeraReasoningEngine.js` or new handler
- [ ] **Action**: Create `listKnownStandards()` function that queries `public.standards`
- [ ] **Action**: Detect "list standards" intent
- [ ] **Action**: Return actual list with IDs and names, not architecture template

### Phase 4: Implement Customer Requirement Mapping Explanation
- [ ] **File**: New handler or extend existing
- [ ] **Action**: Query actual schema for `customer_documents`, `customer_procedures`, `requirement_mappings`
- [ ] **Action**: Explain real flow based on actual table structure
- [ ] **Action**: Remove architecture template fallback

### Phase 5: Make Debug 0331 Actually Introspect
- [ ] **File**: `backend/src/services/vera/VeraDebugService.js`
- [ ] **Action**: Implement intent/knowledge introspection for last message
- [ ] **Action**: Implement clause debug (show standard_id, clause_ref used)
- [ ] **Action**: Implement requirement mapping debug (query `requirement_mappings`)
- [ ] **Action**: Implement table visibility check (query `information_schema`)
- [ ] **Action**: Remove "No analysis to clarify" guard for debug queries

### Phase 6: Implement Gap Analysis Using Gap Tables
- [ ] **File**: New handler or extend existing
- [ ] **Action**: Create `getUnmappedClausesForStandard()` function
- [ ] **Action**: Query `public.parsed_requirements` and `public.requirement_mappings`
- [ ] **Action**: Return list of unmapped clauses
- [ ] **Action**: Remove AS9100 marketing blurb fallback

### Phase 7: Implement Conversation Summary
- [ ] **File**: New handler or extend existing
- [ ] **Action**: Create `summarizeRecentQuestions()` function
- [ ] **Action**: Query `edcat.ai_conversation_history` for last N user messages
- [ ] **Action**: Return intent/topic/sub_intent for each
- [ ] **Action**: Remove "No analysis to clarify" guard

### Phase 8: Handle "New Standard Not Parsed" Scenario
- [ ] **File**: Clause lookup handler
- [ ] **Action**: Check if `parsed_requirements` has any rows for `standard_id`
- [ ] **Action**: If zero rows, respond that standard is known but not parsed
- [ ] **Action**: Suggest running parser
- [ ] **Action**: Prevent CQE blob fallback

### Phase 9: Add Loop-Avoidance Logic
- [ ] **File**: Response generation logic
- [ ] **Action**: Check last response in `ai_conversation_history`
- [ ] **Action**: Compare similarity (simple string similarity or hash)
- [ ] **Action**: If high similarity, rephrase or explicitly state it's the same content
- [ ] **Action**: Store loop protection metadata

### Phase 10: Testing & Verification
- [ ] **File**: Create `backend/src/tests/vera/behavior.test.js`
- [ ] **Action**: Test CQE vs DMAIC separation
- [ ] **Action**: Test clause lookup with real DB
- [ ] **Action**: Test standards listing
- [ ] **Action**: Test debug 0331 introspection
- [ ] **Action**: Test gap analysis
- [ ] **Action**: Test conversation summary
- [ ] **Action**: Test "new standard not parsed" scenario

