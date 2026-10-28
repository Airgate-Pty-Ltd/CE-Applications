# Vera Architecture and Capabilities

**Last Updated:** December 2024  
**Version:** 4.1 (World-Class Quality Brain - Phases 13-20 Complete + Critical Schema Fixes)

---

## Executive Summary

**Vera** (Virtual Expert in Requirements and Assessments) is a self-contained AI compliance specialist designed to help organizations navigate complex quality management systems, regulatory requirements, and compliance standards. Unlike traditional AI assistants that rely on external LLM APIs, Vera operates entirely within your infrastructure, using her own internal reasoning engine powered by your compliance data.

### Key Differentiators

- ✅ **100% Self-Contained**: No external AI providers (OpenAI, Anthropic, etc.)
- ✅ **Domain-Specific**: Built specifically for compliance, quality, and regulatory requirements
- ✅ **Learning-Enabled**: Continuously learns from your documents, examples, and feedback
- ✅ **Confidence-Aware**: Knows when she's certain and when she's uncertain
- ✅ **Multi-Standard**: Supports AS9100, ISO 9001, ISO 13485, FAA, CASA, EASA, UK CAA, FDA, DOT, and more

---

## What Vera Can Do

### 1. **Compliance Question Answering**

Vera can answer questions about:
- **Standards**: AS9100D, ISO 9001:2015, ISO 13485:2016, IATF 16949, etc.
- **Regulations**: FAA Part 21.137, CASA CASRs, EASA 1321/2014, UK CAA AW 2025, FDA 21 CFR Part 11, DOT 49 CFR Part 40
- **Clauses**: "What does clause 8.7 require?", "Explain 21.137(n)", "What is required in ISO 9001 clause 4.2.3?"
- **Requirements**: Specific requirement text, intent, common gaps, evidence examples

**Example Queries:**
- "What does AS9100D clause 8.7 require?"
- "Explain FAA Part 21.137(n)"
- "What is the difference between ISO 9001 and AS9100D?"
- "What are common gaps in clause 8.5.1?"

### 2. **Gap Analysis and Compliance Assessment**

Vera can:
- Identify gaps between your documents and standards
- Classify gaps by severity (Critical, High, Medium, Low)
- Suggest remediation priorities
- Compare your procedures against approved examples
- Highlight patterns from bad examples to avoid

**Example Queries:**
- "Analyze gaps for AS9100D"
- "What gaps exist in our document control procedure?"
- "Show me compliance gaps for FAA Part 21.137"

### 3. **Procedure Drafting and Template Generation**

Vera can:
- Generate procedure templates based on approved examples
- Extract patterns from good examples ("what good looks like")
- Warn about patterns from bad examples ("what to avoid")
- Create procedure drafts for specific clauses
- Suggest structure and content based on ingested examples

**Example Queries:**
- "Draft a procedure for clause 8.7"
- "Create a template for document control"
- "Generate a procedure based on approved examples"

### 4. **Cross-Standard Comparison**

Vera can:
- Compare requirements across standards (e.g., AS9100D vs ISO 9001)
- Map clauses between standards
- Identify similarities and differences
- Explain regulatory relationships

**Example Queries:**
- "How does AS9100D 8.7 compare to ISO 9001 8.7?"
- "What's the difference between FAA Part 21.137 and AS9100D?"
- "Map ISO 13485 requirements to AS9100D"

### 5. **Regulatory Lookup and Explanation**

Vera can:
- Query regulatory standards (FAA, CASA, EASA, UK CAA, FDA, DOT)
- Explain regulatory sections and subsections
- Provide regulatory context and requirements
- Cross-reference regulatory requirements with standards

**Example Queries:**
- "What does FAA Part 21.137(n) require?"
- "Explain CASA CASR Part 145"
- "What are EASA requirements for design approval?"

### 6. **Learning from Examples**

Vera can:
- Learn from approved example documents
- Identify patterns in good examples
- Learn from bad examples (what to avoid)
- Use examples to guide procedure generation
- Reference examples in answers

**Example Queries:**
- "Show me approved examples for clause 8.7"
- "What patterns should I avoid based on bad examples?"
- "Use approved examples to draft a procedure"

### 7. **Conversation and Context Awareness**

Vera can:
- Remember previous questions in a conversation
- Build on prior context
- Track conversation topics
- Maintain conversation state across sessions
- Learn from user corrections

**Example Queries:**
- "Tell me about clause 8.7" → "What about 8.7.1?" (Vera remembers the context)
- "That's not right, here's the correct answer" (Vera learns from correction)

### 8. **Confidence and Uncertainty Communication**

Vera can:
- Calculate confidence scores for her answers
- Communicate uncertainty professionally
- Indicate when information may be incomplete
- Suggest verification with official documents

**Example Behavior:**
- High confidence (≥0.85): Direct, confident answer
- Medium confidence (0.6-0.85): Answer with "I have good information, but..."
- Low confidence (<0.6): "Based on what I can see, but you may want to verify..."

### 9. **Intent Detection and Routing**

Vera can:
- Detect user intent (clause question, gap analysis, procedure request, etc.)
- Route to appropriate handlers
- Learn from conversation history
- Refine routing based on past interactions

**Supported Intents:**
- `term_definition`: Term definition requests (95% confidence)
- `quality_definition`: Quality concept questions (92% confidence)
- `gap_analysis`: Gap analysis requests (90% confidence)
- `regulatory_question`: Regulatory queries (93% confidence)
- `procedure_draft`: Procedure generation requests (90% confidence)
- `self_diagnostic`: ⭐ **NEW** - Self-diagnostic questions (99% confidence)
- `self_triage`: ⭐ **NEW** - Issue prioritization requests (99% confidence)
- `self_debug_history`: ⭐ **NEW** - Debug history requests (99% confidence)
- `self_remedy`: ⭐ **NEW** - Remedy recommendation requests (99% confidence)
- `self_test`: ⭐ **NEW** - Self-test requests (99% confidence)
- `remedy_application`: ⭐ **NEW** - Remedy application recording (95% confidence)
- `remedy_effectiveness`: ⭐ **NEW** - Remedy effectiveness queries (99% confidence)
- `clause_question`: Questions about specific clauses
- `standard_question`: Questions about standards
- `gap_analysis_request`: Requests for gap analysis
- `cross_standard_comparison`: Comparison requests
- `general_query`: General compliance questions

### 10. **Knowledge Gap Detection**

Vera can:
- Detect when she doesn't have sufficient information
- Request specific documents or information
- Guide users on what to provide
- Automatically recognize when requested information is ingested

**Example Behavior:**
- "I need more information about FAA Part 21.137. Please add documents to the Regulatory folder and run ingestion."

### 11. **Self-Diagnostic and Health Monitoring** ⭐ **NEW**

Vera can:
- Track internal issues across all critical systems
- Prioritize issues by business impact (priority scores)
- Provide actionable remediation steps with specific migration files
- Run self-tests to verify system health
- Learn from remedy effectiveness over time
- Report health status via API endpoint

**Self-Diagnostic Intents:**
- `self_diagnostic`: "What issues are you having?", "Are you working properly?"
- `self_triage`: "What should we fix first?", "Top priority issue"
- `self_debug_history`: "Show me your recent issues", "What problems have you had?"
- `self_remedy`: "What do you recommend?", "How should I fix this?"
- `self_test`: "Run self-test", "Verify fixes"
- `remedy_application`: "I applied migration 041", "I fixed DB_SCHEMA_MISMATCH"
- `remedy_effectiveness`: "Which remedy worked best?", "Remedy effectiveness statistics"

**Example Queries:**
- "Vera, what issues are you having?"
- "What should we fix first?"
- "What do you recommend for DB_SCHEMA_MISMATCH?"
- "Run self-test"
- "I applied migration 041"
- "Which remedy worked best for DB_SCHEMA_MISMATCH?"

**Health API:**
- `GET /api/vera/health` - Returns JSON with current health status and active issues

### 12. **Remedy Learning and Effectiveness Tracking** ⭐ **NEW**

Vera can:
- Record when users apply remedies
- Track remedy effectiveness over time
- Prioritize historically successful remedies in recommendations
- Calculate success rates and resolution times
- Learn which fixes work best for specific issues

**Example Flow:**
1. User: "What do you recommend?" → Vera suggests remedies
2. User: "I applied migration 041" → Vera records the remedy
3. Issue resolves → Vera marks remedy as successful
4. Future: "What do you recommend?" → Vera prioritizes successful remedies

### 13. **Multimodal Content Extraction** ⭐ **NEW**

Vera can:
- Extract tables, images, flowcharts, and diagrams from PDFs
- Store multimodal content in `edcat.document_multimodal_content`
- Search content by text using full-text search
- Retrieve tables, images, and diagrams by document
- Reference page numbers and section headers

**Database:** `edcat.document_multimodal_content`

**Content Types:**
- `text`: Extracted text content
- `table`: Structured table data (headers, rows)
- `image`: Images with descriptions
- `flowchart`: Process flowcharts
- `diagram`: Technical diagrams

**Key Functions:**
- `extractAndStore()`: Extract and store multimodal content
- `getContentByDocument()`: Get all content for a document
- `searchByText()`: Full-text search across content
- `getTables()`, `getImages()`, `getDiagrams()`: Type-specific retrieval

### 14. **Knowledge Graph Navigation** ⭐ **NEW**

Vera can:
- Navigate relationships between requirements, standards, and procedures
- Find paths between related requirements
- Identify dependencies, complements, and conflicts
- Traverse requirement relationships graph
- Discover related requirements automatically

**Database:** `edcat.requirement_relationships`

**Relationship Types:**
- `depends_on`: Requirement A depends on Requirement B
- `complements`: Requirements that work together
- `conflicts`: Conflicting requirements
- `implies`: Requirement A implies Requirement B
- `references`: Requirement A references Requirement B
- `implements`: Requirement A implements Requirement B

**Key Functions:**
- `getRelationships()`: Get all relationships for a requirement
- `findPath()`: Find navigation path between two requirements
- `getDependents()`: Get requirements that depend on this one
- `getDependencies()`: Get requirements this one depends on
- `getConflicts()`: Get conflicting requirements
- `getComplements()`: Get complementary requirements

### 15. **Role-Based Adaptive Responses** ⭐ **NEW**

Vera can:
- Detect user role from database (admin, auditor, engineer, manager, user)
- Adapt responses based on role
- Provide role-appropriate technical detail level
- Customize language and depth for different audiences

**Supported Roles:**
- `admin` / `administrator`: Full technical details
- `auditor` / `quality_auditor`: Compliance-focused language
- `engineer` / `quality_engineer`: Technical, implementation-focused
- `manager` / `quality_manager`: Executive summaries, high-level insights
- `user`: Standard responses

**Implementation:**
- `getUserRole()`: Retrieves role from `public.users` table
- `adaptResponseForRole()`: Adapts response text based on role
- Applied to all response types (Q&A, templates, clarifications, etc.)

### 16. **LLM Integration & RAG Pipeline** ⭐ **NEW (Phases 1-7)**

Vera now supports pluggable LLM integration with Retrieval-Augmented Generation (RAG).

**Components:**
- `VeraLLMBridge.ts`: Provider-agnostic LLM interface (local_http, noop modes)
- `VeraContextOrchestrator.ts`: Builds comprehensive RAG context from all services
- `VeraPromptBuilder.ts`: Constructs system prompts with Vera persona and structured format
- Integrated into `VeraCoreEngine` with graceful fallback to legacy templates

**Features:**
- Supports local/self-hosted LLMs via HTTP endpoint
- Graceful degradation when LLM unavailable
- Comprehensive context gathering from all knowledge sources
- Structured answer format with requirement → evidence → pitfalls → next steps

