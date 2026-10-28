/**
 * Verify Q&A Data in Database
 * Checks if response_text column has actual content
 */

import { queryEdcatAI } from '../config/databases.js';

async function verifyQaData() {
  try {
    console.log('[Q&A Verify] Checking database state...\n');
    
    // Check current state
    const result = await queryEdcatAI(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN response_text IS NOT NULL AND response_text != '' THEN 1 END) as with_content,
        COUNT(CASE WHEN response_text IS NULL OR response_text = '' THEN 1 END) as empty_or_null
      FROM edcat.vera_query_response_bank
    `);
    
    const stats = result.rows[0];
    
    console.log('📊 Database Status:');
    console.log(`   Total records: ${stats.total_records}`);
    console.log(`   With content: ${stats.with_content}`);
    console.log(`   Empty/Null: ${stats.empty_or_null}`);
    console.log('');
    
    if (parseInt(stats.empty_or_null) === parseInt(stats.total_records)) {
      console.log('❌ PROBLEM: All entries are empty or null!');
      console.log('   Need to force-reload Q&A data.\n');
      return { needsReload: true, stats };
    } else if (parseInt(stats.with_content) > 0) {
      console.log('✅ GOOD: Some entries have content!');
      console.log(`   ${stats.with_content} entries have response_text\n`);
      return { needsReload: false, stats };
    } else {
      console.log('⚠️  WARNING: No records found');
      return { needsReload: true, stats };
    }
  } catch (error) {
    console.error('[Q&A Verify] Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('verify_qa_data.js');
if (isMainModule) {
  verifyQaData()
    .then(result => {
      process.exit(result.needsReload ? 1 : 0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

export { verifyQaData };

