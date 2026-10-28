# Vera Database Architecture - Complete Review

**Generated:** December 2024  
**Purpose:** Comprehensive review of all databases, their purposes, and how Vera connects to them

---

## Executive Summary

Vera uses **TWO separate PostgreSQL databases** with a clear separation of concerns:

1. **Customer Data Database** (`DATABASE_URL`) - Stores customer-specific data and standards
2. **EDCAT AI Database** (`EDCAT_AI_DATABASE_URL`) - Stores Vera's intelligence, learning, and knowledge

**Connection Method:** Centralized via `backend/src/config/databases.js`  
**Status:** ✅ All services correctly use centralized helpers

---

## Database 1: Customer Data Database

### Purpose
Stores **customer-specific data** and **standards/requirements** that Vera references to answer questions.

### Connection Details
- **Environment Variable:** `DATABASE_URL`
- **Schema:** `public.*`
- **Connection Pool:** `postgresPool` (max 20 connections)
- **Helper Function:** `queryPostgres(text, params)`

### What It Stores

#### 1. Standards Metadata
- **Table:** `public.standards`
- **Purpose:** Stores information about compliance standards (AS9100D, ISO 9001, ISO 13485, etc.)
- **Key Columns:** `id`, `code`, `name`, `title`, `revision`, `sector`, `family`, `domain_tags`
- **Used By:** VeraCoreEngine, VeraCrossStandardReasoning, routes

#### 2. Compliance Requirements
- **Table:** `public.compliance_requirements`
- **Purpose:** Stores actual clause requirements from standards
- **Key Columns:** `id`, `standard_id`, `clause_reference`, `requirement_text`
- **Used By:** VeraCoreEngine, VeraClauseMatcher, VeraAdvancedGapEngine

#### 3. Parsed Requirements
- **Table:** `public.parsed_requirements`
- **Purpose:** Machine-parsed requirements with metadata
- **Key Columns:** `id`, `standard_id`, `clause_ref`, `requirement_text`, `metadata`
- **Used By:** VeraCoreEngine, VeraAdvancedGapEngine

#### 4. Regulatory Standards
- **Table:** `public.regulatory_registry`
- **Purpose:** Regulatory standards (FAA, CASA, EASA, UK CAA, FDA, DOT)
- **Key Columns:** `id`, `standard_code`, `authority`, `section_text`
- **Used By:** VeraRegulatoryRepository

#### 5. Customer Documents
- **Table:** `public.customer_documents`
- **Purpose:** Documents uploaded by customers
- **Key Columns:** `id`, `document_name`, `document_type`, `content_text`
- **Used By:** VeraCoreEngine (for gap analysis)

#### 6. Customer Procedures
- **Table:** `public.customer_procedures`
- **Purpose:** Extracted procedures from customer documents
- **Key Columns:** `id`, `procedure_text`, `standard_code`
- **Used By:** VeraCoreEngine

#### 7. Gap Analyses
- **Table:** `public.gap_analyses`
- **Purpose:** Results of gap analysis runs
- **Key Columns:** `id`, `standard_code`, `status`, `result_json`
- **Used By:** Routes, VeraCoreEngine

#### 8. Standard Files
- **Table:** `public.standard_files`
- **Purpose:** Metadata about uploaded standard files
- **Key Columns:** `id`, `file_name`, `standard_id`, `file_path`
- **Used By:** Routes/upload.js

#### 9. Users & Tenants
- **Tables:** `public.users`, `public.tenants`
- **Purpose:** User accounts and tenant organizations
- **Key Columns:** `id`, `email`, `role`, `tenant_id`
- **Used By:** Routes, VeraCoreEngine (for role-based responses)

### How Vera Uses This Database

**VeraCoreEngine** queries this database to:
1. **Find standards** - "What standards do you support?" → Query `public.standards`
2. **Get requirements** - "What does clause 8.7 require?" → Query `public.compliance_requirements` or `public.parsed_requirements`
3. **Compare standards** - "How does AS9100D compare to ISO 9001?" → Query both standards from `public.standards` and `public.compliance_requirements`
4. **Regulatory lookup** - "What does FAA Part 21.137(n) require?" → Query `public.regulatory_registry`
5. **Gap analysis** - "Analyze gaps for AS9100D" → Query `public.parsed_requirements` and compare with `public.customer_documents`

