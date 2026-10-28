# Vera Spark Upgrade: Reasoning Orchestrator + Domain Policies + Debug Insight

## Spark Orchestrator TODO (2025-01-XX)

### Phase 0: Analysis & Planning ✅
- [x] Analyze current Vera architecture
- [x] Identify entry points (chat.js route)
- [x] Identify intent classification system (VeraIntentClassifier.js)
- [x] Identify reasoning engine (VeraReasoningEngine.js)
- [x] Identify quality reasoning service (VeraQualityReasoningService.js)
- [x] Locate greeting/smalltalk handlers
- [x] Locate "teach me" fallback logic
- [x] Create TODO document

### Phase 1: Technical Question Detection & Intent Classification
- [ ] Create `VeraIntentService.js` with `looksLikeTechnicalQuestion()` function
- [ ] Create/upgrade `classifyIntent()` to return `{ highLevelIntent, domain }`
- [ ] Add domain detection (regulatory, quality_eng, generic, smalltalk, debug)
- [ ] Wire intent classification into reasoning orchestrator
- [ ] Test intent classification with sample messages

### Phase 2: Multi-Step Reasoning Orchestrator
- [ ] Refactor `VeraReasoningEngine.reason()` into orchestrator pattern
- [ ] Implement debug route handling
- [ ] Implement regulatory technical question route
- [ ] Implement quality engineering technical question route
- [ ] Implement generic technical question route
- [ ] Implement smalltalk route (only when not technical)
- [ ] Implement generic fallback route
- [ ] Add debug trace object to all routes
- [ ] Ensure backward compatibility with existing callers

### Phase 3: Domain-Specific Reasoning Services
- [ ] Create/verify `VeraRegulatoryReasoningService.js` (strict clause-based)
- [ ] Enhance `VeraQualityReasoningService.js` with QUALITY_ANSWER_TEMPLATE
- [ ] Create `VeraGenericTechnicalReasoningService.js` for generic technical questions
- [ ] Create/verify `VeraSmalltalkService.js` (or use existing VeraGreetingService)
- [ ] Ensure all services follow answer scaffold (definition → expansion → example → follow-up)

### Phase 4: Fix Greeting & "Teach Me" Behavior
- [ ] Update greeting detection to exclude technical questions
- [ ] Update greeting detection to exclude quality/regulatory keywords
- [ ] Create `shouldUseTeachMeFallback()` helper function
- [ ] Remove "teach me" fallback for quality_eng domain
- [ ] Keep "teach me" only for regulatory/QMS-org-specific when no clause found
- [ ] Test that "what is Six Sigma?" never triggers greeting or "teach me"

### Phase 5: Debug Trace & Explanations
- [ ] Add `debugTrace` object structure to reasoning result
- [ ] Store `debugTrace` in conversation state/history
- [ ] Create `VeraDebugReasoningService.handleDebugRequest()` for debug: commands
- [ ] Implement "why did you answer that way?" explanation
- [ ] Implement "analyze last response" explanation
- [ ] Test debug mode explanations

### Phase 6: Quality Domain LLM Knowledge Integration
- [ ] Update `VeraQualityReasoningService` to explicitly allow general LLM knowledge
- [ ] Ensure CQE-level topics are supported (root cause, SPC, capability, MSA, FMEA, etc.)
- [ ] Update quality answer template to include general knowledge instruction
- [ ] Test that quality questions use both KB and general knowledge

### Phase 7: Chat Route Integration
- [ ] Update `chat.js` route to use orchestrator pattern
- [ ] Extract `messageText`, `userId`, `tenantId`, `debugMode`
- [ ] Call `VeraReasoningEngine.reason()` instead of ad-hoc branching
- [ ] Store conversation history with classification & domain
- [ ] Include debug metadata when debug mode is active
- [ ] Test end-to-end flow

### Phase 8: Testing & Verification
- [ ] Add unit tests for `looksLikeTechnicalQuestion()`
- [ ] Add unit tests for `classifyIntent()`
- [ ] Add routing tests (CQE → quality_eng, AS9100 → regulatory, etc.)
- [ ] Add test: no greeting for technical questions
- [ ] Add test: no "teach me" for quality_eng basic concepts
- [ ] Manual verification checklist:
  - [ ] "Vera, define CQE" → technical_question + quality_eng, no greeting
  - [ ] "What is AS9100?" → technical_question + regulatory
  - [ ] "What is Six Sigma?" → technical_question + quality_eng, no "teach me"
  - [ ] "0331" + "debug: why did you answer that way?" → debug explanation
  - [ ] "Hello, how are you?" → smalltalk greeting

### Phase 9: Git Commit & Push
- [ ] Run linter/prettier
- [ ] Run tests
- [ ] Remove extraneous debug logging
- [ ] Commit with clear message
- [ ] Push to deployment branch

---

## Current Architecture Analysis

### Entry Points
- **Main Chat Route**: `backend/src/routes/chat.js` → `POST /api/chat/analyze`
- **Middleware**: `veraConversationMiddleware.js` → creates conversation context
- **Intent Classification**: `VeraIntentClassifier.js` → classifies user messages

### Reasoning Components
- **VeraReasoningEngine.js**: Main reasoning orchestrator (v3.1 pipeline)
  - Currently has quality domain routing (`_looksQualityDomain()`)
  - Uses `VeraIntentClassifier.classify()`
  - Uses `VeraKnowledgeRetrievalService.getEvidence()`
  - Uses `VeraAnswerPlanner.buildPlan()`
  - Calls `runVera()` LLM wrapper

- **VeraQualityReasoningService.js**: Quality engineering knowledge service
  - Has `answerQualityQuestion()` method
  - Uses quality KB tables (`edcat.vera_quality_topics`, `edcat.vera_quality_snippets`, `edcat.vera_quality_qa`)
  - Calls `runVera()` for LLM responses

### Current Issues Identified
1. **Greeting Override**: Greeting templates may override technical questions
2. **"Teach Me" Fallback**: Need to locate where this occurs and restrict it
3. **Intent Classification**: May not be domain-aware enough
4. **Debug Trace**: Not currently propagated through conversation
5. **Answer Scaffold**: Quality answers may not follow structured template consistently

### Services to Create/Enhance
- `VeraIntentService.js` (NEW) - Central intent classification
- `VeraRegulatoryReasoningService.js` (CHECK IF EXISTS) - Strict clause-based reasoning
- `VeraGenericTechnicalReasoningService.js` (NEW) - Generic technical questions
- `VeraSmalltalkService.js` (CHECK IF EXISTS, may be VeraGreetingService)
- `VeraDebugReasoningService.js` (ENHANCE EXISTING VeraDebugService)

