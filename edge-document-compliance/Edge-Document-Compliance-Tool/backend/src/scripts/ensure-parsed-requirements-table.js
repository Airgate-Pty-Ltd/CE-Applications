/**
 * Ensure parsed_requirements table exists in PostgreSQL
 * This script creates the table if it doesn't exist
 */

import { queryPostgres } from '../config/databases.js';

async function ensureParsedRequirementsTable() {
  try {
    console.log('🔍 Checking if public.parsed_requirements table exists...');
    
    // Check if table exists
    const checkResult = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'parsed_requirements'
      );
    `);
    
    const tableExists = checkResult.rows[0].exists;
    
    if (tableExists) {
      console.log('✅ public.parsed_requirements table already exists');
      
      // Check row count
      const countResult = await queryPostgres(`
        SELECT COUNT(*) as count FROM public.parsed_requirements
      `);
      console.log(`   Current row count: ${countResult.rows[0].count}`);
      return;
    }
    
    console.log('⚠️  public.parsed_requirements table does NOT exist. Creating it...');
    
    // Create the table
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS public.parsed_requirements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        standard_id UUID NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
        clause_number VARCHAR(100) NOT NULL,
        clause_title VARCHAR(500),
        requirement_text TEXT NOT NULL,
        requirement_type VARCHAR(100),
        requirement_subtype VARCHAR(100),
        keyword VARCHAR(50),
        modal_verb VARCHAR(50),
        intent TEXT,
        why_it_matters TEXT,
        common_gaps TEXT,
        evidence_requirements JSONB,
        related_clauses JSONB,
        audit_frequency VARCHAR(50),
        extracted_at TIMESTAMP DEFAULT NOW(),
        extracted_by_model_version VARCHAR(20) DEFAULT '1.0.0',
        confidence DECIMAL(3,2) DEFAULT 0.75,
        keywords TEXT,
        clause_ref VARCHAR(100),
        sub_ref VARCHAR(100),
        full_ref VARCHAR(200),
        requirement_uid VARCHAR(16),
        aerospace_addition BOOLEAN DEFAULT FALSE,
        requires_maintained_di BOOLEAN DEFAULT FALSE,
        is_informative_note BOOLEAN DEFAULT FALSE,
        is_recommendation BOOLEAN DEFAULT FALSE,
        is_in_scope BOOLEAN DEFAULT TRUE,
        clause_path_depth INT DEFAULT 0,
        subject_text TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Created public.parsed_requirements table');
    
    // Create indexes
    await queryPostgres(`
      CREATE INDEX IF NOT EXISTS idx_parsed_requirements_standard_id 
        ON public.parsed_requirements(standard_id);
      
      CREATE INDEX IF NOT EXISTS idx_parsed_requirements_clause_number 
        ON public.parsed_requirements(clause_number);
      
      CREATE INDEX IF NOT EXISTS idx_parsed_requirements_requirement_uid 
        ON public.parsed_requirements(requirement_uid);
      
      CREATE INDEX IF NOT EXISTS idx_parsed_requirements_full_ref 
        ON public.parsed_requirements(full_ref);
      
      CREATE INDEX IF NOT EXISTS idx_parsed_requirements_extracted_at 
        ON public.parsed_requirements(extracted_at DESC);
    `);
    
    console.log('✅ Created indexes on public.parsed_requirements table');
    
  } catch (error) {
    console.error('❌ Error ensuring parsed_requirements table:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureParsedRequirementsTable()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { ensureParsedRequirementsTable };

