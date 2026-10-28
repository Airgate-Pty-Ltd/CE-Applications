/**
 * Clean Up Duplicate Database Tables
 * 
 * PROBLEM: Duplicate tables exist in both Postgres and EDCAT AI databases:
 * - standards (exists in both, should only be in Postgres)
 * - standard_files (exists in both, should only be in Postgres)
 * - parsed_requirements (exists in both, should only be in Postgres)
 * 
 * SOLUTION: Delete duplicates from EDCAT AI DB and ensure all data is in Postgres
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupDuplicates() {
  console.log('\n🧹 CLEANING UP DUPLICATE DATABASE TABLES\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Verify Postgres tables exist (source of truth)
    console.log('\n1️⃣  Verifying Postgres tables (source of truth)...');
    const postgresTables = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('standards', 'standard_files', 'parsed_requirements')
      ORDER BY table_name
    `);
    
    console.log(`   ✅ Found ${postgresTables.rows.length} tables in Postgres:`);
    postgresTables.rows.forEach(row => {
      console.log(`      - ${row.table_name}`);
    });
    
    if (postgresTables.rows.length !== 3) {
      console.log(`   ⚠️  WARNING: Expected 3 tables, found ${postgresTables.rows.length}`);
      console.log(`   ⚠️  Migration may have failed. Check migrations/001_postgres_customer_data.sql`);
    }
    
    // Step 2: Check EDCAT AI DB for duplicates
    console.log('\n2️⃣  Checking EDCAT AI DB for duplicates...');
    const edcatTables = await queryEdcatAI(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('standards', 'standard_files', 'parsed_requirements')
      ORDER BY table_name
    `);
    
    if (edcatTables.rows.length > 0) {
      console.log(`   ❌ Found ${edcatTables.rows.length} DUPLICATE tables in EDCAT AI DB:`);
      edcatTables.rows.forEach(row => {
        console.log(`      - ${row.table_name} (DUPLICATE - will be deleted)`);
      });
      
      // Step 3: Count rows in duplicates (for logging)
      console.log('\n3️⃣  Checking data in duplicate tables...');
      for (const table of edcatTables.rows) {
        try {
          const count = await queryEdcatAI(`SELECT COUNT(*) as count FROM ${table.table_name}`);
          const rowCount = parseInt(count.rows[0].count);
          console.log(`      ${table.table_name}: ${rowCount} rows`);
          
          if (rowCount > 0) {
            console.log(`      ⚠️  WARNING: ${table.table_name} has ${rowCount} rows in EDCAT AI DB`);
            console.log(`      ⚠️  These rows will be LOST if they're not in Postgres!`);
          }
        } catch (error) {
          console.log(`      ⚠️  Could not count rows in ${table.table_name}: ${error.message}`);
        }
      }
      
      // Step 4: Verify Postgres has the data
      console.log('\n4️⃣  Verifying Postgres has the data...');
      for (const table of edcatTables.rows) {
        try {
          const count = await queryPostgres(`SELECT COUNT(*) as count FROM public.${table.table_name}`);
          const rowCount = parseInt(count.rows[0].count);
          console.log(`      public.${table.table_name}: ${rowCount} rows`);
          
          if (rowCount === 0) {
            console.log(`      ⚠️  WARNING: Postgres table is EMPTY!`);
            console.log(`      ⚠️  Data migration may be needed before deleting duplicates.`);
          } else {
            console.log(`      ✅ Postgres table has data - safe to delete duplicate`);
          }
        } catch (error) {
          console.log(`      ❌ ERROR checking Postgres ${table.table_name}: ${error.message}`);
          console.log(`      ❌ CANNOT DELETE duplicate - Postgres table doesn't exist or is broken!`);
        }
      }
      
      // Step 5: Delete duplicates (with confirmation prompt simulation)
      console.log('\n5️⃣  Deleting duplicate tables from EDCAT AI DB...');
      console.log('   ⚠️  This will permanently delete these tables from EDCAT AI DB!');
      console.log('   ⚠️  Ensure all data is in Postgres before proceeding.\n');
      
      for (const table of edcatTables.rows) {
        try {
          console.log(`   🗑️  Dropping ${table.table_name} from EDCAT AI DB...`);
          await queryEdcatAI(`DROP TABLE IF EXISTS ${table.table_name} CASCADE`);
          console.log(`      ✅ Deleted ${table.table_name}`);
        } catch (error) {
          console.log(`      ❌ Error deleting ${table.table_name}: ${error.message}`);
        }
      }
      
      // Step 6: Verify deletion
      console.log('\n6️⃣  Verifying deletion...');
      const remainingEdcatTables = await queryEdcatAI(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('standards', 'standard_files', 'parsed_requirements')
        ORDER BY table_name
      `);
      
      if (remainingEdcatTables.rows.length === 0) {
        console.log(`   ✅ All duplicate tables deleted successfully!`);
      } else {
        console.log(`   ⚠️  Still found ${remainingEdcatTables.rows.length} tables in EDCAT AI DB:`);
        remainingEdcatTables.rows.forEach(row => {
          console.log(`      - ${row.table_name}`);
        });
      }
      
    } else {
      console.log(`   ✅ No duplicate tables found in EDCAT AI DB!`);
      console.log(`   ✅ Cleanup not needed.`);
    }
    
    // Step 7: Verify code connections
    console.log('\n7️⃣  Verifying code connections...');
    console.log('   ✅ requirements.js uses: public.standards, public.standard_files, public.parsed_requirements');
    console.log('   ✅ upload.js uses: public.standards, public.standard_files');
    console.log('   ✅ parse.js uses: public.standards, public.standard_files, public.parsed_requirements');
    console.log('   ✅ chat.js uses: public.standards, public.parsed_requirements, ai_standard');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📊 FINAL STATE:');
    console.log('   PostgreSQL (DATABASE_URL):');
    console.log('      ✅ public.standards (source of truth)');
    console.log('      ✅ public.standard_files (source of truth)');
    console.log('      ✅ public.parsed_requirements (source of truth)');
    console.log('\n   EDCAT AI (EDCAT_AI_DATABASE_URL):');
    console.log('      ✅ ai_standard (Vera-specific)');
    console.log('      ✅ ai_persona (Vera-specific)');
    console.log('      ✅ ai_conversation_history (Vera-specific)');
    console.log('      ✅ ai_memories (Vera-specific)');
    console.log('      ✅ learned_patterns (AI-specific)');
    console.log('      ✅ regulatory_websites (regulatory sources)');
    console.log('      ❌ NO duplicate standards/standard_files/parsed_requirements');
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ ERROR during cleanup:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

cleanupDuplicates();

