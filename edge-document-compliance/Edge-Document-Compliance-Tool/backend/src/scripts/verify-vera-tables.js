/**
 * Verify Vera Conversation Tables
 * Checks that all required tables for Vera's conversational features exist in EDCAT AI database
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

const REQUIRED_TABLES = [
  'edcat.ai_persona_profile',
  'edcat.ai_conversation_state',
  'edcat.ai_conversation_history',
  'edcat.ai_policy',
  'edcat.ai_prompt'
];

async function verifyVeraTables() {
  console.log('\n🔍 Verifying Vera Conversation Tables in EDCAT AI Database...\n');

  try {
    // Check connection
    await queryEdcatAI('SELECT NOW()');
    console.log('✓ EDCAT AI database connection successful\n');

    // Check each required table
    const results = {};
    for (const tableName of REQUIRED_TABLES) {
      try {
        // Extract schema and table name
        const [schema, table] = tableName.includes('.') ? tableName.split('.') : ['public', tableName];
        
        const result = await queryEdcatAI(`
          SELECT 
            COUNT(*) as row_count,
            column_name,
            data_type
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          GROUP BY column_name, data_type
          ORDER BY column_name
        `, [schema, table]);

        if (result.rows.length > 0) {
          // NOTE: Use correct database based on schema
          // edcat.* tables use queryEdcatAI, public.* tables use queryPostgres
          const queryFn = schema === 'edcat' ? queryEdcatAI : queryPostgres;
          const countResult = await queryFn(`SELECT COUNT(*) as count FROM ${tableName}`);
          results[tableName] = {
            exists: true,
            columns: result.rows.length,
            rowCount: parseInt(countResult.rows[0].count),
            columnsList: result.rows.map(r => `${r.column_name} (${r.data_type})`)
          };
          console.log(`✅ ${tableName}: EXISTS (${result.rows.length} columns, ${countResult.rows[0].count} rows)`);
        } else {
          results[tableName] = { exists: false };
          console.log(`❌ ${tableName}: NOT FOUND`);
        }
      } catch (error) {
        results[tableName] = { exists: false, error: error.message };
        console.log(`❌ ${tableName}: ERROR - ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    const existing = REQUIRED_TABLES.filter(t => results[t]?.exists);
    const missing = REQUIRED_TABLES.filter(t => !results[t]?.exists);

    if (missing.length === 0) {
      console.log('✅ All Vera conversation tables are present!');
      console.log(`   Found: ${existing.length}/${REQUIRED_TABLES.length} tables\n`);
      
      // Show table details
      for (const tableName of REQUIRED_TABLES) {
        const info = results[tableName];
        if (info.exists) {
          console.log(`   ${tableName}:`);
          console.log(`     - Columns: ${info.columns}`);
          console.log(`     - Rows: ${info.rowCount}`);
          console.log(`     - Columns: ${info.columnsList.slice(0, 3).join(', ')}${info.columnsList.length > 3 ? '...' : ''}`);
        }
      }
    } else {
      console.log('⚠️  Some Vera conversation tables are missing!');
      console.log(`   Found: ${existing.length}/${REQUIRED_TABLES.length} tables`);
      console.log(`   Missing: ${missing.join(', ')}\n`);
      console.log('   To fix: Run the migration file: migrations/002_edcat_ai_intelligence.sql');
      console.log('   Or restart the server to trigger automatic migrations.\n');
    }

    // Check for indexes
    console.log('\n📊 Checking indexes...');
    for (const tableName of REQUIRED_TABLES) {
      if (results[tableName]?.exists) {
        try {
          const [schema, table] = tableName.includes('.') ? tableName.split('.') : ['public', tableName];
          const indexResult = await queryEdcatAI(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = $1 AND tablename = $2
          `, [schema, table]);
          
          if (indexResult.rows.length > 0) {
            console.log(`   ${tableName}: ${indexResult.rows.length} index(es)`);
          } else {
            console.log(`   ${tableName}: No indexes found`);
          }
        } catch (error) {
          console.log(`   ${tableName}: Could not check indexes`);
        }
      }
    }

    return {
      success: missing.length === 0,
      tables: results,
      existing,
      missing
    };

  } catch (error) {
    console.error('❌ Error verifying Vera tables:', error.message);
    console.error('   Make sure EDCAT_AI_DATABASE_URL is set correctly\n');
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyVeraTables()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { verifyVeraTables };

