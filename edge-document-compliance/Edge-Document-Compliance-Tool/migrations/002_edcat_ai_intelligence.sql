-- =============================================================================
-- EDCAT AI: EDCAT_AI_DB
-- Purpose: Compliance standards, requirement extraction, learning system, 
--          continuous improvement, parsing intelligence
-- Run against: EDCAT AI database on Railway (EDCAT_AI_DATABASE_URL)
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CLEANUP: Drop duplicate tables that should only exist in Postgres
-- =============================================================================
-- These tables are duplicates and should NOT exist in EDCAT AI DB:
-- - standards (use public.standards in Postgres DATABASE_URL)
-- - standard_files (use public.standard_files in Postgres DATABASE_URL)
-- - parsed_requirements (use public.parsed_requirements in Postgres DATABASE_URL)
-- =============================================================================
DROP TABLE IF EXISTS standard_files CASCADE;
DROP TABLE IF EXISTS standards CASCADE;
DROP TABLE IF EXISTS parsed_requirements CASCADE;

-- =============================================================================
-- 1. STANDARDS (DELETED - Use public.standards in Postgres DATABASE_URL instead)
-- =============================================================================
-- ❌ REMOVED: This table should NOT exist in EDCAT AI DB
-- ✅ Use public.standards in PostgreSQL (DATABASE_URL) as single source of truth
-- 
-- Code references:
-- - backend/src/routes/requirements.js uses public.standards (Postgres)
-- - backend/src/routes/upload.js uses public.standards (Postgres)
-- - backend/src/routes/parse.js uses public.standards (Postgres)
-- 
-- If this table exists, drop it:
-- DROP TABLE IF EXISTS standards CASCADE;

-- =============================================================================
-- 2. PARSED_REQUIREMENTS (DELETED - Use public.parsed_requirements in Postgres DATABASE_URL instead)
-- =============================================================================
-- ❌ REMOVED: This table should NOT exist in EDCAT AI DB
-- ✅ Use public.parsed_requirements in PostgreSQL (DATABASE_URL) as single source of truth
-- 
-- Code references:
-- - backend/src/routes/requirements.js uses public.parsed_requirements (Postgres)
-- - backend/src/routes/parse.js uses public.parsed_requirements (Postgres)
-- - backend/src/services/veraConversationalEngine.js uses public.parsed_requirements (Postgres)
-- 
-- If this table exists, drop it:
-- DROP TABLE IF EXISTS parsed_requirements CASCADE;

-- =============================================================================
-- 3. EXTRACTION_HISTORY (Track parsing decisions)
-- =============================================================================
-- NOTE: References public.parsed_requirements and public.standards in Postgres (no FK constraint)
CREATE TABLE IF NOT EXISTS extraction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL,  -- Reference to public.parsed_requirements(id) in Postgres (no FK - cross-database)
  standard_id UUID NOT NULL,  -- Reference to public.standards(id) in Postgres (no FK - cross-database)
  extraction_event VARCHAR(100),  -- 'initial_parse', 'confidence_update', 'refinement'
  confidence_before DECIMAL(3,2),
  confidence_after DECIMAL(3,2),
  improvement DECIMAL(3,2) GENERATED ALWAYS AS (confidence_after - confidence_before) STORED,
  model_version VARCHAR(20),
  reasoning JSONB,  -- Why confidence changed
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_standard ON extraction_history(standard_id);
CREATE INDEX IF NOT EXISTS idx_extraction_improvement ON extraction_history(improvement);

