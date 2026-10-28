/**
 * Verify standards table contents and connection
 * This script checks what's actually in the standards table
 */

import { queryPostgres } from '../config/databases.js';

async function verifyStandardsTable() {
  try {
    console.log('🔍 Verifying standards table in PostgreSQL...\n');
    
    // 1. Check if table exists
    console.log('1️⃣ Checking if public.standards table exists...');
    const tableExists = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standards'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ public.standards table does NOT exist!');
      return;
    }
    console.log('✅ public.standards table EXISTS\n');
    
    // 2. Get table structure
    console.log('2️⃣ Getting table structure...');
    const columns = await queryPostgres(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'standards'
      ORDER BY ordinal_position;
    `);
    
    console.log(`   Found ${columns.rows.length} columns:`);
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log('');
    
    // 3. Count total rows
    console.log('3️⃣ Counting rows...');
    const totalCount = await queryPostgres(`SELECT COUNT(*) as count FROM public.standards`);
    console.log(`   Total rows: ${totalCount.rows[0].count}\n`);
    
    // 4. Count rows with uploaded_at
    console.log('4️⃣ Counting rows with uploaded_at set...');
    const uploadedCount = await queryPostgres(`
      SELECT COUNT(*) as count 
      FROM public.standards 
      WHERE uploaded_at IS NOT NULL
    `);
    console.log(`   Rows with uploaded_at: ${uploadedCount.rows[0].count}\n`);
    
    // 5. Count rows with code
    console.log('5️⃣ Counting rows with code set...');
    const codeCount = await queryPostgres(`
      SELECT COUNT(*) as count 
      FROM public.standards 
      WHERE code IS NOT NULL AND TRIM(code) != ''
    `);
    console.log(`   Rows with code: ${codeCount.rows[0].count}\n`);
    
    // 6. Get all standards
    console.log('6️⃣ Listing all standards...');
    const allStandards = await queryPostgres(`
      SELECT 
        id,
        code,
        name,
        sector,
        authority_source,
        uploaded_at,
        total_clauses,
        total_requirements,
        created_at
      FROM public.standards
      ORDER BY uploaded_at DESC NULLS LAST, code
    `);
    
    console.log(`   Found ${allStandards.rows.length} standards:\n`);
    allStandards.rows.forEach((std, idx) => {
      console.log(`   ${idx + 1}. ${std.code || '(no code)'} - ${std.name || '(no name)'}`);
      console.log(`      ID: ${std.id}`);
      console.log(`      Sector: ${std.sector || 'NULL'}`);
      console.log(`      Authority: ${std.authority_source || 'NULL'}`);
      console.log(`      Uploaded: ${std.uploaded_at || 'NULL'}`);
      console.log(`      Clauses: ${std.total_clauses || 0}, Requirements: ${std.total_requirements || 0}`);
      console.log(`      Created: ${std.created_at || 'NULL'}`);
      console.log('');
    });
    
    // 7. Check standards that would appear in API (have uploaded_at and code)
    console.log('7️⃣ Standards that would appear in API (uploaded_at IS NOT NULL AND code IS NOT NULL)...');
    const apiStandards = await queryPostgres(`
      SELECT 
        id,
        code,
        name,
        sector,
        uploaded_at
      FROM public.standards
      WHERE code IS NOT NULL 
        AND TRIM(code) != ''
        AND uploaded_at IS NOT NULL
      ORDER BY code
    `);
    
    console.log(`   Found ${apiStandards.rows.length} standards that would appear in API:\n`);
    apiStandards.rows.forEach((std, idx) => {
      console.log(`   ${idx + 1}. ${std.code} - ${std.name || '(no name)'} (sector: ${std.sector || 'NULL'})`);
    });
    console.log('');
    
    // 8. Check standard_files linkage
    console.log('8️⃣ Checking standard_files linkage...');
    const filesCount = await queryPostgres(`
      SELECT COUNT(*) as count FROM public.standard_files
    `);
    console.log(`   Total files in standard_files: ${filesCount.rows[0].count}`);
    
    const linkedFiles = await queryPostgres(`
      SELECT COUNT(DISTINCT standard_id) as count 
      FROM public.standard_files 
      WHERE standard_id IS NOT NULL
    `);
    console.log(`   Files linked to standards: ${linkedFiles.rows[0].count}`);
    
    const filesByCategory = await queryPostgres(`
      SELECT 
        file_category,
        COUNT(*) as count
      FROM public.standard_files
      GROUP BY file_category
      ORDER BY count DESC
    `);
    console.log(`   Files by category:`);
    filesByCategory.rows.forEach(row => {
      console.log(`      ${row.file_category || 'NULL'}: ${row.count}`);
    });
    console.log('');
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Table exists: Yes`);
    console.log(`   📋 Total standards in table: ${totalCount.rows[0].count}`);
    console.log(`   ✅ Standards with uploaded_at: ${uploadedCount.rows[0].count}`);
    console.log(`   ✅ Standards with code: ${codeCount.rows[0].count}`);
    console.log(`   🌐 Standards visible in API: ${apiStandards.rows.length}`);
    console.log(`   📁 Files in standard_files: ${filesCount.rows[0].count}`);
    console.log(`   🔗 Standards with files: ${linkedFiles.rows[0].count}`);
    
    if (parseInt(totalCount.rows[0].count) === 0) {
      console.log('\n⚠️  WARNING: standards table is EMPTY!');
      console.log('   Standards need to be created via:');
      console.log('   1. Upload route: backend/src/routes/upload.js');
      console.log('   2. Process requirements folder: backend/src/scripts/process-requirements-folder.js');
    } else if (parseInt(apiStandards.rows.length) === 0) {
      console.log('\n⚠️  WARNING: No standards have uploaded_at set!');
      console.log('   Standards exist but won\'t appear in API because uploaded_at is NULL');
      console.log('   Fix: UPDATE public.standards SET uploaded_at = NOW() WHERE uploaded_at IS NULL;');
    }
    
  } catch (error) {
    console.error('❌ Error verifying standards table:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyStandardsTable()
    .then(() => {
      console.log('\n✅ Verification completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifyStandardsTable };

