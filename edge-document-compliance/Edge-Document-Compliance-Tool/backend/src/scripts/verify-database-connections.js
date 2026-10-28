/**
 * Verify Database Connections
 * 
 * This script verifies that both databases are connected and accessible.
 * It also checks critical tables and shows data counts.
 */

import { query, queryEdcatAI } from '../database/connection.js';

async function verifyConnections() {
  console.log('\n🔍 Verifying Database Connections...\n');
  console.log('='.repeat(60));
  
  let customerDataOk = false;
  let edcatAiOk = false;
  
  // Test Customer Data DB
  console.log('\n📊 Customer Data DB (DATABASE_URL)');
  console.log('-'.repeat(60));
  try {
    const customerResult = await query('SELECT NOW() as time, current_database() as db');
    console.log(`✅ Connected to: ${customerResult.rows[0].db}`);
    customerDataOk = true;
    
    // Check standard_files table
    const filesCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'standard_files'
      ) as exists
    `);
    const hasStandardFiles = filesCheck.rows[0].exists;
    console.log(`   standard_files table exists: ${hasStandardFiles ? '✅' : '❌'}`);
    
    if (hasStandardFiles) {
      // Count files
      const filesCount = await query('SELECT COUNT(*) as count FROM standard_files');
      console.log(`   Files in standard_files: ${filesCount.rows[0].count}`);
      
      // Show standards with files
      const standardsWithFiles = await query(`
        SELECT DISTINCT standard_id, COUNT(*) as file_count
        FROM standard_files
        WHERE standard_id IS NOT NULL
        GROUP BY standard_id
        ORDER BY file_count DESC
        LIMIT 10
      `);
      console.log(`   Standards with files: ${standardsWithFiles.rows.length}`);
      if (standardsWithFiles.rows.length > 0) {
        console.log('   Sample standard_ids with files:');
        standardsWithFiles.rows.forEach(row => {
          console.log(`     - ${row.standard_id} (${row.file_count} file(s))`);
        });
      }
    }
    
    // Check other important tables
    const tables = ['tenants', 'users', 'customer_documents', 'gap_analyses'];
    for (const table of tables) {
      try {
        const check = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          ) as exists
        `, [table]);
        if (check.rows[0].exists) {
          const count = await query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`   ${table}: ${count.rows[0].count} rows`);
        }
      } catch (err) {
        // Table might not exist, that's okay
      }
    }
    
  } catch (error) {
    console.error('❌ Customer Data DB Error:', error.message);
    console.error('   Check DATABASE_URL environment variable');
  }
  
  // Test EDCAT AI DB
  console.log('\n🧠 EDCAT AI Intelligence DB (EDCAT_AI_DATABASE_URL)');
  console.log('-'.repeat(60));
  try {
    const edcatResult = await queryEdcatAI('SELECT NOW() as time, current_database() as db');
    console.log(`✅ Connected to: ${edcatResult.rows[0].db}`);
    edcatAiOk = true;
    
    // Check standards table
    const standardsCheck = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'standards'
      ) as exists
    `);
    const hasStandards = standardsCheck.rows[0].exists;
    console.log(`   standards table exists: ${hasStandards ? '✅' : '❌'}`);
    
    if (hasStandards) {
      // Count standards
      const standardsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM standards');
      console.log(`   Standards in database: ${standardsCount.rows[0].count}`);
      
      // Show standards without uploaded_at (shouldn't appear in dropdown)
      const standardsWithoutUpload = await queryEdcatAI(`
        SELECT code, name, uploaded_at 
        FROM standards 
        WHERE uploaded_at IS NULL
        LIMIT 10
      `);
      if (standardsWithoutUpload.rows.length > 0) {
        console.log(`   ⚠️  Standards without uploaded_at (won't appear in dropdown): ${standardsWithoutUpload.rows.length}`);
        standardsWithoutUpload.rows.forEach(row => {
          console.log(`     - ${row.code}: ${row.name}`);
        });
      }
      
      // Show all standards
      const allStandards = await queryEdcatAI(`
        SELECT code, name, uploaded_at, total_clauses
        FROM standards
        ORDER BY uploaded_at DESC
        LIMIT 20
      `);
      console.log(`   Recent standards (last 20):`);
      allStandards.rows.forEach(row => {
        console.log(`     - ${row.code}: ${row.name} (${row.total_clauses || 0} requirements, uploaded: ${row.uploaded_at ? 'Yes' : 'No'})`);
      });
    }
    
    // Check parsed_requirements table
    const reqsCheck = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'parsed_requirements'
      ) as exists
    `);
    const hasReqs = reqsCheck.rows[0].exists;
    console.log(`   parsed_requirements table exists: ${hasReqs ? '✅' : '❌'}`);
    
    if (hasReqs) {
      // Count requirements
      const reqsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM parsed_requirements');
      console.log(`   Requirements in database: ${reqsCount.rows[0].count}`);
      
      // Count by standard
      const reqsByStandard = await queryEdcatAI(`
        SELECT s.code, COUNT(pr.id) as req_count
        FROM standards s
        LEFT JOIN parsed_requirements pr ON pr.standard_id = s.id
        GROUP BY s.code
        ORDER BY req_count DESC
        LIMIT 10
      `);
      console.log(`   Requirements by standard:`);
      reqsByStandard.rows.forEach(row => {
        console.log(`     - ${row.code}: ${row.req_count} requirements`);
      });
    }
    
    // Check document_content_for_learning table
    const learningCheck = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'document_content_for_learning'
      ) as exists
    `);
    if (learningCheck.rows[0].exists) {
      const learningCount = await queryEdcatAI('SELECT COUNT(*) as count FROM document_content_for_learning');
      console.log(`   document_content_for_learning: ${learningCount.rows[0].count} entries`);
    }
    
  } catch (error) {
    console.error('❌ EDCAT AI DB Error:', error.message);
    console.error('   Check EDCAT_AI_DATABASE_URL environment variable');
  }
  
  // Cross-database verification
  console.log('\n🔗 Cross-Database Verification');
  console.log('-'.repeat(60));
  if (customerDataOk && edcatAiOk) {
    try {
      // Find standards that exist in EDCAT AI but have no files in Customer Data
      const standardsInEdcat = await queryEdcatAI(`
        SELECT id, code, name, uploaded_at
        FROM standards
        WHERE uploaded_at IS NOT NULL
        ORDER BY code
      `);
      
      if (filesCheck && filesCheck.rows[0].exists) {
        const filesInCustomer = await query(`
          SELECT DISTINCT standard_id
          FROM standard_files
          WHERE standard_id IS NOT NULL
        `);
        const fileStandardIds = new Set(filesInCustomer.rows.map(r => r.standard_id));
        
        const standardsWithoutFiles = standardsInEdcat.rows.filter(s => !fileStandardIds.has(s.id));
        
        if (standardsWithoutFiles.length > 0) {
          console.log(`⚠️  Found ${standardsWithoutFiles.length} standards in EDCAT AI DB without files in Customer Data DB:`);
          standardsWithoutFiles.forEach(std => {
            console.log(`   - ${std.code}: ${std.name} (ID: ${std.id})`);
          });
          console.log(`\n   These standards will NOT appear in the dropdown.`);
          console.log(`   Run cleanup script: node backend/src/scripts/cleanup-standards-without-files.js`);
        } else {
          console.log('✅ All standards in EDCAT AI DB have corresponding files in Customer Data DB');
        }
      }
    } catch (error) {
      console.error('⚠️  Could not perform cross-database check:', error.message);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`Customer Data DB: ${customerDataOk ? '✅ Connected' : '❌ Not Connected'}`);
  console.log(`EDCAT AI DB: ${edcatAiOk ? '✅ Connected' : '❌ Not Connected'}`);
  
  if (customerDataOk && edcatAiOk) {
    console.log('\n✅ Both databases are connected and accessible!');
  } else {
    console.log('\n❌ One or more databases are not connected. Check environment variables.');
  }
  console.log('='.repeat(60));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyConnections()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifyConnections };

