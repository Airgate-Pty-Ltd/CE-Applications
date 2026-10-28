/**
 * Check ALL standards in database
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function checkAllStandards() {
  console.log('🔍 Checking ALL Standards in Database...\n');
  
  try {
    // 1. Get ALL standards (no limit)
    console.log('1️⃣ Getting ALL standards from database...');
    const allStandards = await queryEdcatAI(`
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
      ORDER BY uploaded_at DESC
    `);
    
    console.log(`   ✅ Found ${allStandards.rows.length} total standards in database`);
    
    // 2. Count by uploaded_at status
    const withUploadedAt = allStandards.rows.filter(s => s.uploaded_at);
    const withoutUploadedAt = allStandards.rows.filter(s => !s.uploaded_at);
    
    console.log(`   - ${withUploadedAt.length} with uploaded_at set`);
    console.log(`   - ${withoutUploadedAt.length} without uploaded_at set`);
    
    // 3. Check standard_files
    console.log('\n2️⃣ Checking standard_files table...');
    const files = await queryPostgres(`
      SELECT 
        id,
        standard_id,
        file_name,
        file_category
      FROM public.standard_files
    `);
    
    console.log(`   ✅ Found ${files.rows.length} files in standard_files table`);
    const standardIdsWithFiles = new Set(files.rows.map(f => f.standard_id).filter(id => id));
    
    // 4. Apply the ACTUAL filtering logic from requirements.js
    console.log('\n3️⃣ Applying ACTUAL filtering logic from requirements.js...');
    
    const hasStandardFiles = files.rows.length > 0;
    
    // Filter standards that would pass the requirements.js filter
    const filteredStandards = allStandards.rows.filter(row => {
      // Must have uploaded_at (this is in the WHERE clause)
      if (!row.uploaded_at) {
        return false;
      }
      
      // Apply the filter logic from requirements.js
      if (hasStandardFiles && standardIdsWithFiles.size > 0) {
        // Only show standards with files
        return standardIdsWithFiles.has(row.id);
      } else {
        // Backward compatibility: show all if standard_files is empty
        return true;
      }
    });
    
    console.log(`   ✅ ${filteredStandards.length} standards would be shown`);
    console.log(`   ❌ ${allStandards.rows.length - filteredStandards.length} standards would be filtered out`);
    
    // 5. Show breakdown
    console.log('\n4️⃣ Breakdown:');
    console.log(`   Total standards: ${allStandards.rows.length}`);
    console.log(`   With uploaded_at: ${withUploadedAt.length}`);
    console.log(`   With files in standard_files: ${standardIdsWithFiles.size}`);
    console.log(`   Would be shown: ${filteredStandards.length}`);
    
    // 6. List all standards that would be shown
    if (filteredStandards.length > 0) {
      console.log('\n5️⃣ Standards that WOULD be shown:');
      filteredStandards.forEach((std, i) => {
        const hasFile = standardIdsWithFiles.has(std.id);
        console.log(`   ${i + 1}. ${std.code} - ${std.name}`);
        console.log(`      Sector: ${std.sector || 'null'}`);
        console.log(`      Has file in standard_files: ${hasFile}`);
        console.log(`      Uploaded: ${std.uploaded_at}`);
        console.log('');
      });
    }
    
    // 7. List standards that would be filtered out
    const filteredOut = allStandards.rows.filter(row => {
      if (!row.uploaded_at) return true;
      if (hasStandardFiles && standardIdsWithFiles.size > 0) {
        return !standardIdsWithFiles.has(row.id);
      }
      return false;
    });
    
    if (filteredOut.length > 0) {
      console.log(`\n6️⃣ Standards that would be FILTERED OUT (${filteredOut.length}):`);
      filteredOut.slice(0, 10).forEach((std, i) => {
        console.log(`   ${i + 1}. ${std.code} - ${std.name}`);
        console.log(`      Reason: ${!std.uploaded_at ? 'No uploaded_at' : 'No file in standard_files'}`);
        console.log('');
      });
      if (filteredOut.length > 10) {
        console.log(`   ... and ${filteredOut.length - 10} more`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAllStandards()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

