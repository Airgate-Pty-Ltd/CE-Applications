/**
 * Check which standards have files and if they have uploaded_at set
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function checkStandardsWithFiles() {
  console.log('🔍 Checking standards with files...\n');
  
  try {
    // Get all files
    const files = await queryPostgres(`
      SELECT DISTINCT standard_id 
      FROM public.standard_files 
      WHERE file_category = 'standard' 
        AND standard_id IS NOT NULL
    `);
    
    const fileIds = files.rows.map(f => f.standard_id);
    console.log(`📁 Found ${fileIds.length} unique standard_ids in standard_files (category='standard')`);
    
    // Get standards that have files
    if (fileIds.length === 0) {
      console.log('⚠️  No files found!');
      return;
    }
    
    const standards = await queryEdcatAI(`
      SELECT id, code, uploaded_at 
      FROM standards 
      WHERE id = ANY($1)
    `, [fileIds]);
    
    console.log(`📋 Found ${standards.rows.length} standards matching those IDs`);
    
    const withUploadedAt = standards.rows.filter(s => s.uploaded_at);
    const withoutUploadedAt = standards.rows.filter(s => !s.uploaded_at);
    
    console.log(`\n✅ With uploaded_at: ${withUploadedAt.length}`);
    console.log(`❌ Without uploaded_at: ${withoutUploadedAt.length}`);
    
    if (withoutUploadedAt.length > 0) {
      console.log('\n⚠️  Standards WITHOUT uploaded_at (will be filtered out by query):');
      withoutUploadedAt.forEach(s => {
        console.log(`   - ${s.code} (${s.id.substring(0, 8)}...)`);
      });
    }
    
    // Check what the requirements.js query would return
    const queryResult = await queryEdcatAI(`
      SELECT DISTINCT ON (LOWER(TRIM(s.code)))
        s.id as standard_id,
        s.code,
        s.name,
        s.uploaded_at
      FROM standards s
      WHERE s.code IS NOT NULL 
        AND TRIM(s.code) != ''
        AND s.uploaded_at IS NOT NULL
        AND s.id = ANY($1)
      ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC NULLS LAST
    `, [fileIds]);
    
    console.log(`\n📊 Standards that would be returned by requirements.js query: ${queryResult.rows.length}`);
    console.log(`   (Filtered by: code IS NOT NULL, uploaded_at IS NOT NULL, id IN fileIds)`);
    
    if (queryResult.rows.length < standards.rows.length) {
      const missing = standards.rows.filter(s => 
        !queryResult.rows.some(r => r.standard_id === s.id)
      );
      console.log(`\n⚠️  ${missing.length} standards would be filtered out by the query:`);
      missing.forEach(s => {
        const reason = !s.uploaded_at ? 'no uploaded_at' : 'other';
        console.log(`   - ${s.code} (${reason})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkStandardsWithFiles()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