**Configuration:**
```env
VERA_LLM_PROVIDER=local_http
VERA_LLM_ENDPOINT=http://localhost:8000/generate
VERA_LLM_API_KEY=...  # optional
```

### 17. **Active Learning Loop** ⭐ **NEW (Phase 8)**

Vera records learning events when she struggles, fails, or receives corrections.

**Capabilities:**
- Records low-confidence answers (< 0.6 threshold)
- Captures user corrections as learning events
- Tracks fallback to legacy system
- Stores self-evaluation failures
- Provides learning dashboard API

**Database:** `edcat.ai_learning_event`

**API Endpoints:**
- `GET /api/vera/learning/events` - List recent learning events
- `GET /api/vera/learning/dashboard` - Aggregated statistics

### 18. **Automated Knowledge Enrichment** ⭐ **NEW (Phase 9)**

Vera automatically extracts structured knowledge from ingested documents.

**Extraction Types:**
- **Terminology**: Terms, acronyms, definitions → `edcat.terms_and_definitions`
- **Examples**: Good/bad examples → `edcat.example_documents`
- **Relationships**: Requirement relationships → `edcat.requirement_relationships`

**Service:** `VeraKnowledgeEnrichmentService.ts`

**Batch Script:** `backend/src/scripts/enrich-learning-content.js`

### 19. **Skill Modules** ⭐ **NEW (Phase 10)**

Vera can perform actions beyond answering questions.

**Available Skills:**
- `generate_audit_questions` - Generate 15-20 audit questions grouped by topic
- `generate_audit_checklist` - Create comprehensive audit checklist
- `draft_corrective_action_plan` - Draft CAR template with root cause analysis
- `generate_training_outline` - Create training module outline
- `summarize_gaps` - Summarize compliance gaps with severity
- `compare_standards` - Compare requirements across standards

**Service:** `VeraSkillEngine.ts`

**Usage:** Automatically detected from user messages (e.g., "Generate audit checklist for AS9100D")

### 20. **Answer Self-Evaluation** ⭐ **NEW (Phase 11)**

Vera critiques her own answers using an LLM.

**Capabilities:**
- Evaluates answer quality (score 0.0-1.0)
- Provides detailed feedback and recommendations
- Records low-score answers as learning events
- Optional refinement loop for improvement

**Service:** `VeraAnswerEvaluator.ts`

**Configuration:**
```env
VERA_SELF_EVAL_ENABLED=true
VERA_SELF_EVAL_THRESHOLD=0.6
```

### 21. **Capability Profile & Growth Dashboard** ⭐ **NEW (Phase 12)**

Vera tracks her own strengths and weaknesses.

**Metrics:**
- Per-standard capability (avg confidence, low-score count)
- Per-intent capability (usage, success rates)
- Top weak areas (standards/clauses with most issues)
- Growth suggestions ("what to teach me next")

**API Endpoints:**
- `GET /api/vera/capability/summary` - Overall capability summary
- `GET /api/vera/capability/by-standard` - Per-standard metrics
- `GET /api/vera/capability/by-intent` - Per-intent metrics

**Service:** `VeraCapabilityProfileService.ts`

### 22. **Audit Playbooks & Scenario Simulation** ⭐ **NEW (Phase 13)**

Vera acts as a world-class lead auditor coach.

**Capabilities:**
- Generates complete audit scenarios for given clauses
- Step-by-step walkthrough (opening meeting, process walk-through, record sampling, closing)
- Expected evidence, suggested questions, common pitfalls
- Interactive simulation mode ("start simulation")
- Stores scenarios for re-use

**Service:** `VeraAuditScenarioService.ts`

**API Endpoints:**
- `GET /api/vera/audit-scenarios` - List saved scenarios
- `POST /api/vera/audit-scenarios/generate` - Generate new scenario
- `GET /api/vera/audit-scenarios/:id` - Get specific scenario

**Database:** `edcat.vera_audit_scenarios`

### 23. **Quality Ontology & Taxonomy** ⭐ **NEW (Phase 14)**

Vera has a structured mental map of Quality concepts.

**Concepts Covered:**
- **Audit Types**: Internal audit, supplier audit, certification audit, surveillance audit
- **Tools**: FMEA, APQP, PPAP, SPC, MSA, Control Plan, 8D, Ishikawa, 5 Whys, DOE
- **Documents**: Procedure, work instruction, form, record, Quality Manual, QMS matrix
- **Roles**: Lead auditor, internal auditor, quality manager, process owner, inspector
- **Processes**: NCR, CAR, SCAR, risk assessment, management review, calibration, training

**Relationships:**
- `uses`, `produces`, `requires`, `is_part_of`, `is_instance_of`, `contradicts`, `supports`

**Service:** `VeraQualityOntologyService.ts`

**Database:** `edcat.quality_concepts`, `edcat.quality_concept_relations`

**Seed Script:** `backend/src/scripts/seed-quality-ontology.ts`

### 24. **Advanced Dialogue Manager** ⭐ **NEW (Phase 15)**

Vera maintains goals across turns and guides users to better questions.

**Capabilities:**
- Detects exploratory vs executing intent
- Asks clarifying questions when information is missing
- Suggests next logical steps
- Maintains conversation goals
- Configurable guidance level (minimal/standard/coaching)

**Service:** `VeraDialogueManager.ts`

**Database:** `edcat.ai_conversation_state` (extended with goals, subtasks, mode)

### 25. **Personality & Tone Layer** ⭐ **NEW (Phase 16)**

Vera has a warm, professional personality with British/Scottish influence.

**Features:**
- British/Scottish regional flavour (subtle phrasing: "shall we", "that's brilliant")
- Context-aware humour (low for serious topics like recalls, safety)
- Reassurance, encouragement, and gentle challenge phrases
- Automatic detection of when to apply persona layer
- Configurable humour and formality levels

**Configuration:** `backend/src/config/veraPersonaProfile.ts`

**Service:** `VeraPersonaResponseAdapter.ts`

**Persona Profile:**
- Region: British
- Humour Level: Medium (context-aware)
- Formality: Semi-formal
- Greetings, reassurance, encouragement, challenge phrases

### 26. **Multi-Domain Standards Integration** ⭐ **NEW (Phase 17)**

Vera seamlessly operates across multiple domains.

**Supported Domains:**
- **Aerospace**: AS9100, AS9110, AS9120, FAA, EASA, CASA, UK CAA
- **Medical Device**: ISO 13485, FDA 820, MDSAP, MDR, IVDR
- **Automotive**: IATF 16949

**Capabilities:**
- Automatic domain detection from message keywords
- Cross-domain requirement mapping with similarity scores
- Cached mappings for performance
- Structured comparison showing equivalent/similar requirements

**Service:** `VeraCrossDomainMappingService.ts`

**Database:** `edcat.cross_domain_mappings`, `public.standards` (with family and domain_tags)

### 27. **Deep Explanation Mode** ⭐ **NEW (Phase 18)**

Vera teaches Quality concepts with layered explanations.

**Teaching Layers:**
1. **Plain Explanation** - No jargon, beginner-friendly
2. **Practical Examples** - Real-world scenarios ("In an AS9100 shop...")
3. **Audit Lens** - What auditors look for, common findings
4. **Implementation Tips** - How to move from theory to practice

**Modes:**
- `basic` - Plain explanation only
- `intermediate` - Plain + examples
- `advanced` - All layers
- `layered` - All layers (default for new users)

**Service:** `VeraTeachingFormatter.ts`

**Usage:** "Teach me APQP from scratch", "Explain clause 8.7 like I'm new"

### 28. **Advanced Gap Analysis Engine** ⭐ **NEW (Phase 19)**

Vera performs structured, deeply reasoned gap analysis.

**Features:**
- Gap rules per clause (mandatory elements, common misinterpretations, evidence examples)
- LLM-based gap analysis with rule-based fallback
- Coverage ratings (0.0-1.0) and status (fully_met/partially_met/not_met)
- Plain-language narrative explanations
- Recommended corrective actions per gap
- Overall coverage summary and critical gap identification

**Services:**
- `VeraGapRulesService.ts` - Manages gap rules
- `VeraAdvancedGapEngine.ts` - Performs gap analysis

**Database:** `edcat.vera_gap_rules`

### 29. **Training & Exam Content Generator** ⭐ **NEW (Phase 20)**

Vera generates training outlines and exam questions.

**Capabilities:**
- **Training Outlines**: Modules, learning objectives, key topics, duration, talking points, assessment methods
- **Exam Questions**: Multiple choice, scenario-based, true/false with explanations
- Questions tagged with standard, clause, difficulty, learning objective, domain
- Export-friendly formatting for Word/PPT conversion

**Service:** `VeraTrainingContentService.ts`

**Database:** `edcat.vera_training_questions`

**Usage:** "Create training for clause 8.7 for new inspectors", "Give me 20 exam questions for FAA 21.137(n)"

---

## How Vera Works

### Architecture Overview

Vera uses a **two-database architecture**:

1. **Customer Data Database** (`DATABASE_URL`)
   - Stores customer-specific data
   - Standards, requirements, documents, gap analyses
   - Schema: `public.*`

2. **EDCAT AI Database** (`EDCAT_AI_DATABASE_URL`)
   - Stores Vera's intelligence and learning
   - Conversation history, embeddings, knowledge graph
   - Schema: `edcat.*`

### Core Components

#### 1. **VeraCoreEngine** (`backend/src/services/vera/VeraCoreEngine.ts`)

The central reasoning engine that orchestrates all of Vera's capabilities.

**Pipeline:**
1. **Intent Detection**: Determines what the user is asking
2. **Context Building**: Gathers relevant information from databases
3. **Template Selection**: Chooses appropriate answer template
4. **Template Filling**: Populates template with context data
5. **Confidence Calculation**: Determines confidence level
6. **Response Generation**: Creates final answer
7. **Conversation Recording**: Saves interaction for learning

**Key Methods:**
- `generateVeraResponse()`: Main entry point
- `detectSpecializedIntent()`: ⭐ **NEW** - Specialized intent detection (runs first)
- `detectIntentAndTopic()`: Generic intent detection (fallback)
- `buildSemanticContext()`: Context gathering
- `selectAnswerTemplate()`: Template selection
- `fillTemplate()`: Template population
- `calculateConfidence()`: Confidence scoring
- `formatTermDefinition()`: ⭐ **NEW** - Format terminology definitions
- `formatQnAResponse()`: ⭐ **NEW** - Format Q&A responses
- `getUserRole()`: ⭐ **NEW** - Get user role for adaptive responses
- `adaptResponseForRole()`: ⭐ **NEW** - Adapt response based on user role

#### 2. **VeraTerminologyService** (`backend/src/services/vera/VeraTerminologyService.js`) ⭐ **NEW**

Manages terminology, acronyms, and definitions lookup.

**Database:** `edcat.terms_and_definitions`

**Capabilities:**
- Look up term definitions by name or acronym
- Context-aware selection (automotive/aerospace/quality)
- Search terms by keyword
- Load from database or file system

**Key Functions:**
- `lookupTerm(termName, context)`: Look up a term with context awareness
- `lookupAcronym(acronym)`: Look up by acronym
- `searchTerms(keyword)`: Search terms by keyword
- `loadFromDatabase()`: Load from `edcat.terms_and_definitions`

**Wiring:** ✅ Wired into `VeraCoreEngine` at STEP 1.25 (fast path)

**Status:** ✅ **WORKING** - Fully functional, queries database successfully

#### 3. **VeraQueryResponseService** (`backend/src/services/vera/VeraQueryResponseService.js`) ⭐ **NEW**

Manages pre-written Q&A responses from the knowledge bank.

**Database:** `edcat.vera_query_response_bank`

