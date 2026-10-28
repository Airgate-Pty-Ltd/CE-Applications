# VERA ENHANCEMENTS - DEBUG CODES & TESTING GUIDE

## 🚀 Quick Start

All enhancements have been deployed. Use these debug codes to test and verify functionality.

---

## 🔍 FULL SYSTEM DIAGNOSTIC

### Run Comprehensive Diagnostic (Recommended First Step)

```bash
# Via API endpoint (easiest)
curl http://localhost:8080/api/vera/diagnostics/full

# Or via script (more detailed)
node backend/src/scripts/vera-full-diagnostic.js
```

**Expected Output:**
```json
{
  "status": "ok",
  "connections": {
    "postgres": "connected",
    "edcatAI": "connected"
  },
  "tables": {
    "edcat.vera_query_response_bank": true,
    "edcat.terms_and_definitions": true,
    ...
  },
  "data": {
    "qaBank": { "total": 99, "hasResponseText": 99 },
    "terminology": 3000
  },
  "services": {
    "qaService": "working",
    "terminologyService": "working"
  },
  "errors": []
}
```

**If you see errors:**
- Check `errors` array for specific issues
- Verify database connection strings in Railway
- Run seed scripts if data is missing

---

## 📋 TIER 1: Exact Matching Algorithm

### Test Exact Matching

```bash
# Test 1: AS9100 Definition (should return actual definition, not generic template)
curl -X POST http://localhost:8080/api/chat/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what is AS9100",
    "sessionId": "test-1",
    "tenantId": "00000000-0000-0000-0000-000000000000"
  }'

# Expected: Response should mention AS9100 specifically, not "agile" or "Six Sigma"
# Check logs for: [QA-LOOKUP] ✅ Exact match found
```

### Debug Logs to Check

```bash
# In Railway logs, look for:
[QA-LOOKUP] Extracted key terms: as9100
[QA-LOOKUP] ✅ Exact match found: <category>
[QA-LOOKUP] ⚠️ Skipping Six Sigma match - user asked about AS9100
[QA-LOOKUP] ⚠️ Skipping <category> match - doesn't mention AS9100
```

### Manual Database Check

```sql
-- Check if Q&A entries exist for AS9100
SELECT id, category, question_text, confidence_score 
FROM edcat.vera_query_response_bank 
WHERE question_text ILIKE '%AS9100%' 
   OR representative_examples::text ILIKE '%AS9100%'
ORDER BY confidence_score DESC;
```

---

## 📋 TIER 2: Conversation Memory & Learning

### Test Multi-Turn Conversation

```bash
# Message 1: Establish context
curl -X POST http://localhost:8080/api/chat/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me about ISO 9001",
    "sessionId": "test-memory-1",
    "tenantId": "00000000-0000-0000-0000-000000000000"
  }'

# Message 2: Use pronoun (should resolve "it" to "ISO 9001")
curl -X POST http://localhost:8080/api/chat/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Compare it to AS9100",
    "sessionId": "test-memory-1",
    "tenantId": "00000000-0000-0000-0000-000000000000"
  }'

# Expected: Response should say "Compared to ISO 9001, AS9100..."
# Check logs for: [Vera-CHAT] Resolved pronouns: "Compare it to AS9100" → "Compare ISO 9001 to AS9100"
```

### Test Feedback Endpoint

```bash
# Approval feedback
curl -X POST http://localhost:8080/api/chat/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-memory-1",
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "userId": "test-user",
    "feedbackType": "approval",
    "reason": "Great explanation"
  }'

# Correction feedback
curl -X POST http://localhost:8080/api/chat/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-memory-1",
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "userId": "test-user",
    "feedbackType": "correction",
    "correctedAnswer": "AS9100D is the aerospace quality standard that extends ISO 9001.",
    "reason": "More accurate definition"
  }'

# Expected: { "success": true, "message": "✅ Recorded approval/correction - Vera is learning!" }
```

### Debug Logs to Check

```bash
# In Railway logs, look for:
[VeraMemory] ✅ Recorded turn in session <sessionId>
[VeraMemory] ✅ Built context with <N> messages
[VeraMemory] Resolved: "Compare it to AS9100" → "Compare ISO 9001 to AS9100"
[VeraMemory] ✅ Recorded learning event: approval/correction
[VeraMemory] ✅ Updated Q&A entry <qaId> based on correction
[VeraMemory] ✅ Boosted confidence for Q&A <qaId>
```

### Manual Database Check

```sql
-- Check conversation history
SELECT role, message_text, created_at 
FROM edcat.ai_conversation_history 
WHERE session_id = 'test-memory-1'
ORDER BY created_at DESC
LIMIT 10;

-- Check learning events (if table exists)
SELECT event_type, event_data, created_at 
FROM edcat.vera_learning_events 
WHERE session_id = 'test-memory-1'
ORDER BY created_at DESC;
```

---

## 📋 TIER 3: Knowledge Graph

### Test Standards Comparison

