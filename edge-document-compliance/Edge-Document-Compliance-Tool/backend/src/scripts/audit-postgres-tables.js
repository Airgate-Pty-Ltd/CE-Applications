/**
 * Comprehensive audit of PostgreSQL tables
 * Identifies errors, inconsistencies, and issues
 */

import { queryPostgres } from '../config/databases.js';

async function auditTables() {
  console.log('=== POSTGRESQL DATABASE AUDIT ===\n');
  
  const errors = [];
  const warnings = [];
  
  // Step 1: List all tables
  console.log('STEP 1: Listing all tables...');
  console.log('───────────────────────────────');
  
  const tables = await queryPostgres(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    ORDER BY table_schema, table_name
  `);
  
  console.log(`Found ${tables.rows.length} tables\n`);
  
  // Step 2: Check standards-related tables specifically
  console.log('STEP 2: Checking standards-related tables...');
  console.log('─────────────────────────────────────────────\n');
  
  const standardsTables = tables.rows.filter(t => 
    t.table_name.includes('standard') || 
    t.table_name.includes('requirement') ||
    t.table_name.includes('compliance')
  );
  
  for (const table of standardsTables) {
    const fullName = `${table.table_schema}.${table.table_name}`;
    console.log(`\n📋 ${fullName}:`);
    
    try {
      // Get row count
      const count = await queryPostgres(`SELECT COUNT(*) as count FROM ${fullName}`);
      console.log(`  Rows: ${count.rows[0].count}`);
      
      // Get column structure
      const columns = await queryPostgres(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [table.table_schema, table.table_name]);
      
      console.log(`  Columns: ${columns.rows.length}`);
      
      // Check for common issues
      if (table.table_name === 'standards') {
        // Check for required columns
        const requiredCols = ['id', 'code', 'name', 'uploaded_at'];
        const colNames = columns.rows.map(c => c.column_name);
        const missing = requiredCols.filter(r => !colNames.includes(r));
        if (missing.length > 0) {
          errors.push(`${fullName}: Missing required columns: ${missing.join(', ')}`);
          console.log(`  ❌ Missing columns: ${missing.join(', ')}`);
        }
        
        // Check for NULL codes
        const nullCodes = await queryPostgres(`
          SELECT COUNT(*) as count FROM ${fullName} WHERE code IS NULL OR TRIM(code) = ''
        `);
        if (nullCodes.rows[0].count > 0) {
          warnings.push(`${fullName}: ${nullCodes.rows[0].count} rows with NULL or empty code`);
          console.log(`  ⚠️  ${nullCodes.rows[0].count} rows with NULL/empty code`);
        }
        
        // Check for duplicate codes
        const duplicates = await queryPostgres(`
          SELECT code, COUNT(*) as count 
          FROM ${fullName} 
          WHERE code IS NOT NULL 
          GROUP BY code 
          HAVING COUNT(*) > 1
        `);
        if (duplicates.rows.length > 0) {
          errors.push(`${fullName}: Duplicate codes found: ${duplicates.rows.map(d => d.code).join(', ')}`);
          console.log(`  ❌ Duplicate codes: ${duplicates.rows.map(d => `${d.code} (${d.count}x)`).join(', ')}`);
        }
      }
      
      if (table.table_name === 'standard_files') {
        // Check for orphaned files (standard_id doesn't exist in standards)
        const orphaned = await queryPostgres(`
          SELECT COUNT(*) as count 
          FROM ${fullName} sf
          WHERE sf.standard_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.standards s WHERE s.id = sf.standard_id
          )
        `);
        if (orphaned.rows[0].count > 0) {
          errors.push(`${fullName}: ${orphaned.rows[0].count} files with invalid standard_id (orphaned)`);
          console.log(`  ❌ ${orphaned.rows[0].count} orphaned files (standard_id doesn't exist)`);
        }
        
        // Check for NULL standard_ids
        const nullStandardIds = await queryPostgres(`
          SELECT COUNT(*) as count FROM ${fullName} WHERE standard_id IS NULL
        `);
        if (nullStandardIds.rows[0].count > 0) {
          warnings.push(`${fullName}: ${nullStandardIds.rows[0].count} files with NULL standard_id`);
          console.log(`  ⚠️  ${nullStandardIds.rows[0].count} files with NULL standard_id`);
        }
      }
      
      if (table.table_name === 'parsed_requirements') {
        // Check for orphaned requirements
        const orphaned = await queryPostgres(`
          SELECT COUNT(*) as count 
          FROM ${fullName} pr
          WHERE pr.standard_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.standards s WHERE s.id = pr.standard_id
          )
        `);
        if (orphaned.rows[0].count > 0) {
          errors.push(`${fullName}: ${orphaned.rows[0].count} requirements with invalid standard_id (orphaned)`);
          console.log(`  ❌ ${orphaned.rows[0].count} orphaned requirements`);
        }
      }
      
    } catch (error) {
      errors.push(`${fullName}: Error checking table - ${error.message}`);
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  // Step 3: Check foreign key relationships
  console.log('\n\nSTEP 3: Checking foreign key relationships...');
  console.log('───────────────────────────────────────────────\n');
  
  const foreignKeys = await queryPostgres(`
    SELECT
      tc.table_schema, 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `);
  
  for (const fk of foreignKeys.rows) {
    const tableName = `${fk.table_schema}.${fk.table_name}`;
    const refTable = `${fk.foreign_table_schema}.${fk.foreign_table_name}`;
    
    // Check if referenced table exists
    try {
      const refExists = await queryPostgres(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        ) as exists
      `, [fk.foreign_table_schema, fk.foreign_table_name]);
      
      if (!refExists.rows[0].exists) {
        errors.push(`${tableName}.${fk.column_name} → ${refTable}: Referenced table does not exist`);
        console.log(`  ❌ ${tableName}.${fk.column_name} → ${refTable}: Table missing`);
      }
    } catch (e) {
      // Skip if can't check
    }
  }
  
  // Step 4: Check for missing indexes on foreign keys
  console.log('\n\nSTEP 4: Checking indexes...');
  console.log('───────────────────────────\n');
  
  for (const fk of foreignKeys.rows) {
    const tableName = `${fk.table_schema}.${fk.table_name}`;
    const columnName = fk.column_name;
    
    try {
      const indexes = await queryPostgres(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = $1 
        AND tablename = $2 
        AND indexdef LIKE '%${columnName}%'
      `, [fk.table_schema, fk.table_name]);
      
      if (indexes.rows.length === 0) {
        warnings.push(`${tableName}.${columnName}: Foreign key column missing index`);
        console.log(`  ⚠️  ${tableName}.${columnName}: No index on FK column`);
      }
    } catch (e) {
      // Skip if can't check
    }
  }
  
  // Step 5: Data consistency checks
  console.log('\n\nSTEP 5: Data consistency checks...');
  console.log('───────────────────────────────────\n');
  
  // Check standards vs standard_files linkage
  try {
    const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
    const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files WHERE standard_id IS NOT NULL');
    const linkedStandards = await queryPostgres('SELECT COUNT(DISTINCT standard_id) as count FROM public.standard_files WHERE standard_id IS NOT NULL');
    
    console.log(`Standards: ${standardsCount.rows[0].count}`);
    console.log(`Files: ${filesCount.rows[0].count}`);
    console.log(`Standards with files: ${linkedStandards.rows[0].count}`);
    
    if (linkedStandards.rows[0].count < standardsCount.rows[0].count) {
      const missing = standardsCount.rows[0].count - linkedStandards.rows[0].count;
      warnings.push(`${missing} standards have no files in standard_files table`);
      console.log(`  ⚠️  ${missing} standards have no files`);
    }
    
    // Check for standards with files but no uploaded_at
    const noUploadedAt = await queryPostgres(`
      SELECT COUNT(*) as count 
      FROM public.standards s
      WHERE s.uploaded_at IS NULL
      AND EXISTS (SELECT 1 FROM public.standard_files sf WHERE sf.standard_id = s.id)
    `);
    if (noUploadedAt.rows[0].count > 0) {
      errors.push(`${noUploadedAt.rows[0].count} standards have files but uploaded_at is NULL`);
      console.log(`  ❌ ${noUploadedAt.rows[0].count} standards with files but NULL uploaded_at`);
    }
    
  } catch (e) {
    errors.push(`Data consistency check failed: ${e.message}`);
    console.log(`  ❌ Error: ${e.message}`);
  }
  
  // Summary
  console.log('\n\n=== AUDIT SUMMARY ===');
  console.log('────────────────────');
  console.log(`Errors found: ${errors.length}`);
  console.log(`Warnings found: ${warnings.length}\n`);
  
  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ No errors or warnings found!');
  }
  
  process.exit(errors.length > 0 ? 1 : 0);
}

auditTables().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