-- =============================================================================
-- 4. CLAUSE_CORRELATION_MATRIX (Requirement ↔ Procedure mapping)
-- =============================================================================
-- NOTE: References public.parsed_requirements in Postgres (no FK constraint)
CREATE TABLE IF NOT EXISTS clause_correlation_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL,  -- Reference to public.parsed_requirements(id) in Postgres (no FK - cross-database)
  tenant_id UUID,  -- Reference to PostgreSQL customer
  procedure_id UUID,  -- Reference to PostgreSQL procedure (can't FK across databases)
  document_id UUID,  -- Reference to PostgreSQL document (can't FK across databases)
  
  compliance_status VARCHAR(20) NOT NULL DEFAULT 'unknown',  -- 'full', 'partial', 'none'
  match_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  
  evidence_text TEXT,
  evidence_location VARCHAR(255),
  reasoning TEXT,
  
  gap_description TEXT,
  gap_severity VARCHAR(20),
  recommendation TEXT,
  recommendation_effort VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  
  CONSTRAINT valid_status CHECK (compliance_status IN ('full', 'partial', 'none', 'unknown')),
  CONSTRAINT valid_severity CHECK (gap_severity IN ('critical', 'major', 'minor', 'observation', NULL))
);

CREATE INDEX IF NOT EXISTS idx_correlation_requirement ON clause_correlation_matrix(requirement_id);
CREATE INDEX IF NOT EXISTS idx_correlation_tenant ON clause_correlation_matrix(tenant_id);

-- =============================================================================
-- 5. EDCAT_LEARNING_EVENTS (Every learning opportunity)
-- =============================================================================
-- NOTE: References public.parsed_requirements and public.standards in Postgres (no FK constraint)
CREATE TABLE IF NOT EXISTS edcat_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL,  -- Reference to public.parsed_requirements(id) in Postgres (no FK - cross-database)
  standard_id UUID NOT NULL,  -- Reference to public.standards(id) in Postgres (no FK - cross-database)
  
  event_type VARCHAR(100) NOT NULL,  -- 'extraction_feedback', 'accuracy_rating', 'clarification_response'
  event_description TEXT,
  
  confidence_before DECIMAL(3,2),
  confidence_after DECIMAL(3,2),
  improvement DECIMAL(3,2) GENERATED ALWAYS AS (confidence_after - confidence_before) STORED,
  
  model_version_before VARCHAR(20),
  model_version_after VARCHAR(20),
  
  feedback_provided_by VARCHAR(100),
  feedback_rating INT,  -- 1-5
  feedback_comment TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_standard ON edcat_learning_events(standard_id);
CREATE INDEX IF NOT EXISTS idx_learning_improvement ON edcat_learning_events(improvement);

-- =============================================================================
-- 6. LEARNED_PATTERNS (Patterns that improved accuracy)
-- =============================================================================
CREATE TABLE IF NOT EXISTS learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name VARCHAR(255) NOT NULL,
  pattern_description TEXT,
  
  rule_keyword VARCHAR(255),
  rule_context TEXT,
  confidence_boost DECIMAL(3,2),
  
  times_applied INT DEFAULT 0,
  total_improvement DECIMAL(5,3) DEFAULT 0,
  average_improvement DECIMAL(3,2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by_model_version VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE
);

-- =============================================================================
-- 7. MODEL_VERSIONS (System improvements over time)
-- =============================================================================
CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL UNIQUE,
  
  baseline_accuracy DECIMAL(4,3),
  baseline_precision DECIMAL(4,3),
  baseline_recall DECIMAL(4,3),
  
  improvement_from_previous DECIMAL(4,3),
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100) DEFAULT 'system',
  reason_for_update TEXT,
  
  total_learning_events INT DEFAULT 0,
  total_extractions_improved INT DEFAULT 0,
  
  approved BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMP,
  
  CONSTRAINT valid_version CHECK (version ~ '^\d+\.\d+\.\d+$')
);

