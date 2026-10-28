/**
 * Test the actual API endpoint logic to see what it returns
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function testEndpoint(category = null) {
  console.log(`=== TESTING API ENDPOINT (category=${category || 'null'}) ===\n`);
  
  // Simulate the exact logic from requirements.js
  let hasStandardFiles = false;
  let fileCategoryMap = new Map();
  let standardsWithFiles = new Set();
  
  try {
    const standardFilesCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files'
      ) as exists
    `);
    hasStandardFiles = standardFilesCheck.rows[0]?.exists || false;
    
    if (hasStandardFiles) {
      const filesResult = await queryPostgres(`
        SELECT DISTINCT ON (standard_id)
          standard_id,
          file_category
        FROM public.standard_files
        WHERE standard_id IS NOT NULL
        ORDER BY standard_id, uploaded_at DESC
      `);
      
      filesResult.rows.forEach(row => {
        if (row.standard_id) {
          fileCategoryMap.set(row.standard_id, row.file_category);
          standardsWithFiles.add(row.standard_id);
        }
      });
      
      console.log(`✓ standardsWithFiles.size: ${standardsWithFiles.size}`);
    }
  } catch (filesError) {
    console.log(`✗ Error checking standard_files: ${filesError.message}`);
    hasStandardFiles = false;
  }
  
  // Query standards
  let query = `
    SELECT 
      s.id as standard_id,
      s.code,
      s.name,
      s.sector,
      s.uploaded_at,
      s.total_clauses as total_requirements
    FROM standards s
    WHERE s.code IS NOT NULL 
      AND TRIM(s.code) != ''
      AND s.uploaded_at IS NOT NULL
      ${hasStandardFiles && standardsWithFiles.size > 0 ? `
      AND s.id = ANY($1)
      ` : ''}
    ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC NULLS LAST
  `;
  
  const queryParams = hasStandardFiles && standardsWithFiles.size > 0 
    ? [Array.from(standardsWithFiles)]
    : [];
  
  const result = await queryEdcatAI(query, queryParams);
  console.log(`✓ Query returned: ${result.rows.length} standards`);
  
  // Filter by files
  const standards = result.rows
    .filter(row => {
      if (hasStandardFiles) {
        return standardsWithFiles.has(row.standard_id);
      }
      return false;
    })
    .map(row => {
      let fileCategory = 'standard';
      if (fileCategoryMap.has(row.standard_id)) {
        fileCategory = fileCategoryMap.get(row.standard_id);
      } else if (row.sector === 'regulatory') {
        fileCategory = 'regulatory';
      } else if (row.sector === 'customer') {
        fileCategory = 'customer_requirements';
      }
      
      return {
        id: row.standard_id,
        code: row.code,
        name: row.name,
        sector: row.sector,
        fileCategory: fileCategory,
        uploadedAt: row.uploaded_at,
        totalRequirements: row.total_requirements || 0
      };
    });
  
  console.log(`✓ After file filter: ${standards.length} standards`);
  
  // Apply category filter
  const filteredByCategory = standards.filter(std => {
    if (!category) return true;
    
    if (category === 'standard') {
      return std.fileCategory === 'standard';
    } else if (category === 'regulatory') {
      return std.fileCategory === 'regulatory';
    } else if (category === 'customer') {
      return std.fileCategory === 'customer_requirements' || std.fileCategory === 'customer';
    }
    return true;
  });
  
  console.log(`✓ After category filter: ${filteredByCategory.length} standards`);
  
  if (filteredByCategory.length === 0) {
    console.log(`\n✗ RESULT: 0 standards returned!`);
    console.log(`  → Query returned: ${result.rows.length}`);
    console.log(`  → After file filter: ${standards.length}`);
    console.log(`  → After category filter: ${filteredByCategory.length}`);
    
    if (standards.length > 0 && filteredByCategory.length === 0) {
      console.log(`\n✗ ROOT CAUSE: Category filter removed all standards!`);
      console.log(`  → Category requested: "${category}"`);
      console.log(`  → fileCategories found:`, [...new Set(standards.map(s => s.fileCategory))].join(', '));
    }
  } else {
    console.log(`\n✓ RESULT: ${filteredByCategory.length} standards would be returned`);
    console.log(`  Sample: ${filteredByCategory.slice(0, 3).map(s => s.code).join(', ')}`);
  }
  
  return filteredByCategory;
}

// Test all scenarios
async function runTests() {
  console.log('Testing without category...\n');
  await testEndpoint(null);
  
  console.log('\n\nTesting with category=standard...\n');
  await testEndpoint('standard');
  
  console.log('\n\nTesting with category=regulatory...\n');
  await testEndpoint('regulatory');
  
  console.log('\n\nTesting with category=customer...\n');
  await testEndpoint('customer');
  
  process.exit(0);
}

runTests().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});

