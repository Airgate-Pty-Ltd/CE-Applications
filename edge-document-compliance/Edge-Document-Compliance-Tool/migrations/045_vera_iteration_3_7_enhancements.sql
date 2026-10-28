-- Migration 045: Vera Iteration 3 & 7 Enhancements
-- Iteration 3: Add embedding storage to conversation history
-- Iteration 7: Seed knowledge graph with standard relationships

-- ============================================================================
-- Iteration 3: Embedding Storage for Conversation History
-- ============================================================================

-- Add embedding column to conversation history for semantic search
ALTER TABLE edcat.ai_conversation_history
  ADD COLUMN IF NOT EXISTS embedding JSONB;

-- Add index for embedding queries (if pgvector is available)
CREATE INDEX IF NOT EXISTS idx_ach_embedding ON edcat.ai_conversation_history
  USING gin(embedding) WHERE embedding IS NOT NULL;

-- ============================================================================
-- Iteration 7: Knowledge Graph Seeding
-- ============================================================================

-- Seed standard relationships into knowledge graph
INSERT INTO edcat.knowledge_relationships (
  id,
  source_type,
  source_id,
  target_type,
  target_id,
  relationship_type,
  confidence,
  metadata
)
SELECT
  gen_random_uuid(),
  'standard',
  s1.id,
  'standard',
  s2.id,
  'based_on',
  0.95,
  jsonb_build_object(
    'description', s1.code || ' is based on ' || s2.code,
    'source', 'manual_seed'
  )
FROM public.standards s1
CROSS JOIN public.standards s2
WHERE 
  -- AS9100D is based on ISO 9001
  (s1.code LIKE 'AS9100%' AND s2.code LIKE 'ISO9001%')
  -- AS9110 is based on ISO 9001
  OR (s1.code LIKE 'AS9110%' AND s2.code LIKE 'ISO9001%')
  -- AS9120 is based on ISO 9001
  OR (s1.code LIKE 'AS9120%' AND s2.code LIKE 'ISO9001%')
  -- ISO 13485 is based on ISO 9001
  OR (s1.code LIKE 'ISO13485%' AND s2.code LIKE 'ISO9001%')
  -- IATF 16949 is based on ISO 9001
  OR (s1.code LIKE 'IATF%' AND s2.code LIKE 'ISO9001%')
ON CONFLICT DO NOTHING;

-- Add regulatory-to-standard relationships
INSERT INTO edcat.knowledge_relationships (
  id,
  source_type,
  source_id,
  target_type,
  target_id,
  relationship_type,
  confidence,
  metadata
)
SELECT
  gen_random_uuid(),
  'regulatory',
  NULL, -- Regulatory standards may not have IDs in standards table
  'standard',
  s.id,
  'complements',
  0.90,
  jsonb_build_object(
    'description', 'Regulatory requirement complements ' || s.code,
    'source', 'manual_seed',
    'regulatory_type', CASE 
      WHEN s.code LIKE 'FAA%' THEN 'FAA'
      WHEN s.code LIKE 'CASA%' THEN 'CASA'
      WHEN s.code LIKE 'EASA%' THEN 'EASA'
      WHEN s.code LIKE 'UKCAA%' THEN 'UK_CAA'
      ELSE 'REGULATORY'
    END
  )
FROM public.standards s
WHERE s.code LIKE 'FAA%' OR s.code LIKE 'CASA%' OR s.code LIKE 'EASA%' OR s.code LIKE 'UKCAA%'
ON CONFLICT DO NOTHING;

-- Add cross-standard similarity relationships
INSERT INTO edcat.knowledge_relationships (
  id,
  source_type,
  source_id,
  target_type,
  target_id,
  relationship_type,
  confidence,
  metadata
)
SELECT
  gen_random_uuid(),
  'standard',
  s1.id,
  'standard',
  s2.id,
  'similar_to',
  0.85,
  jsonb_build_object(
    'description', s1.code || ' is similar to ' || s2.code,
    'source', 'manual_seed',
    'similarity_reason', 'Both are quality management standards with similar structure'
  )
FROM public.standards s1
CROSS JOIN public.standards s2
WHERE 
  -- ISO 9001 and ISO 13485 are similar
  ((s1.code LIKE 'ISO9001%' AND s2.code LIKE 'ISO13485%')
   OR (s1.code LIKE 'ISO13485%' AND s2.code LIKE 'ISO9001%'))
  -- AS9100 and IATF 16949 are similar (both industry-specific extensions)
  OR ((s1.code LIKE 'AS9100%' AND s2.code LIKE 'IATF%')
      OR (s1.code LIKE 'IATF%' AND s2.code LIKE 'AS9100%'))
  AND s1.id != s2.id
ON CONFLICT DO NOTHING;

-- Create index for faster relationship queries
CREATE INDEX IF NOT EXISTS idx_kr_source ON edcat.knowledge_relationships(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_kr_target ON edcat.knowledge_relationships(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_kr_type ON edcat.knowledge_relationships(relationship_type);

COMMENT ON TABLE edcat.knowledge_relationships IS 'Knowledge graph relationships between standards, clauses, and requirements. Seeded with standard relationships for Iteration 7.';