**Example Query Flow:**
```javascript
// In VeraCoreEngine.js
const standards = await queryPostgres(
  'SELECT * FROM standards WHERE code = $1',
  ['AS9100D']
);

const requirements = await queryPostgres(
  'SELECT * FROM compliance_requirements WHERE standard_id = $1 AND clause_reference = $2',
  [standardId, '8.7']
);
```

---

## Database 2: EDCAT AI Database

### Purpose
Stores **Vera's intelligence, learning, and knowledge** - everything that makes Vera "smart."

### Connection Details
- **Environment Variable:** `EDCAT_AI_DATABASE_URL` (falls back to `DATABASE_URL` if not set)
- **Schema:** `edcat.*`
- **Connection Pool:** `edcatPool` (max 20 connections)
- **Helper Function:** `queryEdcatAI(text, params)`

### What It Stores

#### Category 1: Core Intelligence Tables

##### 1. Terms and Definitions
- **Table:** `edcat.terms_and_definitions`
- **Purpose:** Terminology, acronyms, and definitions (e.g., "APQP", "FMEA", "PPAP")
- **Key Columns:** `id`, `term`, `acronym`, `definition`, `category`, `industry`
- **Used By:** VeraTerminologyService
- **How Vera Uses It:** Fast-path lookup at STEP 1.25 - if user asks "What is APQP?", Vera immediately queries this table

##### 2. Q&A Response Bank
- **Table:** `edcat.vera_query_response_bank`
- **Purpose:** Pre-written Q&A responses for common questions
- **Key Columns:** `id`, `user_query_pattern`, `response_text`, `confidence_score`
- **Used By:** VeraQueryResponseService
- **How Vera Uses It:** Fast-path lookup at STEP 1.3 - if user asks "What is quality?", Vera matches pattern and returns stored response

##### 3. Learning Documents
- **Table:** `edcat.document_content_for_learning`
- **Purpose:** Extracted text from ingested documents for Vera to learn from
- **Key Columns:** `id`, `file_id`, `standard_code`, `content_text`, `quality`
- **Used By:** VeraLearningRepository
- **How Vera Uses It:** When building context, Vera queries this table to find relevant document excerpts

##### 4. Example Documents
- **Table:** `edcat.example_documents` (or `edcat.learning_examples`)
- **Purpose:** Approved and bad examples for procedure generation
- **Key Columns:** `id`, `file_id`, `standard_code`, `quality_score`, `example_type`
- **Used By:** VeraLearningRepository
- **How Vera Uses It:** When generating procedures, Vera references good examples and avoids bad patterns

#### Category 2: Conversation & Memory Tables

##### 5. Conversation History
- **Table:** `edcat.ai_conversation_history`
- **Purpose:** Stores all conversation messages
- **Key Columns:** `id`, `session_id`, `role`, `message_text`, `user_id`, `tenant_id`, `embedding`
- **Used By:** VeraMemoryService, VeraIntentLearner, VeraConversationContextBuilder
- **How Vera Uses It:** Builds conversation context, learns from past interactions

##### 6. Conversation State
- **Table:** `edcat.ai_conversation_state`
- **Purpose:** Current conversation state (intent, topic, goals, mode)
- **Key Columns:** `session_id`, `last_intent`, `last_topic`, `context`, `current_goal`, `subtasks`, `mode`
- **Used By:** VeraCoreEngine, VeraDialogueManager
- **How Vera Uses It:** Maintains conversation context across turns

##### 7. Persistent Memory
- **Table:** `edcat.vera_memory`
- **Purpose:** Long-term memory about tenants, standards, preferences
- **Key Columns:** `id`, `tenant_id`, `category`, `content`, `standard_code`
- **Used By:** VeraMemoryService
- **How Vera Uses It:** Remembers tenant-specific information

#### Category 3: Learning & Improvement Tables

