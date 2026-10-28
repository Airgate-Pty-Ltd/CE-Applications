# Vera Architecture Documentation

## Overview

Vera is EDCAT's intelligent compliance assistant, built on a comprehensive database-backed architecture that enables conversational AI, learning, research, and knowledge management.

## Architecture Components

### 1. Data Access Layer (VeraRepository)

**Location**: `backend/src/services/vera/VeraRepository.js`

Provides typed, consistent access to all Vera/AI database tables:

- **PersonaRepository**: Persona profiles, response templates
- **StandardsRepository**: Standards, requirements, embeddings, blueprints
- **ConversationRepository**: Conversation history, context, sessions
- **LearningRepository**: Learning events, response effectiveness, data gaps
- **ResearchRepository**: Research requests, sources, regulatory lookups
- **KnowledgeGraphRepository**: Concepts, relationships
- **PatternDiscoveryRepository**: Pattern discovery and tracking
- **ReasoningRepository**: Reasoning chains for requirement-procedure mappings

### 2. Intelligence Services

**StandardsIntelligenceService** (`backend/src/services/vera/StandardsIntelligenceService.js`):
- Intelligent clause lookup with fuzzy matching
- Similar requirement discovery using embeddings
- Crosswalk mapping between standards
- Requirement search and filtering

**VeraComprehensiveResearcher** (`backend/src/services/vera/VeraComprehensiveResearcher.js`):
- Multi-source research execution
- Source credibility assessment
- Content synthesis and report generation
- Regulatory lookup caching

### 3. Conversational Engine

**VeraConversationalEngine** (`backend/src/services/veraConversationalEngine.js`):
- Intent classification and routing
- Context-aware response generation
- Conversation memory integration
- Research request handling
- Standards intelligence integration

### 4. Database Tables

#### EDCAT AI Database (EDCAT_AI_DATABASE_URL)

**Core AI Tables:**
- `ai_persona_profile` - Vera's personality profile
- `ai_conversation_state` - Current conversation state
- `ai_conversation_history` - Historical conversations
- `ai_policy` - Tool policies and rules
- `ai_prompt` - System prompts
- `ai_template` - Response templates

**Vera Enhanced Intelligence (Migration 014):**
- `vera_conversation_context` - Real-time context
- `vera_response_templates` - Response templates
- `vera_learning_events` - Learning opportunities
- `vera_response_effectiveness` - Response quality tracking
- `vera_data_gaps` - Identified knowledge gaps
- `vera_model_versions` - Model version tracking

**Vera Knowledge Base (Migration 015):**
- `requirement_embeddings` - Vector embeddings
- `vera_knowledge_graph_concepts` - Knowledge graph nodes
- `vera_concept_relationships` - Knowledge graph edges
- `vera_requirement_reasoning_chains` - Reasoning chains
- `vera_pattern_discoveries` - Discovered patterns

**Vera Research System (Migration 016):**
- `vera_research_requests` - Research tracking
- `vera_research_sources_web` - Web source tracking
- `vera_regulatory_lookup` - Regulatory lookup cache

#### PostgreSQL Database (DATABASE_URL)

**Core Tables:**
- `public.standards` - Standards metadata
- `public.parsed_requirements` - Parsed requirements
- `public.regulatory_websites` - Regulatory website references

## Data Flow

### User Question → Response

1. **Intent Classification**: Message classified using intent router
2. **Context Loading**: Load conversation history, standards, documents
3. **Session Management**: Get or create conversation session
4. **Response Generation**: 
   - Use StandardsIntelligenceService for clause queries
   - Use ResearchRepository for unknown standards
   - Use PersonaRepository for templates
5. **History Logging**: Save user message and response to history
6. **Context Update**: Update conversation context with task/phase
7. **Learning**: Log learning events if applicable

### Research Flow

1. **Request Parsing**: Parse user query for research intent
2. **Request Creation**: Create research request record
3. **Research Execution**: Execute comprehensive research
4. **Source Saving**: Save all sources to database
5. **Result Caching**: Cache regulatory lookups
6. **Request Update**: Update request with results
7. **Response Formatting**: Format results professionally

### Learning Flow

1. **User Feedback**: User rates response (helpful/not helpful)
2. **Effectiveness Recording**: Record in `vera_response_effectiveness`
3. **Learning Event**: Log learning event if negative feedback
4. **Data Gap Detection**: Record data gap if confidence low
5. **Pattern Discovery**: Discover patterns from learning events

## API Endpoints

### Vera Endpoints (`/api/vera`)

- `GET /api/vera/diagnostics` - Comprehensive diagnostics
- `GET /api/vera/conversation/:id` - Get conversation history
- `GET /api/vera/context/:id` - Get conversation context
- `POST /api/vera/feedback` - Record user feedback
- `GET /api/vera/standards` - List all standards
- `GET /api/vera/standards/:id/clauses` - Get clauses for standard

## Seed Data

**Location**: `backend/src/scripts/seed-vera-comprehensive.js`

Seeds:
- `ai_persona_profile` - Vera's persona
- `vera_response_templates` - Greeting and casual chat templates
- `regulatory_websites` - Regulatory body websites
- `vera_model_versions` - Initial model version

## Diagnostics

**Location**: `backend/src/scripts/vera-diagnostics.js`

Checks:
- All table connections
- Seed data existence
- Table row counts
- Migration validation

## Key Features

1. **Conversation Memory**: Full conversation history with context tracking
2. **Standards Intelligence**: Intelligent clause lookup and crosswalk mapping
3. **Research System**: Comprehensive research with source tracking
4. **Learning Pipeline**: Feedback-driven learning and improvement
5. **Professional Presence**: Consultant-style responses, not chatbot
6. **Database-Backed**: All data persisted for learning and context

## Future Enhancements

- Vector similarity search with embeddings
- Knowledge graph traversal
- Pattern-based recommendations
- Expert training integration
- Self-directed learning automation

