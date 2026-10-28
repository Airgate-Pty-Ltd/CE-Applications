/**
 * Robust script to ensure parsed_requirements table exists
 * This can be run manually or called from the parse route
 */

import dotenv from 'dotenv';
import { queryPostgres } from '../config/databases.js';

dotenv.config();

async function ensureParsedRequirementsTable() {
  try {
    console.log('🔍 Checking if parsed_requirements table exists...');
    
    // Check if table exists
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'parsed_requirements'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ parsed_requirements table exists');
      
      // Verify all required columns exist
      const columnsCheck = await queryPostgres(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'parsed_requirements'
        ORDER BY ordinal_position;
      `);
      
      console.log(`   Found ${columnsCheck.rows.length} columns`);
      
      const requiredColumns = [
        { name: 'id', type: 'UUID' },
        { name: 'standard_id', type: 'UUID' },
        { name: 'clause_number', type: 'VARCHAR(100)' },
        { name: 'clause_title', type: 'VARCHAR(500)' },
        { name: 'requirement_text', type: 'TEXT' },
        { name: 'requirement_type', type: 'VARCHAR(100)' },
        { name: 'requirement_subtype', type: 'VARCHAR(100)' },
        { name: 'clause_ref', type: 'VARCHAR(100)' },
        { name: 'sub_ref', type: 'VARCHAR(100)' },
        { name: 'full_ref', type: 'VARCHAR(200)' },
        { name: 'clause_path_depth', type: 'INT DEFAULT 0' },
        { name: 'subject_text', type: 'TEXT' },
        { name: 'is_informative_note', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'is_recommendation', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'is_in_scope', type: 'BOOLEAN DEFAULT TRUE' },
        { name: 'keyword', type: 'VARCHAR(50)' },
        { name: 'modal_verb', type: 'VARCHAR(50)' },
        { name: 'intent', type: 'TEXT' },
        { name: 'keywords', type: 'TEXT' },
        { name: 'confidence', type: 'DECIMAL(3,2) DEFAULT 0.75' },
        { name: 'requirement_uid', type: 'VARCHAR(16)' },
        { name: 'extraction_flags', type: 'JSONB' },
        { name: 'extracted_at', type: 'TIMESTAMP DEFAULT NOW()' },
        { name: 'extracted_by_model_version', type: 'VARCHAR(20) DEFAULT \'1.0.0\'' }
      ];
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col.name));
      
      if (missingColumns.length > 0) {
        console.log(`⚠️  Missing columns: ${missingColumns.map(c => c.name).join(', ')}`);
        console.log('   Adding missing columns...');
        
        for (const col of missingColumns) {
          try {
            await queryPostgres(`ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
            console.log(`   ✅ Added column: ${col.name}`);
          } catch (error) {
            console.warn(`   ⚠️  Failed to add ${col.name}: ${error.message}`);
          }
        }
      } else {
        console.log('   ✅ All required columns exist');
      }
      
      return true;
    }
    
    console.log('⚠️  parsed_requirements table does not exist. Creating it...');
    
    // Create the table
    await queryPostgres(`
      CREATE TABLE public.parsed_requirements (
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
        requires_retained_di BOOLEAN DEFAULT FALSE,
        is_informative_note BOOLEAN DEFAULT FALSE,
        is_recommendation BOOLEAN DEFAULT FALSE,
        is_in_scope BOOLEAN DEFAULT TRUE,
        clause_path_depth INT DEFAULT 0,
        subject_text TEXT,
        extraction_flags JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Created parsed_requirements table');
    
    // Create indexes
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_standard_id ON public.parsed_requirements(standard_id)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_clause_ref ON public.parsed_requirements(clause_ref)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_full_ref ON public.parsed_requirements(full_ref)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_extracted_at ON public.parsed_requirements(extracted_at DESC)');
    
    console.log('✅ Created indexes');
    
    return true;
  } catch (error) {
    console.error('❌ Error ensuring parsed_requirements table:', error.message);
    console.error('   SQL State:', error.code);
    console.error('   Detail:', error.detail);
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

