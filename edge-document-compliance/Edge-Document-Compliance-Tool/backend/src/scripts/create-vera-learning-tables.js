/**
 * Create Vera Learning Tables
 * Tables for storing learned corrections and reasoning patterns
 */

import { queryEdcatAI } from '../config/databases.js';

async function createVeraLearningTables() {
  console.log('\n🔄 Creating Vera Learning Tables...');

  try {
    // Create vera_learned_corrections table
    await queryEdcatAI(`
      CREATE TABLE IF NOT EXISTS vera_learned_corrections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        broken_input TEXT NOT NULL,
        corrected_output TEXT NOT NULL,
        confidence_before DECIMAL(3,2) NOT NULL,
        confidence_after DECIMAL(3,2) NOT NULL,
        user_feedback TEXT,
        usage_count INT DEFAULT 1,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ DEFAULT NOW(),
        confidence_improvement DECIMAL(3,2) GENERATED ALWAYS AS (confidence_after - confidence_before) STORED,
        UNIQUE(broken_input, corrected_output)
      );
      
      CREATE INDEX IF NOT EXISTS idx_vera_learned_corrections_broken 
        ON vera_learned_corrections(broken_input);
      CREATE INDEX IF NOT EXISTS idx_vera_learned_corrections_active 
        ON vera_learned_corrections(active) WHERE active = true;
      CREATE INDEX IF NOT EXISTS idx_vera_learned_corrections_usage 
        ON vera_learned_corrections(usage_count DESC);
    `);
    console.log('✓ Table vera_learned_corrections created.');

    // Create vera_reasoning_patterns table (for storing successful reasoning chains)
    await queryEdcatAI(`
      CREATE TABLE IF NOT EXISTS vera_reasoning_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        input_pattern TEXT NOT NULL,
        output_pattern TEXT NOT NULL,
        reasoning_steps JSONB NOT NULL,
        success_rate DECIMAL(3,2) DEFAULT 0.5,
        usage_count INT DEFAULT 1,
        last_success_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_vera_reasoning_patterns_input 
        ON vera_reasoning_patterns(input_pattern);
      CREATE INDEX IF NOT EXISTS idx_vera_reasoning_patterns_success 
        ON vera_reasoning_patterns(success_rate DESC);
    `);
    console.log('✓ Table vera_reasoning_patterns created.');

    console.log('\n✅ Vera Learning Tables created successfully.');
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating Vera Learning Tables:', error.message);
    return { success: false, error: error.message };
  }
}

// If this script is run directly, execute the table creation
if (import.meta.url === `file://${process.argv[1]}`) {
  createVeraLearningTables()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error during table creation:', error);
      process.exit(1);
    });
}

export { createVeraLearningTables };

