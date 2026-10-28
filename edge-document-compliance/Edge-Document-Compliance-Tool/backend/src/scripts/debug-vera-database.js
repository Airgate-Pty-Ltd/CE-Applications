/**
 * Debug Vera Database Connections and Schema
 * Checks both databases and reports schema mismatches
 */

import { queryPostgres, queryEdcatAI, checkConnections, postgresPool, edcatPool } from '../config/databases.js';

async function checkVeraTables() {
  console.log('🔍 Checking Vera Database Connections and Schema...\n');

  // Check if we're in Railway environment
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME;
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasEdcatUrl = !!process.env.EDCAT_AI_DATABASE_URL;
  
  console.log('Environment Check:');
  console.log(`   Railway: ${isRailway ? '✅ Yes' : '❌ No'}`);
  console.log(`   DATABASE_URL: ${hasDatabaseUrl ? '✅ Set' : '❌ Not set'}`);
  console.log(`   EDCAT_AI_DATABASE_URL: ${hasEdcatUrl ? '✅ Set' : '⚠️  Not set (using DATABASE_URL)'}`);
  
  if (!hasDatabaseUrl) {
    console.error('\n❌ DATABASE_URL environment variable is not set!');
    console.error('   This script needs database connection strings to work.');
    console.error('   On Railway: Environment variables are set automatically');
    console.error('   Locally: Set DATABASE_URL and EDCAT_AI_DATABASE_URL in .env file');
    return;
  }

  // Check connections
  console.log('\n1. Testing Database Connections...');
  try {
    const connections = await checkConnections();
    if (connections.error) {
      console.error('   ❌ Connection failed:', connections.error);
      if (connections.error.includes('ENOTFOUND') && connections.error.includes('railway.internal')) {
        console.error('   💡 Railway internal hostnames only work inside Railway containers');
        console.error('   💡 To run this script:');
        console.error('      - Deploy to Railway and run it there, OR');
        console.error('      - Use Railway CLI: railway run node backend/src/scripts/debug-vera-database.js');
        console.error('      - Make sure you\'re connected: railway link');
        return;
      }
    } else {
      console.log('   ✅ Connections:', connections);
    }
  } catch (error) {
    console.error('   ❌ Connection check failed:', error.message);
    if (error.message.includes('ENOTFOUND') && error.message.includes('railway.internal')) {
      console.error('   💡 This script must run inside Railway environment');
      console.error('   💡 Railway internal hostnames are not accessible from your local machine');
      return;
    }
  }

  // Check EDCAT AI DB tables (Vera's memory)
  console.log('\n2. Checking EDCAT AI Database (Vera Memory)...');
  try {
    // Check if ai_conversation_history exists and has embedding column
    const historyCheck = await queryEdcatAI(`
      SELECT 
        column_name, 
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'edcat' 
        AND table_name = 'ai_conversation_history'
      ORDER BY ordinal_position;
    `);

    if (historyCheck.rows.length === 0) {
      console.log('   ❌ ai_conversation_history table does not exist!');
      console.log('   💡 Run migration: migrations/002_edcat_ai_intelligence.sql');
    } else {
      console.log('   ✅ ai_conversation_history table exists');
      console.log('   Columns:', historyCheck.rows.map(r => r.column_name).join(', '));
      
      const hasEmbedding = historyCheck.rows.some(r => r.column_name === 'embedding');
      if (!hasEmbedding) {
        console.log('   ❌ Missing embedding column! (DB_SCHEMA_MISMATCH)');
        console.log('   💡 Run migration: migrations/046_fix_railway_schema_errors.sql');
      } else {
        console.log('   ✅ embedding column exists');
      }
    }

    // Check conversation_memory table
    const memoryCheck = await queryEdcatAI(`
      SELECT 
        column_name, 
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'edcat' 
        AND table_name = 'conversation_memory'
      ORDER BY ordinal_position;
    `);

    if (memoryCheck.rows.length === 0) {
      console.log('   ⚠️  conversation_memory table does not exist');
    } else {
      console.log('   ✅ conversation_memory table exists');
      const hasEmbedding = memoryCheck.rows.some(r => r.column_name === 'embedding');
      if (!hasEmbedding) {
        console.log('   ❌ Missing embedding column in conversation_memory!');
      } else {
        console.log('   ✅ embedding column exists in conversation_memory');
      }
    }

    // Check pgvector extension
    console.log('\n3. Checking pgvector Extension...');
    const vectorCheck = await queryEdcatAI(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as has_vector;
    `);

    if (vectorCheck.rows[0]?.has_vector) {
      console.log('   ✅ pgvector extension is enabled');
    } else {
      console.log('   ⚠️  pgvector extension is NOT enabled (SEMANTIC_SEARCH_DISABLED)');
      console.log('   💡 Vera will use JSONB embeddings instead of vector similarity');
      console.log('   💡 To enable: CREATE EXTENSION IF NOT EXISTS vector;');
    }

    // Check ai_conversation_state
    const stateCheck = await queryEdcatAI(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'edcat' 
        AND table_name = 'ai_conversation_state';
    `);

    if (parseInt(stateCheck.rows[0]?.count || 0) === 0) {
      console.log('   ❌ ai_conversation_state table does not exist!');
    } else {
      console.log('   ✅ ai_conversation_state table exists');
    }

    // Check ai_persona_profile
    const profileCheck = await queryEdcatAI(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'edcat' 
        AND table_name = 'ai_persona_profile';
    `);

    if (parseInt(profileCheck.rows[0]?.count || 0) === 0) {
      console.log('   ❌ ai_persona_profile table does not exist!');
    } else {
      console.log('   ✅ ai_persona_profile table exists');
    }

  } catch (error) {
    console.error('   ❌ Error checking EDCAT AI DB:', error.message);
    console.error('   Stack:', error.stack);
  }

  // Check Customer Data DB (standards, requirements)
  console.log('\n4. Checking Customer Data Database...');
  
  // Skip if connection failed
  if (!postgresPool) {
    console.log('   ⚠️  Skipping - Customer Data database pool not initialized');
    return;
  }
  
  try {
    const standardsCheck = await queryPostgres(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'standards';
    `);

    if (parseInt(standardsCheck.rows[0]?.count || 0) === 0) {
      console.log('   ❌ standards table does not exist!');
    } else {
      console.log('   ✅ standards table exists');
    }

    const requirementsCheck = await queryPostgres(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'parsed_requirements';
    `);

    if (parseInt(requirementsCheck.rows[0]?.count || 0) === 0) {
      console.log('   ⚠️  parsed_requirements table does not exist');
    } else {
      console.log('   ✅ parsed_requirements table exists');
    }

  } catch (error) {
    console.error('   ❌ Error checking Customer Data DB:', error.message);
  }

  console.log('\n✅ Database diagnostic complete!');
  console.log('\n💡 If you see schema mismatches, run the appropriate migrations:');
  console.log('   - migrations/041_fix_vera_schema_columns.sql');
  console.log('   - migrations/046_fix_railway_schema_errors.sql');
}

// Run diagnostic
checkVeraTables().catch(console.error);