##### 8. Learning Events
- **Table:** `edcat.ai_learning_event`
- **Purpose:** Records when Vera struggles or receives corrections (Phase 8)
- **Key Columns:** `id`, `user_question`, `intent`, `confidence_score`, `failure_type`, `metadata`
- **Used By:** VeraLearningEventService, VeraCapabilityProfileService
- **How Vera Uses It:** Tracks learning opportunities and capability gaps

##### 9. Learned Corrections
- **Table:** `edcat.vera_learned_corrections`
- **Purpose:** User corrections to Vera's answers
- **Key Columns:** `id`, `original_question`, `corrected_answer`, `confidence`
- **Used By:** VeraCorrectionProcessor
- **How Vera Uses It:** Learns from user feedback

##### 10. Remedy Applications
- **Table:** `edcat.vera_remedy_applications`
- **Purpose:** Tracks successful fixes for issues
- **Key Columns:** `id`, `issue_code`, `remedy_action`, `resolution_status`
- **Used By:** VeraRemedyLearningService
- **How Vera Uses It:** Learns which remedies work for which issues

#### Category 4: Knowledge Graph Tables

##### 11. Knowledge Relationships
- **Table:** `edcat.knowledge_relationships`
- **Purpose:** Relationships between standards and clauses
- **Key Columns:** `id`, `source_code`, `target_code`, `relationship_type`
- **Used By:** VeraKnowledgeGraph
- **How Vera Uses It:** Maps relationships between standards (e.g., "AS9100D extends ISO 9001")

##### 12. Requirement Relationships
- **Table:** `edcat.requirement_relationships`
- **Purpose:** Relationships between individual requirements
- **Key Columns:** `id`, `source_requirement_id`, `target_requirement_id`, `relationship_type`
- **Used By:** VeraKnowledgeGraphNavigator
- **How Vera Uses It:** Navigates requirement dependencies

##### 13. Knowledge Embeddings
- **Table:** `edcat.knowledge_embeddings`
- **Purpose:** Vector embeddings for semantic search
- **Key Columns:** `id`, `content_text`, `embedding`, `standard_code`
- **Used By:** VeraSemanticMemory
- **How Vera Uses It:** Semantic similarity search (if pgvector available)

#### Category 5: Advanced Feature Tables (Phases 13-20)

##### 14. Audit Scenarios
- **Table:** `edcat.vera_audit_scenarios`
- **Purpose:** Generated audit scenarios for training (Phase 13)
- **Key Columns:** `id`, `title`, `standard_code`, `clauses`, `scenario_json`, `difficulty`
- **Used By:** VeraAuditScenarioService
- **How Vera Uses It:** Generates and walks through audit scenarios

##### 15. Quality Ontology
- **Tables:** `edcat.quality_concepts`, `edcat.quality_concept_relations`
- **Purpose:** Structured mental map of Quality concepts (Phase 14)
- **Key Columns:** `id`, `name`, `category`, `description`, `aliases`, `domain_tags`
- **Used By:** VeraQualityOntologyService
- **How Vera Uses It:** Explains quality concepts with relationships (e.g., "APQP feeds into PPAP")

##### 16. Cross-Domain Mappings
- **Table:** `edcat.cross_domain_mappings`
- **Purpose:** Maps requirements across domains (aerospace, medical, automotive) (Phase 17)
- **Key Columns:** `id`, `source_standard_code`, `target_standard_code`, `similarity_score`
- **Used By:** VeraCrossDomainMappingService
- **How Vera Uses It:** Explains how similar requirements appear in different domains

##### 17. Gap Rules
- **Table:** `edcat.vera_gap_rules`
- **Purpose:** Structured gap analysis rules (Phase 19)
- **Key Columns:** `id`, `standard_code`, `clause_ref`, `rule_json`, `severity`
- **Used By:** VeraGapRulesService, VeraAdvancedGapEngine
- **How Vera Uses It:** Applies structured rules for gap analysis

