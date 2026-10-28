/**
 * Drop standard_files and standard_files_content tables immediately
 * This script should be run after data has been migrated to standards table
 */

import { queryPostgres } from '../config/databases.js';

async function dropStandardFilesTables() {
  console.log('🗑️  Dropping standard_files and standard_files_content tables...\n');

  try {
    // Step 1: Check if tables exist
    console.log('1️⃣ Checking if tables exist...');
    const checkTables = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('standard_files', 'standard_files_content')
      ORDER BY table_name
    `);

    if (checkTables.rows.length === 0) {
      console.log('✅ Both tables already removed - nothing to do!');
      return;
    }

    console.log(`   Found ${checkTables.rows.length} table(s) to remove:`);
    checkTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Step 2: Drop standard_files_content first (no dependencies)
    if (checkTables.rows.some(r => r.table_name === 'standard_files_content')) {
      console.log('\n2️⃣ Dropping standard_files_content table...');
      try {
        await queryPostgres('DROP TABLE IF EXISTS public.standard_files_content CASCADE');
        console.log('   ✅ Dropped standard_files_content');
      } catch (error) {
        console.error(`   ❌ Error dropping standard_files_content: ${error.message}`);
        throw error;
      }
    }

    // Step 3: Drop standard_files (may have foreign keys)
    if (checkTables.rows.some(r => r.table_name === 'standard_files')) {
      console.log('\n3️⃣ Dropping standard_files table...');
      try {
        await queryPostgres('DROP TABLE IF EXISTS public.standard_files CASCADE');
        console.log('   ✅ Dropped standard_files');
      } catch (error) {
        console.error(`   ❌ Error dropping standard_files: ${error.message}`);
        throw error;
      }
    }

    // Step 4: Verify tables are gone
    console.log('\n4️⃣ Verifying tables are removed...');
    const verifyTables = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('standard_files', 'standard_files_content')
    `);

    if (verifyTables.rows.length === 0) {
      console.log('   ✅ Both tables successfully removed!');
    } else {
      console.log(`   ⚠️  Warning: ${verifyTables.rows.length} table(s) still exist:`);
      verifyTables.rows.forEach(row => {
        console.log(`      - ${row.table_name}`);
      });
    }

    console.log('\n✅ Cleanup complete!');
  } catch (error) {
    console.error('\n❌ Error dropping tables:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('drop-standard-files-tables.js')) {
  dropStandardFilesTables()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { dropStandardFilesTables };

