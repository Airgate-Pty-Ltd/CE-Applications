# Vera Comprehensive Upgrade Plan

## Overview
Transform Vera from a basic conversational AI into a fully database-backed, learning, expert compliance assistant.

## Current State Analysis

### Existing Tables (from migrations)

#### EDCAT AI Database (EDCAT_AI_DATABASE_URL)

**Core AI Tables:**
- `ai_tenant` - Multi-tenancy support
- `ai_persona` - Personality profiles
- `ai_persona_profile` - Extended persona data
- `ai_prompt` - System prompts
- `ai_policy` - Tool policies and rules
- `ai_template` - Response templates
- `ai_validator` - Validation rules
- `ai_router` - Routing policies
- `ai_chat_log` - Full audit trail
- `ai_doc_ref` - Document references
- `ai_standard` - Standard blueprints
- `ai_clause_blueprint` - Clause definitions
- `ai_crosswalk_blueprint` - Cross-standard mappings
- `ai_conversation_state` - Current conversation state
- `ai_conversation_history` - Historical conversations

**Vera Enhanced Intelligence (Migration 014):**
- `vera_conversation_context` - Real-time context
- `vera_clarification_rules` - When to ask questions
- `vera_response_templates` - Response templates
- `vera_knowledge_boundaries` - What Vera knows/doesn't know
- `vera_data_gaps` - Identified knowledge gaps
- `vera_conversation_memory` - Short/long-term memory
- `vera_response_effectiveness` - Response quality tracking
- `vera_learning_events` - Learning opportunities
- `vera_model_versions` - Model version tracking
- `vera_daily_learning_batch` - Daily learning summaries
- `vera_clarification_feedback` - User feedback on clarifications
- `vera_user_interaction_patterns` - User behavior patterns

**Vera Knowledge Base (Migration 015):**
- `requirement_embeddings` - Vector embeddings for requirements
- `procedure_embeddings` - Vector embeddings for procedures
- `vera_knowledge_graph_concepts` - Knowledge graph nodes
- `vera_concept_relationships` - Knowledge graph edges
- `vera_requirement_reasoning_chains` - Reasoning chains
- `vera_pattern_discoveries` - Discovered patterns
- `vera_self_learning_questions` - Self-directed learning
- `vera_standard_profiles` - Standard profiles
- `vera_transfer_learning_maps` - Cross-standard learning
- `vera_expert_training_sessions` - Expert training data
- `vera_contextual_enrichment` - Context enhancement
- `vera_reasoning_validation_feedback` - Reasoning validation

**Vera Research System (Migration 016):**
- `vera_research_requests` - Research request tracking
- `vera_research_sources_web` - Web source tracking
- `vera_standard_profiles_comprehensive` - Comprehensive standard profiles
- `vera_regulatory_lookup` - Regulatory lookup cache

**Legacy Learning Tables:**
- `edcat.ai_agents` - Agent definitions
- `edcat.ai_sessions` - Session tracking
- `edcat.ai_messages` - Message history
- `edcat.ai_memories` - Memory storage
- `extraction_history` - Parsing history
- `clause_correlation_matrix` - Requirement-procedure mapping
- `edcat_learning_events` - Learning events
- `learned_patterns` - Learned patterns
- `model_versions` - Model versions
- `baseline_metrics` - Performance metrics

#### PostgreSQL Database (DATABASE_URL)

**Core Tables:**
- `public.standards` - Standards metadata
- `public.parsed_requirements` - Parsed requirements
- `public.parsed_clauses` - Parsed clauses
- `public.tenants` - Tenant organizations
- `public.authorized_users` - User accounts
- `public.user_permissions` - User permissions
- `public.regulatory_websites` - Regulatory website references
- `public.customer_documents` - Customer documents
- `public.customer_procedures` - Customer procedures
- `public.gap_analyses` - Gap analysis results
- `public.audit_trail` - Audit trail

## Implementation Plan

### Phase 1: Data Access Layer (VeraRepository)
Create comprehensive data access layer for all Vera/AI tables.

### Phase 2: Persona & Greetings System
Wire up persona system using ai_persona, ai_persona_profile, vera_response_templates.

### Phase 3: Standards Intelligence Service
Build service using requirement_embeddings, parsed_requirements, ai_clause_blueprint.

### Phase 4: Conversation Memory System
Implement conversation tracking using vera_conversation_history/state/sessions.

### Phase 5: Learning Pipeline
Build learning system using vera_learning_events, vera_response_effectiveness, vera_data_gaps.

### Phase 6: Enhanced Research System
Fix research to provide detailed results with proper confidence scoring.

### Phase 7: Seed Data
Create comprehensive seed data for all key tables.

### Phase 8: API Integration
Update all API endpoints to use new data access layer.

### Phase 9: Diagnostic Tool
Build tool to verify all table connections.

### Phase 10: Testing & Documentation
Test all functionality and document architecture.

