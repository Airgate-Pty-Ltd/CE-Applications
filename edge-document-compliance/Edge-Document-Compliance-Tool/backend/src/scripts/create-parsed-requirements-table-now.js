/**
 * IMMEDIATE FIX: Create parsed_requirements table directly
 * This script creates the table immediately to fix parsing issues
 */

import dotenv from 'dotenv';
import { queryPostgres } from '../config/databases.js';

dotenv.config();

async function createParsedRequirementsTableNow() {
  console.log('🔧 Creating parsed_requirements table immediately...');
  console.log('='.repeat(80));
  
  try {
    // Check if table exists
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'parsed_requirements'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ parsed_requirements table already exists');
      
      // Check if it has required columns
      const columnsCheck = await queryPostgres(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'parsed_requirements'
        ORDER BY ordinal_position;
      `);
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      console.log(`   Found ${existingColumns.length} columns: ${existingColumns.join(', ')}`);
      
      // List of all required columns
      const requiredColumns = [
        { name: 'clause_number', type: 'VARCHAR(100)' },
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
        { name: 'requirement_uid', type: 'VARCHAR(16)' },
        { name: 'aerospace_addition', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'requires_maintained_di', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'requires_retained_di', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'extraction_flags', type: 'JSONB' },
        { name: 'keyword', type: 'VARCHAR(50)' },
        { name: 'modal_verb', type: 'VARCHAR(50)' },
        { name: 'intent', type: 'TEXT' },
        { name: 'keywords', type: 'TEXT' },
        { name: 'confidence', type: 'DECIMAL(3,2) DEFAULT 0.75' },
        { name: 'extraction_flags', type: 'JSONB' },
        { name: 'extracted_at', type: 'TIMESTAMP DEFAULT NOW()' },
        { name: 'extracted_by_model_version', type: 'VARCHAR(20) DEFAULT \'1.0.0\'' }
      ];
      
      // Check for missing columns and add them
      let addedColumns = [];
      for (const col of requiredColumns) {
        if (!existingColumns.includes(col.name)) {
          console.log(`   ⚠️  Missing ${col.name} column, adding it...`);
          try {
            await queryPostgres(`
              ALTER TABLE public.parsed_requirements 
              ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
            `);
            addedColumns.push(col.name);
            console.log(`   ✅ Added ${col.name} column`);
          } catch (error) {
            console.warn(`   ⚠️  Failed to add ${col.name}: ${error.message}`);
          }
        }
      }
      
      if (addedColumns.length > 0) {
        console.log(`   ✅ Added ${addedColumns.length} missing column(s): ${addedColumns.join(', ')}`);
      } else {
        console.log('   ✅ All required columns exist');
      }
      
      return true;
    }
    
    console.log('⚠️  parsed_requirements table does not exist. Creating it...');
    
    // Create the table with all required columns
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
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_clause_number ON public.parsed_requirements(clause_number)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_clause_ref ON public.parsed_requirements(clause_ref)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_full_ref ON public.parsed_requirements(full_ref)');
    await queryPostgres('CREATE INDEX IF NOT EXISTS idx_parsed_requirements_extracted_at ON public.parsed_requirements(extracted_at DESC)');
    
    console.log('✅ Created indexes');
    
    // Verify table was created
    const verifyCheck = await queryPostgres(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'parsed_requirements'
    `);
    
    if (verifyCheck.rows[0].count > 0) {
      console.log('✅ Verification: parsed_requirements table exists');
      
      // Check columns
      const finalColumns = await queryPostgres(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'parsed_requirements'
        ORDER BY ordinal_position;
      `);
      
      console.log(`✅ Table has ${finalColumns.rows.length} columns`);
      console.log(`   Columns: ${finalColumns.rows.map(r => r.column_name).join(', ')}`);
    }
    
    console.log('\n✅ parsed_requirements table created successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating parsed_requirements table:', error.message);
    console.error('   SQL State:', error.code);
    console.error('   Detail:', error.detail);
    throw error;
  }
}

// Export for use as module
export default createParsedRequirementsTableNow;

// Run if called directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || 
    process.argv[1]?.includes('create-parsed-requirements-table-now.js')) {
  createParsedRequirementsTableNow()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

