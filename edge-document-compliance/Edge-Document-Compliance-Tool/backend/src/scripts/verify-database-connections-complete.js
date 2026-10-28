/**
 * Complete verification of all database connections
 * Tests that all routes are connected to the correct databases
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function verifyConnections() {
  console.log('=== COMPLETE DATABASE CONNECTION VERIFICATION ===\n');
  
  const errors = [];
  const warnings = [];
  
  // Test 1: PostgreSQL connection
  console.log('TEST 1: PostgreSQL Connection');
  console.log('─────────────────────────────');
  try {
    const result = await queryPostgres('SELECT NOW() as time, current_database() as db');
    console.log(`✅ PostgreSQL connected: ${result.rows[0].db}`);
    console.log(`   Time: ${result.rows[0].time}`);
  } catch (e) {
    errors.push(`PostgreSQL connection failed: ${e.message}`);
    console.log(`❌ PostgreSQL connection failed: ${e.message}`);
  }
  
  // Test 2: EDCAT AI DB connection
  console.log('\nTEST 2: EDCAT AI DB Connection');
  console.log('───────────────────────────────');
  try {
    const result = await queryEdcatAI('SELECT NOW() as time, current_database() as db');
    console.log(`✅ EDCAT AI DB connected: ${result.rows[0].db}`);
    console.log(`   Time: ${result.rows[0].time}`);
  } catch (e) {
    errors.push(`EDCAT AI DB connection failed: ${e.message}`);
    console.log(`❌ EDCAT AI DB connection failed: ${e.message}`);
  }
  
  // Test 3: PostgreSQL tables exist
  console.log('\nTEST 3: PostgreSQL Tables');
  console.log('─────────────────────────');
  const pgTables = ['standards', 'standard_files', 'parsed_requirements'];
  for (const table of pgTables) {
    try {
      const exists = await queryPostgres(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists
      `, [table]);
      
      if (exists.rows[0].exists) {
        const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${table}`);
        console.log(`✅ ${table}: ${count.rows[0].count} rows`);
      } else {
        errors.push(`Table public.${table} does not exist`);
        console.log(`❌ ${table}: Table does not exist`);
      }
    } catch (e) {
      errors.push(`Error checking ${table}: ${e.message}`);
      console.log(`❌ ${table}: ${e.message}`);
    }
  }
  
  // Test 4: Data consistency
  console.log('\nTEST 4: Data Consistency');
  console.log('─────────────────────────');
  try {
    const standards = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
    const files = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files WHERE standard_id IS NOT NULL');
    const requirements = await queryPostgres('SELECT COUNT(*) as count FROM public.parsed_requirements');
    
    console.log(`Standards: ${standards.rows[0].count}`);
    console.log(`Files: ${files.rows[0].count}`);
    console.log(`Parsed Requirements: ${requirements.rows[0].count}`);
    
    if (standards.rows[0].count === 0) {
      warnings.push('No standards in database - need to run process-requirements-folder.js');
    }
    
    if (files.rows[0].count === 0) {
      warnings.push('No files in standard_files - need to run process-requirements-folder.js');
    }
    
    if (requirements.rows[0].count === 0) {
      warnings.push('No parsed requirements - standards need to be parsed using the parse tool');
    }
    
    // Check for orphaned files
    const orphaned = await queryPostgres(`
      SELECT COUNT(*) as count 
      FROM public.standard_files sf
      WHERE sf.standard_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.standards s WHERE s.id = sf.standard_id
      )
    `);
    
    if (orphaned.rows[0].count > 0) {
      errors.push(`${orphaned.rows[0].count} orphaned files (standard_id doesn't exist)`);
      console.log(`❌ ${orphaned.rows[0].count} orphaned files`);
    } else {
      console.log(`✅ No orphaned files`);
    }
    
  } catch (e) {
    errors.push(`Data consistency check failed: ${e.message}`);
    console.log(`❌ Error: ${e.message}`);
  }
  
  // Test 5: Verify parsed_requirements table structure
  console.log('\nTEST 5: parsed_requirements Table Structure');
  console.log('─────────────────────────────────────────────');
  try {
    const columns = await queryPostgres(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'parsed_requirements'
      ORDER BY ordinal_position
    `);
    
    const requiredColumns = ['id', 'standard_id', 'clause_number', 'requirement_text', 'clause_ref', 'sub_ref', 'full_ref'];
    const columnNames = columns.rows.map(c => c.column_name);
    const missing = requiredColumns.filter(r => !columnNames.includes(r));
    
    if (missing.length > 0) {
      errors.push(`parsed_requirements missing columns: ${missing.join(', ')}`);
      console.log(`❌ Missing columns: ${missing.join(', ')}`);
    } else {
      console.log(`✅ All required columns present (${columns.rows.length} total columns)`);
    }
  } catch (e) {
    errors.push(`Error checking table structure: ${e.message}`);
    console.log(`❌ Error: ${e.message}`);
  }
  
  // Summary
  console.log('\n\n=== VERIFICATION SUMMARY ===');
  console.log('───────────────────────────');
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}\n`);
  
  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed!');
  }
  
  process.exit(errors.length > 0 ? 1 : 0);
}

verifyConnections().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

