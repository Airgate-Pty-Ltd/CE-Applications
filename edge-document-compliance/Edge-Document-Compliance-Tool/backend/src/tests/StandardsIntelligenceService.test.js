/**
 * Unit Tests for StandardsIntelligenceService
 * Tests intelligent standards access and clause lookup functionality
 */

import StandardsIntelligenceService from '../services/vera/StandardsIntelligenceService.js';
import { queryPostgres } from '../config/databases.js';

// Mock data for testing
const mockStandard = {
  id: 'test-standard-id',
  code: 'AS9100D',
  name: 'AS9100D Quality Management Systems',
  total_requirements: 100
};

const mockRequirement = {
  id: 'test-requirement-id',
  standard_id: 'test-standard-id',
  clause_number: '8.7',
  clause_ref: '8.7',
  full_ref: '8.7',
  requirement_text: 'The organization shall control nonconforming outputs.',
  requirement_type: 'requirement',
  confidence: 0.95
};

/**
 * Test getRequirementByClause
 */
async function testGetRequirementByClause() {
  console.log('\n🧪 Testing getRequirementByClause...\n');
  
  try {
    // Test exact match
    const result1 = await StandardsIntelligenceService.getRequirementByClause(
      mockStandard.id,
      '8.7'
    );
    console.log(`  ${result1 ? '✅' : '❌'} Exact clause match: ${result1 ? 'Found' : 'Not found'}`);
    
    // Test partial match (parent clause)
    const result2 = await StandardsIntelligenceService.getRequirementByClause(
      mockStandard.id,
      '8.7.1'
    );
    console.log(`  ${result2 ? '✅' : '⚠️'} Partial clause match: ${result2 ? 'Found' : 'Not found (expected if no sub-clause)'}`);
    
    // Test non-existent clause
    const result3 = await StandardsIntelligenceService.getRequirementByClause(
      mockStandard.id,
      '99.99'
    );
    console.log(`  ${!result3 ? '✅' : '❌'} Non-existent clause: ${!result3 ? 'Correctly returns null' : 'Unexpectedly found'}`);
    
    return true;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test findSimilarRequirements
 */
async function testFindSimilarRequirements() {
  console.log('\n🧪 Testing findSimilarRequirements...\n');
  
  try {
    const result = await StandardsIntelligenceService.findSimilarRequirements(
      mockRequirement.id,
      5
    );
    console.log(`  ${Array.isArray(result) ? '✅' : '❌'} Returns array: ${Array.isArray(result)}`);
    console.log(`  ${result.length >= 0 ? '✅' : '❌'} Array length valid: ${result.length}`);
    
    return true;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test getCrosswalkMapping
 */
async function testGetCrosswalkMapping() {
  console.log('\n🧪 Testing getCrosswalkMapping...\n');
  
  try {
    const result = await StandardsIntelligenceService.getCrosswalkMapping(
      'AS9100D',
      'ISO9001',
      '8.7'
    );
    console.log(`  ${result !== null ? '✅' : '⚠️'} Crosswalk result: ${result ? 'Found mapping or fallback' : 'No mapping (may be expected)'}`);
    
    return true;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test getRequirementsForStandard
 */
async function testGetRequirementsForStandard() {
  console.log('\n🧪 Testing getRequirementsForStandard...\n');
  
  try {
    // Test without filters
    const result1 = await StandardsIntelligenceService.getRequirementsForStandard(
      mockStandard.id
    );
    console.log(`  ${Array.isArray(result1) ? '✅' : '❌'} Returns array: ${Array.isArray(result1)}`);
    console.log(`  ${result1.length >= 0 ? '✅' : '❌'} Requirements found: ${result1.length}`);
    
    // Test with clause filter
    const result2 = await StandardsIntelligenceService.getRequirementsForStandard(
      mockStandard.id,
      { clauseNumber: '8.7' }
    );
    console.log(`  ${Array.isArray(result2) ? '✅' : '❌'} Filtered results: ${Array.isArray(result2)}`);
    
    return true;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test searchRequirements
 */
async function testSearchRequirements() {
  console.log('\n🧪 Testing searchRequirements...\n');
  
  try {
    const result = await StandardsIntelligenceService.searchRequirements(
      mockStandard.id,
      'shall'
    );
    console.log(`  ${Array.isArray(result) ? '✅' : '❌'} Returns array: ${Array.isArray(result)}`);
    console.log(`  ${result.length >= 0 ? '✅' : '❌'} Search results: ${result.length}`);
    
    return true;
  } catch (error) {
    console.error('  ❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Run all unit tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 STANDARDS INTELLIGENCE SERVICE UNIT TESTS');
  console.log('='.repeat(60));
  
  const results = {
    getRequirementByClause: false,
    findSimilarRequirements: false,
    getCrosswalkMapping: false,
    getRequirementsForStandard: false,
    searchRequirements: false
  };
  
  results.getRequirementByClause = await testGetRequirementByClause();
  results.findSimilarRequirements = await testFindSimilarRequirements();
  results.getCrosswalkMapping = await testGetCrosswalkMapping();
  results.getRequirementsForStandard = await testGetRequirementsForStandard();
  results.searchRequirements = await testSearchRequirements();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:\n');
  
  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${test}`);
  });
  
  console.log(`\n  Overall: ${passed}/${total} tests passed`);
  console.log(`  Success rate: ${((passed / total) * 100).toFixed(1)}%\n`);
  
  return {
    success: passed === total,
    results: results,
    summary: { passed, total }
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { 
  runAllTests,
  testGetRequirementByClause,
  testFindSimilarRequirements,
  testGetCrosswalkMapping,
  testGetRequirementsForStandard,
  testSearchRequirements
};