##### 18. Training Questions
- **Table:** `edcat.vera_training_questions`
- **Purpose:** Generated exam questions (Phase 20)
- **Key Columns:** `id`, `question_stem`, `options`, `correct_answer`, `difficulty`, `standard_code`
- **Used By:** VeraTrainingContentService
- **How Vera Uses It:** Generates training content and exam questions

#### Category 6: Configuration & System Tables

##### 19. AI Policy
- **Table:** `edcat.ai_policy`
- **Purpose:** Policy configurations for Vera's behavior
- **Key Columns:** `id`, `tenant_id`, `name`, `config`
- **Used By:** VeraCoreEngine
- **How Vera Uses It:** Loads behavior policies (e.g., `vera.follow.rules`)

##### 20. AI Prompt
- **Table:** `edcat.ai_prompt`
- **Purpose:** System prompts for Vera
- **Key Columns:** `id`, `tenant_id`, `persona_code`, `kind`, `name`, `content`
- **Used By:** VeraCoreEngine
- **How Vera Uses It:** Loads system prompts for different scenarios

##### 21. AI Router
- **Table:** `edcat.ai_router`
- **Purpose:** Intent routing rules
- **Key Columns:** `id`, `tenant_id`, `rules`, `active`
- **Used By:** VeraCoreEngine
- **How Vera Uses It:** Routes user intents to appropriate handlers

##### 22. Response Templates
- **Table:** `edcat.vera_response_templates`
- **Purpose:** Answer templates
- **Key Columns:** `id`, `tenant_id`, `template_code`, `content`, `active`
- **Used By:** VeraCoreEngine
- **How Vera Uses It:** Template-based response generation

##### 23. Debug Sessions
- **Table:** `edcat.vera_debug_sessions`
- **Purpose:** Debug session logs
- **Key Columns:** `id`, `session_id`, `issue_code`, `severity`, `details`
- **Used By:** VeraDebugLogger
- **How Vera Uses It:** Logs internal issues for diagnostics

##### 24. Multimodal Content
- **Table:** `edcat.document_multimodal_content`
- **Purpose:** Extracted tables, images, diagrams from PDFs
- **Key Columns:** `id`, `document_id`, `content_type`, `content_json`, `page_number`
- **Used By:** VeraMultimodalExtractor
- **How Vera Uses It:** References visual content from documents

##### 25. Information Requests
- **Table:** `edcat.ai_information_request`
- **Purpose:** Tracks when Vera requests missing information
- **Key Columns:** `id`, `request_type`, `details`, `status`
- **Used By:** VeraKnowledgeGapService
- **How Vera Uses It:** Identifies knowledge gaps

##### 26. Gap Hints
- **Table:** `edcat.vera_gap_hints`
- **Purpose:** Hints for gap analysis
- **Key Columns:** `id`, `standard_code`, `clause_ref`, `hint_text`
- **Used By:** VeraGapHintService
- **How Vera Uses It:** Provides hints during gap analysis

##### 27. Knowledge Graph Concepts
- **Table:** `edcat.vera_knowledge_graph_concepts`
- **Purpose:** Knowledge graph concepts
- **Key Columns:** `id`, `concept_name`, `description`
- **Used By:** VeraKnowledgeGraph
- **How Vera Uses It:** Builds knowledge graph

##### 28. Standard Profiles
- **Table:** `edcat.vera_standard_profiles`
- **Purpose:** Standard-specific profiles
- **Key Columns:** `id`, `standard_code`, `profile_data`
- **Used By:** VeraKnowledgeGraph
- **How Vera Uses It:** Stores standard-specific metadata

##### 29. Clarification Rules
- **Table:** `edcat.vera_clarification_rules`
- **Purpose:** Rules for when to ask clarifying questions
- **Key Columns:** `id`, `rule_pattern`, `clarification_question`
- **Used By:** VeraInteractiveClarificationEngine
- **How Vera Uses It:** Determines when to ask for clarification

##### 30. Conversation Memory
- **Table:** `edcat.conversation_memory`
- **Purpose:** Conversation memory with embeddings
- **Key Columns:** `id`, `session_id`, `message_text`, `role`, `embedding`
- **Used By:** VeraMemoryService
- **How Vera Uses It:** Semantic search over conversation history