**Capabilities:**
- Find best matching Q&A entry for a user question
- Pattern matching (regex/ILIKE)
- Representative examples matching
- Confidence scoring
- Usage tracking

**Key Functions:**
- `findBestMatch({ tenantId, message, intent })`: Find best Q&A match
- `getResponsesByCategory(category)`: Get Q&A by category
- `createQueryResponseEntry()`: Create new Q&A entry
- `logMissingKnowledge()`: Log when knowledge is missing

**Wiring:** ✅ Wired into `VeraCoreEngine` at STEP 1.3 (fast path)

**Status:** ✅ **WORKING** - Fully functional, queries database successfully (99 entries available)

#### 4. **VeraLearningRepository** (`backend/src/services/vera/VeraLearningRepository.ts`)

Manages access to learning documents and examples.

**Database:** `edcat.document_content_for_learning`, `edcat.example_documents`

**Capabilities:**
- Query learning documents by standard code
- Search learning documents by topic/keyword
- **Semantic search** using embeddings
- Retrieve approved/bad examples
- Find clauses in learning documents

**Key Functions:**
- `getLearningDocsByStandardCode()`: Get docs for a standard
- `semanticSearchLearningDocs()`: Semantic similarity search
- `getApprovedExamplesForStandard()`: Get good examples
- `getBadExamplesForStandard()`: Get bad examples

#### 3. **VeraSemanticMemory** (`backend/src/services/vera/VeraSemanticMemory.js`)

Provides semantic search capabilities using embeddings.

**How It Works:**
1. Generates embeddings for text using configured provider
2. Stores embeddings in `edcat.knowledge_embeddings`
3. Performs similarity search using cosine distance
4. Returns most similar documents ranked by similarity

**Features:**
- Supports multiple embedding providers (TF-IDF, Ollama, Mistral, OpenAI-compatible)
- Uses pgvector extension if available (PostgreSQL)
- Falls back to JSONB storage if pgvector unavailable
- Caches embeddings for performance

#### 4. **VeraClauseMatcher** (`backend/src/services/vera/VeraClauseMatcher.ts`)

Normalizes and matches clause references across different formats.

**Supported Formats:**
- AS/ISO style: "8.7", "8.7.1", "Clause 8.7"
- Regulatory style: "21.137(n)", "21.137 n", "Part 21.137"
- Handles variations: "8.7.0" → "8.7", "8.7.1" → matches "8.7" and "8.7.1"

**Key Methods:**
- `normalizeClauseRef()`: Normalize clause reference
- `extractClauseReferences()`: Extract all clauses from text
- `buildClauseMatchQuery()`: Build SQL query for clause matching

#### 5. **VeraRegulatoryRepository** (`backend/src/services/vera/VeraRegulatoryRepository.ts`)

Specialized repository for regulatory standards.

**Supported Regulations:**
- **FAA**: Part 21.137, Part 145, etc.
- **CASA**: CASR Part 145, CASR Part 21, etc.
- **EASA**: 1321/2014, etc.
- **UK CAA**: AW 2025, etc.
- **FDA**: 21 CFR Part 11, Part 820, etc.
- **DOT**: 49 CFR Part 40, etc.

**Key Methods:**
- `findRegSectionText()`: Find regulatory section text
- `getAllRegulatoryClauses()`: Get all clauses for a regulation
- `isRegulatoryStandardAvailable()`: Check if regulation is available

#### 6. **VeraIntentLearner** (`backend/src/services/vera/VeraIntentLearner.ts`)

Learns from conversation history to improve intent detection.

**How It Works:**
1. Searches conversation history for similar questions
2. Uses embeddings for semantic similarity
3. Infers intent from similar past questions
4. Refines routing based on learned patterns

#### 7. **VeraCorrectionProcessor** (`backend/src/services/vera/VeraCorrectionProcessor.ts`)

Processes user corrections and learns from feedback.

**How It Works:**
1. Detects when user provides correction
2. Records correction in `edcat.ai_learning_event`
3. Updates response bank with corrected answer
4. Uses corrections for future answers

#### 8. **VeraConversationContextBuilder** (`backend/src/services/vera/VeraConversationContextBuilder.ts`)

Builds conversation context from recent messages.

**Capabilities:**
- Fetches last N messages from conversation history
- Tracks conversation topics
- Maintains context across turns
- Enables pronoun resolution (future enhancement)

#### 9. **VeraKnowledgeGraph** (`backend/src/services/vera/VeraKnowledgeGraph.ts`)

Manages relationships between standards, clauses, and requirements.

**Relationships:**
- `similar_to`: Similar requirements
- `references`: One requirement references another
- `supersedes`: One requirement supersedes another

**Use Cases:**
- Cross-standard mapping
- Requirement relationships
- Clause dependencies

#### 10. **VeraTemplateGenerator** (`backend/src/services/vera/VeraTemplateGenerator.ts`)

Generates procedure templates from approved examples.

**How It Works:**
1. Analyzes approved examples for a standard/clause
2. Extracts common patterns (headings, structure, content)
3. Generates template with placeholders
4. Uses bad examples to identify patterns to avoid

#### 11. **VeraCrossStandardReasoning** (`backend/src/services/vera/VeraCrossStandardReasoning.ts`)

Compares requirements across different standards.

**Capabilities:**
- Compares clauses between standards
- Identifies similarities and differences
- Maps requirements across standards
- Provides structured comparison output

#### 12. **VeraGapHintService** (`backend/src/services/vera/VeraGapHintService.ts`)

Provides gap analysis reasoning and hints.

**Capabilities:**
- Identifies potential gaps
- Suggests remediation priorities
- Uses examples to identify common gaps
- Provides gap analysis reasoning

#### 13. **VeraMemoryService** (`backend/src/services/vera/VeraMemoryService.ts`)

Manages persistent memory and conversation state.

**Capabilities:**
- Stores conversation context
- Retrieves relevant memories
- Manages user preferences
- Tracks conversation history

#### 14. **VeraCacheService** (`backend/src/services/vera/VeraCacheService.ts`)

Provides in-memory caching for performance.

**Cached Data:**
- Intent detection results
- Semantic context
- Regulatory queries
- Clause matches

#### 15. **VeraEngineHealthService** (`backend/src/services/vera/VeraEngineHealthService.ts`) ⭐ **NEW**

Tracks and reports internal health issues of the Vera engine.

**Capabilities:**
- Records issues from all critical systems
- Computes priority scores for triage
- Generates environment-specific remedies
- Tracks issue occurrences and severity
- Logs issues to database for history

**Key Methods:**
- `recordIssue()`: Record a new issue or update existing
- `getCurrentIssues()`: Get all active issues sorted by priority
- `clearIssue()`: Mark an issue as resolved
- `computePriority()`: Calculate priority score (0-100)
- `generateRemedies()`: Generate actionable remedy steps

**Issue Types:**
- `DB_SCHEMA_MISMATCH` (Priority: 100)
- `CONVERSATION_MEMORY_ERROR` (Priority: 90)
- `SEMANTIC_SEARCH_DISABLED` (Priority: 70)
- `CORRECTION_PROCESSOR_ERROR` (Priority: 60)
- `RESPONSE_LOOP_DETECTED` (Priority: 50)
- `CONFIG_WARNING` (Priority: 40)

#### 16. **VeraDebugLogger** (`backend/src/services/vera/VeraDebugLogger.ts`) ⭐ **NEW**

Logs Vera's internal issues to the database for historical tracking.

**Capabilities:**
- Logs new issues to `edcat.vera_debug_sessions`
- Logs severity escalations
- Retrieves recent debug history
- Non-fatal error handling

**Key Functions:**
- `logVeraIssueToDb()`: Log issue to database
- `fetchRecentDebugSessions()`: Retrieve historical issues

#### 17. **VeraSelfTestService** (`backend/src/services/vera/VeraSelfTestService.ts`) ⭐ **NEW**

Runs automated diagnostic tests to verify system health.

**Test Coverage:**
- Database connections (Customer Data + EDCAT AI)
- Schema integrity (critical tables and columns)
- pgvector extension availability
- Memory tables (writable/accessible)
- Learning tables (document count)
- Correction tables (corrections + Q&A entries)

**Key Methods:**
- `runAllTests()`: Run all diagnostic tests
- `formatTestReport()`: Format results for display

#### 18. **VeraRemedyLearningService** (`backend/src/services/vera/VeraRemedyLearningService.ts`) ⭐ **NEW**

Tracks remedy effectiveness and learns from successful fixes.

**Capabilities:**
- Records remedy applications
- Tracks resolution status
- Calculates success rates
- Provides remedy effectiveness statistics

**Database:** `edcat.vera_remedy_applications`

#### 19. **VeraMultimodalExtractor** (`backend/src/services/vera/VeraMultimodalExtractor.ts`) ⭐ **NEW**

Extracts and manages tables, images, and structured data from PDFs.

**Database:** `edcat.document_multimodal_content`

**Capabilities:**
- Extract tables, images, flowcharts, and diagrams
- Store with page numbers and section headers
- Full-text search across multimodal content
- Type-specific retrieval (tables, images, diagrams)

**Key Methods:**
- `extractAndStore()`: Extract and store multimodal content
- `getContentByDocument()`: Get all content for a document
- `searchByText()`: Full-text search across content
- `getTables()`, `getImages()`, `getDiagrams()`: Type-specific retrieval

#### 20. **VeraKnowledgeGraphNavigator** (`backend/src/services/vera/VeraKnowledgeGraphNavigator.ts`) ⭐ **NEW**

Navigates relationships between requirements, standards, and procedures.

**Database:** `edcat.requirement_relationships`

**Capabilities:**
- Find relationships between requirements
- Navigate paths between related requirements
- Identify dependencies, complements, and conflicts
- Graph traversal with path finding

**Key Methods:**
- `getRelationships()`: Get all relationships for a requirement
- `findPath()`: Find navigation path between two requirements (recursive CTE)
- `getDependents()`: Get requirements that depend on this one
- `getDependencies()`: Get requirements this one depends on
- `getConflicts()`: Get conflicting requirements
- `getComplements()`: Get complementary requirements
- `addRelationship()`: Add new relationship

**Relationship Types:**
- `depends_on`: Requirement A depends on Requirement B
- `complements`: Requirements that work together
- `conflicts`: Conflicting requirements
- `implies`: Requirement A implies Requirement B
- `references`: Requirement A references Requirement B
- `implements`: Requirement A implements Requirement B

#### 21. **VeraTerminologyService** (`backend/src/services/vera/VeraTerminologyService.js`)

Manages terminology, acronyms, and definitions lookup.

**Database:** `edcat.terms_and_definitions`

**Capabilities:**
- Look up term definitions by name or acronym
- Context-aware selection (automotive/aerospace/quality)
- Search terms by keyword
- Load from database

**Wiring:** ✅ Wired into `VeraCoreEngine` at STEP 1.25 (fast path)

#### 22. **VeraQueryResponseService** (`backend/src/services/vera/VeraQueryResponseService.js`)

Manages pre-written Q&A responses from the knowledge bank.

**Database:** `edcat.vera_query_response_bank`

**Capabilities:**
- Find best matching Q&A entry for a user question
- Pattern matching (regex/ILIKE)
- Representative examples matching
- Confidence scoring

**Wiring:** ✅ Wired into `VeraCoreEngine` at STEP 1.3 (fast path)

#### 23. **VeraLLMBridge** (`backend/src/services/vera/VeraLLMBridge.ts`) ⭐ **NEW (Phase 2)**

Provider-agnostic LLM interface for pluggable LLM integration.

**Supported Providers:**
- `local_http`: Self-hosted LLM via HTTP endpoint
- `noop`: Fallback mode (returns empty response)

