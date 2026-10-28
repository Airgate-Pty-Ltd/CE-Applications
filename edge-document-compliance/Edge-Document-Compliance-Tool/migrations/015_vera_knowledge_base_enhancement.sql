-- =============================================================================
-- MIGRATION 015: Vera Knowledge Base Enhancement System
-- Creates 12 new tables for semantic understanding, knowledge graphs, and self-directed learning
-- =============================================================================

-- Enable pgvector extension (if available)
-- Note: Railway PostgreSQL may need pgvector extension enabled
-- If extension is not available, embeddings will be stored as JSONB instead
DO $$
BEGIN
    -- Try to create extension, but don't fail if it doesn't exist
    BEGIN
        CREATE EXTENSION IF NOT EXISTS vector;
        RAISE NOTICE 'pgvector extension enabled';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension not available, will use JSONB for embeddings';
    END;
END $$;

-- TABLE 1: requirement_embeddings
-- Store vector embeddings of requirements for semantic similarity
CREATE TABLE IF NOT EXISTS requirement_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL,
    
    -- The requirement text being embedded
    requirement_text TEXT NOT NULL,
    
    -- Vector embedding (1536-dimensional from OpenAI's text-embedding-3-small)
    -- If pgvector not available, store as JSONB
    embedding JSONB, -- Will store as array of numbers
    
    -- Metadata about the embedding
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    embedding_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Quality metrics
    embedding_confidence DECIMAL(3,2), -- 0-1, how good is this embedding?
    
    -- Related embeddings (for fast retrieval)
    similar_requirement_ids UUID[], -- Top 5 most similar requirements
    similarity_scores DECIMAL(3,2)[], -- Confidence of similarity [0.92, 0.88, 0.85, ...]
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requirement_embedding_requirement_id ON requirement_embeddings(requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_embedding_model ON requirement_embeddings(embedding_model);

-- TABLE 2: procedure_embeddings
-- Store vector embeddings of customer procedures
CREATE TABLE IF NOT EXISTS procedure_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL,
    
    -- The procedure text being embedded
    procedure_text TEXT NOT NULL,
    
    -- Vector embedding
    embedding JSONB, -- Will store as array of numbers
    
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    embedding_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    embedding_confidence DECIMAL(3,2),
    
    -- What does this procedure relate to?
    related_concepts TEXT[], -- ["change_control", "management_review", "design_control"]
    concept_scores DECIMAL(3,2)[],
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_procedure_embedding_procedure_id ON procedure_embeddings(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_embedding_model ON procedure_embeddings(embedding_model);

-- TABLE 3: vera_knowledge_graph_concepts
-- Core concepts from standards that Vera understands deeply
CREATE TABLE IF NOT EXISTS vera_knowledge_graph_concepts (
    concept_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The concept
    concept_name VARCHAR(255) NOT NULL UNIQUE,
    concept_description TEXT,
    
    -- Is this concept foundational across standards?
    is_universal_concept BOOLEAN DEFAULT FALSE, -- Appears in ISO, AS, FAA, etc.
    
    -- Which standards include this concept?
    appears_in_standards TEXT[], -- ["ISO9001", "AS9100D", "IATF16949"]
    
    -- Related concepts (concept relationships)
    related_concepts JSONB, 
        -- {"enables": ["audit_planning"], "requires": ["management_commitment"], "prevents": ["non_conformance"]}
    
    -- Requirements that express this concept
    requirement_ids UUID[],
    
    -- How central is this concept to quality?
    importance_score DECIMAL(3,2), -- 0-1
    complexity_score DECIMAL(3,2), -- 0-1 (simple vs complex to understand)
    
    -- Examples of how this is implemented
    implementation_examples TEXT[],
    
    -- Common misconceptions
    common_misconceptions TEXT[],
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_concepts_name ON vera_knowledge_graph_concepts(concept_name);
CREATE INDEX IF NOT EXISTS idx_concepts_universal ON vera_knowledge_graph_concepts(is_universal_concept);

-- TABLE 4: vera_concept_relationships
-- How concepts relate to each other (the knowledge graph structure)
CREATE TABLE IF NOT EXISTS vera_concept_relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Two concepts
    concept_id_1 UUID NOT NULL REFERENCES vera_knowledge_graph_concepts(concept_id),
    concept_id_2 UUID NOT NULL REFERENCES vera_knowledge_graph_concepts(concept_id),
    
    -- Type of relationship
    relationship_type VARCHAR(100) NOT NULL,
        -- "enables" (A enables B), "requires" (A requires B), "conflicts_with", 
        -- "similar_to", "specializes" (A is a special case of B),
        -- "depends_on", "supports", "implements"
    
    -- Strength of relationship
    relationship_strength DECIMAL(3,2), -- 0-1, how strong is this relationship?
    
    -- Why do they relate?
    relationship_reason TEXT,
    
    -- Evidence from standards
    supporting_requirements JSONB,
        -- {"ISO9001_8.5.6": "manage changes", "ISO9001_8.3": "control design"}
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_concept_rel_1 ON vera_concept_relationships(concept_id_1);
CREATE INDEX IF NOT EXISTS idx_concept_rel_2 ON vera_concept_relationships(concept_id_2);
CREATE INDEX IF NOT EXISTS idx_concept_rel_type ON vera_concept_relationships(relationship_type);

-- TABLE 5: vera_requirement_reasoning_chains
-- When a procedure covers a requirement, store the reasoning (not just the match)
CREATE TABLE IF NOT EXISTS vera_requirement_reasoning_chains (
    chain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The mapping this chain explains
    requirement_id UUID NOT NULL,
    procedure_id UUID NOT NULL,
    mapping_id UUID,
    
    -- What's the reasoning?
    reasoning_type VARCHAR(100), 
        -- "direct_match", "semantic_similarity", "concept_coverage", "process_alignment", "control_coverage"
    
    reasoning_text TEXT,
    
    -- Break down the reasoning
    concepts_covered UUID[], -- Which concepts from knowledge graph does this cover?
    requirements_satisfied JSONB, -- Which specific requirement clauses are met?
    gaps_in_reasoning TEXT[], -- What's NOT covered by this procedure?
    
    -- Confidence in this reasoning
    reasoning_confidence DECIMAL(3,2), -- How confident is Vera in this logic?
    reasoning_quality_score DECIMAL(3,2), -- How well-reasoned is this? (1-5 scale)
    
    -- Has a human validated this reasoning?
    validated_by_human BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP,
    human_notes TEXT,
    
    -- Can Vera reuse this reasoning pattern?
    is_reusable_pattern BOOLEAN DEFAULT FALSE, -- Could apply to other procs/reqs?
    applies_to_other_requirements UUID[], -- Which other requirements could use this reasoning?
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reasoning_requirement ON vera_requirement_reasoning_chains(requirement_id);
CREATE INDEX IF NOT EXISTS idx_reasoning_procedure ON vera_requirement_reasoning_chains(procedure_id);
CREATE INDEX IF NOT EXISTS idx_reasoning_type ON vera_requirement_reasoning_chains(reasoning_type);

-- TABLE 6: vera_pattern_discoveries
-- Track patterns Vera discovers about standards and compliance
CREATE TABLE IF NOT EXISTS vera_pattern_discoveries (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What pattern did Vera discover?
    pattern_name VARCHAR(255) NOT NULL,
    pattern_description TEXT,
    
    -- Type of pattern
    pattern_type VARCHAR(100),
        -- "requirement_cluster", "common_gap", "implementation_variation", 
        -- "standard_overlap", "industry_specific", "maturity_progression"
    
    -- Where does this pattern appear?
    appears_in_standards TEXT[], -- ["ISO9001", "AS9100D"]
    appears_in_industries TEXT[], -- ["aerospace", "medical", "automotive"]
    frequency_count INT, -- How many times observed?
    
    -- Why does this pattern matter?
    significance_score DECIMAL(3,2), -- 0-1, how important is this pattern?
    
    -- What does it mean?
    interpretation TEXT,
    
    -- How can Vera use this?
    vera_application TEXT,
    
    -- Has Vera validated this?
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP,
    validation_confidence DECIMAL(3,2), -- Is this pattern reliable?
    
    -- Track learning value
    helped_improve_analysis BOOLEAN DEFAULT FALSE,
    times_applied INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patterns_type ON vera_pattern_discoveries(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_significance ON vera_pattern_discoveries(significance_score DESC);

-- TABLE 7: vera_self_learning_questions
-- Questions Vera asks HERSELF to deepen understanding
CREATE TABLE IF NOT EXISTS vera_self_learning_questions (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What is Vera wondering?
    question_text TEXT NOT NULL,
    question_category VARCHAR(100),
        -- "concept_understanding", "requirement_interpretation", "pattern_validation",
        -- "gap_analysis", "transfer_learning", "edge_cases"
    
    -- What triggered this question?
    triggered_by_event TEXT, 
        -- "user_clarification", "contradiction_detected", "pattern_noticed", "low_confidence_analysis"
    
    -- What would answering this question help?
    learning_potential_score DECIMAL(3,2), -- How valuable is answering this?
    
    -- Vera's current hypothesis
    hypothesis TEXT,
    hypothesis_confidence DECIMAL(3,2),
    
    -- How to test the hypothesis
    validation_method TEXT,
    
    -- Has Vera answered this?
    is_answered BOOLEAN DEFAULT FALSE,
    answer_text TEXT,
    answer_source VARCHAR(100), -- "user_feedback", "analysis_result", "expert_consultation"
    answered_at TIMESTAMP,
    answer_confidence DECIMAL(3,2),
    
    -- Learning outcome
    learned_insight TEXT, -- What did Vera learn from answering this?
    applies_to TEXT[], -- What does this insight improve?
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_self_questions_category ON vera_self_learning_questions(question_category);
CREATE INDEX IF NOT EXISTS idx_self_questions_answered ON vera_self_learning_questions(is_answered);

-- TABLE 8: vera_standard_profiles
-- Vera's understanding of each standard's structure, intent, and nuances
CREATE TABLE IF NOT EXISTS vera_standard_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id UUID,
    
    -- Basic info
    standard_code VARCHAR(50), -- ISO9001, AS9100D, etc.
    standard_full_name TEXT,
    
    -- Vera's understanding of this standard
    vera_knowledge_summary TEXT, -- What does Vera know about this standard?
    
    -- Structure
    section_count INT, -- How many main sections?
    clause_count INT, -- Total clauses/requirements?
    critical_clauses UUID[], -- Which requirements are most important?
    
    -- Strategic intent (what is the standard trying to achieve?)
    strategic_intent TEXT,
    
    -- Core concepts in this standard
    core_concepts UUID[], -- FK to vera_knowledge_graph_concepts
    core_concept_importance JSONB, -- {"change_control": 0.95, "management_review": 0.90}
    
    -- Common implementation approaches
    typical_implementations JSONB,
    
    -- Common gaps
    typical_gaps TEXT[],
    
    -- Relationships to other standards
    related_standards JSONB,
    
    -- Industry variations
    industry_variations JSONB,
    
    -- Vera's confidence in understanding this standard
    vera_expertise_level DECIMAL(3,2), -- 0-1, how expert is Vera on this standard?
    expertise_last_updated TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_standard_profiles_standard_id ON vera_standard_profiles(standard_id);
CREATE INDEX IF NOT EXISTS idx_standard_profiles_code ON vera_standard_profiles(standard_code);

-- TABLE 9: vera_transfer_learning_maps
-- When Vera learns about one standard, automatically apply to similar ones
CREATE TABLE IF NOT EXISTS vera_transfer_learning_maps (
    map_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The learning
    source_standard VARCHAR(50), -- ISO9001
    source_concept_id UUID REFERENCES vera_knowledge_graph_concepts(concept_id),
    source_requirement_id UUID,
    
    -- Apply to
    target_standard VARCHAR(50), -- AS9100D
    target_concept_id UUID REFERENCES vera_knowledge_graph_concepts(concept_id),
    target_requirement_id UUID,
    
    -- The mapping
    transfer_rule TEXT,
    
    -- Confidence in transfer
    transfer_confidence DECIMAL(3,2),
    
    -- Has this transfer proven accurate?
    validated BOOLEAN DEFAULT FALSE,
    validation_count INT DEFAULT 0,
    validation_accuracy DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transfer_source ON vera_transfer_learning_maps(source_standard);
CREATE INDEX IF NOT EXISTS idx_transfer_target ON vera_transfer_learning_maps(target_standard);

-- TABLE 10: vera_expert_training_sessions
-- Track when humans teach Vera (guided learning)
CREATE TABLE IF NOT EXISTS vera_expert_training_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who's teaching?
    expert_user_id UUID, -- Compliance expert
    expertise_area VARCHAR(255), -- "ISO9001", "AS9100D", "FAA_regulations"
    
    -- What's being taught?
    topic TEXT,
    lesson_type VARCHAR(100), -- "concept_explanation", "requirement_interpretation", "pattern_teaching"
    
    -- The teaching content
    teaching_content JSONB,
    
    -- What Vera learned
    vera_understanding_before TEXT,
    vera_understanding_after TEXT,
    understanding_improvement_score DECIMAL(3,2),
    
    -- Has Vera applied this learning?
    applied_to_analyses INT DEFAULT 0,
    accuracy_when_applied DECIMAL(3,2),
    
    -- Quality of training
    training_effectiveness_score DECIMAL(3,2), -- 1-5
    expert_notes TEXT,
    
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_expert ON vera_expert_training_sessions(expert_user_id);
CREATE INDEX IF NOT EXISTS idx_training_topic ON vera_expert_training_sessions(expertise_area);

-- TABLE 11: vera_contextual_enrichment
-- Rich context for each requirement to improve understanding
CREATE TABLE IF NOT EXISTS vera_contextual_enrichment (
    enrichment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL,
    
    -- What's the context?
    context_type VARCHAR(100),
        -- "business_context", "process_context", "technical_context", 
        -- "regulatory_context", "customer_impact"
    
    context_description TEXT,
    
    -- Why does this requirement exist?
    requirement_purpose TEXT,
    
    -- Who is affected?
    affects_which_roles TEXT[], -- ["QMS Manager", "Design Engineer", "Operations"]
    
    -- What happens if this requirement is NOT met?
    if_not_met_consequences TEXT[],
    
    -- How is this related to other requirements?
    prerequisite_requirements UUID[],
    dependent_requirements UUID[],
    
    -- Real-world examples
    real_world_examples JSONB,
    
    -- Evidence of importance
    audit_failure_frequency DECIMAL(3,2), -- How often is this a finding?
    customer_complaint_frequency DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enrichment_requirement ON vera_contextual_enrichment(requirement_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_context_type ON vera_contextual_enrichment(context_type);

-- TABLE 12: vera_reasoning_validation_feedback
-- When Vera explains her reasoning, track if humans agree
CREATE TABLE IF NOT EXISTS vera_reasoning_validation_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID REFERENCES vera_requirement_reasoning_chains(chain_id),
    
    -- Who validated?
    validator_user_id UUID,
    validator_expertise_level VARCHAR(50), -- "novice", "intermediate", "expert"
    
    -- What was Vera's reasoning?
    vera_reasoning TEXT,
    vera_confidence DECIMAL(3,2),
    
    -- Did the validator agree?
    validation_result VARCHAR(50), -- "fully_correct", "mostly_correct", "partially_correct", "incorrect"
    validator_confidence DECIMAL(3,2), -- How confident is the validator?
    
    -- Feedback
    validator_comments TEXT,
    what_vera_got_right TEXT,
    what_vera_missed TEXT,
    corrections_needed TEXT,
    
    -- Learning
    learned_lesson TEXT,
    
    -- Quality metrics
    reasoning_quality_before DECIMAL(3,2),
    reasoning_quality_after DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_validation_chain ON vera_reasoning_validation_feedback(chain_id);
CREATE INDEX IF NOT EXISTS idx_validation_result ON vera_reasoning_validation_feedback(validation_result);

DO $$
BEGIN
    RAISE NOTICE 'Vera Knowledge Base Enhancement tables created successfully';
END $$;