### How Vera Uses This Database

**VeraCoreEngine** queries this database in a **priority order**:

#### STEP 1.25: Term Definition Check (Fastest Path)
```javascript
// In VeraTerminologyService
const term = await queryEdcatAI(
  'SELECT * FROM edcat.terms_and_definitions WHERE term ILIKE $1 OR acronym ILIKE $1',
  ['APQP']
);
// If found → RETURN IMMEDIATELY (skips all other queries)
```

#### STEP 1.3: Q&A Bank Check (Fast Path)
```javascript
// In VeraQueryResponseService
const qa = await queryEdcatAI(
  'SELECT * FROM edcat.vera_query_response_bank WHERE user_query_pattern ILIKE $1',
  ['%what is quality%']
);
// If found with confidence > 0.85 → RETURN IMMEDIATELY
```

#### STEP 2: Build Comprehensive Context (Slower Path)
```javascript
// In VeraContextOrchestrator
const learningDocs = await queryEdcatAI(
  'SELECT * FROM edcat.document_content_for_learning WHERE standard_code = $1',
  ['AS9100D']
);

const examples = await queryEdcatAI(
  'SELECT * FROM edcat.example_documents WHERE standard_code = $1 AND quality_score > 0.8',
  ['AS9100D']
);

const conversationHistory = await queryEdcatAI(
  'SELECT * FROM edcat.ai_conversation_history WHERE session_id = $1 ORDER BY created_at DESC LIMIT 10',
  [sessionId]
);
```

#### STEP 3: Use Learning & Memory
```javascript
// In VeraMemoryService
const memory = await queryEdcatAI(
  'SELECT * FROM edcat.vera_memory WHERE tenant_id = $1 AND category = $2',
  [tenantId, 'preferences']
);

// In VeraLearningEventService
const learningEvents = await queryEdcatAI(
  'SELECT * FROM edcat.ai_learning_event WHERE failure_type = $1 ORDER BY created_at DESC',
  ['low_confidence']
);
```

---

## Connection Architecture

### How Connections Are Established

```javascript
// backend/src/config/databases.js

// 1. Customer Data Pool
postgresPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  ssl: production ? { rejectUnauthorized: false } : false
});

// 2. EDCAT AI Pool
edcatPool = new Pool({
  connectionString: process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL,
  max: 20,
  ssl: railway ? { rejectUnauthorized: false } : false
});
```

### How Services Connect

**All services use centralized helpers:**

```javascript
// ✅ CORRECT PATTERN (used by all services)
import { queryPostgres, queryEdcatAI } from '../../config/databases.js';

// Customer Data DB
const standards = await queryPostgres('SELECT * FROM standards WHERE code = $1', ['AS9100D']);

// EDCAT AI DB
const terms = await queryEdcatAI('SELECT * FROM edcat.terms_and_definitions WHERE term = $1', ['APQP']);
```

**Services NEVER:**
- ❌ Create their own connection pools
- ❌ Access `DATABASE_URL` or `EDCAT_AI_DATABASE_URL` directly
- ❌ Use different connection methods

---

## Request Flow: How Vera Uses Both Databases

### Example: User asks "What does AS9100D clause 8.7 require?"

