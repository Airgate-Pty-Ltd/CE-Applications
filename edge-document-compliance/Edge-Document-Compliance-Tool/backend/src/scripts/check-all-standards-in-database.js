/**
 * Check ALL standards in the database to see what we actually have
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function checkAllStandards() {
  try {
    console.log('🔍 Checking ALL standards in PostgreSQL database...\n');
    
    // Check public.standards table
    const standardsResult = await queryPostgres(`
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
    
    console.log(`📊 Total standards in public.standards: ${standardsResult.rows.length}`);
    console.log('\n📋 All Standards:');
    standardsResult.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.code} - ${row.name}`);
      console.log(`      Sector: ${row.sector || 'NULL'}, Authority: ${row.authority_source || 'NULL'}`);
      console.log(`      Uploaded: ${row.uploaded_at || 'NULL'}`);
      console.log(`      Total clauses: ${row.total_clauses || 0}, Total requirements: ${row.total_requirements || 0}`);
    });
    
    // Check standard_files table
    console.log('\n\n🔍 Checking standard_files table...\n');
    const filesResult = await queryPostgres(`
      SELECT 
        id,
        file_name,
        file_category,
        standard_id,
        uploaded_at
      FROM public.standard_files
      ORDER BY uploaded_at DESC
    `);
    
    console.log(`📊 Total files in public.standard_files: ${filesResult.rows.length}`);
    console.log('\n📋 Files by category:');
    const categoryCounts = {};
    filesResult.rows.forEach(row => {
      const cat = row.file_category || 'NULL';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} files`);
    });
    
    console.log('\n📋 Files linked to standards:');
    const linkedFiles = filesResult.rows.filter(f => f.standard_id);
    const unlinkedFiles = filesResult.rows.filter(f => !f.standard_id);
    console.log(`   Linked: ${linkedFiles.length}`);
    console.log(`   Unlinked: ${unlinkedFiles.length}`);
    
    // Check which standards have files
    console.log('\n\n🔍 Standards with files:');
    const standardsWithFiles = new Set(filesResult.rows
      .filter(f => f.standard_id)
      .map(f => f.standard_id));
    
    console.log(`   ${standardsWithFiles.size} standards have files linked`);
    
    // Check standards without files
    const standardsWithoutFiles = standardsResult.rows.filter(s => !standardsWithFiles.has(s.id));
    console.log(`   ${standardsWithoutFiles.length} standards have NO files linked`);
    if (standardsWithoutFiles.length > 0) {
      console.log('\n   Standards without files:');
      standardsWithoutFiles.slice(0, 10).forEach(s => {
        console.log(`      - ${s.code} (${s.name})`);
      });
      if (standardsWithoutFiles.length > 10) {
        console.log(`      ... and ${standardsWithoutFiles.length - 10} more`);
      }
    }
    
    // Check parsed_requirements
    console.log('\n\n🔍 Checking parsed_requirements...\n');
    try {
      const parsedResult = await queryPostgres(`
        SELECT 
          standard_id,
          COUNT(*) as count
        FROM public.parsed_requirements
        GROUP BY standard_id
        ORDER BY count DESC
      `);
      console.log(`📊 Standards with parsed requirements: ${parsedResult.rows.length}`);
      parsedResult.rows.forEach(row => {
        const std = standardsResult.rows.find(s => s.id === row.standard_id);
        console.log(`   ${std?.code || row.standard_id}: ${row.count} requirements`);
      });
    } catch (err) {
      console.log(`   ⚠️  Could not check parsed_requirements: ${err.message}`);
    }
    
    // Summary
    console.log('\n\n📊 SUMMARY:');
    console.log(`   Total standards in database: ${standardsResult.rows.length}`);
    console.log(`   Standards with files: ${standardsWithFiles.size}`);
    console.log(`   Standards without files: ${standardsWithoutFiles.length}`);
    console.log(`   Total files: ${filesResult.rows.length}`);
    console.log(`   Files by category:`, categoryCounts);
    
  } catch (error) {
    console.error('❌ Error checking standards:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAllStandards()
    .then(() => {
      console.log('\n✅ Check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Check failed:', error);
      process.exit(1);
    });
}

export { checkAllStandards };

