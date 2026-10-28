/**
 * Debug script to check why standards aren't showing
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function debugStandards() {
  console.log('🔍 Debugging Standards Filtering...\n');
  
  try {
    // 1. Check standards table
    console.log('1️⃣ Checking standards table...');
    const standards = await queryEdcatAI(`
      SELECT 
        id, 
        code, 
        name, 
        sector, 
        uploaded_at,
        total_clauses
      FROM standards
      WHERE code IS NOT NULL 
        AND TRIM(code) != ''
        AND uploaded_at IS NOT NULL
      ORDER BY uploaded_at DESC
      LIMIT 10
    `);
    
    console.log(`   Found ${standards.rows.length} standards with uploaded_at set`);
    console.log('\n   Sample standards:');
    standards.rows.forEach((std, i) => {
      console.log(`   ${i + 1}. ${std.code} - ${std.name}`);
      console.log(`      ID: ${std.id}`);
      console.log(`      Sector: ${std.sector || 'null'}`);
      console.log(`      Uploaded: ${std.uploaded_at}`);
      console.log('');
    });
    
    // 2. Check standard_files table
    console.log('2️⃣ Checking standard_files table...');
    const files = await queryPostgres(`
      SELECT 
        id,
        standard_id,
        file_name,
        file_category,
        file_path
      FROM public.standard_files
      ORDER BY uploaded_at DESC
      LIMIT 10
    `);
    
    console.log(`   Found ${files.rows.length} files in standard_files table`);
    if (files.rows.length > 0) {
      console.log('\n   Sample files:');
      files.rows.forEach((file, i) => {
        console.log(`   ${i + 1}. ${file.file_name}`);
        console.log(`      Standard ID: ${file.standard_id}`);
        console.log(`      Category: ${file.file_category || 'null'}`);
        console.log(`      Path: ${file.file_path}`);
        console.log('');
      });
    }
    
    // 3. Check which standards have files
    console.log('3️⃣ Checking which standards have files...');
    const standardsWithFiles = await queryPostgres(`
      SELECT DISTINCT standard_id
      FROM public.standard_files
      WHERE standard_id IS NOT NULL
    `);
    
    console.log(`   Found ${standardsWithFiles.rows.length} standards with files in standard_files`);
    const standardIdsWithFiles = new Set(standardsWithFiles.rows.map(r => r.standard_id));
    
    // 4. Simulate the filtering logic
    console.log('4️⃣ Simulating filtering logic...');
    const hasStandardFiles = files.rows.length > 0;
    const filteredStandards = standards.rows.filter(row => {
      const hasFileInStandardFiles = standardIdsWithFiles.has(row.id);
      
      // New logic: If standard_files table exists and has data, only show standards with files
      // Otherwise, show all standards for backward compatibility
      let shouldShow = false;
      
      if (hasStandardFiles && standardIdsWithFiles.size > 0) {
        shouldShow = hasFileInStandardFiles;
      } else {
        // Backward compatibility: show all standards if standard_files is empty
        shouldShow = true;
      }
      
      if (!shouldShow) {
        console.log(`   ❌ Filtered out: ${row.code} (no file in standard_files)`);
      }
      
      return shouldShow;
    });
    
    console.log(`\n   ✅ ${filteredStandards.length} standards would be shown`);
    console.log(`   ❌ ${standards.rows.length - filteredStandards.length} standards would be filtered out`);
    
    // 5. Check category distribution
    console.log('\n5️⃣ Checking category distribution...');
    const categoryCounts = {};
    standards.rows.forEach(std => {
      const category = std.sector === 'regulatory' ? 'regulatory' : 
                      std.sector === 'customer' ? 'customer' : 'standard';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    console.log('   Category counts:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`      ${cat}: ${count}`);
    });
    
    // 6. Recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    if (filteredStandards.length === 0) {
      console.log('   ⚠️  No standards would be shown!');
      console.log('   Possible fixes:');
      console.log('   1. Standards need entries in standard_files table, OR');
      console.log('   2. Standards need file_path set in standards table');
      console.log('   3. Check if file_path values are being set correctly during upload');
    } else {
      console.log(`   ✅ ${filteredStandards.length} standards would be shown`);
      console.log(`   First standard: ${filteredStandards[0]?.code} - ${filteredStandards[0]?.name}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugStandards()
  .then(() => {
    console.log('\n✅ Debug complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  });