```
1. User Query: "What does AS9100D clause 8.7 require?"
   ↓
2. VeraCoreEngine.generateVeraResponse()
   ↓
3. [STEP 1.25] Term Definition Check
   ├─→ queryEdcatAI('SELECT * FROM edcat.terms_and_definitions WHERE term ILIKE $1', ['8.7'])
   └─→ Not found → Continue
   ↓
4. [STEP 1.3] Q&A Bank Check
   ├─→ queryEdcatAI('SELECT * FROM edcat.vera_query_response_bank WHERE user_query_pattern ILIKE $1', ['%AS9100D%8.7%'])
   └─→ Not found → Continue
   ↓
5. [STEP 2] Build Context
   ├─→ queryPostgres('SELECT * FROM standards WHERE code = $1', ['AS9100D'])  ← Customer Data DB
   ├─→ queryPostgres('SELECT * FROM compliance_requirements WHERE standard_id = $1 AND clause_reference = $2', [standardId, '8.7'])  ← Customer Data DB
   ├─→ queryEdcatAI('SELECT * FROM edcat.document_content_for_learning WHERE standard_code = $1', ['AS9100D'])  ← EDCAT AI DB
   ├─→ queryEdcatAI('SELECT * FROM edcat.example_documents WHERE standard_code = $1', ['AS9100D'])  ← EDCAT AI DB
   └─→ queryEdcatAI('SELECT * FROM edcat.ai_conversation_history WHERE session_id = $1', [sessionId])  ← EDCAT AI DB
   ↓
6. Generate Response using context from both databases
   ↓
7. Store in EDCAT AI DB
   ├─→ queryEdcatAI('INSERT INTO edcat.ai_conversation_history (session_id, role, message_text) VALUES ($1, $2, $3)', [sessionId, 'assistant', response])
   └─→ queryEdcatAI('UPDATE edcat.ai_conversation_state SET last_intent = $1, last_topic = $2', [intent, 'AS9100D 8.7'])
```

---

## Database Separation Logic

### Why Two Databases?

1. **Customer Data DB** = **What the customer has**
   - Their documents
   - Their procedures
   - Standards they need to comply with
   - Gap analysis results

2. **EDCAT AI DB** = **What Vera knows**
   - Terminology definitions
   - Learned responses
   - Conversation history
   - Learning events
   - Knowledge relationships

### Benefits of Separation

1. **Scalability** - Can scale intelligence separately from customer data
2. **Security** - Customer data isolated from AI learning data
3. **Performance** - Optimized indexes for each use case
4. **Maintenance** - Can backup/restore independently

---

## Migration System

### How Migrations Work

**File:** `backend/src/database/twoDatabaseMigrations.js`

**On Startup:**
1. Server starts (`backend/index.js`)
2. Calls `initializeTwoDatabases()`
3. Runs migrations for Customer Data DB using `queryPostgres()`
4. Runs migrations for EDCAT AI DB using `queryEdcatAI()`
5. All migrations are idempotent (safe to run multiple times)

**Migration Files:**
- Customer Data: `001_postgres_customer_data.sql`, `006_consolidate_to_standards_table.sql`, etc.
- EDCAT AI: `002_edcat_ai_intelligence.sql`, `014_vera_enhanced_intelligence.sql`, `072_ensure_all_edcat_tables.sql`, etc.

---

## Health Checks

### Connection Health

**Function:** `checkConnections()` in `databases.js`

```javascript
// Tests both databases
const pg = await postgresPool.query('SELECT NOW()');
const edcat = await edcatPool.query('SELECT NOW()');
```

**Endpoints:**
- `GET /api/vera/health` - Uses `checkConnections()`
- `GET /api/db-status` - Database status

---

## Summary Table

| Database | Environment Var | Schema | Tables | Purpose | Used By |
|----------|----------------|--------|--------|---------|---------|
| **Customer Data** | `DATABASE_URL` | `public.*` | 11 tables | Customer documents, standards, requirements | VeraCoreEngine, routes |
| **EDCAT AI** | `EDCAT_AI_DATABASE_URL` | `edcat.*` | 30+ tables | Vera's intelligence, learning, knowledge | All Vera services |

---

## Key Takeaways

1. ✅ **Two databases, clear separation**
   - Customer Data = What customer has
   - EDCAT AI = What Vera knows

2. ✅ **Centralized connection management**
   - All services use `queryPostgres()` and `queryEdcatAI()`
   - No direct database URL access

3. ✅ **Fast-path optimization**
   - Term lookup (STEP 1.25) → EDCAT AI DB
   - Q&A lookup (STEP 1.3) → EDCAT AI DB
   - Only builds full context if fast paths fail

4. ✅ **Automatic migrations**
   - Run on startup via `twoDatabaseMigrations.js`
   - Idempotent and safe

5. ✅ **Health monitoring**
   - Connection checks available
   - Health endpoints expose status

---

**Last Updated:** December 2024  
**Status:** ✅ Architecture is sound and well-documented