INSERT INTO model_versions (version, baseline_accuracy, baseline_precision, baseline_recall, approved, deployed_at)
VALUES ('1.0.0', 0.800, 0.800, 0.800, TRUE, NOW())
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- 8. BASELINE_METRICS (Performance metrics per version)
-- =============================================================================
CREATE TABLE IF NOT EXISTS baseline_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  standard_id UUID,  -- Reference to public.standards(id) in Postgres (no FK - cross-database)
  
  accuracy DECIMAL(4,3),
  precision DECIMAL(4,3),
  recall DECIMAL(4,3),
  f1_score DECIMAL(4,3),
  
  false_positives INT,
  false_negatives INT,
  true_positives INT,
  true_negatives INT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 9. AUDIT_TRAIL_DECISIONS (Why EDCAT made every decision)
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_trail_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID UNIQUE DEFAULT gen_random_uuid(),  -- For compatibility with existing audit_trail
  analysis_id UUID,  -- Reference to PostgreSQL gap_analyses (can't FK across databases)
  
  actor VARCHAR(100) NOT NULL,  -- 'EDCAT_PARSER', 'EDCAT_MATCHER', 'EDCAT_LEARNER', 'EDCAT_ORCHESTRATOR'
  action VARCHAR(100) NOT NULL,  -- 'EXTRACT', 'MATCH', 'ASSIGN_CONFIDENCE', 'LEARN', 'PARSE_STANDARD', 'ANALYZE_GAPS'
  action_details TEXT,
  details TEXT,  -- Alias for action_details
  
  requirement_id UUID,  -- Reference to public.parsed_requirements(id) in Postgres (no FK - cross-database)
  standard_id UUID,  -- Reference to public.standards(id) in Postgres (no FK - cross-database)
  
  decision_reasoning JSONB,
  reasoning JSONB,  -- Alias for decision_reasoning
  confidence_score DECIMAL(3,2),
  thresholds_used JSONB,
  
  action_status VARCHAR(50),
  status VARCHAR(50),  -- Alias for action_status
  action_result JSONB,
  metadata JSONB,  -- Alias for action_result
  
  created_at TIMESTAMP DEFAULT NOW(),
  timestamp TIMESTAMP DEFAULT NOW(),  -- Alias for created_at
  
  -- For learning
  predicted_accuracy DECIMAL(3,2),
  actual_accuracy DECIMAL(3,2),
  
  -- Standard/Customer context
  customer_id UUID,  -- Reference to PostgreSQL tenant (can't FK across databases)
  
  -- Performance metrics
  execution_time_ms INTEGER,
  confidence_score_alt DECIMAL(3,2)  -- Alias for confidence_score
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_trail_decisions(actor);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_trail_decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_analysis ON audit_trail_decisions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_audit_standard_customer ON audit_trail_decisions(standard_id, customer_id) WHERE standard_id IS NOT NULL AND customer_id IS NOT NULL;

-- =============================================================================
-- 10. REGULATORY_WEBSITES (Where standards come from)
-- =============================================================================
CREATE TABLE IF NOT EXISTS regulatory_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url VARCHAR(500) NOT NULL,
  name VARCHAR(255),
  agency VARCHAR(100),
  regulatory_body VARCHAR(100),
  standard_code VARCHAR(100),  -- Reference: 'ISO9001:2015'
  added_at TIMESTAMP DEFAULT NOW(),
  last_scraped TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT
);

-- =============================================================================
-- 11. SYNC_LOG (Track when customer data came in)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(100),  -- 'analysis_started', 'customer_data_received', 'results_sent'
  source_database VARCHAR(100),  -- 'postgresql', 'edcat_ai'
  source_table VARCHAR(100),
  record_count INT,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 12. EDCAT SCHEMA: AI Personality & Learning System
-- =============================================================================
-- Create edcat schema for AI personality, sessions, memories, and learning
CREATE SCHEMA IF NOT EXISTS edcat;

-- AI Agents (Personality Profiles)
CREATE TABLE IF NOT EXISTS edcat.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,              -- e.g., 'edcat-admin'
  name TEXT NOT NULL,                     -- display name
  status TEXT NOT NULL DEFAULT 'active',  -- active | disabled
  system_prompt TEXT NOT NULL,            -- full bounded instructions
  persona_json JSONB NOT NULL DEFAULT '{}',       -- tone, constraints, command map, greetings
  capabilities_json JSONB NOT NULL DEFAULT '{}',  -- which commands/endpoints it can call
  learning_enabled BOOLEAN DEFAULT TRUE,  -- whether this agent learns from interactions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Conversation Sessions
CREATE TABLE IF NOT EXISTS edcat.ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES edcat.ai_agents(id) ON DELETE CASCADE,
  tenant_id UUID,  -- Reference to PostgreSQL customer (can't FK across databases)
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NULL,
  meta JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_agent ON edcat.ai_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_tenant ON edcat.ai_sessions(tenant_id);

-- AI Conversation Messages (Every interaction)
CREATE TABLE IF NOT EXISTS edcat.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES edcat.ai_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  tokens_in INT NULL,
  tokens_out INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON edcat.ai_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON edcat.ai_messages(created_at);

-- AI Memories (What EDCAT learns and remembers)
CREATE TABLE IF NOT EXISTS edcat.ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES edcat.ai_agents(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('global','customer','standard')),
  tenant_id UUID,  -- Reference to PostgreSQL customer (can't FK across databases)
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1.0,  -- priority
  ttl_days INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ
);

-- Add trigger to populate expires_at (replaces generated column for immutability compliance)
CREATE OR REPLACE FUNCTION edcat.update_ai_memories_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ttl_days IS NOT NULL THEN
    NEW.expires_at := NEW.created_at + (NEW.ttl_days || ' days')::INTERVAL;
  ELSE
    NEW.expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DROP TRIGGER IF EXISTS set_ai_memories_expires_at ON edcat.ai_memories;
CREATE TRIGGER set_ai_memories_expires_at
  BEFORE INSERT OR UPDATE ON edcat.ai_memories
  FOR EACH ROW
  EXECUTE FUNCTION edcat.update_ai_memories_expires_at();

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_memories_scope_tenant_key
  ON edcat.ai_memories(scope, tenant_id, key) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_memories_scope_global_key
  ON edcat.ai_memories(scope, key) WHERE scope = 'global' AND tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_memories_agent ON edcat.ai_memories(agent_id);

-- Q&A Pairs for Learning (Every question/answer interaction)
CREATE TABLE IF NOT EXISTS edcat.qa_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES edcat.ai_agents(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  standard_code VARCHAR(100),  -- Which standard was involved
  requirement_id UUID,  -- Reference to public.parsed_requirements(id) in Postgres (no FK - cross-database)
  success BOOLEAN NOT NULL DEFAULT TRUE,  -- did user accept/rate positively?
  feedback JSONB NOT NULL DEFAULT '{}',  -- user feedback, ratings, corrections
  interaction_count INT DEFAULT 1,  -- how many times this Q&A was used
  last_used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_pairs_agent ON edcat.qa_pairs(agent_id);
CREATE INDEX IF NOT EXISTS idx_qa_pairs_standard ON edcat.qa_pairs(standard_code);
CREATE INDEX IF NOT EXISTS idx_qa_pairs_success ON edcat.qa_pairs(success);

-- Personality Learning Events (How personality improves over time)
CREATE TABLE IF NOT EXISTS edcat.personality_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES edcat.ai_agents(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,  -- 'greeting_feedback', 'tone_adjustment', 'capability_learned'
  event_description TEXT,
  before_state JSONB,  -- personality state before learning
  after_state JSONB,  -- personality state after learning
  user_feedback TEXT,  -- what the user said/did
  learning_insight TEXT,  -- what EDCAT learned from this
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personality_learning_agent ON edcat.personality_learning_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_personality_learning_type ON edcat.personality_learning_events(event_type);

-- Insert default EDCAT Administrator agent with personality profile
INSERT INTO edcat.ai_agents (code, name, status, system_prompt, persona_json, capabilities_json, learning_enabled)
VALUES (
  'edcat-admin',
  'EDCAT Administrator',
  'active',
  'You are the bounded EDCAT Administrator. You must:
- Answer only from data in Postgres and approved packs
- Use the command layer to: requirements.list/search/show, docs.search, gap.run, trace.build, export.matrix, explain
- Never fabricate; include source pointers for all regulatory text
- If no pack exists for a requested regulation, enqueue a regs.refresh task for that source
- Learn from every interaction to become more helpful and user-friendly',
  '{
    "tone": "professional_warm",
    "greetings": {
      "default": [
        "Good day. Let''s prepare your GAP analysis.",
        "Hello. Your library is ready—what shall we assess today?",
        "Welcome back. Select a standard and target documents to begin."
      ],
      "morning": ["Good morning. Ready to dig into today''s clauses?"],
      "afternoon": ["Good afternoon. Your latest analyses are in the history panel."],
      "evening": ["Good evening. Need a quick clause quote before close of business?"]
    },
    "compliance_note": "EDCAT is bounded to your uploaded corpus and approved regulator sources.",
    "show_tip_probability": 0.25,
    "tips": [
      "Tip: Use Clause Lookup to quote a requirement verbatim with citation.",
      "Tip: Run ''GAP (All Modeled Clauses)'' to find blind spots in one pass.",
      "Tip: Add reviewer feedback—EDCAT learns and tightens future matches."
    ],
    "jurisdictions": ["FAA", "EASA", "AFAC", "CAAC", "UK CAA"],
    "learning_preferences": {
      "remember_user_preferences": true,
      "adapt_tone_to_user": true,
      "learn_from_feedback": true
    }
  }'::jsonb,
  '{
    "commands": [
      "requirements.list",
      "requirements.search",
      "requirements.show",
      "docs.search",
      "gap.run",
      "trace.build",
      "export.matrix",
      "explain",
      "teach.ingest",
      "health.check"
    ]
  }'::jsonb,
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  persona_json = EXCLUDED.persona_json,
  capabilities_json = EXCLUDED.capabilities_json,
  learning_enabled = EXCLUDED.learning_enabled,
  updated_at = NOW();

-- =============================================================================
-- 13. EDCAT AI PERSONALITY SYSTEM (Vera & Console Assistant)
-- =============================================================================
-- Personality tables for EDCAT AI personas, prompts, policies, templates, validators, and routing

-- AI Tenant (for multi-tenancy support)
CREATE TABLE IF NOT EXISTS edcat.ai_tenant (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name)
);

-- Insert default tenant if not exists
INSERT INTO edcat.ai_tenant (tenant_id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default EDCAT Tenant')
ON CONFLICT (name) DO NOTHING;

-- AI Persona (Vera, Console Assistant, etc.)
CREATE TABLE IF NOT EXISTS edcat.ai_persona (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  code TEXT NOT NULL,           -- e.g., 'vera', 'console-assistant'
  display_name TEXT NOT NULL,   -- 'Vera'
  description TEXT NOT NULL,
  voice TEXT,                   -- 'british_scottish_female'
  style JSONB NOT NULL,         -- tone, do/don'ts, formatting
  capabilities JSONB NOT NULL,  -- actions allowed, tools allowed
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_ai_persona_tenant ON edcat.ai_persona(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_persona_code ON edcat.ai_persona(code);

-- AI Prompt (System prompts, greetings, refusals, repairs)
CREATE TABLE IF NOT EXISTS edcat.ai_prompt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  persona_code TEXT NOT NULL,   -- foreign key via (tenant_id, code) in ai_persona
  kind TEXT NOT NULL,           -- 'system', 'greeting', 'refusal', 'repair'
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_persona ON edcat.ai_prompt(tenant_id, persona_code);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_kind ON edcat.ai_prompt(kind);

-- AI Policy (Tool policies, citation rules, etc.)
CREATE TABLE IF NOT EXISTS edcat.ai_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- 'tool_policies', 'citation_rules'
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ai_policy_tenant ON edcat.ai_policy(tenant_id);

-- AI Template (Retrieval templates, draft templates, mapping templates)
CREATE TABLE IF NOT EXISTS edcat.ai_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- 'retrieval.clause.qa', 'draft.procedure.section'
  kind TEXT NOT NULL,           -- 'retrieval', 'draft', 'mapping'
  template JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ai_template_tenant ON edcat.ai_template(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_template_kind ON edcat.ai_template(kind);

-- AI Validator (Citation validators, style validators, format validators)
CREATE TABLE IF NOT EXISTS edcat.ai_validator (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- 'citations.required', 'style.procedure.no_howto'
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ai_validator_tenant ON edcat.ai_validator(tenant_id);

-- AI Router (Routing policies for cloud vs on-prem models)
CREATE TABLE IF NOT EXISTS edcat.ai_router (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- 'default-routing'
  rules JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ai_router_tenant ON edcat.ai_router(tenant_id);

-- AI Chat Log (Full audit trail of every chat exchange)
CREATE TABLE IF NOT EXISTS edcat.ai_chat_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  persona_code TEXT NOT NULL,
  user_id UUID,
  user_role TEXT DEFAULT 'user',
  request JSONB NOT NULL,       -- {text, tools_allowed, retrieval_queries}
  retrieved JSONB,              -- [{doc_id, page, line_start, line_end, hash}]
  model_used TEXT NOT NULL,
  router_trace JSONB,           -- decision path
  response JSONB NOT NULL,      -- {text, citations, tool_calls}
  validators JSONB NOT NULL,    -- results per validator
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_log_tenant ON edcat.ai_chat_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_log_session ON edcat.ai_chat_log(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_log_persona ON edcat.ai_chat_log(persona_code);
CREATE INDEX IF NOT EXISTS idx_ai_chat_log_created ON edcat.ai_chat_log(created_at);

-- AI Document Reference (Store snippet hashes for immutability checks)
CREATE TABLE IF NOT EXISTS edcat.ai_doc_ref (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  doc_id TEXT NOT NULL,
  page INT,
  line_start INT,
  line_end INT,
  sha256 TEXT NOT NULL,         -- of the snippet text
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_doc_ref_tenant ON edcat.ai_doc_ref(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_doc_ref_doc ON edcat.ai_doc_ref(doc_id);
CREATE INDEX IF NOT EXISTS idx_ai_doc_ref_hash ON edcat.ai_doc_ref(sha256);

-- =============================================================================
-- 20. VERA CONVERSATIONAL TABLES (Persona profiles and conversation state)
-- =============================================================================

-- Persona profiles for Vera and other AI personas
CREATE TABLE IF NOT EXISTS edcat.ai_persona_profile (
  tenant_id UUID NOT NULL,
  persona_code TEXT NOT NULL,
  profile JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, persona_code)
);

CREATE INDEX IF NOT EXISTS idx_ai_persona_profile_tenant ON edcat.ai_persona_profile(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_persona_profile_code ON edcat.ai_persona_profile(persona_code);

-- Conversation state for maintaining context across turns
CREATE TABLE IF NOT EXISTS edcat.ai_conversation_state (
  tenant_id UUID NOT NULL,
  session_id UUID NOT NULL,
  persona_code TEXT NOT NULL,
  last_intent TEXT,
  context JSONB,
  last_topic TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, session_id, persona_code)
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_state_session ON edcat.ai_conversation_state(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_state_persona ON edcat.ai_conversation_state(tenant_id, persona_code);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_state_updated ON edcat.ai_conversation_state(updated_at);

-- Conversation history for full message tracking
CREATE TABLE IF NOT EXISTS edcat.ai_conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  session_id UUID NOT NULL,
  persona_code TEXT NOT NULL DEFAULT 'vera',
  role TEXT NOT NULL, -- 'user' or 'assistant'
  message TEXT NOT NULL,
  intent TEXT,
  metadata JSONB, -- Additional context, tokens used, model, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, session_id, persona_code) 
    REFERENCES edcat.ai_conversation_state(tenant_id, session_id, persona_code) 
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_history_session 
  ON ai_conversation_history(tenant_id, session_id, persona_code, created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_history_tenant 
  ON ai_conversation_history(tenant_id, created_at);

-- Function to get recent conversation history
CREATE OR REPLACE FUNCTION get_conversation_history(
  p_tenant_id UUID,
  p_session_id UUID,
  p_persona_code TEXT DEFAULT 'vera',
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  role TEXT,
  message TEXT,
  intent TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.role,
    h.message,
    h.intent,
    h.created_at
  FROM ai_conversation_history h
  WHERE h.tenant_id = p_tenant_id
    AND h.session_id = p_session_id
    AND h.persona_code = p_persona_code
  ORDER BY h.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 21. BLUEPRINT TABLES (Standard metadata and clause blueprints)
-- =============================================================================

-- Blueprint tables for standards metadata and clause IDs
CREATE TABLE IF NOT EXISTS edcat.ai_standard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  code TEXT NOT NULL,           -- e.g., 'ISO-9001', 'AS9100'
  revision TEXT NOT NULL,        -- e.g., '2015', 'Rev D'
  title TEXT NOT NULL,
  authority TEXT,                -- e.g., 'ISO', 'IAQG/SAE'
  citation_style TEXT,            -- e.g., 'page_line'
  parser_profile TEXT,           -- e.g., 'pdf_generic_v1'
  metadata JSONB,                -- family, domain, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code, revision)
);

CREATE INDEX IF NOT EXISTS idx_ai_standard_code ON edcat.ai_standard(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_ai_standard_authority ON edcat.ai_standard(tenant_id, authority);

CREATE TABLE IF NOT EXISTS edcat.ai_clause_blueprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES edcat.ai_standard(id) ON DELETE CASCADE,
  clause_id TEXT NOT NULL,      -- e.g., '8.7', '4.1.1'
  label TEXT,                    -- e.g., 'Control of nonconforming outputs'
  parent_clause_id TEXT,         -- parent clause_id for hierarchy
  order_index INT NOT NULL,
  ontology_tags TEXT[],          -- array of tags
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, standard_id, clause_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_clause_blueprint_standard ON edcat.ai_clause_blueprint(tenant_id, standard_id);
CREATE INDEX IF NOT EXISTS idx_ai_clause_blueprint_parent ON edcat.ai_clause_blueprint(tenant_id, standard_id, parent_clause_id);

CREATE TABLE IF NOT EXISTS edcat.ai_crosswalk_blueprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES edcat.ai_tenant(tenant_id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES edcat.ai_standard(id) ON DELETE CASCADE,
  target_family TEXT NOT NULL,   -- e.g., 'HLS', 'AS91xx'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, standard_id, target_family)
);

CREATE INDEX IF NOT EXISTS idx_ai_crosswalk_blueprint_standard ON edcat.ai_crosswalk_blueprint(tenant_id, standard_id);

-- =============================================================================
-- VERA LEARNING TABLES (Document content for AI learning and example documents)
-- =============================================================================
-- These tables store extracted document content and example documents
-- that Vera uses to learn patterns and provide better responses
-- =============================================================================

-- Example Documents (High-quality example documents for learning)
-- NOTE: standard_id references public.standards in Postgres (no FK - cross-database)
CREATE TABLE IF NOT EXISTS example_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL UNIQUE,
  standard_id UUID,  -- Reference to public.standards(id) in Postgres (no FK - cross-database)
  file_name TEXT NOT NULL,
  category TEXT NOT NULL,
  standard_code TEXT,
  quality_score DECIMAL(3,2) DEFAULT 1.0,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_example_documents_standard ON example_documents(standard_code);
CREATE INDEX IF NOT EXISTS idx_example_documents_category ON example_documents(category);
CREATE INDEX IF NOT EXISTS idx_example_documents_file ON example_documents(file_id);
CREATE INDEX IF NOT EXISTS idx_example_documents_standard_id ON example_documents(standard_id);

-- Document Content for Learning (Extracted text from documents for AI learning)
-- NOTE: standard_id references public.standards in Postgres (no FK - cross-database)
CREATE TABLE IF NOT EXISTS document_content_for_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL,
  standard_id UUID,  -- Reference to public.standards(id) in Postgres (no FK - cross-database)
  standard_code TEXT,
  category TEXT NOT NULL,
  content_text TEXT NOT NULL,
  is_example BOOLEAN DEFAULT false,
  word_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_content_file ON document_content_for_learning(file_id);
CREATE INDEX IF NOT EXISTS idx_doc_content_standard ON document_content_for_learning(standard_id);
CREATE INDEX IF NOT EXISTS idx_doc_content_standard_code ON document_content_for_learning(standard_code);
CREATE INDEX IF NOT EXISTS idx_doc_content_example ON document_content_for_learning(is_example) WHERE is_example = true;

COMMENT ON TABLE example_documents IS 'High-quality example documents that Vera uses to learn document structure and patterns';
COMMENT ON TABLE document_content_for_learning IS 'Extracted text content from documents that Vera uses for learning and knowledge retrieval';

-- Done!