```bash
curl -X POST http://localhost:8080/api/chat/compare \
  -H "Content-Type: application/json" \
  -d '{
    "standard1": "ISO 9001",
    "standard2": "AS9100D"
  }'

# Expected response:
# {
#   "success": true,
#   "standard1": "ISO 9001",
#   "standard2": "AS9100D",
#   "relationship": "AS9100D extends ISO 9001",
#   "overlappingRequirements": <number>,
#   "uniqueTo1": <number>,
#   "uniqueTo2": <number>,
#   "overlapPercentage": <percentage>,
#   "summary": "..."
# }
```

### Test Clause Mapping

```bash
curl -X POST http://localhost:8080/api/chat/compare \
  -H "Content-Type: application/json" \
  -d '{
    "standard1": "ISO 9001",
    "standard2": "AS9100D",
    "fromClause": "8.5"
  }'

# Expected response:
# {
#   "success": true,
#   "sourceStandard": "ISO 9001",
#   "sourceClause": "8.5",
#   "targetStandard": "AS9100D",
#   "targetClause": "<clause_number>",
#   "similarity": <percentage>,
#   "message": "8.5 in ISO 9001 maps to <clause> in AS9100D (<similarity>% similar)"
# }
```

### Debug Logs to Check

```bash
# In Railway logs, look for:
[KnowledgeGraph] Comparing ISO 9001 vs AS9100D
[KnowledgeGraph] Standard not found: <standard> (if standard doesn't exist)
[KnowledgeGraph] Error comparing standards: <error> (if error occurs)
```

### Manual Database Check

```sql
-- Check if standards exist
SELECT standard_id, code, name 
FROM public.standards 
WHERE code ILIKE '%ISO 9001%' OR code ILIKE '%AS9100%';

-- Check requirements for a standard
SELECT COUNT(*) as requirement_count
FROM public.parsed_requirements
WHERE standard_id = '<standard_id>';
```

---

## 🧪 Automated Test Script

Run the comprehensive test suite:

```bash
# Make sure you're in the project root
node backend/src/scripts/test-vera-enhancements.js
```

This will test:
- ✅ TIER 1: Exact matching for multiple queries
- ✅ TIER 2: Multi-turn conversations, pronoun resolution, feedback
- ✅ TIER 3: Standards comparison and clause mapping

---

## 🔍 Troubleshooting

### Problem: Exact matching returns wrong answers

**Check:**
1. Q&A bank has entries: `SELECT COUNT(*) FROM edcat.vera_query_response_bank;`
2. Entries have question_text or representative_examples
3. Logs show `[QA-LOOKUP] Extracted key terms: ...`

**Fix:**
- Verify Q&A entries exist for the topic
- Check that `extractKeyTerms()` is working (should extract meaningful terms)
- Ensure exact match query is executing (check logs)

### Problem: Pronouns not resolving

**Check:**
1. Conversation history exists: `SELECT * FROM edcat.ai_conversation_history WHERE session_id = '...'`
2. Context building works: Look for `[VeraMemory] ✅ Built context`
3. Prior topic extracted: Check `conversationContext.priorTopic`

**Fix:**
- Ensure same `sessionId` is used across messages
- Check that `extractTopicsFromMessages()` finds topics
- Verify `resolvePronounsInMessage()` is being called

### Problem: Feedback not working

**Check:**
1. Last response exists in conversation history
2. Feedback endpoint receives correct sessionId
3. Learning events table exists (optional)

**Fix:**
- Ensure sessionId matches the conversation
- Check that last response has metadata with qaId
- Verify `recordLearningEvent()` is executing

### Problem: Knowledge graph returns errors

**Check:**
1. Standards exist in database: `SELECT * FROM public.standards WHERE code ILIKE '%ISO 9001%'`
2. Requirements exist: `SELECT COUNT(*) FROM public.parsed_requirements WHERE standard_id = '...'`
3. Database connections work

**Fix:**
- Upload/parse standards if missing
- Check database connection strings
- Verify table schemas match expected structure

---

## 📊 Performance Benchmarks

Expected response times:
- **TIER 1 (Exact Match)**: < 500ms
- **TIER 2 (Memory + Context)**: < 800ms
- **TIER 3 (Knowledge Graph)**: < 2 seconds

If responses are slower:
- Check database query performance
- Verify indexes exist on key columns
- Check for N+1 query problems

---

## 🎯 Success Criteria

### TIER 1: ✅ PASS if
- "what is AS9100" returns AS9100 definition (not generic template)
- Logs show `[QA-LOOKUP] ✅ Exact match found`
- No Six Sigma matches for standard queries

### TIER 2: ✅ PASS if
- "Tell me about ISO 9001" → "Compare it to AS9100" resolves "it" correctly
- Feedback endpoint returns success
- Conversation history is recorded

### TIER 3: ✅ PASS if
- `/api/chat/compare` returns relationship data
- Clause mapping finds similar requirements
- No database errors in logs

---

## 📞 Need Help?

If tests fail:
1. Check Railway logs: `railway logs | grep "QA-LOOKUP\|VeraMemory\|KnowledgeGraph"`
2. Verify database connections
3. Check that all migrations ran successfully
4. Share error messages and logs

---

**Last Updated:** After TIER 1, 2, and 3 deployment
**Status:** ✅ All enhancements deployed and ready for testing

