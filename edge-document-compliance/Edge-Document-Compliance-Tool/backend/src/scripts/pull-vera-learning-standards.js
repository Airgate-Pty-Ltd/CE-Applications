/**
 * Pull Vera's Learning Standards into Parsing Tool
 * 
 * This script extracts standards from Vera's learning database tables
 * (document_content_for_learning, example_documents) and ensures they
 * appear in the standards table so they can be used in the parsing tool.
 */

// Import directly from databases.js to avoid DATABASE_URL requirement
import { queryEdcatAI, edcatPool, checkConnections } from '../config/databases.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Main function to pull learning standards into parsing tool
 */
async function pullVeraLearningStandards() {
  console.log('\n📚 Pulling Vera\'s Learning Standards into Parsing Tool...\n');
  console.log('='.repeat(60));

  // Check for EDCAT_AI_DATABASE_URL
  if (!process.env.EDCAT_AI_DATABASE_URL) {
    console.error('\n❌ EDCAT_AI_DATABASE_URL not set!');
    console.error('   This script needs access to Vera\'s learning database.');
    console.error('   Please set EDCAT_AI_DATABASE_URL in your .env file or environment.');
    console.error('\n   Example:');
    console.error('   EDCAT_AI_DATABASE_URL=postgresql://user:pass@host:port/database');
    process.exit(1);
  }

  console.log('✅ EDCAT_AI_DATABASE_URL is set');
  console.log('   Connecting to Vera\'s learning database...\n');

  // Test the connection first
  try {
    console.log('🔌 Testing database connection...');
    const testResult = await edcatPool.query('SELECT NOW() as now, current_database() as db_name');
    console.log(`   ✅ Connected to database: ${testResult.rows[0].db_name}`);
    console.log(`   ✅ Connection time: ${testResult.rows[0].now}\n`);
  } catch (connError) {
    console.error('\n❌ Database connection failed!');
    console.error(`   Error: ${connError.message}`);
    console.error(`   Code: ${connError.code || 'N/A'}`);
    console.error('\n   Troubleshooting:');
    console.error('   • Verify EDCAT_AI_DATABASE_URL is correct');
    console.error('   • Check that the database server is accessible');
    console.error('   • Ensure SSL settings are correct (Railway requires SSL)');
    process.exit(1);
  }

  try {
    // Step 1: Check if tables exist first
    console.log('\n🔍 Step 1: Checking if learning tables exist...');
    try {
      const tableCheck = await queryEdcatAI(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'document_content_for_learning'
        ) as has_doc_table,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'example_documents'
        ) as has_example_table
      `);
      
      const hasDocTable = tableCheck.rows[0]?.has_doc_table || false;
      const hasExampleTable = tableCheck.rows[0]?.has_example_table || false;
      
      console.log(`   document_content_for_learning: ${hasDocTable ? '✅ Exists' : '❌ Missing'}`);
      console.log(`   example_documents: ${hasExampleTable ? '✅ Exists' : '❌ Missing'}`);
      
      if (!hasDocTable && !hasExampleTable) {
        console.log('\n⚠️  Learning tables do not exist yet.');
        console.log('   These tables are created when you run process-requirements-folder.js');
        console.log('   Run that script first to process documents from the Requirements folder.');
        process.exit(0);
      }
    } catch (tableError) {
      console.error('\n❌ Error checking tables:', tableError.message);
      throw tableError;
    }

    // Step 2: Get all unique standards from learning tables
    console.log('\n🔍 Step 2: Finding standards in learning database...');
    
    let learningStandards;
    try {
      learningStandards = await queryEdcatAI(`
        SELECT DISTINCT
          COALESCE(ed.standard_code, dcl.standard_code) as standard_code,
          COALESCE(ed.standard_id, dcl.standard_id) as standard_id,
          COUNT(DISTINCT ed.file_id) as example_count,
          COUNT(DISTINCT dcl.file_id) as document_count,
          MAX(ed.created_at) as last_used_at
        FROM document_content_for_learning dcl
        LEFT JOIN example_documents ed ON ed.file_id = dcl.file_id
        WHERE COALESCE(ed.standard_code, dcl.standard_code) IS NOT NULL
          AND TRIM(COALESCE(ed.standard_code, dcl.standard_code)) != ''
        GROUP BY 
          COALESCE(ed.standard_code, dcl.standard_code),
          COALESCE(ed.standard_id, dcl.standard_id)
        ORDER BY standard_code
      `);
    } catch (queryError) {
      console.error('\n❌ Error querying learning database:', queryError.message);
      console.error('   This might mean:');
      console.error('   • Tables document_content_for_learning or example_documents don\'t exist');
      console.error('   • Database connection failed');
      console.error('   • Check EDCAT_AI_DATABASE_URL is correct');
      throw queryError;
    }

    console.log(`   Found ${learningStandards.rows.length} unique standards in learning database`);

    if (learningStandards.rows.length === 0) {
      console.log('\n⚠️  No standards found in learning database.');
      console.log('   This could mean:');
      console.log('   • No documents have been processed yet');
      console.log('   • Run process-requirements-folder.js first to load documents');
      console.log('   • Or documents exist but don\'t have standard_code set');
      console.log('\n   The script completed but found no standards to sync.');
      process.exit(0);
    }

    // Step 3: For each learning standard, ensure it exists in standards table
    console.log('\n📝 Step 3: Syncing standards to parsing tool...');
    
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const learningStd of learningStandards.rows) {
      const standardCode = learningStd.standard_code;
      const existingStandardId = learningStd.standard_id;
      const exampleCount = parseInt(learningStd.example_count) || 0;
      const documentCount = parseInt(learningStd.document_count) || 0;

      // Check if standard already exists in standards table
      const existingCheck = await queryEdcatAI(
        `SELECT id, code, name, uploaded_at, total_clauses 
         FROM standards 
         WHERE code = $1 
         LIMIT 1`,
        [standardCode]
      );

      if (existingCheck.rows.length > 0) {
        const existing = existingCheck.rows[0];
        
        // Update if it doesn't have uploaded_at (was a seed standard)
        if (!existing.uploaded_at) {
          await queryEdcatAI(
            `UPDATE standards 
             SET uploaded_at = NOW(),
                 name = COALESCE(name, $1),
                 sector = COALESCE(sector, 'compliance')
             WHERE id = $2`,
            [`${standardCode} (from Vera learning)`, existing.id]
          );
          updatedCount++;
          console.log(`   ✓ Updated: ${standardCode} (${documentCount} documents, ${exampleCount} examples)`);
        } else {
          skippedCount++;
          console.log(`   ⊙ Skipped: ${standardCode} (already exists with uploaded_at)`);
        }
      } else {
        // Create new standard record
        const standardId = existingStandardId || uuidv4();
        const standardName = `${standardCode} (from Vera learning)`;
        
        try {
          await queryEdcatAI(
            `INSERT INTO standards (id, code, name, sector, uploaded_at, total_clauses)
             VALUES ($1, $2, $3, $4, NOW(), 0)
             ON CONFLICT (code) DO UPDATE SET
               uploaded_at = EXCLUDED.uploaded_at,
               name = EXCLUDED.name`,
            [standardId, standardCode, standardName, 'compliance']
          );
          createdCount++;
          console.log(`   ✓ Created: ${standardCode} (${documentCount} documents, ${exampleCount} examples)`);
        } catch (error) {
          console.error(`   ✗ Error creating ${standardCode}:`, error.message);
        }
      }
    }

    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   • Total standards in learning DB: ${learningStandards.rows.length}`);
    console.log(`   • Created: ${createdCount}`);
    console.log(`   • Updated: ${updatedCount}`);
    console.log(`   • Skipped: ${skippedCount}`);
    
    if (createdCount === 0 && updatedCount === 0 && skippedCount === 0) {
      console.log('\n⚠️  No standards were synced.');
      console.log('   This might mean all standards already exist in the standards table.');
    } else {
      console.log('\n✅ Standards are now available in the parsing tool!');
      console.log('   Refresh the compliance library to see them.');
    }

  } catch (error) {
    console.error('\n❌ Error pulling learning standards:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    console.error('\n   Troubleshooting:');
    console.error('   • Verify EDCAT_AI_DATABASE_URL is correct');
    console.error('   • Check that the database is accessible');
    console.error('   • Ensure tables document_content_for_learning and example_documents exist');
    console.error('   • Run process-requirements-folder.js first to populate learning tables');
    process.exit(1);
  }
}

// Run if called directly
// Check if this is the main module (multiple ways to detect)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith(process.argv[1]) ||
                     process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || !process.env.RUN_AS_MODULE) {
  pullVeraLearningStandards()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

export { pullVeraLearningStandards };

