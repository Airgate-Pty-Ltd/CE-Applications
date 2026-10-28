/**
 * Test script to verify the complete upload flow
 * Tests:
 * 1. Standard creation
 * 2. File metadata saving
 * 3. API endpoint returning standards
 */

import { queryPostgres } from '../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

async function testUploadFlow() {
  console.log('\n🧪 Testing Upload Flow...\n');
  console.log('='.repeat(70));

  try {
    // Step 1: Check if standards table exists and has correct schema
    console.log('📋 Step 1: Checking standards table schema...');
    const schemaCheck = await queryPostgres(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'standards'
      ORDER BY ordinal_position
    `);
    
    console.log(`   Found ${schemaCheck.rows.length} columns in standards table:`);
    schemaCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Step 2: Check if standard_files table exists
    console.log('\n📁 Step 2: Checking standard_files table...');
    const filesTableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files'
      ) as exists
    `);
    const filesTableExists = filesTableCheck.rows[0]?.exists || false;
    console.log(`   Table exists: ${filesTableExists}`);

    if (filesTableExists) {
      const filesSchema = await queryPostgres(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'standard_files'
        ORDER BY ordinal_position
      `);
      console.log(`   Found ${filesSchema.rows.length} columns:`);
      filesSchema.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Step 3: Test standard creation
    console.log('\n🔨 Step 3: Testing standard creation...');
    const testCode = `TEST_${Date.now()}`;
    const testName = 'Test Standard';
    const testSector = 'general';
    
    try {
      const standardId = uuidv4();
      const insertResult = await queryPostgres(
        `INSERT INTO public.standards (id, code, name, sector, uploaded_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           sector = EXCLUDED.sector,
           uploaded_at = EXCLUDED.uploaded_at
         RETURNING id, code, name, uploaded_at`,
        [standardId, testCode, testName, testSector]
      );
      
      if (insertResult.rows.length > 0) {
        const created = insertResult.rows[0];
        console.log(`   ✅ Standard created successfully:`);
        console.log(`      ID: ${created.id}`);
        console.log(`      Code: ${created.code}`);
        console.log(`      Name: ${created.name}`);
        console.log(`      Uploaded: ${created.uploaded_at}`);
        
        // Step 4: Test file metadata saving
        if (filesTableExists) {
          console.log('\n📄 Step 4: Testing file metadata saving...');
          const fileId = uuidv4();
          const fileName = 'test_file.pdf';
          const filePath = '/test/path/test_file.pdf';
          const fileSize = 12345;
          const fileType = 'application/pdf';
          const category = 'standard';
          
          try {
            await queryPostgres(
              `INSERT INTO public.standard_files 
               (id, file_name, file_path, file_size, file_type, file_category, standard_id, uploaded_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
              [fileId, fileName, filePath, fileSize, fileType, category, created.id]
            );
            console.log(`   ✅ File metadata saved successfully:`);
            console.log(`      File ID: ${fileId}`);
            console.log(`      Standard ID: ${created.id}`);
            console.log(`      Category: ${category}`);
            
            // Step 5: Test API query
            console.log('\n🌐 Step 5: Testing API query logic...');
            const apiQuery = await queryPostgres(`
              SELECT 
                s.id as standard_id,
                s.code,
                s.name,
                s.sector,
                s.uploaded_at,
                COALESCE(s.total_clauses, s.total_requirements, 0) as total_requirements
              FROM public.standards s
              WHERE s.code IS NOT NULL 
                AND TRIM(s.code) != ''
                AND s.uploaded_at IS NOT NULL
                AND s.id = $1
            `, [created.id]);
            
            if (apiQuery.rows.length > 0) {
              console.log(`   ✅ API query would return this standard:`);
              console.log(`      Code: ${apiQuery.rows[0].code}`);
              console.log(`      Name: ${apiQuery.rows[0].name}`);
              console.log(`      Total Requirements: ${apiQuery.rows[0].total_requirements}`);
            } else {
              console.log(`   ❌ API query returned no results (standard won't show in UI)`);
            }
            
            // Cleanup test data
            console.log('\n🧹 Cleaning up test data...');
            await queryPostgres(`DELETE FROM public.standard_files WHERE id = $1`, [fileId]);
            await queryPostgres(`DELETE FROM public.standards WHERE id = $1`, [created.id]);
            console.log('   ✅ Test data cleaned up');
            
          } catch (fileError) {
            console.error(`   ❌ File metadata save failed:`, fileError.message);
            console.error(`   Error details:`, fileError);
          }
        } else {
          console.log('   ⚠️  Cannot test file saving - standard_files table does not exist');
        }
      }
    } catch (standardError) {
      console.error(`   ❌ Standard creation failed:`, standardError.message);
      console.error(`   Error details:`, standardError);
    }

    // Step 6: Check actual data
    console.log('\n📊 Step 6: Checking actual database state...');
    const actualStandards = await queryPostgres(`
      SELECT COUNT(*) as count FROM public.standards
    `);
    console.log(`   Total standards in database: ${actualStandards.rows[0].count}`);
    
    if (parseInt(actualStandards.rows[0].count) > 0) {
      const sampleStandards = await queryPostgres(`
        SELECT id, code, name, uploaded_at, total_clauses, total_requirements
        FROM public.standards
        ORDER BY uploaded_at DESC
        LIMIT 5
      `);
      console.log(`   Sample standards:`);
      sampleStandards.rows.forEach((std, idx) => {
        console.log(`   ${idx + 1}. ${std.code} - ${std.name || 'No name'}`);
        console.log(`      ID: ${std.id}`);
        console.log(`      Uploaded: ${std.uploaded_at || 'NULL'}`);
        console.log(`      Clauses: ${std.total_clauses || std.total_requirements || 0}`);
      });
    }

    if (filesTableExists) {
      const actualFiles = await queryPostgres(`
        SELECT COUNT(*) as count FROM public.standard_files
      `);
      console.log(`   Total files in standard_files: ${actualFiles.rows[0].count}`);
      
      if (parseInt(actualFiles.rows[0].count) > 0) {
        const filesWithStandardId = await queryPostgres(`
          SELECT COUNT(*) as count FROM public.standard_files WHERE standard_id IS NOT NULL
        `);
        console.log(`   Files with standard_id: ${filesWithStandardId.rows[0].count}`);
        
        const sampleFiles = await queryPostgres(`
          SELECT id, file_name, standard_id, file_category
          FROM public.standard_files
          WHERE standard_id IS NOT NULL
          LIMIT 5
        `);
        if (sampleFiles.rows.length > 0) {
          console.log(`   Sample files:`);
          sampleFiles.rows.forEach((file, idx) => {
            console.log(`   ${idx + 1}. ${file.file_name}`);
            console.log(`      Standard ID: ${file.standard_id}`);
            console.log(`      Category: ${file.file_category}`);
          });
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testUploadFlow()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

