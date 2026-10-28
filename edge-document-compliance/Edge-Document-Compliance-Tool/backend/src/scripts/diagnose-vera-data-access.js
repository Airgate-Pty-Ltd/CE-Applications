/**
 * Vera Data Access Diagnostic Script
 * 
 * Checks if Vera can see:
 * 1. Standards in database
 * 2. Terms and definitions
 * 3. Requirements/parsed requirements
 * 4. Learning documents
 * 
 * Run: node backend/src/scripts/diagnose-vera-data-access.js
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function diagnoseVeraDataAccess() {
  console.log('\n🔍 VERA DATA ACCESS DIAGNOSTIC\n');
  console.log('='.repeat(60));

  const issues = [];
  const successes = [];

  // ============================================================================
  // 1. CHECK STANDARDS (Customer Data DB - public.standards)
  // ============================================================================
  console.log('\n📋 1. CHECKING STANDARDS (Customer Data DB)');
  console.log('-'.repeat(60));

  try {
    // Check if table exists
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standards'
      ) as exists;
    `);

    if (!tableCheck.rows[0].exists) {
      issues.push('❌ Table public.standards does NOT exist');
      console.log('❌ Table public.standards does NOT exist');
    } else {
      console.log('✅ Table public.standards exists');

      // Count standards
      const countResult = await queryPostgres(`
        SELECT COUNT(*) as count FROM public.standards;
      `);
      const count = parseInt(countResult.rows[0].count);
      console.log(`   Total standards: ${count}`);

      if (count === 0) {
        issues.push('⚠️  Table public.standards exists but is EMPTY');
        console.log('⚠️  Table is EMPTY - no standards found');
      } else {
        successes.push(`✅ Found ${count} standards in public.standards`);

        // Show sample standards
        const sampleResult = await queryPostgres(`
          SELECT code, name, is_active 
          FROM public.standards 
          LIMIT 5;
        `);
        console.log('   Sample standards:');
        sampleResult.rows.forEach(row => {
          console.log(`   - ${row.code}: ${row.name} (active: ${row.is_active})`);
        });
      }

      // Check columns
      const columnsResult = await queryPostgres(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'standards'
        ORDER BY ordinal_position;
      `);
      console.log(`   Columns: ${columnsResult.rows.map(r => r.column_name).join(', ')}`);
    }
  } catch (error) {
    issues.push(`❌ Error checking standards: ${error.message}`);
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
  }

  // ============================================================================
  // 2. CHECK TERMS AND DEFINITIONS (EDCAT AI DB - edcat.terms_and_definitions)
  // ============================================================================
  console.log('\n📚 2. CHECKING TERMS AND DEFINITIONS (EDCAT AI DB)');
  console.log('-'.repeat(60));

  try {
    const tableCheck = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'edcat' 
        AND table_name = 'terms_and_definitions'
      ) as exists;
    `);

    if (!tableCheck.rows[0].exists) {
      issues.push('❌ Table edcat.terms_and_definitions does NOT exist');
      console.log('❌ Table edcat.terms_and_definitions does NOT exist');
    } else {
      console.log('✅ Table edcat.terms_and_definitions exists');

      const countResult = await queryEdcatAI(`
        SELECT COUNT(*) as count FROM edcat.terms_and_definitions;
      `);
      const count = parseInt(countResult.rows[0].count);
      console.log(`   Total terms: ${count}`);

      if (count === 0) {
        issues.push('⚠️  Table edcat.terms_and_definitions exists but is EMPTY');
        console.log('⚠️  Table is EMPTY - no terms found');
      } else {
        successes.push(`✅ Found ${count} terms in edcat.terms_and_definitions`);

        const sampleResult = await queryEdcatAI(`
          SELECT term_name, acronym, category 
          FROM edcat.terms_and_definitions 
          LIMIT 5;
        `);
        console.log('   Sample terms:');
        sampleResult.rows.forEach(row => {
          console.log(`   - ${row.term_name}${row.acronym ? ` (${row.acronym})` : ''} [${row.category}]`);
        });
      }

      // Check columns
      const columnsResult = await queryEdcatAI(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'edcat' 
        AND table_name = 'terms_and_definitions'
        ORDER BY ordinal_position;
      `);
      console.log(`   Columns: ${columnsResult.rows.map(r => r.column_name).join(', ')}`);
    }
  } catch (error) {
    issues.push(`❌ Error checking terms: ${error.message}`);
    console.error('❌ Error:', error.message);
  }

  // ============================================================================
  // 3. CHECK REQUIREMENTS (Customer Data DB - public.parsed_requirements)
  // ============================================================================
  console.log('\n📄 3. CHECKING REQUIREMENTS (Customer Data DB)');
  console.log('-'.repeat(60));

  try {
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'parsed_requirements'
      ) as exists;
    `);

    if (!tableCheck.rows[0].exists) {
      issues.push('❌ Table public.parsed_requirements does NOT exist');
      console.log('❌ Table public.parsed_requirements does NOT exist');
    } else {
      console.log('✅ Table public.parsed_requirements exists');

      const countResult = await queryPostgres(`
        SELECT COUNT(*) as count FROM public.parsed_requirements;
      `);
      const count = parseInt(countResult.rows[0].count);
      console.log(`   Total requirements: ${count}`);

      if (count === 0) {
        issues.push('⚠️  Table public.parsed_requirements exists but is EMPTY');
        console.log('⚠️  Table is EMPTY - no requirements found');
      } else {
        successes.push(`✅ Found ${count} requirements in public.parsed_requirements`);

        // Check by standard
        const byStandardResult = await queryPostgres(`
          SELECT s.code, COUNT(pr.id) as req_count
          FROM public.parsed_requirements pr
          JOIN public.standards s ON pr.standard_id = s.id
          GROUP BY s.code
          ORDER BY req_count DESC
          LIMIT 5;
        `);
        console.log('   Requirements by standard:');
        byStandardResult.rows.forEach(row => {
          console.log(`   - ${row.code}: ${row.req_count} requirements`);
        });
      }
    }
  } catch (error) {
    issues.push(`❌ Error checking requirements: ${error.message}`);
    console.error('❌ Error:', error.message);
  }

  // ============================================================================
  // 4. CHECK COMPLIANCE REQUIREMENTS (Customer Data DB - public.compliance_requirements)
  // ============================================================================
  console.log('\n📋 4. CHECKING COMPLIANCE REQUIREMENTS (Customer Data DB)');
  console.log('-'.repeat(60));

  try {
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'compliance_requirements'
      ) as exists;
    `);

    if (!tableCheck.rows[0].exists) {
      issues.push('❌ Table public.compliance_requirements does NOT exist');
      console.log('❌ Table public.compliance_requirements does NOT exist');
    } else {
      console.log('✅ Table public.compliance_requirements exists');

      const countResult = await queryPostgres(`
        SELECT COUNT(*) as count FROM public.compliance_requirements;
      `);
      const count = parseInt(countResult.rows[0].count);
      console.log(`   Total compliance requirements: ${count}`);

      if (count === 0) {
        issues.push('⚠️  Table public.compliance_requirements exists but is EMPTY');
        console.log('⚠️  Table is EMPTY - no compliance requirements found');
      } else {
        successes.push(`✅ Found ${count} compliance requirements`);
      }
    }
  } catch (error) {
    issues.push(`❌ Error checking compliance_requirements: ${error.message}`);
    console.error('❌ Error:', error.message);
  }

  // ============================================================================
  // 5. CHECK LEARNING DOCUMENTS (EDCAT AI DB - edcat.document_content_for_learning)
  // ============================================================================
  console.log('\n📚 5. CHECKING LEARNING DOCUMENTS (EDCAT AI DB)');
  console.log('-'.repeat(60));

  try {
    const tableCheck = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'edcat' 
        AND table_name = 'document_content_for_learning'
      ) as exists;
    `);

    if (!tableCheck.rows[0].exists) {
      issues.push('❌ Table edcat.document_content_for_learning does NOT exist');
      console.log('❌ Table edcat.document_content_for_learning does NOT exist');
    } else {
      console.log('✅ Table edcat.document_content_for_learning exists');

      const countResult = await queryEdcatAI(`
        SELECT COUNT(*) as count FROM edcat.document_content_for_learning;
      `);
      const count = parseInt(countResult.rows[0].count);
      console.log(`   Total learning documents: ${count}`);

      if (count === 0) {
        issues.push('⚠️  Table edcat.document_content_for_learning exists but is EMPTY');
        console.log('⚠️  Table is EMPTY - no learning documents found');
      } else {
        successes.push(`✅ Found ${count} learning documents`);

        // Check by standard
        const byStandardResult = await queryEdcatAI(`
          SELECT standard_code, COUNT(*) as doc_count
          FROM edcat.document_content_for_learning
          WHERE standard_code IS NOT NULL
          GROUP BY standard_code
          ORDER BY doc_count DESC
          LIMIT 5;
        `);
        console.log('   Learning documents by standard:');
        byStandardResult.rows.forEach(row => {
          console.log(`   - ${row.standard_code}: ${row.doc_count} documents`);
        });
      }
    }
  } catch (error) {
    issues.push(`❌ Error checking learning documents: ${error.message}`);
    console.error('❌ Error:', error.message);
  }

  // ============================================================================
  // 6. CHECK Q&A RESPONSE BANK (EDCAT AI DB - edcat.vera_query_response_bank)
  // ============================================================================
  console.log('\n💬 6. CHECKING Q&A RESPONSE BANK (EDCAT AI DB)');
  console.log('-'.repeat(60));

  try {
    const tableCheck = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'edcat' 
        AND table_name = 'vera_query_response_bank'
      ) as exists;
    `);

    if (!tableCheck.rows[0].exists) {
      issues.push('❌ Table edcat.vera_query_response_bank does NOT exist');
      console.log('❌ Table edcat.vera_query_response_bank does NOT exist');
    } else {
      console.log('✅ Table edcat.vera_query_response_bank exists');

      const countResult = await queryEdcatAI(`
        SELECT COUNT(*) as count FROM edcat.vera_query_response_bank;
      `);
      const count = parseInt(countResult.rows[0].count);
      console.log(`   Total Q&A entries: ${count}`);

      if (count === 0) {
        issues.push('⚠️  Table edcat.vera_query_response_bank exists but is EMPTY');
        console.log('⚠️  Table is EMPTY - no Q&A entries found');
      } else {
        successes.push(`✅ Found ${count} Q&A entries`);
      }
    }
  } catch (error) {
    issues.push(`❌ Error checking Q&A bank: ${error.message}`);
    console.error('❌ Error:', error.message);
  }

  // ============================================================================
  // 7. TEST VERA'S ACTUAL QUERIES
  // ============================================================================
  console.log('\n🔬 7. TESTING VERA\'S ACTUAL QUERIES');
  console.log('-'.repeat(60));

  // Test terminology lookup
  console.log('\n   Testing terminology lookup (VeraTerminologyService pattern):');
  try {
    const termTest = await queryEdcatAI(`
      SELECT term_name, definition, category
      FROM edcat.terms_and_definitions
      WHERE term_name ILIKE 'APQP' OR acronym ILIKE 'APQP'
      LIMIT 1;
    `);
    if (termTest.rows.length > 0) {
      console.log(`   ✅ Found term: ${termTest.rows[0].term_name}`);
    } else {
      console.log('   ⚠️  No term found for "APQP"');
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }

  // Test standards lookup
  console.log('\n   Testing standards lookup (VeraCoreEngine pattern):');
  try {
    const standardsTest = await queryPostgres(`
      SELECT code, name, is_active
      FROM public.standards
      WHERE is_active = TRUE OR is_active IS NULL
      LIMIT 5;
    `);
    if (standardsTest.rows.length > 0) {
      console.log(`   ✅ Found ${standardsTest.rows.length} active standards`);
      standardsTest.rows.forEach(row => {
        console.log(`      - ${row.code}: ${row.name}`);
      });
    } else {
      console.log('   ⚠️  No active standards found');
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }

  // Test requirements lookup
  console.log('\n   Testing requirements lookup (VeraClauseMatcher pattern):');
  try {
    const reqTest = await queryPostgres(`
      SELECT pr.clause_number, pr.requirement_text, s.code as standard_code
      FROM public.parsed_requirements pr
      JOIN public.standards s ON pr.standard_id = s.id
      WHERE s.code = 'AS9100D'
      LIMIT 3;
    `);
    if (reqTest.rows.length > 0) {
      console.log(`   ✅ Found ${reqTest.rows.length} requirements for AS9100D`);
      reqTest.rows.forEach(row => {
        console.log(`      - ${row.standard_code} ${row.clause_number}: ${row.requirement_text.substring(0, 50)}...`);
      });
    } else {
      console.log('   ⚠️  No requirements found for AS9100D');
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n✅ Successes: ${successes.length}`);
  successes.forEach(s => console.log(`   ${s}`));

  console.log(`\n⚠️  Issues: ${issues.length}`);
  if (issues.length > 0) {
    issues.forEach(i => console.log(`   ${i}`));
  } else {
    console.log('   None! All checks passed.');
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(60));

  if (issues.some(i => i.includes('does NOT exist'))) {
    console.log('\n1. Run migrations to create missing tables:');
    console.log('   npm start  (migrations run automatically on startup)');
  }

  if (issues.some(i => i.includes('EMPTY'))) {
    console.log('\n2. Run ingestion scripts to populate data:');
    console.log('   npm run ingest:requirements  (for standards and requirements)');
    console.log('   npm run ingest:terms         (for terms and definitions)');
  }

  if (issues.length === 0 && successes.length > 0) {
    console.log('\n✅ All data is accessible! If Vera still can\'t see it, check:');
    console.log('   1. Query patterns in VeraCoreEngine.js');
    console.log('   2. Database connection strings (DATABASE_URL, EDCAT_AI_DATABASE_URL)');
    console.log('   3. Schema names (public vs edcat)');
    console.log('   4. Column names match between queries and actual schema');
  }

  console.log('\n');
}

// Run diagnostic
diagnoseVeraDataAccess()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

