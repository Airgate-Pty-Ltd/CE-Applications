/**
 * Test Script for Vera Clause Lookup
 * Tests the getStandardClause function with various scenarios
 */

import { getStandardClause, findStandardByCode } from '../services/vera/VeraClauseLookupService.js';
import { queryPostgres } from '../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

async function testClauseLookup() {
  console.log('🧪 Testing Vera Clause Lookup Service\n');

  try {
    // Test 1: Find AS9100 standard
    console.log('Test 1: Finding AS9100 standard...');
    const as9100 = await findStandardByCode('AS9100');
    if (as9100) {
      console.log(`✅ Found AS9100: ${as9100.code} - ${as9100.name}`);
      console.log(`   Standard ID: ${as9100.id}\n`);

      // Test 2: Get clause 8.7
      console.log('Test 2: Getting clause 8.7...');
      const clause87 = await getStandardClause(as9100.id, '8.7', {
        tenantId: DEFAULT_TENANT_ID,
        includeChildren: true,
        diagnostic: true
      });

      if (clause87 && clause87.found) {
        console.log(`✅ Found clause 8.7: ${clause87.clause.clauseTitle || clause87.clause.clauseNumber}`);
        console.log(`   Requirement: ${clause87.clause.requirementText.substring(0, 200)}...`);
        console.log(`   Children: ${clause87.childCount}\n`);
      } else {
        console.log(`❌ Clause 8.7 not found: ${clause87?.error || 'Unknown error'}\n`);
      }

      // Test 3: Get clause 5.1
      console.log('Test 3: Getting clause 5.1...');
      const clause51 = await getStandardClause(as9100.id, '5.1', {
        tenantId: DEFAULT_TENANT_ID,
        includeChildren: true,
        diagnostic: true
      });

      if (clause51 && clause51.found) {
        console.log(`✅ Found clause 5.1: ${clause51.clause.clauseTitle || clause51.clause.clauseNumber}`);
        console.log(`   Requirement: ${clause51.clause.requirementText.substring(0, 200)}...`);
        console.log(`   Children: ${clause51.childCount}\n`);
      } else {
        console.log(`❌ Clause 5.1 not found: ${clause51?.error || 'Unknown error'}\n`);
      }
    } else {
      console.log('❌ AS9100 not found in database. Please upload and parse it first.\n');
    }

    // Test 4: Find ISO9001 standard
    console.log('Test 4: Finding ISO9001 standard...');
    const iso9001 = await findStandardByCode('ISO9001');
    if (iso9001) {
      console.log(`✅ Found ISO9001: ${iso9001.code} - ${iso9001.name}`);
      console.log(`   Standard ID: ${iso9001.id}\n`);

      // Test 5: Get clause 7.5.3
      console.log('Test 5: Getting clause 7.5.3...');
      const clause753 = await getStandardClause(iso9001.id, '7.5.3', {
        tenantId: DEFAULT_TENANT_ID,
        includeChildren: true,
        diagnostic: true
      });

      if (clause753 && clause753.found) {
        console.log(`✅ Found clause 7.5.3: ${clause753.clause.clauseTitle || clause753.clause.clauseNumber}`);
        console.log(`   Requirement: ${clause753.clause.requirementText.substring(0, 200)}...`);
        console.log(`   Children: ${clause753.childCount}\n`);
      } else {
        console.log(`❌ Clause 7.5.3 not found: ${clause753?.error || 'Unknown error'}\n`);
      }
    } else {
      console.log('❌ ISO9001 not found in database. Please upload and parse it first.\n');
    }

    // Test 6: Check parsed requirements count
    console.log('Test 6: Checking parsed requirements count...');
    const reqCount = await queryPostgres(
      `SELECT COUNT(*) as count 
       FROM public.parsed_requirements 
       WHERE is_in_scope = true`
    );
    console.log(`✅ Total parsed requirements: ${reqCount.rows[0]?.count || 0}\n`);

    // Test 7: Check standards count
    console.log('Test 7: Checking standards count...');
    const stdCount = await queryPostgres(
      `SELECT COUNT(*) as count, 
              COUNT(*) FILTER (WHERE code LIKE 'AS%') as as_standards,
              COUNT(*) FILTER (WHERE code LIKE 'ISO%') as iso_standards
       FROM public.standards`
    );
    const counts = stdCount.rows[0];
    console.log(`✅ Total standards: ${counts.count || 0}`);
    console.log(`   AS standards: ${counts.as_standards || 0}`);
    console.log(`   ISO standards: ${counts.iso_standards || 0}\n`);

    console.log('✅ All tests completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testClauseLookup()
  .then(() => {
    console.log('✅ Test script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });

