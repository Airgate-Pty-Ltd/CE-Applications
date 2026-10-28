# Vera Guided Knowledge Acquisition System

## Overview

Vera now has the ability to detect when she's missing critical information needed to answer user requests, and explicitly ask for that information with specific instructions on where to place it and how to tag it.

**Key Features:**
- ✅ Detects missing standards, regulations, examples, and customer documents
- ✅ Creates structured information requests in the database
- ✅ Provides specific, actionable instructions to users
- ✅ Automatically recognizes when requested items have been ingested
- ✅ 100% internal - no external LLM calls

---

## How It Works

### 1. Knowledge Gap Detection

When a user asks Vera a question, `VeraCoreEngine` now:

1. Detects intent and topic
2. Builds semantic context (what information is available)
3. **NEW:** Checks for knowledge gaps using `VeraKnowledgeGapService`
4. If a gap is detected, returns a specific request instead of a generic answer
5. If no gap, proceeds with normal answer generation

### 2. Gap Detection Patterns

Vera detects gaps for:

- **Missing Standards**: User asks about AS9100D but no AS9100D content exists
- **Missing Clause Details**: User asks about "8.7" but no detailed 8.7 content exists
- **Missing Examples**: User requests procedure generation but no approved examples exist
- **Missing Regulatory Documents**: User asks about FAA 21.137 but no regulatory content exists
- **Gap Analysis Requests**: User requests gap analysis but missing standard or examples

### 3. Request Creation

When a gap is detected, Vera:

1. Creates a record in `edcat.ai_information_request` table
2. Returns a user-friendly message with:
   - What's missing (description)
   - Related standard/regulation
   - Exact folder path to place the file
   - Tag/label to use
   - Preferred file type

### 4. Request Fulfillment

During ingestion (`npm run ingest:requirements`):

1. After each document is successfully indexed
2. The system checks for open information requests
3. Matches by:
   - Standard code
   - Folder path
   - Description keywords in filename
4. Automatically marks requests as `fulfilled` when matches are found
5. Links the file IDs to the request

---

## Database Schema

### Table: `edcat.ai_information_request`

```sql
CREATE TABLE edcat.ai_information_request (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  session_id TEXT,
  persona_code TEXT DEFAULT 'vera',
  request_type TEXT NOT NULL,          -- 'standard', 'regulatory', 'example_good', etc.
  standard_code TEXT,                  -- e.g., 'AS9100D', 'FAA_21_137'
  regulation_ref TEXT,                 -- e.g., '21.137(j)'
  topic TEXT,                          -- free-text topic
  description TEXT NOT NULL,           -- what Vera is asking for
  suggested_folder TEXT,               -- where to place it
  suggested_tag TEXT,                  -- how to tag it
  requested_artifact_type TEXT,        -- 'pdf', 'docx', 'xlsx', 'any'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by_file_ids UUID[],        -- files that fulfilled this request
  status TEXT DEFAULT 'open',          -- 'open', 'partial', 'fulfilled', 'cancelled'
  metadata JSONB DEFAULT '{}'::jsonb
);
```

---

## Example Interactions

### Example 1: Missing Standard

**User:** "What does AS9100D clause 8.7 cover?"

**Vera Response:**
```
I'm missing some key information to give you a proper, standards-accurate answer.

**What I need:** I need the full standard AS9100D as a clean, official PDF to answer this request accurately.
**Related standard/regulation:** AS9100D
**Please place it here in your Requirements folders:** `Requirements/Standards/AS9100D`
**Mark/tag it as:** Approved Standard
**Preferred file type:** PDF

Once you've added it and run the ingestion process (`npm run ingest:requirements`), I'll be able to pull it into my knowledge base and use it for future analyses.
```

### Example 2: Missing Examples

**User:** "Generate a procedure for AS9110 receiving inspection"

**Vera Response:**
```
I'm missing some key information to give you a proper, standards-accurate answer.

**What I need:** I need at least one approved 'good' example document for AS9110 clause receiving inspection to illustrate best practice and generate accurate procedures.
**Related standard/regulation:** AS9110
**Please place it here in your Requirements folders:** `Requirements/Examples/Approved/AS9110`
**Mark/tag it as:** Approved Document
**Preferred file type:** ANY

Once you've added it and run the ingestion process (`npm run ingest:requirements`), I'll be able to pull it into my knowledge base and use it for future analyses.
```

### Example 3: Missing Regulatory Document

**User:** "What does FAA 21.137(m) require for in-service feedback?"

**Vera Response:**
```
I'm missing some key information to give you a proper, standards-accurate answer.

**What I need:** I need the current FAA 14 CFR Part 21.137 quality system requirements in an official format (PDF or authoritative source) to validate your PAH system and answer questions accurately.
**Related standard/regulation:** FAA_21_137 – 21.137(m)
**Please place it here in your Requirements folders:** `Requirements/Regulatory/FAA`
**Mark/tag it as:** Approved Standard
**Preferred file type:** PDF

Once you've added it and run the ingestion process (`npm run ingest:requirements`), I'll be able to pull it into my knowledge base and use it for future analyses.
```

---

## Implementation Details

### Files Created/Modified

1. **Migration**: `backend/migrations/039_vera_guided_knowledge_acquisition.sql`
   - Creates `edcat.ai_information_request` table
   - Adds indexes for efficient queries

2. **Service**: `backend/src/services/vera/VeraKnowledgeGapService.ts`
   - `detectKnowledgeGap()` - Main detection logic
   - `checkRequestFulfillment()` - Check if request was fulfilled
   - `getOpenRequests()` - Get open requests for a tenant

3. **Core Engine**: `backend/src/services/vera/VeraCoreEngine.ts`
   - Integrated gap detection into response pipeline
   - Added `buildKnowledgeGapResponse()` method
   - Maps semantic context to gap service format

4. **Ingestion Script**: `backend/src/scripts/ingest-requirements-comprehensive.js`
   - Added `tryFulfillInformationRequests()` function
   - Called after each document is indexed
   - Matches documents to open requests

---

## Usage

### For Users

1. Ask Vera a question about a standard, regulation, or procedure
2. If Vera is missing information, she'll ask for it specifically
3. Upload the requested document to the specified folder
4. Run `npm run ingest:requirements`
5. Ask the question again - Vera will now have the information

### For Developers

**Check open requests:**
```typescript
import { VeraKnowledgeGapService } from './services/vera/VeraKnowledgeGapService.js';

const openRequests = await VeraKnowledgeGapService.getOpenRequests(tenantId, 10);
console.log('Open requests:', openRequests);
```

**Check if request was fulfilled:**
```typescript
const isFulfilled = await VeraKnowledgeGapService.checkRequestFulfillment(requestId);
```

**Query requests directly:**
```sql
SELECT * FROM edcat.ai_information_request 
WHERE tenant_id = $1 AND status = 'open'
ORDER BY created_at DESC;
```

---

## Request Types

- `standard` - Missing standard document (ISO, AS, etc.)
- `regulatory` - Missing regulatory document (FAA, CASA, EASA, UK CAA)
- `example_good` - Missing approved/good example document
- `example_bad` - Missing bad example document (for learning what not to do)
- `customer_requirement` - Missing customer-specific requirement
- `training_material` - Missing training material
- `data_set` - Missing data set
- `clause_detail` - Missing detailed clause information
- `procedure_template` - Missing procedure template

---

## Status Values

- `open` - Request is open, waiting for document
- `partial` - Some documents found, but may need more
- `fulfilled` - Request has been fulfilled
- `cancelled` - Request was cancelled

---

## Future Enhancements

1. **UI Dashboard**: Admin page showing all open requests
2. **Email Notifications**: Notify users when requests are fulfilled
3. **Request Prioritization**: Prioritize requests based on frequency or importance
4. **Smart Matching**: Improve matching algorithm using semantic similarity
5. **Request History**: Track which requests led to better answers

---

## Testing

To test the system:

1. Ask Vera about a standard that doesn't exist in the database
2. Verify she asks for the specific document
3. Check `edcat.ai_information_request` table for the new request
4. Upload the document to the suggested folder
5. Run `npm run ingest:requirements`
6. Verify the request status changed to `fulfilled`
7. Ask the question again - Vera should now answer

---

## Notes

- All gap detection is 100% internal - no external LLM calls
- Requests are tenant-scoped for multi-tenant support
- Matching is fuzzy (handles variations in standard codes, folder paths)
- Non-fatal errors during fulfillment don't break ingestion
- Requests are automatically linked to files that fulfill them