**Key Functions:**
- `callVeraLLM()`: Main LLM call function
- `isLLMConfigured()`: Check if LLM is available
- Robust error handling (timeouts, HTTP errors, JSON parse failures)

#### 24. **VeraContextOrchestrator** (`backend/src/services/vera/VeraContextOrchestrator.ts`) ⭐ **NEW (Phase 3)**

Builds comprehensive RAG context from all Vera services.

**Gathers Data From:**
- Terminology service (term definitions)
- Q&A response bank (high-signal Q&A entries)
- Clause matcher + compliance requirements (relevant clauses)
- Regulatory repository (regulatory sections)
- Learning repository (examples, learning docs)
- Gap hint service (gap analysis hints)
- Conversation memory (recent context)
- Quality ontology (concepts and relationships) ⭐ **NEW (Phase 14)**

**Key Function:** `buildContext()` - Returns structured `VeraContext` object

#### 25. **VeraPromptBuilder** (`backend/src/services/vera/VeraPromptBuilder.ts`) ⭐ **NEW (Phase 4)**

Constructs system prompts with Vera persona and structured answer format.

**Features:**
- Vera persona (seasoned lead auditor, British/Scottish tone)
- Structured answer format (requirement → evidence → pitfalls → next steps)
- Context blocks from `VeraContext`
- User role-based depth adaptation

**Key Function:** `buildVeraPrompt()` - Returns system prompt and context blocks

#### 26. **VeraLearningEventService** (`backend/src/services/vera/VeraLearningEventService.ts`) ⭐ **NEW (Phase 8)**

Records learning events when Vera struggles or receives corrections.

**Database:** `edcat.ai_learning_event`

**Key Functions:**
- `recordLearningEvent()`: Record a learning event
- `getLearningEvents()`: Retrieve learning events
- `getLearningStats()`: Aggregate statistics

#### 27. **VeraKnowledgeEnrichmentService** (`backend/src/services/vera/VeraKnowledgeEnrichmentService.ts`) ⭐ **NEW (Phase 9)**

Extracts terminology, examples, and relationships from ingested documents.

**Key Function:** `enrichLearningDocument()` - Performs enrichment extraction

#### 28. **VeraSkillEngine** (`backend/src/services/vera/VeraSkillEngine.ts`) ⭐ **NEW (Phase 10)**

Executes skill modules (generate checklists, draft plans, etc.).

**Key Function:** `runVeraSkill()` - Executes a skill using RAG + LLM

#### 29. **VeraAnswerEvaluator** (`backend/src/services/vera/VeraAnswerEvaluator.ts`) ⭐ **NEW (Phase 11)**

Evaluates answer quality using an LLM.

**Key Function:** `evaluateAnswerQuality()` - Returns score, feedback, recommendations

#### 30. **VeraCapabilityProfileService** (`backend/src/services/vera/VeraCapabilityProfileService.ts`) ⭐ **NEW (Phase 12)**

Calculates capability profile and growth metrics.

**Key Functions:**
- `getCapabilitySummary()`: Overall capability summary
- `getCapabilityByStandard()`: Per-standard metrics
- `getCapabilityByIntent()`: Per-intent metrics
- `getWeakAreasByStandard()`: Top weak areas by standard
- `getWeakAreasByIntent()`: Top weak areas by intent

#### 31. **VeraAuditScenarioService** (`backend/src/services/vera/VeraAuditScenarioService.ts`) ⭐ **NEW (Phase 13)**

Generates and manages audit scenarios for training and simulation.

**Key Functions:**
- `generateAuditScenario()`: Generate new scenario
- `listSavedScenarios()`: List saved scenarios
- `getScenarioById()`: Get specific scenario

**Database:** `edcat.vera_audit_scenarios`

#### 32. **VeraQualityOntologyService** (`backend/src/services/vera/VeraQualityOntologyService.ts`) ⭐ **NEW (Phase 14)**

Provides structured access to Quality concepts and relationships.

**Key Functions:**
- `getConceptByName()`: Get concept by name
- `findRelatedConcepts()`: Find related concepts
- `searchConcepts()`: Search concepts by keyword
- `buildOntologyContext()`: Build context for LLM prompts

**Database:** `edcat.quality_concepts`, `edcat.quality_concept_relations`

#### 33. **VeraDialogueManager** (`backend/src/services/vera/VeraDialogueManager.ts`) ⭐ **NEW (Phase 15)**

Manages conversational flow and maintains goals across turns.

**Key Functions:**
- `decideNextAction()`: Decide next dialogue action
- `getDialogueState()`: Get current dialogue state
- `updateDialogueState()`: Update dialogue state
- `setGoal()`: Set conversation goal
- `clearGoal()`: Clear conversation goal

**Database:** `edcat.ai_conversation_state` (extended)

#### 34. **VeraPersonaResponseAdapter** (`backend/src/services/vera/VeraPersonaResponseAdapter.ts`) ⭐ **NEW (Phase 16)**

Wraps responses with persona-aware formatting.

**Key Function:** `adaptResponseWithPersona()` - Applies persona layer to response

**Configuration:** `backend/src/config/veraPersonaProfile.ts`

#### 35. **VeraCrossDomainMappingService** (`backend/src/services/vera/VeraCrossDomainMappingService.ts`) ⭐ **NEW (Phase 17)**

Maps requirements across different domains (aerospace, medical_device, automotive).

**Key Functions:**
- `mapRequirementAcrossDomains()`: Map requirement to target domain
- `detectDomainFromMessage()`: Detect domain from message keywords

**Database:** `edcat.cross_domain_mappings`

#### 36. **VeraTeachingFormatter** (`backend/src/services/vera/VeraTeachingFormatter.ts`) ⭐ **NEW (Phase 18)**

Formats content into layered teaching explanations.

**Key Functions:**
- `generateTeachingResponse()`: Generate teaching response
- `formatTeachingResponse()`: Format for display

#### 37. **VeraGapRulesService** (`backend/src/services/vera/VeraGapRulesService.ts`) ⭐ **NEW (Phase 19)**

Manages gap analysis rules per clause.

**Key Functions:**
- `getGapRule()`: Get gap rule for clause
- `saveGapRule()`: Save or update gap rule
- `getGapRulesForStandard()`: Get all rules for standard

**Database:** `edcat.vera_gap_rules`

#### 38. **VeraAdvancedGapEngine** (`backend/src/services/vera/VeraAdvancedGapEngine.ts`) ⭐ **NEW (Phase 19)**

Performs structured, deeply reasoned gap analysis.

**Key Function:** `performAdvancedGapAnalysis()` - Returns comprehensive gap report

#### 39. **VeraTrainingContentService** (`backend/src/services/vera/VeraTrainingContentService.ts`) ⭐ **NEW (Phase 20)**

Generates training outlines and exam questions.

**Key Functions:**
- `generateTrainingOutline()`: Generate training outline
- `generateExamQuestions()`: Generate exam questions

**Database:** `edcat.vera_training_questions`

---

## Data Flow

### Question Processing Flow

```
User Question
    ↓
VeraCoreEngine.generateVeraResponse()
    ↓
1. Specialized Intent Detection ⭐ NEW
    ├─→ detectSpecializedIntent() - High-confidence intents (90-95%)
    ├─→ Term definition, quality concepts, gap analysis, regulatory, procedure draft
    └─→ Falls back to generic detection if no match
    ↓
1.25. FAST PATH: Terminology Lookup ⭐ NEW
    ├─→ veraTerminologyService.lookupTerm()
    ├─→ Query edcat.terms_and_definitions
    └─→ RETURN IMMEDIATELY if found (confidence ≥ 0.70)
    ↓
1.3. FAST PATH: Q&A Response Bank ⭐ NEW
    ├─→ VeraQueryResponseService.findBestMatch()
    ├─→ Query edcat.vera_query_response_bank
    └─→ RETURN IMMEDIATELY if found (confidence ≥ 0.75)
    ↓
2. Context Building (buildSemanticContext) - Only if fast paths don't match
    ├─→ Query standards (public.compliance_standards)
    ├─→ Query clauses (public.compliance_requirements)
    ├─→ Semantic search learning docs (VeraSemanticMemory)
    ├─→ Get approved/bad examples (VeraLearningRepository)
    ├─→ Query regulatory standards (VeraRegulatoryRepository)
    ├─→ Get conversation context (VeraConversationContextBuilder)
    └─→ Check for corrections (VeraCorrectionProcessor)
    ↓
3. Template Selection (selectAnswerTemplate)
    ↓
4. Template Filling (fillTemplate)
    ├─→ Fill variables from context
    ├─→ Use examples for procedure generation
    └─→ Apply corrections if available
    ↓
5. Confidence Calculation (calculateConfidence)
    ↓
6. Response Generation
    ├─→ Add uncertainty messaging if needed
    ├─→ Adjust wording based on confidence
    └─→ Format final answer
    ↓
7. Conversation Recording (recordConversationTurn)
    ├─→ Save to ai_conversation_history
    ├─→ Update ai_conversation_state
    └─→ Store embeddings for future learning
    ↓
Response to User
```

### Semantic Search Flow

```
User Query
    ↓
VeraSemanticMemory.embedText()
    ↓
Generate Query Embedding
    ↓
Query edcat.knowledge_embeddings
    ├─→ Use pgvector cosine similarity (if available)
    └─→ Or JSONB-based similarity (fallback)
    ↓
Rank by Similarity Score
    ↓
Filter by Quality (approved > neutral > bad)
    ↓
Return Top K Results
```

### Learning Flow

```
Document Ingestion
    ↓
Extract Text from Document
    ↓
Store in document_content_for_learning
    ↓
Generate Embedding (VeraSemanticMemory)
    ↓
Store in knowledge_embeddings
    ↓
Available for Semantic Search
```

---

## Database Wiring and Connections

### Complete Database Architecture

Vera uses **two separate PostgreSQL databases**:

1. **Customer Data Database** (`DATABASE_URL`) - `public.*` schema
2. **EDCAT AI Database** (`EDCAT_AI_DATABASE_URL`) - `edcat.*` schema

### Database Connection Flow

```
Application Start
    ↓
backend/src/config/databases.js
    ├─→ Creates postgresPool (Customer Data DB)
    └─→ Creates edcatPool (EDCAT AI DB)
    ↓
Connection Health Checks
    ├─→ queryPostgres() → Customer Data DB
    └─→ queryEdcatAI() → EDCAT AI DB
```

### Service-to-Database Mapping

| Service | Database | Tables Used | Status |
|---------|----------|------------|--------|
| **VeraTerminologyService** | EDCAT AI | `edcat.terms_and_definitions` | ✅ **WORKING** (wired in VeraCoreEngine) |
| **VeraQueryResponseService** | EDCAT AI | `edcat.vera_query_response_bank` | ✅ **WORKING** (wired in VeraCoreEngine) |
| **VeraLearningRepository** | EDCAT AI | `edcat.document_content_for_learning`<br>`edcat.example_documents` | ✅ **WORKING** |
| **VeraRegulatoryRepository** | Customer Data | `public.regulatory_registry`<br>`public.compliance_requirements` | ✅ **WORKING** |
| **VeraMemoryService** | EDCAT AI | `edcat.vera_memory`<br>`edcat.ai_conversation_history` | ✅ **WORKING** |
| **VeraSemanticMemory** | EDCAT AI | `edcat.knowledge_embeddings`<br>`edcat.ai_conversation_history` (embedding column) | ⚠️ **PARTIAL** (pgvector fallback) |
| **VeraClauseMatcher** | Customer Data | `public.compliance_requirements` | ✅ **WORKING** |
| **VeraKnowledgeGraph** | EDCAT AI | `edcat.knowledge_relationships` | ✅ **WORKING** |
| **VeraCorrectionProcessor** | EDCAT AI | `edcat.vera_learned_corrections`<br>`edcat.vera_query_response_bank` | ✅ **WORKING** |
| **VeraIntentLearner** | EDCAT AI | `edcat.ai_conversation_history` | ✅ **WORKING** |

