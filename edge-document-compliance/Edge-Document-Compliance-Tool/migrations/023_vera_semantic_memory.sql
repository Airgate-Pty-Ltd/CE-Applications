-- =============================================================================
-- MIGRATION 023: Vera Semantic Memory System
-- Purpose: Add semantic search and embedding storage for Vera v3.0
-- =============================================================================

-- Create knowledge_embeddings table in EDCAT AI DB
CREATE TABLE IF NOT EXISTS edcat.knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    source_type TEXT NOT NULL, -- 'standard_clause', 'customer_doc', 'qna', 'website', 'conversation'
    source_id TEXT NOT NULL, -- UUID or composite ID (e.g., 'doc-id-chunk-0')
    text_content TEXT NOT NULL, -- Original text (limited to 10k chars)
    embedding JSONB NOT NULL, -- Embedding vector stored as JSONB array
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
    model TEXT NOT NULL DEFAULT 'tfidf-local', -- Embedding model used
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_type, source_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_tenant 
    ON edcat.knowledge_embeddings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_source_type 
    ON edcat.knowledge_embeddings (source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_source_id 
    ON edcat.knowledge_embeddings (source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_created_at 
    ON edcat.knowledge_embeddings (created_at DESC);

-- GIN index on embedding for similarity search (if pgvector not available, we use JSONB)
-- Note: For production with pgvector, you would use:
-- CREATE INDEX idx_knowledge_embeddings_embedding ON edcat.knowledge_embeddings 
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- For now, we'll use JSONB and calculate similarity in application code

-- Comments
COMMENT ON TABLE edcat.knowledge_embeddings IS 'Semantic memory storage for Vera AI - stores embeddings of all knowledge sources';
COMMENT ON COLUMN edcat.knowledge_embeddings.source_type IS 'Type of knowledge source: standard_clause, customer_doc, qna, website, conversation';
COMMENT ON COLUMN edcat.knowledge_embeddings.source_id IS 'Unique identifier for the source (UUID or composite like doc-id-chunk-0)';
COMMENT ON COLUMN edcat.knowledge_embeddings.embedding IS 'Vector embedding stored as JSONB array of numbers';
COMMENT ON COLUMN edcat.knowledge_embeddings.model IS 'Embedding model identifier (tfidf-local, ollama, mistral, etc.)';

-- Create conversation_memory table for conversation history with embeddings
CREATE TABLE IF NOT EXISTS edcat.conversation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID, -- References edcat.ai_user_profile.id
    session_id UUID, -- Links to ai_conversation_state.session_id
    message_text TEXT NOT NULL,
    embedding JSONB, -- Optional: embedding for semantic search
    intent TEXT,
    linked_to_previous UUID REFERENCES edcat.conversation_memory(id), -- Threading
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_memory_tenant 
    ON edcat.conversation_memory (tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_session 
    ON edcat.conversation_memory (session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_user 
    ON edcat.conversation_memory (user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_created_at 
    ON edcat.conversation_memory (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_linked 
    ON edcat.conversation_memory (linked_to_previous);

COMMENT ON TABLE edcat.conversation_memory IS 'Conversation history with semantic search capabilities for Vera v3.0';
COMMENT ON COLUMN edcat.conversation_memory.embedding IS 'Optional embedding for semantic conversation search';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

