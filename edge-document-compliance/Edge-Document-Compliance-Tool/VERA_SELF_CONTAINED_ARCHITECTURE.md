# Vera Self-Contained Architecture

## Overview

Vera is her own LLM. All reasoning and text generation uses:
- **EDCAT AI database** (edcat.* tables)
- **Customer DB** (public.* tables)  
- **Internal routing, templates, and logic**

**NO external AI providers** (OpenAI, Anthropic, etc.)

## Files Created/Modified

### Created Files

1. **`backend/src/services/vera/VeraCoreEngine.ts`**
   - Main internal reasoning engine
   - Implements complete pipeline: detectIntentAndTopic → buildSemanticContext → selectAnswerTemplate → fillTemplate → recordConversationTurn → applyLearningFromFeedback
   - No external dependencies

2. **`backend/src/services/vera/ExternalLLMGuard.ts`**
   - Hard-disables external LLM usage
   - Throws errors unless `ALLOW_EXTERNAL_LLM=true` (testing only)
   - Guards all legacy external LLM modules

3. **`backend/src/tests/veraCoreEngine.test.ts`**
   - Sanity checks to ensure no external HTTP calls
   - Verifies responses come from internal DB only
   - Manual test function for debugging

### Modified Files

1. **`backend/src/routes/veraChatRoute.ts`**
   - Now calls `VeraCoreEngine.generateVeraResponse()` instead of `runVera()`
   - Returns `VeraResponse` JSON directly
   - Accepts: `message`, `sessionId`, `userId`, `debugMode`

2. **`backend/src/vera/veraEngine.js`**
   - Added deprecation warning
   - Calls `assertExternalLLMsDisabled()` at start
   - Throws error directing to VeraCoreEngine

3. **`backend/src/vera/llmProvider.js`**
   - Added deprecation warning
   - Calls `assertExternalLLMsDisabled()` in `callLLM()`
   - Hard-disabled for production

4. **`backend/src/services/vera/veraModelService.js`**
   - Added deprecation warning
   - Calls `assertExternalLLMsDisabled()` at start
   - Not used in production

## Where External LLM Logic is Fenced Off

All external LLM usage is now guarded by `ExternalLLMGuard`:

1. **`backend/src/vera/veraEngine.js`** - `runVera()` function
2. **`backend/src/vera/llmProvider.js`** - `callLLM()` function
3. **`backend/src/services/vera/veraModelService.js`** - `callVeraModel()` function

These modules will throw errors unless `ALLOW_EXTERNAL_LLM=true` is set (testing only).

## How to Call generateVeraResponse() Manually for Debugging

### From TypeScript/Node:

```typescript
import { generateVeraResponse, type VeraRequest } from './backend/src/services/vera/VeraCoreEngine.js';

const request: VeraRequest = {
  message: 'What does AS9100D 8.7 cover?',
  sessionId: 'test-session-123',
  userId: 'test-user-123',
  tenantId: '00000000-0000-0000-0000-000000000000',
  debugMode: true  // Enable debug logging
};

const response = await generateVeraResponse(request);
console.log('Response:', response);
```

### From Test File:

```typescript
import { testVeraCoreEngineManually } from './backend/src/tests/veraCoreEngine.test.ts';

const response = await testVeraCoreEngineManually();
```

### Via HTTP Endpoint:

```bash
POST /api/vera/chat
Content-Type: application/json

{
  "message": "What does AS9100D 8.7 cover?",
  "sessionId": "test-session-123",
  "userId": "test-user-123",
  "debugMode": true
}
```

## Pipeline Flow

1. **detectIntentAndTopic**
   - Uses `edcat.ai_router` rules (if available)
   - Falls back to keyword-based detection
   - Returns: `{ intent, topic, subIntent, confidence }`

2. **buildSemanticContext**
   - Queries `public.compliance_standards`
   - Queries `public.compliance_requirements` (for clause questions)
   - Queries `public.customer_documents`
   - Queries `public.gap_analyses`
   - Loads `edcat.ai_conversation_state`
   - Returns: `SemanticContext` object

3. **selectAnswerTemplate**
   - Queries `edcat.ai_template` for intent-specific templates
   - Falls back to default templates based on intent
   - Returns: `AnswerTemplate` or null

4. **fillTemplate**
   - Fills template variables from context
   - References clauses, standards, documents
   - Returns: `VeraResponse` with filled answer

5. **recordConversationTurn**
   - Inserts into `edcat.ai_conversation_history` (user + assistant messages)
   - Updates `edcat.ai_conversation_state`
   - Updates `edcat.conversation_memory` (if exists)

6. **applyLearningFromFeedback**
   - Detects correction phrases in user messages
   - Records learning events in `edcat.ai_learning_event`
   - Status: `pending_review`

## Learning Behavior

When a user message contains phrases like:
- "you were wrong"
- "that's not correct"
- "your explanation was incorrect"
- "actually, ..."
- "correction: ..."

The system:
1. Links to the previous conversation turn
2. Records a learning event in `edcat.ai_learning_event` with:
   - `original_reply`: The previous response
   - `user_correction`: The correction message
   - `topic`: Intent/topic from the conversation
   - `clause_ref`: Clause reference if available
   - `status`: `pending_review`

All learning remains inside the EDCAT AI DB - no external training APIs.

## Database Tables Used

### EDCAT AI DB (edcat.*)
- `ai_router` - Intent routing rules
- `ai_template` - Answer templates
- `ai_policy` - Policy configurations
- `ai_prompt` - System prompts
- `ai_conversation_state` - Active conversation context
- `ai_conversation_history` - Full message history
- `conversation_memory` - Conversation memory with embeddings
- `ai_learning_event` - Learning events from user feedback

### Customer DB (public.*)
- `compliance_standards` - Standards metadata
- `compliance_requirements` - Clause requirements
- `customer_documents` - Customer documents
- `gap_analyses` - Gap analysis results

## Environment Variables

- `ALLOW_EXTERNAL_LLM=true` - **Only for testing** - Allows external LLM calls (not recommended for production)

## Constraints

✅ **DO:**
- Use `VeraCoreEngine.generateVeraResponse()` for all Vera responses
- Query `edcat.*` and `public.*` tables for all data
- Use templates from `edcat.ai_template`
- Record all conversations in `edcat.ai_conversation_history`

❌ **DON'T:**
- Call external AI providers (OpenAI, Anthropic, etc.)
- Use `runVera()`, `callLLM()`, or `callVeraModel()` in production
- Bypass the `edcat.*` schema
- Remove or modify the ExternalLLMGuard

## Testing

Run the test suite:

```bash
npm test -- veraCoreEngine.test.ts
```

Or manually test:

```typescript
import { testVeraCoreEngineManually } from './backend/src/tests/veraCoreEngine.test.ts';
await testVeraCoreEngineManually();
```

The tests verify:
- No external HTTP calls to AI endpoints
- Responses generated from internal DB only
- Conversation turns are recorded
- Error handling works correctly

