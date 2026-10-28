-- =============================================================================
-- MIGRATION 014: Vera Enhanced Intelligence System
-- Creates 12 new tables for conversational AI, learning, and context awareness
-- =============================================================================

-- TABLE 1: vera_conversation_context
-- Real-time state of what Vera knows, what she's doing, and what she's missing
CREATE TABLE IF NOT EXISTS vera_conversation_context (
    context_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID,
    user_id UUID NOT NULL,
    tenant_id UUID,
    
    -- What is the user trying to do?
    active_task VARCHAR(100) NOT NULL DEFAULT 'undefined',
        -- "gap_analysis", "clarification", "gap_justification", "comparison", "trend_analysis"
    task_progress DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
    
    -- What data does Vera have access to RIGHT NOW?
    standard_id UUID,
    customer_id UUID,
    document_id UUID,
    analysis_id UUID,
    requirement_ids UUID[], -- Array of requirements in scope
    procedure_ids UUID[], -- Array of procedures in scope
    
    -- What is Vera uncertain about?
    confidence_level DECIMAL(3,2) DEFAULT 0.50, -- Overall confidence in this task
    clarification_needed BOOLEAN DEFAULT FALSE,
    missing_data_type VARCHAR(100), 
        -- "standard_content", "procedure_specifics", "user_intent", "organizational_context", "business_rules"
    missing_data_description TEXT,
    
    -- Conversation flow
    current_phase VARCHAR(50) DEFAULT 'greeting',
        -- "greeting" → "task_definition" → "data_gathering" → "analysis_in_progress" → "clarification" → "result_presentation" → "feedback"
    phase_start_time TIMESTAMP DEFAULT NOW(),
    messages_in_current_phase INT DEFAULT 0,
    
    -- Context tracking
    last_user_input TEXT, -- Last thing user said
    last_vera_response TEXT, -- Last thing Vera said
    conversation_topic VARCHAR(255), -- Main topic being discussed
    subtopics TEXT[], -- Related topics mentioned
    
    -- User state
    user_is_expert BOOLEAN, -- Is user a QMS expert? (Vera should be more technical)
    user_language_style VARCHAR(50), -- "formal", "casual", "technical"
    user_patience_level VARCHAR(50) DEFAULT 'normal', -- "low" = keep answers short, "high" = detailed
    
    -- Session metadata
    session_id VARCHAR(100),
    ip_hash VARCHAR(100), -- For rate limiting
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_vera_context_conversation ON vera_conversation_context(conversation_id);
CREATE INDEX IF NOT EXISTS idx_vera_context_user ON vera_conversation_context(user_id);
CREATE INDEX IF NOT EXISTS idx_vera_context_phase ON vera_conversation_context(current_phase);
CREATE INDEX IF NOT EXISTS idx_vera_context_task ON vera_conversation_context(active_task);

-- TABLE 2: vera_clarification_rules
-- Define WHEN and HOW Vera asks clarifying questions
CREATE TABLE IF NOT EXISTS vera_clarification_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    
    -- What triggers this clarification?
    trigger_type VARCHAR(100) NOT NULL,
        -- "confidence_threshold", "ambiguous_mapping", "missing_procedure", "contradictory_statements", "semantic_uncertainty"
    trigger_condition VARCHAR(255), -- "confidence_below_0.75", "multiple_matches_found"
    trigger_value DECIMAL(3,2), -- Numeric threshold if applicable
    
    -- How should Vera ask?
    clarification_template TEXT NOT NULL,
        -- Template with placeholders: [PROCEDURE], [REQUIREMENT], [CONFIDENCE], [REASON]
    
    question_type VARCHAR(50) NOT NULL,
        -- "yes_no", "multiple_choice", "open_ended", "rating", "ranking"
    
    answer_options TEXT[], -- For multiple_choice: ["Option 1", "Option 2", "Option 3"]
    
    -- What does the answer teach Vera?
    learning_outcome VARCHAR(255),
        -- "keyword_mapping", "procedure_to_requirement", "context_understanding", "requirement_interpretation"
    
    -- Prevent Vera from overwhelming users
    max_clarifications_per_analysis INT DEFAULT 8,
    max_clarifications_per_conversation INT DEFAULT 15,
    ask_only_if_confidence_below DECIMAL(3,2) DEFAULT 0.70,
    ask_only_if_confidence_above DECIMAL(3,2) DEFAULT 0.45,
    
    -- Don't ask the same clarification twice
    dont_repeat_if_confidence_boosted DECIMAL(3,2) DEFAULT 0.15,
    
    -- Priority (if multiple rules apply, which fires first?)
    priority INT DEFAULT 50,
    
    -- Who should see this?
    applicable_to_experts BOOLEAN DEFAULT TRUE,
    applicable_to_novices BOOLEAN DEFAULT TRUE,
    applicable_to_industries TEXT[], -- ["aerospace", "medical", "automotive"] or NULL for all
    applicable_to_standards TEXT[], -- ["ISO9001", "AS9100"] or NULL for all
    
    -- Safety guardrails
    active BOOLEAN DEFAULT TRUE,
    soft_delete_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    version INT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_clarification_trigger ON vera_clarification_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_clarification_priority ON vera_clarification_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_clarification_active ON vera_clarification_rules(active);

-- TABLE 3: vera_response_templates
-- Dynamic, natural-sounding responses that stay focused on QMS gap analysis
CREATE TABLE IF NOT EXISTS vera_response_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL,
    template_category VARCHAR(100) NOT NULL,
        -- "analysis_start", "analysis_progress", "clarification_question", "analysis_complete", "gap_explanation", "confidence_disclaimer", "unable_to_answer", "waiting_for_data", "learning_acknowledgment"
    
    -- The template with smart placeholders
    template_text TEXT NOT NULL,
        -- Placeholders: [CUSTOMER], [STANDARD], [MATCH_COUNT], [AMBIGUOUS_COUNT], [GAP_COUNT], 
        -- [CONFIDENCE], [HIGH_CONFIDENCE_COUNT], [PROCEDURE_NAME], [REQUIREMENT_TEXT], [REASON], etc.
    
    template_variants TEXT[],
        -- Alternative versions for variety
    
    -- When to use this template?
    use_case VARCHAR(255) NOT NULL,
    applicable_phase VARCHAR(50), -- "analysis_in_progress", "clarification", "result_presentation"
    confidence_range_min DECIMAL(3,2),
    confidence_range_max DECIMAL(3,2),
    min_ambiguous_items INT,
    max_ambiguous_items INT,
    
    -- Tone and style
    tone VARCHAR(50) DEFAULT 'professional',
        -- "formal", "conversational", "technical", "friendly", "encouraging"
    detail_level INT DEFAULT 3, -- 1=minimal, 5=comprehensive
    formality_level VARCHAR(50) DEFAULT 'professional',
        -- "casual", "professional", "expert"
    
    -- For personalization
    expert_version TEXT, -- If user is QMS expert, use this instead
    novice_version TEXT, -- If user is not expert, use this
    
    -- Track effectiveness
    times_used INT DEFAULT 0,
    avg_user_satisfaction DECIMAL(3,2),
    user_follow_up_rate DECIMAL(3,2),
    
    -- Improvement tracking
    satisfaction_trend VARCHAR(50), -- "improving", "stable", "declining"
    last_satisfaction_check TIMESTAMP,
    
    -- Control
    active BOOLEAN DEFAULT TRUE,
    feature_flag VARCHAR(100), -- "enabled", "testing", "disabled"
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    version INT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_response_category ON vera_response_templates(template_category);
CREATE INDEX IF NOT EXISTS idx_response_phase ON vera_response_templates(applicable_phase);
CREATE INDEX IF NOT EXISTS idx_response_confidence ON vera_response_templates(confidence_range_min, confidence_range_max);
CREATE INDEX IF NOT EXISTS idx_response_active ON vera_response_templates(active);

-- TABLE 4: vera_knowledge_boundaries
-- Define exactly what Vera CAN and CANNOT discuss (enforces "bounded" behavior)
CREATE TABLE IF NOT EXISTS vera_knowledge_boundaries (
    boundary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boundary_name VARCHAR(255) NOT NULL,
    
    -- What CAN Vera discuss?
    allowed_domain VARCHAR(255) NOT NULL,
        -- "gap_analysis", "requirement_coverage", "confidence_assessment", "procedure_clarification", "trend_analysis", "comparison_analysis"
    allowed_topics TEXT[] NOT NULL,
    allowed_keywords TEXT[],
    
    -- What CANNOT Vera discuss?
    forbidden_domain VARCHAR(255),
    forbidden_topics TEXT[],
    forbidden_keywords TEXT[],
    
    -- How should Vera respond when asked about forbidden topics?
    redirect_message TEXT NOT NULL,
    
    escalation_needed BOOLEAN DEFAULT FALSE,
    escalation_to VARCHAR(100),
    escalation_message TEXT,
    
    -- Priority if multiple boundaries apply
    priority INT DEFAULT 50,
    
    -- Applicability
    applicable_to_all_users BOOLEAN DEFAULT TRUE,
    applicable_to_user_roles TEXT[],
    applicable_to_industries TEXT[],
    
    -- Control
    active BOOLEAN DEFAULT TRUE,
    reason_for_boundary TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_boundaries_domain ON vera_knowledge_boundaries(allowed_domain);
CREATE INDEX IF NOT EXISTS idx_boundaries_priority ON vera_knowledge_boundaries(priority DESC);
CREATE INDEX IF NOT EXISTS idx_boundaries_active ON vera_knowledge_boundaries(active);

-- TABLE 5: vera_data_gaps
-- Track what information is missing and how it affects Vera's confidence
CREATE TABLE IF NOT EXISTS vera_data_gaps (
    gap_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID,
    analysis_id UUID,
    
    -- What's missing?
    missing_data_type VARCHAR(100) NOT NULL,
        -- "procedure_detail", "standard_context", "organizational_structure", "user_clarification", 
        -- "procedure_examples", "implementation_evidence", "audit_history"
    missing_item_id UUID,
    missing_item_description TEXT,
    
    -- How severe is this gap?
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
        -- "critical" (blocks analysis entirely), "high" (significantly reduces confidence), "medium", "low"
    
    -- Why is it missing?
    reason TEXT NOT NULL,
    
    -- How can we get it?
    how_to_obtain TEXT,
    
    -- Impact on analysis
    confidence_reduction DECIMAL(3,2) NOT NULL DEFAULT 0.15,
    
    affects_mapping_count INT,
    
    -- Action taken
    action_taken VARCHAR(100),
        -- "asked_for_clarification", "flagged_for_manual_review", "proceeded_with_caveats", "halted_analysis"
    action_timestamp TIMESTAMP,
    
    -- Resolution
    resolution_type VARCHAR(50),
        -- "user_provided_data", "vera_made_reasonable_assumption", "manual_review_performed", "escalated"
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolution_summary TEXT,
    
    -- Learning
    learned_pattern TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_gaps_analysis ON vera_data_gaps(analysis_id);
CREATE INDEX IF NOT EXISTS idx_data_gaps_type ON vera_data_gaps(missing_data_type);
CREATE INDEX IF NOT EXISTS idx_data_gaps_severity ON vera_data_gaps(severity);
CREATE INDEX IF NOT EXISTS idx_data_gaps_resolved ON vera_data_gaps(resolved);

-- TABLE 6: vera_conversation_memory
-- Vera learns and remembers context within conversations AND across all conversations
CREATE TABLE IF NOT EXISTS vera_conversation_memory (
    memory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID,
    user_id UUID NOT NULL,
    tenant_id UUID,
    
    -- SHORT-TERM MEMORY (this conversation only)
    short_term_facts JSONB,
    short_term_learned_at TIMESTAMP,
    short_term_confidence DECIMAL(3,2) DEFAULT 0.80,
    
    -- LONG-TERM MEMORY (across all conversations)
    long_term_user_profile JSONB,
    long_term_patterns JSONB,
    
    -- What should Vera remember about THIS USER?
    user_preferences JSONB,
    user_expertise_areas TEXT[],
    user_blind_spots TEXT[],
    
    -- What should Vera remember about THIS CONVERSATION?
    conversation_summary TEXT,
    key_insights_from_user TEXT[],
    items_to_reference_later TEXT[],
    conversation_highlights JSONB,
    
    -- Confidence in these memories
    memory_confidence DECIMAL(3,2),
    memory_confidence_trend VARCHAR(50),
    
    -- Lifecycle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_referenced_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Learning value
    helped_improve_response BOOLEAN DEFAULT FALSE,
    times_referenced INT DEFAULT 0,
    avg_usefulness_rating DECIMAL(3,2)
);

CREATE INDEX IF NOT EXISTS idx_memory_user ON vera_conversation_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_conversation ON vera_conversation_memory(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memory_active ON vera_conversation_memory(is_active);
CREATE INDEX IF NOT EXISTS idx_memory_expires ON vera_conversation_memory(expires_at);

-- TABLE 7: vera_response_effectiveness
-- Track how well each response works so Vera learns what communication styles are best
CREATE TABLE IF NOT EXISTS vera_response_effectiveness (
    effectiveness_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID,
    vera_message_id VARCHAR(100),
    vera_turn_number INT,
    
    -- What response did Vera give?
    response_text TEXT,
    response_type VARCHAR(100),
    response_template_id UUID REFERENCES vera_response_templates(template_id),
    tone_used VARCHAR(50),
    detail_level_used INT,
    
    -- How did the user react?
    user_satisfaction_rating INT,
    was_satisfaction_explicit BOOLEAN,
    
    follow_up_question_asked BOOLEAN,
    follow_up_question_text TEXT,
    follow_up_indicates VARCHAR(50),
    
    user_asked_for_clarification BOOLEAN,
    user_provided_feedback TEXT,
    user_sentiment VARCHAR(50),
    
    -- Vera's self-assessment
    vera_confidence_in_response DECIMAL(3,2),
    vera_confidence_reasoning TEXT,
    
    -- Did the response help the task?
    helped_task_progress BOOLEAN,
    task_before VARCHAR(100),
    task_after VARCHAR(100),
    
    -- Signal for improvement
    improvement_needed BOOLEAN DEFAULT FALSE,
    improvement_areas TEXT[],
    
    -- Learning value
    learned_pattern TEXT,
    learned_keyword VARCHAR(255),
    
    -- Aggregation for training
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aggregated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_effectiveness_conversation ON vera_response_effectiveness(conversation_id);
CREATE INDEX IF NOT EXISTS idx_effectiveness_template ON vera_response_effectiveness(response_template_id);
CREATE INDEX IF NOT EXISTS idx_effectiveness_satisfaction ON vera_response_effectiveness(user_satisfaction_rating);
CREATE INDEX IF NOT EXISTS idx_effectiveness_type ON vera_response_effectiveness(response_type);

-- TABLE 8: vera_learning_events
-- Every time Vera learns something, record it (triggers daily improvement batch)
CREATE TABLE IF NOT EXISTS vera_learning_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID,
    analysis_id UUID,
    
    -- What type of learning event?
    event_type VARCHAR(100) NOT NULL,
        -- "parse_confidence_update", "clarification_feedback", "accuracy_feedback", "requirement_mapping_confirmed",
        -- "response_effectiveness", "pattern_recognized", "boundary_enforced"
    
    -- The learning
    learned_item VARCHAR(255),
    learned_detail JSONB,
    
    confidence_before DECIMAL(3,2),
    confidence_after DECIMAL(3,2),
    confidence_delta DECIMAL(3,2),
    
    -- Why did we learn this?
    triggering_action TEXT,
    
    -- Value of this learning
    is_positive_signal BOOLEAN,
    learning_value DECIMAL(3,2),
    applies_to TEXT[],
    
    -- Impact
    affects_future_confidence DECIMAL(3,2),
    affects_future_responses BOOLEAN DEFAULT FALSE,
    
    -- Aggregation
    processed_in_batch BOOLEAN DEFAULT FALSE,
    batch_id VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_events_type ON vera_learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_analysis ON vera_learning_events(analysis_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON vera_learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_events_processed ON vera_learning_events(processed_in_batch);

-- TABLE 9: vera_model_versions
-- Track Vera's evolution over time. Each day = new potential version.
CREATE TABLE IF NOT EXISTS vera_model_versions (
    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_number VARCHAR(20) NOT NULL UNIQUE,
    
    -- Performance metrics
    baseline_accuracy DECIMAL(4,3),
    baseline_precision DECIMAL(4,3),
    baseline_recall DECIMAL(4,3),
    baseline_confidence_calibration DECIMAL(4,3),
    
    -- What improved?
    improvements_from_previous_version TEXT[],
    improvement_delta DECIMAL(4,3),
    
    -- What changed in Vera?
    clarification_rules_version INT,
    response_template_count INT,
    knowledge_boundary_count INT,
    
    -- Training data
    trained_on_event_count INT,
    trained_on_conversation_count INT,
    training_data_quality DECIMAL(4,3),
    
    -- Lifecycle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    deployed_at TIMESTAMP,
    deprecated_at TIMESTAMP,
    
    status VARCHAR(50),
    
    -- Who made this version?
    created_by UUID,
    approved_by UUID,
    reason_for_update TEXT,
    
    -- Rollback capability
    can_rollback BOOLEAN DEFAULT TRUE,
    rollback_to_version VARCHAR(20),
    
    -- Notes
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_model_versions_version ON vera_model_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_model_versions_status ON vera_model_versions(status);
CREATE INDEX IF NOT EXISTS idx_model_versions_created ON vera_model_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_model_versions_deployed ON vera_model_versions(deployed_at);

-- TABLE 10: vera_daily_learning_batch
-- Aggregate daily learning and generate improvement metrics
CREATE TABLE IF NOT EXISTS vera_daily_learning_batch (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_date DATE NOT NULL UNIQUE,
    
    -- What happened today?
    total_conversations INT DEFAULT 0,
    total_analyses INT DEFAULT 0,
    total_learning_events INT DEFAULT 0,
    
    -- Breakdown of learning
    clarification_feedbacks_count INT,
    accuracy_ratings_count INT,
    response_effectiveness_ratings_count INT,
    new_patterns_discovered INT,
    
    -- Quality metrics
    avg_user_satisfaction DECIMAL(3,2),
    avg_vera_confidence DECIMAL(3,2),
    avg_confidence_calibration DECIMAL(3,2),
    
    -- Improvement signals
    overall_improvement_delta DECIMAL(4,3),
    improvement_confidence DECIMAL(3,2),
    areas_of_improvement TEXT[],
    areas_of_decline TEXT[],
    
    -- Decision: create new version?
    should_create_new_version BOOLEAN DEFAULT FALSE,
    improvement_threshold_met BOOLEAN,
    new_version_created BOOLEAN DEFAULT FALSE,
    new_version_id UUID REFERENCES vera_model_versions(version_id),
    new_version_number VARCHAR(20),
    
    -- Detailed analysis
    analysis_summary TEXT,
    learnings_summary TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    processed_at TIMESTAMP,
    reviewed_by UUID,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batch_date ON vera_daily_learning_batch(batch_date);
CREATE INDEX IF NOT EXISTS idx_batch_status ON vera_daily_learning_batch(status);

-- TABLE 11: vera_clarification_feedback
-- When user responds to Vera's clarifications, record what we learned
CREATE TABLE IF NOT EXISTS vera_clarification_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID,
    clarification_rule_id UUID REFERENCES vera_clarification_rules(rule_id),
    
    -- The clarification that was asked
    clarification_question TEXT,
    clarification_asked_at TIMESTAMP,
    
    -- The requirement and procedure involved
    requirement_id UUID,
    procedure_id UUID,
    vera_confidence_before DECIMAL(3,2),
    
    -- User's response
    user_response VARCHAR(50),
    user_response_detail TEXT,
    response_received_at TIMESTAMP,
    response_time_seconds INT,
    
    -- How did this help Vera?
    vera_confidence_after DECIMAL(3,2),
    confidence_improvement DECIMAL(3,2),
    
    mapping_result_after_feedback VARCHAR(50),
    
    -- Learning value
    learning_value_score DECIMAL(3,2),
    improved_model_accuracy BOOLEAN,
    
    -- Pattern recognition
    if_yes_suggests JSONB,
    if_no_suggests JSONB,
    
    -- Reusability
    can_apply_to_other_requirements TEXT[],
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_conversation ON vera_clarification_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rule ON vera_clarification_feedback(clarification_rule_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requirement ON vera_clarification_feedback(requirement_id);

-- TABLE 12: vera_user_interaction_patterns
-- Understand what works for each user type
CREATE TABLE IF NOT EXISTS vera_user_interaction_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID,
    
    -- User profile
    user_expertise_level VARCHAR(50),
    user_role VARCHAR(100),
    
    -- Communication preferences (learned over time)
    preferred_response_tone VARCHAR(50),
    preferred_detail_level INT,
    preferred_response_length VARCHAR(50),
    preferred_clarification_style VARCHAR(50),
    
    -- Interaction patterns
    avg_messages_per_conversation INT,
    avg_conversation_duration_minutes INT,
    typical_session_time VARCHAR(50),
    typical_day_of_week VARCHAR(50),
    
    -- What topics does this user typically analyze?
    most_analyzed_standards TEXT[],
    most_analyzed_industries TEXT[],
    
    -- Response patterns
    avg_satisfaction_rating DECIMAL(3,2),
    rating_variance DECIMAL(3,2),
    follow_up_question_rate DECIMAL(3,2),
    explicitly_rates_responses BOOLEAN,
    
    -- Vera should personalize for this user
    personalization_enabled BOOLEAN DEFAULT TRUE,
    personalization_confidence DECIMAL(3,2),
    
    -- Engagement
    is_active_user BOOLEAN DEFAULT TRUE,
    last_interaction TIMESTAMP,
    days_since_last_interaction INT,
    
    total_conversations INT,
    total_analyses INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_patterns_user ON vera_user_interaction_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_patterns_expertise ON vera_user_interaction_patterns(user_expertise_level);
CREATE INDEX IF NOT EXISTS idx_user_patterns_active ON vera_user_interaction_patterns(is_active_user);

-- Update ai_conversation_history table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'edcat' AND table_name = 'ai_conversation_history') THEN
        -- Add new columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'edcat' AND table_name = 'ai_conversation_history' 
                       AND column_name = 'conversation_context_id') THEN
            ALTER TABLE edcat.ai_conversation_history 
            ADD COLUMN conversation_context_id UUID,
            ADD COLUMN current_vera_model_version VARCHAR(20),
            ADD COLUMN vera_confidence_level DECIMAL(3,2),
            ADD COLUMN user_expertise_estimate VARCHAR(50),
            ADD COLUMN task_category VARCHAR(100),
            ADD COLUMN clarification_questions_asked INT DEFAULT 0,
            ADD COLUMN clarification_questions_answered INT DEFAULT 0,
            ADD COLUMN analysis_completed BOOLEAN DEFAULT FALSE,
            ADD COLUMN final_confidence_score DECIMAL(3,2),
            ADD COLUMN user_satisfaction_rating INT;
            
            CREATE INDEX IF NOT EXISTS idx_conv_history_context 
                ON edcat.ai_conversation_history(conversation_context_id);
            CREATE INDEX IF NOT EXISTS idx_conv_history_vera_version 
                ON edcat.ai_conversation_history(current_vera_model_version);
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'Vera Enhanced Intelligence System tables created successfully';
END $$;

