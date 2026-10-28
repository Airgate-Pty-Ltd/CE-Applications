/**
 * Check why category filtering might be removing all standards
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function checkCategories() {
  console.log('=== CATEGORY FILTERING CHECK ===\n');
  
  // Get all files with their categories
  const files = await queryPostgres(`
    SELECT DISTINCT ON (standard_id)
      standard_id,
      file_category
    FROM public.standard_files
    WHERE standard_id IS NOT NULL
    ORDER BY standard_id, uploaded_at DESC
  `);
  
  console.log('File categories in standard_files:');
  const categoryCounts = {};
  files.rows.forEach(f => {
    const cat = f.file_category || 'NULL';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    console.log(`  "${cat}": ${count} standards`);
  });
  
  // Get matching standards
  const standards = await queryEdcatAI(`
    SELECT id, code, sector
    FROM standards
    WHERE uploaded_at IS NOT NULL
    ORDER BY code
  `);
  
  const fileIds = new Set(files.rows.map(f => f.standard_id));
  const matching = standards.rows.filter(s => fileIds.has(s.id));
  
  console.log(`\n=== STANDARDS WITH FILES ===`);
  console.log(`Total matching: ${matching.length}\n`);
  
  // Build fileCategoryMap like requirements.js does
  const fileCategoryMap = new Map();
  files.rows.forEach(row => {
    if (row.standard_id) {
      fileCategoryMap.set(row.standard_id, row.file_category);
    }
  });
  
  // Simulate the mapping logic from requirements.js
  console.log('Sample standards with their fileCategory:');
  matching.slice(0, 20).forEach(s => {
    let fileCategory = 'standard'; // Default
    
    if (fileCategoryMap.has(s.id)) {
      fileCategory = fileCategoryMap.get(s.id);
    } else if (s.sector === 'regulatory') {
      fileCategory = 'regulatory';
    } else if (s.sector === 'customer') {
      fileCategory = 'customer_requirements';
    }
    
    console.log(`  ${s.code.padEnd(25)} -> fileCategory: "${fileCategory}" (sector: ${s.sector || 'NULL'})`);
  });
  
  // Check what would pass category='standard' filter
  console.log(`\n=== CATEGORY FILTER TEST ===`);
  const standardCategory = matching.filter(s => {
    let fileCategory = 'standard';
    if (fileCategoryMap.has(s.id)) {
      fileCategory = fileCategoryMap.get(s.id);
    } else if (s.sector === 'regulatory') {
      fileCategory = 'regulatory';
    } else if (s.sector === 'customer') {
      fileCategory = 'customer_requirements';
    }
    return fileCategory === 'standard';
  });
  
  console.log(`Standards that pass category='standard' filter: ${standardCategory.length}`);
  console.log(`Standards that would be filtered out: ${matching.length - standardCategory.length}`);
  
  if (standardCategory.length === 0 && matching.length > 0) {
    console.log(`\n✗ ROOT CAUSE: Category filter is removing ALL standards!`);
    console.log(`  → All ${matching.length} standards have fileCategory !== 'standard'`);
    console.log(`  → Check file_category values in standard_files table`);
  }
  
  process.exit(0);
}

checkCategories().catch(error => {
  console.error('ERROR:', error);
  process.exit(1);
});

