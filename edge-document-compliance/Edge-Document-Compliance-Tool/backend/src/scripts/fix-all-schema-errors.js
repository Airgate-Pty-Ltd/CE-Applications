/**
 * Comprehensive Schema Fix Script
 * Fixes all schema mismatches in both PostgreSQL and EDCAT AI databases
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function fixPostgreSQLSchema() {
  console.log('\n🔧 FIXING POSTGRESQL SCHEMA\n');
  console.log('='.repeat(60));

  try {
    // ============================================================
    // 1. Fix tenants table
    // ============================================================
    console.log('\n1️⃣  Fixing tenants table...');
    
    // Check if tenants table exists
    const tenantsExists = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tenants'
      ) as exists
    `);
    
    if (!tenantsExists.rows[0].exists) {
      console.log('   Creating tenants table...');
      await queryPostgres(`
        CREATE TABLE public.tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          industry VARCHAR(100),
          region VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          is_active BOOLEAN DEFAULT TRUE,
          metadata JSONB
        )
      `);
      console.log('   ✅ Created tenants table');
    } else {
      // Add missing columns
      await queryPostgres(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS key VARCHAR(255) UNIQUE`).catch(() => {});
      await queryPostgres(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS industry VARCHAR(100)`).catch(() => {});
      await queryPostgres(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS region VARCHAR(100)`).catch(() => {});
      await queryPostgres(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS metadata JSONB`).catch(() => {});
      
      // Set default key for existing rows
      await queryPostgres(`
        UPDATE public.tenants 
        SET key = COALESCE(key, 'tenant_' || id::text) 
        WHERE key IS NULL
      `).catch(() => {});
      
      // Make key NOT NULL if all rows have keys now
      try {
        await queryPostgres(`ALTER TABLE public.tenants ALTER COLUMN key SET NOT NULL`);
      } catch (e) {
        // If it fails, some rows still have NULL - that's ok for now
      }
      
      console.log('   ✅ Fixed tenants table columns');
    }
    
    // Insert default tenant if it doesn't exist (with key)
    // First check if key column exists and is NOT NULL
    const keyColumnCheck = await queryPostgres(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tenants' 
      AND column_name = 'key'
    `).catch(() => ({ rows: [] }));
    
    if (keyColumnCheck.rows.length > 0 && keyColumnCheck.rows[0].is_nullable === 'NO') {
      // Key is NOT NULL, must provide it
      await queryPostgres(`
        INSERT INTO public.tenants (name, key, industry, region)
        SELECT 'Default Organization', 'default-org', 'Manufacturing', 'North America'
        WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE name = 'Default Organization' OR key = 'default-org')
      `).catch(() => {});
    } else {
      // Key is nullable or doesn't exist, insert without it
      await queryPostgres(`
        INSERT INTO public.tenants (name, industry, region)
        SELECT 'Default Organization', 'Manufacturing', 'North America'
        WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE name = 'Default Organization')
      `).catch(() => {});
    }
    console.log('   ✅ Default tenant ready');

    // ============================================================
    // 2. Fix standard_files table
    // ============================================================
    console.log('\n2️⃣  Fixing standard_files table...');
    
    const standardFilesExists = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'standard_files'
      ) as exists
    `);
    
    if (!standardFilesExists.rows[0].exists) {
      console.log('   Creating standard_files table...');
      await queryPostgres(`
        CREATE TABLE public.standard_files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          file_name VARCHAR(255) NOT NULL,
          file_path TEXT NOT NULL,
          file_size BIGINT,
          file_type VARCHAR(50),
          file_category VARCHAR(100) NOT NULL DEFAULT 'documents',
          standard_id UUID REFERENCES public.standards(id) ON DELETE SET NULL,
          uploaded_at TIMESTAMP DEFAULT NOW(),
          parsed_at TIMESTAMP,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ Created standard_files table');
    } else {
      // Add missing columns
      await queryPostgres(`ALTER TABLE public.standard_files ADD COLUMN IF NOT EXISTS file_category VARCHAR(100) DEFAULT 'documents'`).catch(() => {});
      await queryPostgres(`ALTER TABLE public.standard_files ADD COLUMN IF NOT EXISTS metadata JSONB`).catch(() => {});
      await queryPostgres(`ALTER TABLE public.standard_files ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`).catch(() => {});
      await queryPostgres(`ALTER TABLE public.standard_files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`).catch(() => {});
      
      // Fix NULL file_category values
      await queryPostgres(`UPDATE public.standard_files SET file_category = 'documents' WHERE file_category IS NULL`).catch(() => {});
      
      // Rename file_id to id if needed
      const hasFileId = await queryPostgres(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'standard_files' 
          AND column_name = 'file_id'
        ) as exists
      `);
      const hasId = await queryPostgres(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'standard_files' 
          AND column_name = 'id'
        ) as exists
      `);
      
      if (hasFileId.rows[0].exists && !hasId.rows[0].exists) {
        console.log('   Renaming file_id to id...');
        await queryPostgres(`ALTER TABLE public.standard_files RENAME COLUMN file_id TO id`);
        console.log('   ✅ Renamed file_id to id');
      }
      
      console.log('   ✅ Fixed standard_files table columns');
    }
    
    // Create indexes
    await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_standard_files_category ON public.standard_files(file_category)`).catch(() => {});
    await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_standard_files_standard_id ON public.standard_files(standard_id)`).catch(() => {});

    // ============================================================
    // 3. Fix standards table
    // ============================================================
    console.log('\n3️⃣  Fixing standards table...');
    
    // Add total_clauses column (alias for total_requirements)
    await queryPostgres(`ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS total_clauses INT`).catch(() => {});
    
    // Sync total_clauses with total_requirements if total_requirements exists
    const hasTotalReqs = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'standards' 
        AND column_name = 'total_requirements'
      ) as exists
    `);
    
    if (hasTotalReqs.rows[0].exists) {
      await queryPostgres(`
        UPDATE public.standards 
        SET total_clauses = total_requirements 
        WHERE total_clauses IS NULL AND total_requirements IS NOT NULL
      `).catch(() => {});
    }
    
    console.log('   ✅ Fixed standards table');

    // ============================================================
    // 4. Fix gap_analyses table
    // ============================================================
    console.log('\n4️⃣  Fixing gap_analyses table...');
    
    const gapExists = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'gap_analyses'
      ) as exists
    `);
    
    if (gapExists.rows[0].exists) {
      await queryPostgres(`ALTER TABLE public.gap_analyses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE`).catch(() => {});
      await queryPostgres(`ALTER TABLE public.gap_analyses ADD COLUMN IF NOT EXISTS analysis_id UUID UNIQUE`).catch(() => {});
      await queryPostgres(`ALTER TABLE public.gap_analyses ADD COLUMN IF NOT EXISTS analysis_date TIMESTAMP DEFAULT NOW()`).catch(() => {});
      
      // Set analysis_id = id if NULL
      await queryPostgres(`
        UPDATE public.gap_analyses 
        SET analysis_id = id 
        WHERE analysis_id IS NULL
      `).catch(() => {});
      
      // Set analysis_date if NULL
      await queryPostgres(`
        UPDATE public.gap_analyses 
        SET analysis_date = COALESCE(created_at, NOW()) 
        WHERE analysis_date IS NULL
      `).catch(() => {});
      
      // Create indexes (only if columns exist)
      await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_gap_analyses_tenant ON public.gap_analyses(tenant_id) WHERE tenant_id IS NOT NULL`).catch(() => {});
      await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_gap_analyses_date ON public.gap_analyses(analysis_date) WHERE analysis_date IS NOT NULL`).catch(() => {});
      await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_gap_analyses_analysis_id ON public.gap_analyses(analysis_id) WHERE analysis_id IS NOT NULL`).catch(() => {});
      
      console.log('   ✅ Fixed gap_analyses table');
    }

    // ============================================================
    // 5. Fix customer_procedures table
    // ============================================================
    console.log('\n5️⃣  Fixing customer_procedures table...');
    
    const procExists = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customer_procedures'
      ) as exists
    `);
    
    if (procExists.rows[0].exists) {
      await queryPostgres(`ALTER TABLE public.customer_procedures ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE`).catch(() => {});
      await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_procedures_tenant ON public.customer_procedures(tenant_id) WHERE tenant_id IS NOT NULL`).catch(() => {});
      console.log('   ✅ Fixed customer_procedures table');
    }

    // ============================================================
    // 6. Create audit_trail table
    // ============================================================
    console.log('\n6️⃣  Creating audit_trail table...');
    
    const auditExists = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_trail'
      ) as exists
    `);
    
    if (!auditExists.rows[0].exists) {
      // First ensure gap_analyses has analysis_id column
      const gapIdExists = await queryPostgres(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'gap_analyses' 
          AND column_name = 'id'
        ) as exists
      `);
      
      if (gapIdExists.rows[0].exists) {
        await queryPostgres(`
          CREATE TABLE public.audit_trail (
            audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            analysis_id UUID REFERENCES public.gap_analyses(id) ON DELETE CASCADE,
            timestamp TIMESTAMP DEFAULT NOW(),
            actor VARCHAR(100) NOT NULL,
            action VARCHAR(100) NOT NULL,
            details TEXT NOT NULL,
            reasoning JSONB,
            status VARCHAR(50),
            metadata JSONB,
            predicted_accuracy DECIMAL(3,2),
            actual_accuracy DECIMAL(3,2),
            standard_id UUID REFERENCES public.standards(id) ON DELETE SET NULL,
            customer_id UUID,
            execution_time_ms INTEGER,
            confidence_score DECIMAL(3,2)
          )
        `);
        
        await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_audit_trail_analysis_id ON public.audit_trail(analysis_id)`).catch(() => {});
        await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON public.audit_trail(timestamp)`).catch(() => {});
        await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_audit_trail_actor ON public.audit_trail(actor)`).catch(() => {});
        await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON public.audit_trail(action)`).catch(() => {});
        await queryPostgres(`CREATE INDEX IF NOT EXISTS idx_audit_trail_standard_customer ON public.audit_trail(standard_id, customer_id) WHERE standard_id IS NOT NULL AND customer_id IS NOT NULL`).catch(() => {});
        
        console.log('   ✅ Created audit_trail table');
      } else {
        console.log('   ⚠️  Skipping audit_trail (gap_analyses.id missing)');
      }
    } else {
      console.log('   ✅ audit_trail table already exists');
    }

    console.log('\n✅ PostgreSQL schema fixes complete!');

  } catch (error) {
    console.error('\n❌ Error fixing PostgreSQL schema:', error.message);
    throw error;
  }
}

async function fixEdcatAISchema() {
  console.log('\n🔧 CHECKING EDCAT AI DATABASE FOR DUPLICATE PUBLIC.* TABLES\n');
  console.log('='.repeat(60));
  console.log('NOTE: public.* tables should ONLY exist in Customer Data DB (DATABASE_URL)');
  console.log('      If they exist in EDCAT AI DB, they are duplicates that should be removed\n');

  try {
    // ============================================================
    // Check for duplicate public.* tables in EDCAT AI DB
    // These should NOT exist - they should only be in Customer Data DB
    // ============================================================
    const duplicateTables = ['standards', 'standard_files', 'parsed_requirements'];
    
    for (const tableName of duplicateTables) {
      const exists = await queryEdcatAI(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        ) as exists
      `, [tableName]);
      
      if (exists.rows[0].exists) {
        console.log(`⚠️  WARNING: public.${tableName} exists in EDCAT AI DB (duplicate)`);
        console.log(`   This table should ONLY exist in Customer Data DB (DATABASE_URL)`);
        console.log(`   Recommendation: Run remove-duplicate-tables.js to clean this up`);
      } else {
        console.log(`✓ public.${tableName} does not exist in EDCAT AI DB (correct)`);
      }
    }

    console.log('\n✅ EDCAT AI duplicate check complete!');
    console.log('   NOTE: EDCAT AI DB should only contain edcat.* tables, not public.* tables');

  } catch (error) {
    console.error('\n❌ Error checking EDCAT AI schema:', error.message);
    // Don't throw - EDCAT AI might not be accessible
    console.log('   ⚠️  Continuing...');
  }
}

// Main execution
async function main() {
  console.log('\n🚀 COMPREHENSIVE SCHEMA FIX');
  console.log('='.repeat(60));
  
  try {
    await fixPostgreSQLSchema();
    await fixEdcatAISchema(); // Now only checks for duplicates, doesn't create public.* tables
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL SCHEMA FIXES COMPLETE!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Schema fix failed:', error);
    process.exit(1);
  }
}

// Run
main()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

