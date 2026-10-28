/**
 * Comprehensive diagnostic script to check the complete data flow
 * from upload to display in compliance library
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function diagnoseCompleteConnection() {
  console.log('\n🔍 COMPREHENSIVE CONNECTION DIAGNOSIS\n');
  console.log('='.repeat(70));

  try {
    // Step 1: Check database connections
    console.log('📡 Step 1: Testing database connections...');
    try {
      const pgTest = await queryPostgres('SELECT NOW() as time');
      console.log(`   ✅ PostgreSQL connected: ${pgTest.rows[0].time}`);
    } catch (e) {
      console.error(`   ❌ PostgreSQL connection failed: ${e.message}`);
      return;
    }

    try {
      const edcatTest = await queryEdcatAI('SELECT NOW() as time');
      console.log(`   ✅ EDCAT AI DB connected: ${edcatTest.rows[0].time}`);
    } catch (e) {
      console.error(`   ⚠️  EDCAT AI DB connection failed: ${e.message}`);
    }

    // Step 2: Check if tables exist
    console.log('\n📋 Step 2: Checking table existence...');
    const tablesToCheck = [
      { name: 'public.standards', db: 'PostgreSQL' },
      { name: 'public.standard_files', db: 'PostgreSQL' },
      { name: 'public.parsed_requirements', db: 'PostgreSQL' }
    ];

    for (const table of tablesToCheck) {
      try {
        const exists = await queryPostgres(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          ) as exists
        `, [table.name.replace('public.', '')]);
        
        if (exists.rows[0].exists) {
          console.log(`   ✅ ${table.name} exists in ${table.db}`);
        } else {
          console.log(`   ❌ ${table.name} MISSING in ${table.db}`);
        }
      } catch (e) {
        console.log(`   ❌ Error checking ${table.name}: ${e.message}`);
      }
    }

    // Step 3: Count records in each table
    console.log('\n📊 Step 3: Counting records...');
    try {
      const standardsCount = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
      console.log(`   Standards table: ${standardsCount.rows[0].count} records`);
    } catch (e) {
      console.log(`   ❌ Error counting standards: ${e.message}`);
    }

    try {
      const filesCount = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files');
      console.log(`   Standard_files table: ${filesCount.rows[0].count} records`);
    } catch (e) {
      console.log(`   ❌ Error counting files: ${filesCount.rows[0].message}`);
    }

    try {
      const reqsCount = await queryPostgres('SELECT COUNT(*) as count FROM public.parsed_requirements');
      console.log(`   Parsed_requirements table: ${reqsCount.rows[0].count} records`);
    } catch (e) {
      console.log(`   ❌ Error counting requirements: ${e.message}`);
    }

    // Step 4: Check standards with their files
    console.log('\n🔗 Step 4: Checking standards-file linkage...');
    const linkageCheck = await queryPostgres(`
      SELECT 
        s.id as standard_id,
        s.code,
        s.name,
        s.uploaded_at,
        s.sector,
        COUNT(sf.id) as file_count,
        STRING_AGG(DISTINCT sf.file_category, ', ') as file_categories
      FROM public.standards s
      LEFT JOIN public.standard_files sf ON s.id = sf.standard_id
      GROUP BY s.id, s.code, s.name, s.uploaded_at, s.sector
      ORDER BY s.uploaded_at DESC NULLS LAST
      LIMIT 10
    `);

    console.log(`   Found ${linkageCheck.rows.length} standards:`);
    linkageCheck.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.code || 'NO CODE'} - ${row.name || 'NO NAME'}`);
      console.log(`      ID: ${row.standard_id}`);
      console.log(`      Sector: ${row.sector || 'NULL'}`);
      console.log(`      Uploaded: ${row.uploaded_at || 'NULL'}`);
      console.log(`      Files: ${row.file_count || 0}`);
      console.log(`      Categories: ${row.file_categories || 'NONE'}`);
    });

    // Step 5: Check files without standards
    console.log('\n📁 Step 5: Checking orphaned files (files without standards)...');
    const orphanedFiles = await queryPostgres(`
      SELECT 
        sf.id,
        sf.file_name,
        sf.standard_id,
        sf.file_category,
        sf.uploaded_at
      FROM public.standard_files sf
      LEFT JOIN public.standards s ON sf.standard_id = s.id
      WHERE sf.standard_id IS NOT NULL
        AND s.id IS NULL
      LIMIT 10
    `);

    if (orphanedFiles.rows.length > 0) {
      console.log(`   ⚠️  Found ${orphanedFiles.rows.length} files with standard_id that don't exist in standards table:`);
      orphanedFiles.rows.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file.file_name}`);
        console.log(`      File ID: ${file.id}`);
        console.log(`      Standard ID (orphaned): ${file.standard_id}`);
        console.log(`      Category: ${file.file_category || 'NULL'}`);
      });
    } else {
      console.log(`   ✅ No orphaned files found`);
    }

    // Step 6: Check files with NULL standard_id
    console.log('\n📁 Step 6: Checking files with NULL standard_id...');
    const nullStandardIdFiles = await queryPostgres(`
      SELECT COUNT(*) as count
      FROM public.standard_files
      WHERE standard_id IS NULL
    `);
    const nullCount = parseInt(nullStandardIdFiles.rows[0].count);
    if (nullCount > 0) {
      console.log(`   ⚠️  Found ${nullCount} files with NULL standard_id`);
    } else {
      console.log(`   ✅ All files have standard_id`);
    }

    // Step 7: Simulate the exact API query
    console.log('\n🌐 Step 7: Simulating API query (category=standard)...');
    
    // Get file_category map (same as API)
    const filesResult = await queryPostgres(`
      SELECT DISTINCT ON (standard_id)
        standard_id,
        file_category
      FROM public.standard_files
      WHERE standard_id IS NOT NULL
      ORDER BY standard_id, uploaded_at DESC
    `);
    
    const fileCategoryMap = new Map();
    const standardsWithFiles = new Set();
    filesResult.rows.forEach(row => {
      if (row.standard_id) {
        fileCategoryMap.set(row.standard_id, row.file_category);
        standardsWithFiles.add(row.standard_id);
      }
    });
    
    console.log(`   Found ${standardsWithFiles.size} standards with files`);
    console.log(`   File categories: ${Array.from(fileCategoryMap.values()).join(', ')}`);
    
    if (standardsWithFiles.size > 0) {
      const standardIdsArray = Array.from(standardsWithFiles);
      console.log(`   Querying standards with IDs: ${standardIdsArray.slice(0, 3).join(', ')}${standardIdsArray.length > 3 ? '...' : ''}`);
      
      const apiQuery = await queryPostgres(`
        SELECT 
          s.id as standard_id,
          s.code,
          s.name,
          s.sector,
          s.uploaded_at,
          COALESCE(s.total_clauses, s.total_requirements, 0) as total_requirements
        FROM public.standards s
        WHERE s.id = ANY($1)
          AND s.code IS NOT NULL 
          AND TRIM(s.code) != ''
          AND (s.uploaded_at IS NOT NULL OR EXISTS (SELECT 1 FROM public.standard_files WHERE standard_id = s.id))
        ORDER BY LOWER(TRIM(s.code)), s.uploaded_at DESC NULLS LAST
      `, [standardIdsArray]);
      
      console.log(`   API query returned: ${apiQuery.rows.length} standards`);
      
      if (apiQuery.rows.length > 0) {
        apiQuery.rows.forEach((std, idx) => {
          const fileCategory = fileCategoryMap.get(std.standard_id) || 'unknown';
          const matchesStandard = fileCategory === 'standard' || fileCategory === 'standards';
          console.log(`   ${idx + 1}. ${std.code} - ${std.name || 'NO NAME'}`);
          console.log(`      fileCategory: ${fileCategory}`);
          console.log(`      Matches 'standard' filter: ${matchesStandard ? '✅' : '❌'}`);
        });
      } else {
        console.log(`   ❌ API query returned 0 standards!`);
        console.log(`   This means standards exist in standard_files but not in standards table, or IDs don't match`);
      }
    } else {
      console.log(`   ⚠️  No standards with files found - cannot simulate API query`);
    }

    // Step 8: Check for standards without uploaded_at
    console.log('\n⏰ Step 8: Checking standards without uploaded_at...');
    const noUploadedAt = await queryPostgres(`
      SELECT id, code, name, uploaded_at
      FROM public.standards
      WHERE uploaded_at IS NULL
      LIMIT 10
    `);
    
    if (noUploadedAt.rows.length > 0) {
      console.log(`   ⚠️  Found ${noUploadedAt.rows.length} standards without uploaded_at:`);
      noUploadedAt.rows.forEach((std, idx) => {
        console.log(`   ${idx + 1}. ${std.code || 'NO CODE'} - ${std.name || 'NO NAME'}`);
        console.log(`      ID: ${std.id}`);
      });
    } else {
      console.log(`   ✅ All standards have uploaded_at`);
    }

    // Step 9: Summary and recommendations
    console.log('\n📋 Step 9: Summary and Recommendations...');
    const standardsTotal = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
    const filesTotal = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files WHERE standard_id IS NOT NULL');
    const linkedCount = await queryPostgres(`
      SELECT COUNT(DISTINCT s.id) as count
      FROM public.standards s
      INNER JOIN public.standard_files sf ON s.id = sf.standard_id
    `);
    
    console.log(`   Total standards: ${standardsTotal.rows[0].count}`);
    console.log(`   Total files with standard_id: ${filesTotal.rows[0].count}`);
    console.log(`   Linked standards (have files): ${linkedCount.rows[0].count}`);
    
    if (parseInt(standardsTotal.rows[0].count) === 0) {
      console.log(`   ❌ CRITICAL: No standards in database!`);
      console.log(`   → Standards need to be created during upload`);
    } else if (parseInt(linkedCount.rows[0].count) === 0) {
      console.log(`   ❌ CRITICAL: No standards are linked to files!`);
      console.log(`   → Standard IDs in standard_files don't match IDs in standards`);
    } else {
      console.log(`   ✅ Standards and files are linked`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Diagnosis complete!\n');

  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run diagnosis
diagnoseCompleteConnection()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

