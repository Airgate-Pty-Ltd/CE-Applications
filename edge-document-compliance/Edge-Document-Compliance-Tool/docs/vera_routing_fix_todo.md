# Vera Routing Fix - Detailed TODO List

## Problem
Vera is returning canned greetings for technical questions like "ok, vera, define 6 sigma" instead of routing through VeraReasoningEngine.

## Root Causes Identified
1. **Middleware hijacking**: `veraConversationMiddleware.js` detects "ok, vera" as `casual_chat` and generates canned greeting
2. **Chat route still uses conversationalEngine**: Even after technical check, falls through to `conversationalEngine.generateResponse()`
3. **Intent misclassification**: Middleware's `detectIntent()` prioritizes greeting/casual_chat over technical questions
4. **Greeting check in conversationalEngine**: `_isSmalltalkGreeting()` may still catch some cases

## TODO List

### Phase 1: Fix Middleware Intent Classification
- [ ] **File**: `backend/src/middleware/veraConversationMiddleware.js`
- [ ] **Function**: `detectIntent()` (line ~130)
- [ ] **Fix**: Add technical question check BEFORE greeting/casual_chat detection
- [ ] **Action**: Import `looksLikeTechnicalQuestion` from `VeraIntentService` and check first
- [ ] **Action**: If technical, return `'technical_question'` instead of `'casual_chat'` or `'greeting'`

### Phase 2: Fix Chat Route to Use Orchestrator Directly
- [ ] **File**: `backend/src/routes/chat.js`
- [ ] **Function**: Main `/analyze` route handler (line ~340-420)
- [ ] **Fix**: Replace `conversationalEngine.generateResponse()` call with direct `VeraReasoningEngine.reason()` call
- [ ] **Action**: Import `VeraReasoningEngine` at top of file
- [ ] **Action**: Call `VeraReasoningEngine.reason()` with proper parameters
- [ ] **Action**: Use `result.text` as response, store `result.debugTrace` for logging
- [ ] **Action**: Update logging to show "Using handler: VeraReasoningEngine.reason()"

### Phase 3: Ensure Technical Questions Bypass Greeting Middleware
- [ ] **File**: `backend/src/middleware/veraConversationMiddleware.js`
- [ ] **Function**: Main middleware function (line ~350-370)
- [ ] **Fix**: Check for technical questions BEFORE generating canned greeting
- [ ] **Action**: Import `looksLikeTechnicalQuestion` and `classifyIntent` from `VeraIntentService`
- [ ] **Action**: If technical, set `canned = null` to prevent greeting hijack
- [ ] **Action**: Update log message to show when technical question detected

### Phase 4: Fix ConversationalEngine Greeting Check
- [ ] **File**: `backend/src/services/veraConversationalEngine.js`
- [ ] **Function**: `_isSmalltalkGreeting()` (line ~5163)
- [ ] **Fix**: Already has technical check, but verify it catches "ok, vera, define X"
- [ ] **Action**: Test that "ok, vera, define 6 sigma" returns `false`
- [ ] **Action**: Ensure technical question patterns are comprehensive

### Phase 5: Wire VeraIntentService Early in Chat Route
- [ ] **File**: `backend/src/routes/chat.js`
- [ ] **Function**: Main route handler
- [ ] **Fix**: Call `VeraIntentService.classifyIntent()` early (before intent classification)
- [ ] **Action**: Use result to determine if technical question
- [ ] **Action**: Pass `intentInfo` to `VeraReasoningEngine.reason()`
- [ ] **Action**: Skip conversationalEngine entirely for technical questions

### Phase 6: Add Logging for Debugging
- [ ] **File**: `backend/src/routes/chat.js`
- [ ] **Action**: Add log: `[Vera-CHAT] Intent classification: ${intentInfo.highLevelIntent}/${intentInfo.domain}`
- [ ] **Action**: Add log: `[Vera-CHAT] Routing to: ${selectedRoute}`
- [ ] **Action**: Add log: `[Vera-CHAT] Debug trace: ${JSON.stringify(debugTrace)}`

### Phase 7: Regression Tests
- [ ] **File**: Create `backend/tests/vera/routing.test.js` or update existing
- [ ] **Test 1**: "ok, vera, define 6 sigma" → should NOT return greeting
- [ ] **Test 2**: "Vera, what is AS9100?" → should route to regulatory
- [ ] **Test 3**: "Vera, define CQE" → should route to quality_eng
- [ ] **Test 4**: "Hello Vera" → should return greeting
- [ ] **Test 5**: Verify logs show correct routing

### Phase 8: Sanity Check & Deploy
- [ ] Run `npm test` to verify all tests pass
- [ ] Run `npm run build:vera` to check for syntax errors
- [ ] Verify no console errors in local test
- [ ] Commit with clear message
- [ ] Push to trigger Railway deployment