### Request Flow with Database Queries

```
User: "What is APQP?"
    ↓
VeraCoreEngine.generateVeraResponse()
    ↓
[STEP 1.25] Term Definition Check
    ├─→ Extract terms: ["APQP"]
    ├─→ veraTerminologyService.lookupTerm("APQP")
    │   └─→ Query: SELECT * FROM edcat.terms_and_definitions 
    │              WHERE term ILIKE 'APQP' OR acronym ILIKE 'APQP'
    │   └─→ Result: ✅ Found definition
    └─→ **RETURN IMMEDIATELY** (skips all other queries)
    
    OR (if not found)
    
[STEP 1.3] Q&A Bank Check
    ├─→ VeraQueryResponseService.findBestMatch()
    │   └─→ Query: SELECT * FROM edcat.vera_query_response_bank
    │              WHERE user_query_pattern ILIKE '%APQP%'
    │              ORDER BY confidence_score DESC
    │   └─→ Result: ✅ Found Q&A entry (confidence: 0.85)
    └─→ **RETURN IMMEDIATELY** (skips context building)
    
    OR (if not found)
    
[STEP 2] Build Semantic Context
    ├─→ Query public.standards (Customer Data DB)
    ├─→ Query public.compliance_requirements (Customer Data DB)
    ├─→ Query edcat.document_content_for_learning (EDCAT AI DB)
    ├─→ Query edcat.example_documents (EDCAT AI DB)
    ├─→ Query edcat.terms_and_definitions (EDCAT AI DB)
    └─→ Continue with template filling...
```

### What's Working ✅

1. **Terminology Lookup** ✅
   - `edcat.terms_and_definitions` table exists
   - `VeraTerminologyService` loads from database
   - Wired into `VeraCoreEngine` at STEP 1.25
   - Context-aware selection (automotive/aerospace/quality)
   - **Status**: Fully functional

2. **Q&A Response Bank** ✅
   - `edcat.vera_query_response_bank` table exists (99 entries seeded)
   - `VeraQueryResponseService.findBestMatch()` queries the bank
   - Wired into `VeraCoreEngine` at STEP 1.3
   - Pattern matching and confidence scoring
   - **Status**: Fully functional

3. **Learning Documents** ✅
   - `edcat.document_content_for_learning` table exists
   - `VeraLearningRepository` queries by standard code
   - Semantic search with fallback to keyword search
   - Enhanced error handling: Gracefully handles missing tables
   - **Status**: Fully functional with improved resilience

4. **Example Documents** ✅
   - `edcat.example_documents` table exists
   - Approved and bad examples are queryable
   - Used in procedure generation
   - **Status**: Fully functional

5. **Regulatory Standards** ✅
   - `public.regulatory_registry` table exists
   - `VeraRegulatoryRepository` queries FAA, CASA, EASA, UK CAA, FDA, DOT
   - **Status**: Fully functional

6. **Memory and Context** ✅
   - `edcat.vera_memory` table exists
   - `edcat.ai_conversation_history` table exists
   - Conversation context building works
   - **Status**: Fully functional

### What's Not Working / Needs Attention ⚠️

1. **pgvector Extension** ⚠️
   - **Issue**: `pgvector` extension may not be available on Railway
   - **Impact**: Semantic search falls back to keyword search (ILIKE)
   - **Workaround**: `VeraSemanticMemory` has fallback keyword search
   - **Status**: Functional but suboptimal (keyword search is slower/less accurate)

2. **Embedding Storage** ⚠️
   - **Issue**: `edcat.ai_conversation_history.embedding` column may not exist on Railway
   - **Impact**: Conversation history embeddings not stored
   - **Fix**: Migration `045_vera_iteration_3_7_enhancements.sql` adds the column
   - **Status**: Needs migration application on Railway

### Recent Fixes (December 2024) ✅

1. **SQL JOIN Errors** ✅ **FIXED**
   - **Issue**: `VeraKnowledgeSynthesisEngine.js` was using `s.standard_id` instead of `s.id` in JOIN clauses
   - **Error**: `column s.standard_id does not exist`
   - **Fix**: Updated JOIN clauses to use `s.id = pr.standard_id` (line 164) and `id as standard_id` (line 229)
   - **Status**: ✅ Fixed in code

2. **file_id Column Missing** ✅ **FIXED**
   - **Issue**: `edcat.document_content_for_learning` table was missing `file_id` column that code expects
   - **Error**: `column dcl.file_id does not exist`
   - **Fix**: Migration 077 adds `file_id` column and populates from `id` for existing rows
   - **Status**: ✅ Migration 077 created and added to migration runner

3. **NOT NULL Constraints** ✅ **FIXED**
   - **Issue**: `ai_conversation_history` had NOT NULL constraints on `tenant_id`, `message`, and `user_id` causing insert failures
   - **Error**: `null value in column "tenant_id" violates not-null constraint`
   - **Fix**: Migration 075 drops NOT NULL constraints on these columns
   - **Status**: ✅ Migration 075 exists and runs automatically

4. **Context Column Missing** ✅ **FIXED**
   - **Issue**: `vera_terminology` table was missing `context` column
   - **Error**: `column "context" does not exist`
   - **Fix**: Migration 076 adds `context TEXT DEFAULT NULL` to `vera_terminology`
   - **Status**: ✅ Migration 076 created and added to migration runner

**Migrations Applied:**
- Migration 075: Drop NOT NULL constraints on `ai_conversation_history` (tenant_id, message, user_id)
- Migration 076: Add `context` column to `vera_terminology` table
- Migration 077: Add `file_id` column to `document_content_for_learning` table

All migrations run automatically on server startup via `twoDatabaseMigrations.js`.

### Database Query Performance

| Query Type | Database | Performance | Notes |
|------------|----------|-------------|-------|
| Term Lookup | EDCAT AI | ⚡ **Fast** (< 10ms) | Indexed on `term` and `acronym` |
| Q&A Lookup | EDCAT AI | ⚡ **Fast** (< 20ms) | Full-text search index on `question_text` |
| Learning Docs | EDCAT AI | ⚡ **Fast** (< 50ms) | Indexed on `standard_code` |
| Semantic Search | EDCAT AI | 🐢 **Slow** (100-500ms) | Falls back to keyword search if pgvector unavailable |
| Standards Query | Customer Data | ⚡ **Fast** (< 30ms) | Indexed on `code` |
| Requirements Query | Customer Data | ⚡ **Fast** (< 50ms) | Indexed on `standard_code` and `clause_reference` |

---

## Database Schema

### Customer Data Database (`public.*`)

**Key Tables:**
- `compliance_standards`: Standards (AS9100D, ISO 9001, etc.)
- `compliance_requirements`: Requirements with clause references
- `customer_documents`: Customer-uploaded documents
- `gap_analyses`: Gap analysis results

### EDCAT AI Database (`edcat.*`)

**Key Tables:**
- `document_content_for_learning`: Extracted text from ingested documents
- `example_documents`: Approved and bad example documents
- `knowledge_embeddings`: Embeddings for semantic search
- `ai_conversation_history`: Conversation history with embeddings
- `ai_conversation_state`: Current conversation state
- `ai_learning_event`: Learning events (corrections, feedback)
- `vera_query_response_bank`: Learned Q&A pairs
- `knowledge_relationships`: Relationships between standards/clauses
- `ai_information_request`: Requests for missing information

---

## Recent Enhancements (12-Hour Upgrade)

### ✅ Iteration 1: Semantic Search Integration
- Enhanced semantic search with embeddings
- Automatic embedding creation during ingestion
- Prioritizes approved examples

### ✅ Iteration 2: Enhanced Clause Matching
- Created `VeraRegulatoryRepository` for regulatory standards
- Supports FAA-style clauses (e.g., "21.137(n)")
- Improved normalization for AS/ISO style clauses

### ✅ Iteration 6: Confidence Scoring
- Enhanced confidence calculation with semantic similarity
- Added uncertainty messaging based on confidence levels
- Adjusted answer wording based on confidence

### ✅ Iteration 11: Regulatory Pack Integration
- Full support for FAA, CASA, EASA, UK CAA, FDA, DOT
- Regulatory clauses are queryable and referenced in answers

### ⭐ **NEW: Terminology and Q&A Fast Path (December 2024)**

**Problem Solved:** Vera had data in databases but couldn't access it efficiently.

**Solution:**
1. **Wired `VeraTerminologyService`** into `VeraCoreEngine` at STEP 1.25
   - Fast lookup of term definitions before expensive context building
   - Context-aware selection (automotive/aerospace/quality)
   - Returns immediately if term found (confidence ≥ 0.70)
   - Enhanced logging: `[VeraCoreEngine] FAST PATH 1.25: Checking terminology...`

2. **Wired `VeraQueryResponseService`** into `VeraCoreEngine` at STEP 1.3
   - Fast lookup of pre-written Q&A responses
   - Pattern matching and confidence scoring
   - Returns immediately if high-confidence match found (confidence ≥ 0.75)
   - Enhanced logging: `[VeraCoreEngine] FAST PATH 1.3: Checking Q&A response bank...`

3. **Added Specialized Intent Detection** (STEP 1 - runs before generic classification)
   - **Term Definition Intent** (95% confidence): "what is X", "define X", "explain X"
   - **Quality Concept Intent** (92% confidence): Detects quality/APQP/IATF/GMP/CAPA/FMEA/PPAP/SPC/DOE/RCA
   - **Gap Analysis Intent** (90% confidence): "find gaps", "identify missing", "show gaps"
   - **Regulatory Intent** (93% confidence): Detects FAA/CASA/EASA/UK CAA/FDA/DOT references
   - **Procedure Draft Intent** (90% confidence): "draft procedure", "create template", "generate procedure"
   - Falls back to generic intent classification if no specialized intent matches

4. **Added Formatting Methods**
   - `formatTermDefinition()`: Formats terminology definitions with acronyms, examples, and related standards
   - `formatQnAResponse()`: Formats Q&A responses with context and related topics

5. **Enhanced Error Handling**
   - `VeraLearningRepository.semanticSearchLearningDocs()`: Falls back to keyword search if table doesn't exist
   - Graceful degradation: Returns empty results instead of crashing
   - Comprehensive logging for debugging

**Impact:**
- **Before**: "What is APQP?" → Generic fallback response
- **After**: "What is APQP?" → Immediate definition from `edcat.terms_and_definitions` or Q&A from `edcat.vera_query_response_bank`

