/**
 * Migration: 004_add_learning_tables
 * Adds tables for continuous learning system:
 * - gap_analysis_traces (audit trail)
 * - gap_feedback (reviewer feedback)
 * - gap_tuning (per-tenant/per-clause parameters)
 */

export const up = async (client) => {
  console.log('🔄 Creating learning system tables...');

  // gap_analysis_traces - Stores each run's raw signals for auditing
  await client.query(`
    CREATE TABLE IF NOT EXISTS customer_data.gap_analysis_traces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      standard_code TEXT NOT NULL,
      clause_ref TEXT NOT NULL,
      requested_doc_ids UUID[] NOT NULL,
      engine_config JSONB NOT NULL,
      candidates JSONB NOT NULL,
      result JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Table customer_data.gap_analysis_traces created');

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_gap_traces_tenant ON customer_data.gap_analysis_traces(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_gap_traces_standard ON customer_data.gap_analysis_traces(standard_code, clause_ref);
    CREATE INDEX IF NOT EXISTS idx_gap_traces_created ON customer_data.gap_analysis_traces(created_at);
  `);

  // gap_feedback - Reviewer feedback on a run
  await client.query(`
    CREATE TABLE IF NOT EXISTS customer_data.gap_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trace_id UUID NOT NULL REFERENCES customer_data.gap_analysis_traces(id) ON DELETE CASCADE,
      reviewer_id UUID,
      final_status TEXT NOT NULL CHECK (final_status IN ('covered','partially_covered','not_covered','insufficient_data')),
      notes TEXT,
      helpful_candidate_chunk_ids UUID[],
      unhelpful_chunk_ids UUID[],
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Table customer_data.gap_feedback created');

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_gap_feedback_trace ON customer_data.gap_feedback(trace_id);
    CREATE INDEX IF NOT EXISTS idx_gap_feedback_reviewer ON customer_data.gap_feedback(reviewer_id);
    CREATE INDEX IF NOT EXISTS idx_gap_feedback_status ON customer_data.gap_feedback(final_status);
  `);

  // gap_tuning - Tunable per-tenant/per-clause parameters
  await client.query(`
    CREATE TABLE IF NOT EXISTS customer_data.gap_tuning (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      standard_code TEXT NOT NULL,
      clause_ref TEXT NOT NULL,
      version INT NOT NULL DEFAULT 1,
      semantic_full REAL,
      semantic_partial REAL,
      lexicon_target INT,
      alpha REAL,
      beta REAL,
      gamma REAL,
      delta REAL,
      penalties JSONB,
      boosts JSONB,
      synonyms JSONB,
      stop_phrases JSONB,
      approved BOOLEAN DEFAULT FALSE,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      rationale JSONB
    )
  `);
  console.log('✓ Table customer_data.gap_tuning created');

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_gap_tuning_key ON customer_data.gap_tuning(tenant_id, standard_code, clause_ref, approved);
    CREATE INDEX IF NOT EXISTS idx_gap_tuning_approved ON customer_data.gap_tuning(approved) WHERE approved = TRUE;
  `);

  console.log('✅ Migration 004_add_learning_tables completed');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS customer_data.gap_tuning');
  await client.query('DROP TABLE IF EXISTS customer_data.gap_feedback');
  await client.query('DROP TABLE IF EXISTS customer_data.gap_analysis_traces');
  console.log('✅ Migration 004_add_learning_tables rolled back');
};

