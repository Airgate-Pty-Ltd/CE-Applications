# Vera Learning System - Developer Notes

## Overview

Vera now uses ingested standards, regulations, and example documents from the `Requirements` folder as first-class inputs for answering questions, generating procedures, and performing gap analysis.

## Architecture

### Data Sources

Vera queries three main tables:

1. **`public.standards`** - Standard metadata (code, name, authority, sector)
2. **`edcat.document_content_for_learning`** - Full text content from ingested documents
3. **`edcat.example_documents`** - Approved and bad examples with quality scores

### Key Components

#### 1. VeraLearningRepository (`backend/src/services/vera/VeraLearningRepository.ts`)

Centralized query helpers for accessing learning content:

- `getLearningDocsByStandardCode(standardCode, limit)` - Get learning docs by standard
- `searchLearningDocsByTopic(topic, limit)` - Search docs by keyword
- `getApprovedExamplesForStandard(standardCode, limit)` - Get approved examples (quality_score >= 0.8)
- `getBadExamplesForStandard(standardCode, limit)` - Get bad examples (quality_score <= 0.4)
- `findClauseInLearningDocs(clauseRef, standardCode, limit)` - Find clause references in docs
- `debugLearningForStandard(standardCode)` - Debug helper for inspection

#### 2. VeraCoreEngine Updates

**Intent Detection:**
- `extractStandardCode(message)` - Detects standard codes from user messages
  - Handles: AS9100D, CASA CASRS Volume 1, EASA 1321/2014, FAA 14 CFR 21.137, etc.
- Enhanced intent detection for procedure generation requests

**Context Building:**
- `buildSemanticContext()` now fetches:
  - `learningDocs` - Full document content
  - `approvedExamples` - Approved examples for the standard
  - `badExamples` - Bad examples to avoid
  - `detectedStandardCode` - Extracted standard code from message

**Template Filling:**
- `requirementText` - Uses learning docs when clause not found in structured requirements
- `procedureDraft` - Generates procedures from approved/bad examples
- `documentContent` - Uses learning docs as primary source
- `exampleContent` - Uses approved examples

**Helper Methods:**
- `extractRelevantSnippet(text, keyword, maxLength)` - Extracts context around clause references
- `buildProcedureDraftFromExamples(context, standardCode, clauseRef)` - Generates procedure drafts
- `summarizeExample(contentText, clauseRef)` - Summarizes approved examples
- `summarizeBadPatterns(contentText, clauseRef)` - Identifies issues in bad examples

## Usage

### Ingesting Documents

1. Place documents in `backend/EDCAT AIP/Requirements/`:
   - `Standards/` - Standard documents (ISO, AS, etc.)
   - `Regulatory/` - Regulatory documents (CASA, EASA, UK CAA, FAA, etc.)
   - `Examples/` - Approved and bad example documents
   - `Customer/` - Customer-specific documents

2. Run ingestion:
```bash
npm run ingest:requirements
```

3. Verify ingestion:
```bash
# In Vera chat (debug mode enabled):
debug: learning standard AS9100D
debug: examples AS9100D
```

### Querying Learning Content

Vera automatically uses learning content when:
- User asks about a standard: "What does AS9100D require?"
- User asks about a clause: "What does 8.7 require under AS9100D?"
- User asks about regulations: "Tell me about CASA CASRS Volume 1"
- User requests procedure generation: "Generate a procedure for AS9100D 8.7"

### Debug Commands

**View learning content for a standard:**
```
debug: learning standard AS9100D
debug: learning standard CASA_CASRS_VOLUME_1
```

**View examples for a standard:**
```
debug: examples AS9100D
```

## Testing

### Unit Tests

Test the repository functions:
```typescript
import { getLearningDocsByStandardCode, getApprovedExamplesForStandard } from './VeraLearningRepository';

// Test learning docs retrieval
const docs = await getLearningDocsByStandardCode('AS9100D', 5);
console.assert(docs.length > 0, 'Should return learning docs');

// Test approved examples
const approved = await getApprovedExamplesForStandard('AS9100D', 3);
console.assert(approved.every(ex => ex.quality_score >= 0.8), 'All should be approved');
```

### Integration Tests

Test Vera's response generation:
```typescript
import { generateVeraResponse } from './VeraCoreEngine';

// Test clause question
const response = await generateVeraResponse({
  message: 'What does 8.7 require under AS9100D?',
  sessionId: 'test-session',
  tenantId: 'test-tenant',
  debugMode: true
});

console.assert(response.answer.includes('8.7'), 'Should mention clause 8.7');
console.assert(response.metadata?.clausesReferenced?.includes('8.7'), 'Should reference clause');
```

### Manual Testing

1. **Ingest documents:**
   ```bash
   npm run ingest:requirements
   ```

2. **Test standard questions:**
   - "What does AS9100D require?"
   - "Tell me about CASA CASRS Volume 1"
   - "What is EASA 1321/2014?"

3. **Test clause questions:**
   - "What does 8.7 require under AS9100D?"
   - "What does 21.137(n) require?"

4. **Test procedure generation:**
   - "Generate a procedure for AS9100D 8.7"
   - "Write a WI for 21.137(n) based on your approved examples"

5. **Verify debug commands:**
   - Enable debug mode (type "0331" or "debug mode")
   - Run: `debug: learning standard AS9100D`
   - Run: `debug: examples AS9100D`

## Important Constraints

1. **No External LLM Calls:** All retrieval and reasoning uses internal EDCAT/Vera engine and databases.

2. **Document Numbering Independence:** Vera doesn't rely on document numbers. She reasons from:
   - Titles
   - Content text
   - Standard codes and clause references
   - Quality metadata (approved vs bad)

3. **Database-Driven Behavior:** When standards/regulations change, Vera's behavior is driven by DB content, not hard-coded text.

4. **Quality Prioritization:** Approved examples (quality_score >= 0.8) are prioritized over bad examples (quality_score <= 0.4).

## Troubleshooting

### No Learning Content Found

**Symptom:** `debug: learning standard AS9100D` shows 0 documents.

**Solution:**
1. Verify documents are in `backend/EDCAT AIP/Requirements/`
2. Run `npm run ingest:requirements`
3. Check ingestion logs for errors
4. Verify database connections (DATABASE_URL, EDCAT_AI_DATABASE_URL)

### Standard Code Not Detected

**Symptom:** Vera doesn't recognize standard codes in questions.

**Solution:**
1. Check `extractStandardCode()` patterns in `VeraCoreEngine.ts`
2. Add new patterns for your standard format
3. Verify standard codes match ingested data in `public.standards`

### Procedure Generation Returns Empty

**Symptom:** "Generate a procedure" returns "No examples available".

**Solution:**
1. Ensure examples are in `Examples/` folder
2. Examples should be marked as "approved" or "bad" in folder names/metadata
3. Run ingestion script
4. Check `edcat.example_documents` table has rows

## Future Enhancements

1. **Semantic Search:** Use `edcat.knowledge_embeddings` for better clause matching
2. **Multi-Standard Comparison:** Compare requirements across standards
3. **Learning from Feedback:** Improve example quality scores based on user feedback
4. **Template Refinement:** Generate more sophisticated procedure templates from examples

## Related Files

- `backend/src/services/vera/VeraLearningRepository.ts` - Query helpers
- `backend/src/services/vera/VeraCoreEngine.ts` - Main engine with learning integration
- `backend/src/scripts/ingest-requirements-comprehensive.js` - Ingestion script
- `backend/src/services/vera/VeraDebugService.js` - Debug command handlers
- `VERA_DATABASE_ARCHITECTURE.md` - Database schema documentation