**Performance:**
- Term lookup: < 10ms (fast path)
- Q&A lookup: < 20ms (fast path)
- Specialized intent detection: < 5ms (runs before everything)
- Context building: 100-500ms (only if fast paths don't match)

**Request Flow:**
```
User: "What is APQP?"
    ↓
[STEP 1] Specialized Intent Detection
    └─→ Detects "TERM_DEFINITION" intent (95% confidence)
    ↓
[STEP 1.25] FAST PATH: Terminology Lookup
    └─→ Query edcat.terms_and_definitions
    └─→ Found: APQP definition
    └─→ RETURN IMMEDIATELY (< 50ms total)
    
    OR (if not found)
    
[STEP 1.3] FAST PATH: Q&A Bank Lookup
    └─→ Query edcat.vera_query_response_bank
    └─→ Found: APQP Q&A entry
    └─→ RETURN IMMEDIATELY (< 50ms total)
    
    OR (if not found)
    
[STEP 2] Build Semantic Context (expensive)
    └─→ Only runs if fast paths don't match
```

---

## Configuration

### Environment Variables

```bash
# Database Connections
DATABASE_URL=postgresql://...          # Customer Data DB
EDCAT_AI_DATABASE_URL=postgresql://... # EDCAT AI DB

# Embedding Configuration (Optional)
EMBEDDING_PROVIDER=tfidf               # tfidf, ollama, mistral, openai
EMBEDDING_MODEL=tfidf-local            # Model name
EMBEDDING_DIMENSION=1536               # Embedding dimension

# Debug Mode (Optional)
VERA_DEBUG_MODE=false                  # Enable debug logging
```

### Ingestion

To make documents available to Vera:

```bash
# Run comprehensive ingestion
npm run ingest:requirements

# This processes:
# - Standards/ folder → Standards
# - Regulatory/ folder → Regulatory standards
# - Examples/ folder → Approved/bad examples
# - Customer/ folder → Customer documents
```

---

## Limitations and Future Enhancements

### Current Limitations

1. **No External Knowledge**: Vera only uses ingested documents
2. **No Internet Access**: Cannot search the web for information
3. **No Real-Time Updates**: Requires ingestion to learn new information
4. **Basic Pattern Extraction**: Template generation is basic (enhancement planned)

### Planned Enhancements

1. **Pronoun Resolution**: Better multi-turn conversation handling
2. **Knowledge Graph Seeding**: Populate standard relationships
3. **Enhanced Template Generation**: Better pattern extraction from examples
4. **Personality Refinement**: More feminine, professional, British/Scottish voice
5. **Correction Checking**: Check corrections before answering

---

## Testing Vera

### Test Queries

**Clause Questions:**
- "What does clause 8.7 require?"
- "Explain FAA Part 21.137(n)"
- "What is required in ISO 9001 clause 4.2.3?"

**Standard Questions:**
- "Tell me about AS9100D"
- "What is ISO 13485?"
- "Compare AS9100D and ISO 9001"

**Gap Analysis:**
- "Analyze gaps for AS9100D"
- "What gaps exist in our procedures?"

**Procedure Generation:**
- "Draft a procedure for clause 8.7"
- "Create a template for document control"

**Regulatory:**
- "What does FAA Part 21.137 require?"
- "Explain CASA CASR Part 145"

### Debug Commands

Vera supports debug commands via the 0331 console:

- `debug: learning standard <CODE>` - Show learning docs for a standard
- `debug: examples <CODE>` - Show examples for a standard
- `debug: confidence <query>` - Show confidence calculation
- `debug: context <query>` - Show semantic context

---

## Summary

Vera is a sophisticated, world-class AI compliance specialist that:

1. **Answers Questions**: About standards, regulations, clauses, and requirements (with LLM-powered RAG)
2. **Analyzes Gaps**: Advanced gap analysis with structured rules and reasoning flow
3. **Generates Procedures**: Creates procedure templates from approved examples
4. **Compares Standards**: Cross-standard and cross-domain comparison and mapping
5. **Learns Continuously**: Active learning loop from failures, corrections, and self-evaluation
6. **Communicates Confidence**: Knows when she's certain and when she's uncertain
7. **Remembers Context**: Maintains conversation state, goals, and learns from history
8. **Teaches Concepts**: Layered explanations from basic to advanced with examples and audit lens
9. **Generates Training Content**: Training outlines and exam questions with metadata
10. **Simulates Audits**: Generates and walks through realistic audit scenarios
11. **Guides Conversations**: Dialogue manager maintains goals and suggests next steps
12. **Has Personality**: British/Scottish flavour, context-aware humour, professional warmth
13. **Maps Across Domains**: Seamlessly operates across aerospace, medical device, automotive
14. **Tracks Capabilities**: Capability profile showing strengths, weaknesses, and growth areas
15. **Self-Evaluates**: Critiques her own answers and identifies weaknesses

**Architecture Evolution:**
- **Phases 1-7**: LLM integration with RAG pipeline (pluggable, graceful fallback)
- **Phases 8-12**: Learning, skills, self-evaluation, capability tracking
- **Phases 13-20**: World-class quality brain (scenarios, ontology, dialogue, personality, cross-domain, teaching, gap analysis, training)

All of this is achieved with **optional LLM support** (pluggable via `VeraLLMBridge`), using your compliance data, Vera's internal reasoning engine, and comprehensive RAG context building.

---

## Complete Code Component List

This section lists **every code file and component** that Vera needs to function as an independent AI LLM. All components are self-contained and do not require external AI providers.

### Core Engine Components

**Primary Engine:**
- `backend/src/services/vera/VeraCoreEngine.ts` - Main reasoning orchestrator (THE BRAIN)
- `backend/src/services/vera/VeraCoreEngine.js` - Compiled JavaScript
- `backend/src/services/vera/VeraCoreEngine.d.ts` - TypeScript definitions

**Legacy Engines (Deprecated but still present):**
- `backend/src/vera/veraEngine.ts` - Legacy engine (deprecated, guarded)
- `backend/src/vera/veraChatEngine.ts` - Legacy chat engine (deprecated)
- `backend/src/services/veraConversationalEngine.js` - Legacy conversational engine (fallback only)

### Core Services (Vera Intelligence Layer)

**Learning & Knowledge:**
- `backend/src/services/vera/VeraLearningRepository.ts` - Learning document access and semantic search
- `backend/src/services/vera/VeraSemanticMemory.js` - Embedding generation and semantic search
- `backend/src/services/vera/VeraKnowledgeGraph.ts` - Knowledge graph and relationships
- `backend/src/services/vera/VeraKnowledgeGapService.ts` - Knowledge gap detection and requests
- `backend/src/services/vera/VeraKnowledgeRetrievalService.js` - Knowledge retrieval from Q&A bank
- `backend/src/services/vera/VeraKnowledgeAggregatorService.js` - Aggregates knowledge from multiple sources

**Intent & Routing:**
- `backend/src/services/vera/VeraIntentLearner.ts` - Learns intent patterns from history
- `backend/src/services/vera/VeraIntentService.js` - Intent classification service
- `backend/src/services/vera/VeraIntentClassifier.js` - Intent classification logic
- `backend/src/services/vera/VeraIntentHandlers.js` - Intent-specific handlers
- `backend/src/vera/intentClassifier.ts` - Core intent classification

**Clause & Standard Matching:**
- `backend/src/services/vera/VeraClauseMatcher.ts` - Clause reference normalization and matching
- `backend/src/services/vera/VeraClauseLookupService.js` - Clause lookup service
- `backend/src/services/vera/VeraRegulatoryRepository.ts` - Regulatory standards repository
- `backend/src/services/vera/VeraRegulatoryReasoningService.js` - Regulatory reasoning
- `backend/src/services/vera/VeraRegulatoryLookup.js` - Regulatory lookup utilities

**Memory & Context:**
- `backend/src/services/vera/VeraMemoryService.ts` - Persistent memory management
- `backend/src/services/vera/VeraConversationContextBuilder.ts` - Conversation context building
- `backend/src/services/vera/VeraConversationMemoryService.js` - Conversation memory service
- `backend/src/services/vera/VeraContextManager.js` - Context management
- `backend/src/services/vera/VeraMemoryManager.js` - Memory management utilities

**Learning & Correction:**
- `backend/src/services/vera/VeraCorrectionProcessor.ts` - Processes user corrections
- `backend/src/services/vera/VeraLearningIngestionService.js` - Learning ingestion pipeline
- `backend/src/services/vera/VeraLearningEngine.js` - Learning engine

**Template & Response Generation:**
- `backend/src/services/vera/VeraTemplateGenerator.ts` - Procedure template generation
- `backend/src/services/vera/VeraResponseGenerator.js` - Response generation
- `backend/src/services/vera/VeraAnswerPlanner.js` - Answer planning
- `backend/src/services/vera/VeraProfessionalResponseBuilder.js` - Professional response building
- `backend/src/services/vera/VeraProfessionalFormatter.js` - Response formatting
- `backend/src/services/vera/VeraProfessionalLanguage.js` - Professional language utilities

**Gap Analysis & Compliance:**
- `backend/src/services/vera/VeraGapHintService.ts` - Gap analysis hints and reasoning
- `backend/src/services/vera/VeraGapAnalysisService.js` - Gap analysis service
- `backend/src/services/vera/VeraReasoningComplianceAnalyzer.js` - Compliance reasoning

**Cross-Standard & Comparison:**
- `backend/src/services/vera/VeraCrossStandardReasoning.ts` - Cross-standard comparison
- `backend/src/services/vera/VeraMultiStandardComparison.js` - Multi-standard comparison

**Caching & Performance:**
- `backend/src/services/vera/VeraCacheService.ts` - In-memory caching service

**Quality & Reasoning:**
- `backend/src/services/vera/VeraQualityReasoningService.js` - Quality engineering reasoning
- `backend/src/services/vera/VeraReasoningEngine.js` - General reasoning engine
- `backend/src/services/vera/VeraAdvancedReasoningEngine.js` - Advanced reasoning
- `backend/src/services/vera/VeraDeductiveReasoningEngine.js` - Deductive reasoning
- `backend/src/services/vera/VeraGenericTechnicalReasoningService.js` - Technical reasoning

**Loop Avoidance & Conversation:**
- `backend/src/services/vera/VeraLoopAvoidanceService.js` - Prevents repetitive responses
- `backend/src/services/vera/VeraGreetingService.js` - Greeting handling
- `backend/src/services/vera/VeraQueryResponseService.js` - Q&A response service

**User & Profile:**
- `backend/src/services/vera/VeraUserProfileService.js` - User profile management

**Document Processing:**
- `backend/src/services/vera/VeraRequirementsFolderScanner.js` - Scans requirements folder
- `backend/src/services/vera/VeraDocumentAssessmentService.js` - Document assessment
- `backend/src/services/vera/VeraDocumentNumberingResponse.js` - Document numbering
- `backend/src/services/vera/VeraAutoIndexingService.js` - Auto-indexing service
- `backend/src/services/vera/VeraUploadOrchestratorService.js` - Upload orchestration
- `backend/src/services/vera/VeraParserSupervisorService.js` - Parser supervision

**Standards & Intelligence:**
- `backend/src/services/vera/VeraStandardsListingService.js` - Standards listing
- `backend/src/services/vera/StandardsIntelligenceService.js` - Standards intelligence
- `backend/src/services/vera/VeraProcedureTemplateService.js` - Procedure templates
- `backend/src/services/vera/VeraPredictiveAuditEngine.js` - Predictive audit engine

**Utilities & Helpers:**
- `backend/src/services/vera/VeraQueryParser.js` - Query parsing
- `backend/src/services/vera/VeraTerminologyService.js` - Terminology service
- `backend/src/services/vera/VeraIndustryTerminology.js` - Industry terminology
- `backend/src/services/vera/VeraSkillOrchestrator.js` - Skill orchestration
- `backend/src/services/vera/VeraClarificationEngine.js` - Clarification engine
- `backend/src/services/vera/VeraComprehensiveResearcher.js` - Comprehensive research
- `backend/src/services/vera/VeraVectorEngine.js` - Vector operations
- `backend/src/services/vera/VeraRepository.js` - General repository
- `backend/src/services/vera/VeraPersonaSpecificationService.js` - Persona specification

**External LLM Guard:**
- `backend/src/services/vera/ExternalLLMGuard.ts` - Prevents external LLM calls
- `backend/src/services/vera/ExternalLLMGuard.js` - Compiled JavaScript

**Debug & Diagnostics:**
- `backend/src/services/vera/VeraDebugService.js` - Debug service and commands
- `backend/src/services/vera/VeraDatabaseHealthService.ts` - Database health monitoring

**Legacy Services (Deprecated):**
- `backend/src/services/vera/veraModelService.js` - Legacy model service (deprecated)
- `backend/src/services/vera/veraCronJobs.js` - Cron jobs (if any)

### Route Handlers

**Primary Routes:**
- `backend/src/routes/chat.js` - Main chat route (routes to VeraCoreEngine)
- `backend/src/routes/veraChatRoute.ts` - Dedicated Vera chat route
- `backend/src/routes/veraAdmin.routes.ts` - Admin routes for Vera
- `backend/src/routes/veraDiagnostics.routes.ts` - Diagnostics routes
- `backend/src/routes/veraHealth.ts` - ⭐ **NEW** Health API endpoint (`GET /api/vera/health`)

**Supporting Routes:**
- `backend/src/routes/vera-requirements-scanner.js` - Requirements scanner route
- `backend/src/routes/parse.js` - Parser routes (used by Vera)
- `backend/src/routes/learning.js` - Learning routes

### Middleware

**Conversation Middleware:**
- `backend/src/middleware/veraConversationMiddleware.js` - Conversation state management
- `backend/src/middleware/veraMiddleware.js` - General Vera middleware

### Core Utilities (Vera Foundation)

**Intent & Classification:**
- `backend/src/vera/intentClassifier.ts` - Core intent classification
- `backend/src/vera/systemPrompt.ts` - System prompt generation
- `backend/src/vera/toolRouter.ts` - Tool routing
- `backend/src/vera/semanticFetcher.ts` - Semantic data fetching
- `backend/src/vera/finalComposer.ts` - Final response composition

**Legacy Utilities:**
- `backend/src/vera/llmProvider.js` - Legacy LLM provider (deprecated, guarded)
- `backend/src/vera/veraChatEngineWrapper.js` - Chat engine wrapper

### Supporting Services

**Conversation Context:**
- `backend/src/services/VeraConversationContextService.js` - Conversation context service
- `backend/src/services/VeraSelfAwarenessService.js` - Self-awareness service

**Personality:**
- `backend/src/services/edcatPersonality.js` - Personality definition

### Configuration

**Config Files:**
- `backend/src/config/veraConfig.js` - Vera configuration (debug pins, etc.)
- `backend/src/config/databases.js` - Database connection configuration (CRITICAL)

### Database Access Layer

**Database Helpers:**
- `backend/src/config/databases.js` - `queryPostgres()` and `queryEdcatAI()` functions
- These are the ONLY database access points Vera uses

### Ingestion Scripts

**Document Ingestion:**
- `backend/src/scripts/ingest-requirements-comprehensive.js` - Comprehensive requirements ingestion
- `backend/src/scripts/seed-regulatory-standards.js` - Regulatory standards seeding
- `backend/src/scripts/process-requirements-folder.js` - Requirements folder processing

### Test Files

**Unit Tests:**
- `backend/src/tests/vera/routing.test.js` - Routing tests
- `backend/src/tests/veraCoreEngine.test.ts` - Core engine tests
- `backend/src/tests/veraChatEngine.test.ts` - Chat engine tests

### Dependency Summary

**Critical Dependencies (Must Exist):**
1. `backend/src/config/databases.js` - Database connections
2. `backend/src/services/vera/VeraCoreEngine.ts` - Main engine
3. `backend/src/services/vera/VeraSemanticMemory.js` - Semantic search
4. `backend/src/services/vera/VeraLearningRepository.ts` - Learning access
5. `backend/src/services/vera/VeraClauseMatcher.ts` - Clause matching
6. `backend/src/services/vera/VeraRegulatoryRepository.ts` - Regulatory access

**Supporting Dependencies:**
- All other services listed above
- Route handlers
- Middleware
- Utilities

**External Dependencies (Node.js packages):**
- `pg` - PostgreSQL client
- `uuid` - UUID generation
- `express` - Web framework
- `node-fetch` - HTTP requests (for embeddings if using external provider)

**NO External AI Dependencies:**
- ❌ No `openai` package
- ❌ No `anthropic` package
- ❌ No external LLM API calls
- ✅ All reasoning is internal

### File Count Summary

- **Core Engine:** 1 file (VeraCoreEngine.ts)
- **Core Services:** ~60+ service files
- **Routes:** 6 route files
- **Middleware:** 2 middleware files
- **Utilities:** 5 utility files
- **Configuration:** 2 config files
- **Scripts:** 3+ ingestion scripts
- **Tests:** 3+ test files

**Total:** ~85+ code files/components required for Vera to function as an independent AI LLM

---

## Complete Capabilities Summary

### Core Capabilities

1. ✅ **Compliance Question Answering** - Standards, regulations, clauses, requirements
2. ✅ **Gap Analysis** - Identify and classify compliance gaps
3. ✅ **Procedure Drafting** - Generate templates from approved examples
4. ✅ **Cross-Standard Comparison** - Compare requirements across standards
5. ✅ **Regulatory Lookup** - FAA, CASA, EASA, UK CAA, FDA, DOT
6. ✅ **Learning from Examples** - Approved and bad examples
7. ✅ **Conversation Context** - Multi-turn conversations with memory
8. ✅ **Confidence Communication** - Knows when certain/uncertain
9. ✅ **Intent Detection** - 15+ specialized intents
10. ✅ **Knowledge Gap Detection** - Requests missing information
11. ✅ **Self-Diagnostic** ⭐ **NEW** - Reports internal issues
12. ✅ **Remedy Learning** ⭐ **NEW** - Learns from successful fixes
13. ✅ **Multimodal Content Extraction** ⭐ **NEW** - Tables, images, diagrams from PDFs
14. ✅ **Knowledge Graph Navigation** ⭐ **NEW** - Navigate requirement relationships
15. ✅ **Role-Based Adaptive Responses** ⭐ **NEW** - Adapts to user role (admin, auditor, engineer, manager)
16. ✅ **LLM Integration & RAG** ⭐ **NEW (Phases 1-7)** - Pluggable LLM with Retrieval-Augmented Generation
17. ✅ **Active Learning Loop** ⭐ **NEW (Phase 8)** - Records learning events from failures and corrections
18. ✅ **Automated Knowledge Enrichment** ⭐ **NEW (Phase 9)** - Extracts terminology, examples, relationships
19. ✅ **Skill Modules** ⭐ **NEW (Phase 10)** - Generates checklists, drafts plans, summarizes gaps
20. ✅ **Answer Self-Evaluation** ⭐ **NEW (Phase 11)** - Vera critiques her own answers
21. ✅ **Capability Profile & Dashboard** ⭐ **NEW (Phase 12)** - Tracks strengths, weaknesses, growth
22. ✅ **Audit Playbooks & Scenario Simulation** ⭐ **NEW (Phase 13)** - Generates and walks through audit scenarios
23. ✅ **Quality Ontology & Taxonomy** ⭐ **NEW (Phase 14)** - Structured mental map of Quality concepts
24. ✅ **Advanced Dialogue Manager** ⭐ **NEW (Phase 15)** - Maintains goals, guides conversations
25. ✅ **Personality & Tone Layer** ⭐ **NEW (Phase 16)** - British/Scottish flavour, context-aware humour
26. ✅ **Multi-Domain Standards Integration** ⭐ **NEW (Phase 17)** - Cross-domain mapping (aerospace, medical, automotive)
27. ✅ **Deep Explanation Mode** ⭐ **NEW (Phase 18)** - Layered teaching (basic → examples → audit lens → implementation)
28. ✅ **Advanced Gap Analysis Engine** ⭐ **NEW (Phase 19)** - Structured gap rules, reasoning flow, plain-language explanations
29. ✅ **Training & Exam Content Generator** ⭐ **NEW (Phase 20)** - Generates training outlines and exam questions
16. ✅ **LLM Integration & RAG Pipeline** ⭐ **NEW (Phases 1-7)** - Pluggable LLM bridge with Retrieval-Augmented Generation
17. ✅ **Active Learning Loop** ⭐ **NEW (Phase 8)** - Records learning events from failures and corrections
18. ✅ **Automated Knowledge Enrichment** ⭐ **NEW (Phase 9)** - Extracts terminology, examples, and relationships from documents
19. ✅ **Skill Modules** ⭐ **NEW (Phase 10)** - Generates checklists, drafts plans, summarizes gaps
20. ✅ **Answer Self-Evaluation** ⭐ **NEW (Phase 11)** - Vera critiques her own answers and identifies weaknesses
21. ✅ **Capability Profile & Dashboard** ⭐ **NEW (Phase 12)** - Tracks strengths, weaknesses, and growth areas
22. ✅ **Audit Playbooks & Scenario Simulation** ⭐ **NEW (Phase 13)** - Generates and walks through realistic audit scenarios
23. ✅ **Quality Ontology & Taxonomy** ⭐ **NEW (Phase 14)** - Structured mental map of Quality concepts, tools, processes
24. ✅ **Advanced Dialogue Manager** ⭐ **NEW (Phase 15)** - Maintains goals, guides conversations, suggests next steps
25. ✅ **Personality & Tone Layer** ⭐ **NEW (Phase 16)** - British/Scottish flavour, context-aware humour, professional warmth
26. ✅ **Multi-Domain Standards Integration** ⭐ **NEW (Phase 17)** - Cross-domain mapping (aerospace, medical, automotive)
27. ✅ **Deep Explanation Mode** ⭐ **NEW (Phase 18)** - Layered teaching (basic → examples → audit lens → implementation)
28. ✅ **Advanced Gap Analysis Engine** ⭐ **NEW (Phase 19)** - Structured gap rules, reasoning flow, plain-language explanations
29. ✅ **Training & Exam Content Generator** ⭐ **NEW (Phase 20)** - Generates training outlines and exam questions

### Performance Metrics

| Operation | Performance | Notes |
|-----------|-------------|-------|
| Term Lookup | ⚡ < 10ms | Fast path (STEP 1.25) |
| Q&A Lookup | ⚡ < 20ms | Fast path (STEP 1.3) |
| Specialized Intent Detection | ⚡ < 5ms | Runs before everything |
| Context Building | 🐢 100-500ms | Only if fast paths don't match |
| Self-Tests | 🐢 ~500ms | 6 diagnostic tests |
| Health Endpoint | ⚡ < 50ms | JSON response |

### Database Tables Summary

**Customer Data DB (public.*):** 5 core tables
**EDCAT AI DB (edcat.*):** 20+ tables for intelligence, learning, and diagnostics

**Total:** 25+ database tables supporting Vera's capabilities

### Complete Database Schematic

#### Customer Data Database (`DATABASE_URL` - `public.*` schema)

| Table | Purpose | Key Columns | Used By |
|-------|---------|-------------|---------|
| `standards` | Standards metadata | `id`, `code`, `name`, `title`, `revision`, `sector` | VeraCoreEngine, routes/requirements.js |
| `compliance_requirements` | Clause requirements | `id`, `standard_id`, `clause_reference`, `requirement_text` | VeraCoreEngine, VeraClauseMatcher |
| `compliance_standards` | Alternative standards table | `id`, `code`, `name`, `authority_source` | VeraCoreEngine (legacy) |
| `customer_documents` | Customer documents | `id`, `document_name`, `document_type`, `content_text` | VeraCoreEngine |
| `customer_procedures` | Extracted procedures | `id`, `procedure_text`, `standard_code` | VeraCoreEngine |
| `gap_analyses` | Gap analysis results | `id`, `standard_code`, `status`, `result_json` | VeraCoreEngine |
| `regulatory_registry` | Regulatory standards | `id`, `standard_code`, `authority`, `section_text` | VeraRegulatoryRepository |
| `parsed_requirements` | Parsed clause requirements | `id`, `standard_id`, `clause_ref`, `requirement_text` | VeraCoreEngine |
| `standard_files` | Standard file metadata | `id`, `file_name`, `standard_id`, `file_path` | routes/upload.js |
| `tenants` | Client organizations | `id`, `key`, `name` | routes/users.js |
| `users` | Team members | `id`, `email`, `role`, `tenant_id` | VeraCoreEngine (role-based responses) |

#### EDCAT AI Database (`EDCAT_AI_DATABASE_URL` - `edcat.*` schema)

| Table | Purpose | Key Columns | Used By |
|-------|---------|-------------|---------|
| `terms_and_definitions` | Terminology and acronyms | `id`, `term`, `acronym`, `definition`, `category`, `industry` | VeraTerminologyService |
| `document_content_for_learning` | Ingested document content | `id`, `file_id` ⭐ **NEW (Migration 077)**, `standard_code`, `content_text`, `quality` | VeraLearningRepository |
| `example_documents` | Approved/bad examples | `id`, `file_id`, `standard_code`, `quality_score` | VeraLearningRepository |
| `vera_query_response_bank` | Pre-written Q&A responses | `id`, `user_query_pattern`, `response_text`, `confidence_score` | VeraQueryResponseService |
| `ai_conversation_history` | Conversation messages | `id`, `session_id`, `role`, `message`, `message_text`, `user_id`, `tenant_id`, `embedding` ⭐ **UPDATED (Migrations 071, 075)** | VeraMemoryService |
| `ai_conversation_state` | Current conversation state | `session_id`, `last_intent`, `last_topic`, `context` | VeraCoreEngine |
| `conversation_memory` | Conversation memory with embeddings | `id`, `session_id`, `message_text`, `role`, `embedding` | VeraMemoryService |
| `vera_memory` | Persistent memory | `id`, `tenant_id`, `category`, `content`, `standard_code` | VeraMemoryService |
| `vera_response_templates` | Answer templates | `id`, `template_code`, `content`, `active` | VeraCoreEngine |
| `ai_router` | Intent routing rules | `id`, `rules`, `active` | VeraCoreEngine |
| `ai_template` | Legacy templates | `id`, `name`, `kind`, `template` | VeraCoreEngine (fallback) |
| `ai_policy` | Policy configurations | `id`, `name`, `config` | VeraCoreEngine |
| `ai_prompt` | System prompts | `id`, `name`, `content` | VeraCoreEngine |
| `vera_learned_corrections` | User corrections | `id`, `original_question`, `corrected_answer`, `confidence` | VeraCorrectionProcessor |
| `vera_debug_sessions` | Debug session logs | `id`, `session_id`, `issue_code`, `severity`, `details` | VeraDebugLogger |
| `knowledge_embeddings` | Semantic search embeddings | `id`, `content_text`, `embedding`, `standard_code` | VeraSemanticMemory |
| `knowledge_relationships` | Standard/clause relationships | `id`, `source_code`, `target_code`, `relationship_type` | VeraKnowledgeGraph |
| `requirement_relationships` | Requirement relationships | `id`, `source_requirement_id`, `target_requirement_id`, `relationship_type` | VeraKnowledgeGraphNavigator |
| `document_multimodal_content` | Tables, images, diagrams | `id`, `document_id`, `content_type`, `content_json`, `page_number` | VeraMultimodalExtractor |
| `vera_remedy_applications` | Remedy tracking | `id`, `issue_code`, `remedy_action`, `resolution_status` | VeraRemedyLearningService |
| `vera_knowledge_graph_concepts` | Knowledge graph concepts | `id`, `concept_name`, `description` | VeraKnowledgeGraph |
| `vera_standard_profiles` | Standard profiles | `id`, `standard_code`, `profile_data` | VeraKnowledgeGraph |
| `vera_clarification_rules` | Clarification rules | `id`, `rule_pattern`, `clarification_question` | VeraInteractiveClarificationEngine |
| `ai_learning_event` | Learning events | `id`, `user_question`, `intent`, `confidence_score`, `failure_type`, `metadata` | VeraLearningEventService ⭐ **NEW (Phase 8)** |
| `vera_audit_scenarios` | Audit scenarios | `id`, `title`, `standard_code`, `clauses`, `scenario_json`, `difficulty` | VeraAuditScenarioService ⭐ **NEW (Phase 13)** |
| `quality_concepts` | Quality concepts | `id`, `name`, `category`, `description`, `aliases`, `domain_tags` | VeraQualityOntologyService ⭐ **NEW (Phase 14)** |
| `quality_concept_relations` | Concept relationships | `id`, `source_concept_id`, `target_concept_id`, `relation_type` | VeraQualityOntologyService ⭐ **NEW (Phase 14)** |
| `cross_domain_mappings` | Cross-domain mappings | `id`, `source_standard_code`, `target_standard_code`, `similarity_score` | VeraCrossDomainMappingService ⭐ **NEW (Phase 17)** |
| `vera_gap_rules` | Gap analysis rules | `id`, `standard_code`, `clause_ref`, `rule_json`, `severity` | VeraGapRulesService ⭐ **NEW (Phase 19)** |
| `vera_training_questions` | Training questions | `id`, `question_stem`, `options`, `correct_answer`, `difficulty`, `standard_code` | VeraTrainingContentService ⭐ **NEW (Phase 20)** |

**Total Tables:**
- **Customer Data DB**: 11 tables (with family and domain_tags added in Phase 17)
- **EDCAT AI DB**: 30+ tables
- **Grand Total**: 41+ database tables supporting Vera's capabilities

---

**For more information:**
- See `VERA_12_HOUR_UPGRADE_SUMMARY.md` for recent enhancements
- See `VERA_DATABASE_ARCHITECTURE.md` for database details
- See `VERA_SELF_CONTAINED_ARCHITECTURE.md` for architecture details
- See `VERA_DIAGNOSTIC_VALIDATION_REPORT.md` for diagnostic system validation
- See `VERA_TODO_GAPS_FILLED.md` for recent gap fixes
- See `VERA_LLM_INTEGRATION_TODO.md` for complete phase tracking (Phases 1-20)

---

## Phase Implementation Summary (Phases 13-20)

### Phase 13: Audit Playbooks & Scenario Simulation ✅
- **Service**: `VeraAuditScenarioService.ts`
- **Database**: `edcat.vera_audit_scenarios`
- **Migration**: `062_create_vera_audit_scenarios.sql`
- **Routes**: `/api/vera/audit-scenarios`
- **Capability**: Generates complete audit scenarios with steps, evidence, questions, pitfalls

### Phase 14: Domain Ontology & Quality Taxonomy ✅
- **Service**: `VeraQualityOntologyService.ts`
- **Database**: `edcat.quality_concepts`, `edcat.quality_concept_relations`
- **Migration**: `063_create_quality_ontology.sql`
- **Seed Script**: `backend/src/scripts/seed-quality-ontology.ts`
- **Capability**: Structured mental map of Quality concepts, tools, processes, relationships

### Phase 15: Advanced Dialogue Manager & Conversational Flow ✅
- **Service**: `VeraDialogueManager.ts`
- **Database**: `edcat.ai_conversation_state` (extended)
- **Migration**: `064_extend_conversation_state.sql`
- **Capability**: Maintains goals, detects exploratory vs executing, suggests next steps, configurable guidance

### Phase 16: Personality, Tone & "Fun" Interaction Layer ✅
- **Service**: `VeraPersonaResponseAdapter.ts`
- **Configuration**: `backend/src/config/veraPersonaProfile.ts`
- **Capability**: British/Scottish flavour, context-aware humour, reassurance, encouragement, gentle challenges

### Phase 17: Multi-Domain Standards Pack Integration ✅
- **Service**: `VeraCrossDomainMappingService.ts`
- **Database**: `edcat.cross_domain_mappings`, `public.standards` (with family and domain_tags)
- **Migrations**: `065_add_standard_families.sql`, `066_create_cross_domain_mappings.sql`
- **Capability**: Cross-domain requirement mapping, intelligent domain recognition, structured comparisons

### Phase 18: Deep Explanation Mode ("Teach Me Like I'm New") ✅
- **Service**: `VeraTeachingFormatter.ts`
- **Capability**: Four-layer teaching (Plain → Examples → Audit Lens → Implementation Tips), persistent teaching mode

### Phase 19: Advanced Gap Analysis Engine Upgrade ✅
- **Services**: `VeraGapRulesService.ts`, `VeraAdvancedGapEngine.ts`
- **Database**: `edcat.vera_gap_rules`
- **Migration**: `067_create_vera_gap_rules.sql`
- **Capability**: Structured gap rules, LLM-based analysis, coverage ratings, plain-language explanations

### Phase 20: Training & Exam Content Generator ✅
- **Service**: `VeraTrainingContentService.ts`
- **Database**: `edcat.vera_training_questions`
- **Migration**: `068_create_vera_training_questions.sql`
- **Capability**: Training outlines with modules, learning objectives, key topics; exam questions with explanations

---

## Complete API Endpoints

### Learning & Capability
- `GET /api/vera/learning/events` - List learning events
- `GET /api/vera/learning/dashboard` - Learning dashboard summary
- `GET /api/vera/capability/summary` - Capability summary
- `GET /api/vera/capability/by-standard` - Per-standard capability
- `GET /api/vera/capability/by-intent` - Per-intent capability

### Audit Scenarios
- `GET /api/vera/audit-scenarios` - List saved scenarios
- `POST /api/vera/audit-scenarios/generate` - Generate new scenario
- `GET /api/vera/audit-scenarios/:id` - Get specific scenario

### Health & Diagnostics
- `GET /api/vera/health` - Health status with capability summary

---

## Environment Variables

```bash
# Database Connections
DATABASE_URL=postgresql://...          # Customer Data DB
EDCAT_AI_DATABASE_URL=postgresql://... # EDCAT AI DB

# LLM Configuration (Optional - Phases 1-7)
VERA_LLM_PROVIDER=local_http          # local_http, noop
VERA_LLM_ENDPOINT=http://localhost:8000/generate
VERA_LLM_API_KEY=...                  # optional

# Learning Configuration (Phase 8)
VERA_LEARNING_CONFIDENCE_THRESHOLD=0.6  # Default 0.6

# Self-Evaluation Configuration (Phase 11)
VERA_SELF_EVAL_ENABLED=true            # Default false
VERA_SELF_EVAL_THRESHOLD=0.6           # Default 0.6

# Debug Mode
VERA_DEBUG_MODE=false                   # Enable debug logging
```

---

## Migration Summary

**Phases 13-20 Migrations:**
- `062_create_vera_audit_scenarios.sql` - Phase 13
- `063_create_quality_ontology.sql` - Phase 14
- `064_extend_conversation_state.sql` - Phase 15
- `065_add_standard_families.sql` - Phase 17
- `066_create_cross_domain_mappings.sql` - Phase 17
- `067_create_vera_gap_rules.sql` - Phase 19
- `068_create_vera_training_questions.sql` - Phase 20

**Critical Schema Fixes (December 2024):**
- `070_fix_vera_query_response_bank_columns.sql` - Normalize column names (response_template → response_text)
- `071_fix_ai_conversation_history_columns.sql` - Add missing columns (user_id, tenant_id, message_text, embedding)
- `072_ensure_all_edcat_tables.sql` - Ensure all critical EDCAT AI tables exist
- `073_ensure_all_edcat_columns.sql` - Ensure all critical columns exist
- `074_fix_critical_column_mismatches.sql` - Fix response_template, answer, context, user_id mismatches
- `075_drop_not_null_constraints_ai_conversation_history.sql` - Drop NOT NULL constraints (tenant_id, message, user_id)
- `076_add_context_to_vera_terminology.sql` - Add context column to vera_terminology
- `077_fix_document_content_for_learning_file_id.sql` - Add file_id column to document_content_for_learning

All migrations are automatically applied on server startup via `twoDatabaseMigrations.js`.

