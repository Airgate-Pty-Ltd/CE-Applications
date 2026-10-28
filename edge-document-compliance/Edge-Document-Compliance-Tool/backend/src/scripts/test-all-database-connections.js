/**
 * Comprehensive Database Connection Test
 * Tests all database connections and verifies every save point
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import pg from 'pg';

const { Pool } = pg;

// Test configuration
const tests = [];

// Test 1: Customer Data DB Connection (queryPostgres)
tests.push({
  name: 'Customer Data DB Connection (queryPostgres)',
  test: async () => {
    try {
      const result = await queryPostgres('SELECT NOW() as current_time, current_database() as db_name');
      return {
        success: true,
        message: `Connected to ${result.rows[0].db_name}`,
        data: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error
      };
    }
  }
});

// Test 2: EDCAT AI DB Connection (queryEdcatAI)
tests.push({
  name: 'EDCAT AI DB Connection (queryEdcatAI)',
  test: async () => {
    try {
      const result = await queryEdcatAI('SELECT NOW() as current_time, current_database() as db_name');
      return {
        success: true,
        message: `Connected to ${result.rows[0].db_name}`,
        data: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error
      };
    }
  }
});

// Test 3: Customer Data DB - standard_files table
tests.push({
  name: 'Customer Data DB - standard_files table',
  test: async () => {
    try {
      // Check if table exists
      const tableCheck = await queryPostgres(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'standard_files'
        ) as exists
      `);
      
      if (!tableCheck.rows[0].exists) {
        return {
          success: false,
          message: 'Table public.standard_files does not exist',
          fix: 'Table needs to be created'
        };
      }
      
      // Try to read from table
      const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.standard_files');
      
      // Try to write to table (test insert with rollback)
      // First get a valid standard_id from EDCAT AI DB
      let testStandardId = null;
      try {
        const stdResult = await queryEdcatAI('SELECT id FROM standards LIMIT 1');
        if (stdResult.rows.length > 0) {
          testStandardId = stdResult.rows[0].id;
        } else {
          // Generate a test UUID if no standards exist
          testStandardId = '00000000-0000-0000-0000-000000000000';
        }
      } catch (e) {
        // If we can't get a standard_id, use a test UUID
        testStandardId = '00000000-0000-0000-0000-000000000000';
      }
      
      await queryPostgres('BEGIN');
      try {
        const testInsert = await queryPostgres(`
          INSERT INTO public.standard_files 
          (id, file_name, file_path, file_size, file_type, file_category, standard_id, uploaded_at)
          VALUES (gen_random_uuid(), 'TEST_FILE', '/test/path', 0, 'test', 'test', $1, NOW())
          RETURNING id
        `, [testStandardId]);
        await queryPostgres('ROLLBACK');
        
        return {
          success: true,
          message: `Table exists and is writable. Current records: ${countResult.rows[0].count}`,
          data: {
            recordCount: parseInt(countResult.rows[0].count),
            canWrite: true
          }
        };
      } catch (writeError) {
        await queryPostgres('ROLLBACK');
        return {
          success: false,
          message: `Table exists but write failed: ${writeError.message}`,
          error: writeError
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error checking table: ${error.message}`,
        error: error
      };
    }
  }
});

// Test 4: EDCAT AI DB - standards table
tests.push({
  name: 'EDCAT AI DB - standards table',
  test: async () => {
    try {
      // Check if table exists
      const tableCheck = await queryEdcatAI(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'standards'
        ) as exists
      `);
      
      if (!tableCheck.rows[0].exists) {
        return {
          success: false,
          message: 'Table standards does not exist in EDCAT AI DB',
          fix: 'Table needs to be created'
        };
      }
      
      // Try to read from table
      const countResult = await queryEdcatAI('SELECT COUNT(*) as count FROM standards');
      
      // Try to write to table (test insert with rollback)
      await queryEdcatAI('BEGIN');
      try {
        const testInsert = await queryEdcatAI(`
          INSERT INTO standards 
          (id, code, name, sector, uploaded_at)
          VALUES (gen_random_uuid(), 'TEST_STD', 'Test Standard', 'test', NOW())
          RETURNING id
        `);
        await queryEdcatAI('ROLLBACK');
        
        return {
          success: true,
          message: `Table exists and is writable. Current records: ${countResult.rows[0].count}`,
          data: {
            recordCount: parseInt(countResult.rows[0].count),
            canWrite: true
          }
        };
      } catch (writeError) {
        await queryEdcatAI('ROLLBACK');
        return {
          success: false,
          message: `Table exists but write failed: ${writeError.message}`,
          error: writeError
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error checking table: ${error.message}`,
        error: error
      };
    }
  }
});

// Test 5: EDCAT AI DB - parsed_requirements table
tests.push({
  name: 'EDCAT AI DB - parsed_requirements table',
  test: async () => {
    try {
      // Check if table exists
      const tableCheck = await queryEdcatAI(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'parsed_requirements'
        ) as exists
      `);
      
      if (!tableCheck.rows[0].exists) {
        return {
          success: false,
          message: 'Table parsed_requirements does not exist in EDCAT AI DB',
          fix: 'Table needs to be created'
        };
      }
      
      // Try to read from table
      const countResult = await queryEdcatAI('SELECT COUNT(*) as count FROM parsed_requirements');
      
      // Get table structure
      const columns = await queryEdcatAI(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'parsed_requirements'
        ORDER BY ordinal_position
      `);
      
      return {
        success: true,
        message: `Table exists. Current records: ${countResult.rows[0].count}`,
        data: {
          recordCount: parseInt(countResult.rows[0].count),
          columns: columns.rows.map(r => `${r.column_name} (${r.data_type})`)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error checking table: ${error.message}`,
        error: error
      };
    }
  }
});

// Test 6: Requirements Library - Full Integration Test
tests.push({
  name: 'Requirements Library - Full Integration Test',
  test: async () => {
    const results = {
      canReadStandards: false,
      canReadFiles: false,
      canReadRequirements: false,
      standardsCount: 0,
      filesCount: 0,
      requirementsCount: 0,
      errors: []
    };
    
    try {
      // Test 1: Can we read standards from EDCAT AI DB?
      try {
        const standards = await queryEdcatAI('SELECT id, code, name FROM standards LIMIT 10');
        results.canReadStandards = true;
        results.standardsCount = standards.rows.length;
      } catch (e) {
        results.errors.push(`Cannot read standards: ${e.message}`);
      }
      
      // Test 2: Can we read files from Customer Data DB?
      try {
        const files = await queryPostgres('SELECT id, file_name, standard_id FROM public.standard_files LIMIT 10');
        results.canReadFiles = true;
        results.filesCount = files.rows.length;
      } catch (e) {
        results.errors.push(`Cannot read standard_files: ${e.message}`);
      }
      
      // Test 3: Can we read requirements from EDCAT AI DB?
      try {
        const requirements = await queryEdcatAI('SELECT id, standard_id, clause_number FROM parsed_requirements LIMIT 10');
        results.canReadRequirements = true;
        results.requirementsCount = requirements.rows.length;
      } catch (e) {
        results.errors.push(`Cannot read parsed_requirements: ${e.message}`);
      }
      
      // Test 4: Can we join standards with files (cross-database check)?
      if (results.canReadStandards && results.canReadFiles) {
        try {
          const standards = await queryEdcatAI('SELECT id, code FROM standards LIMIT 5');
          for (const std of standards.rows) {
            const files = await queryPostgres(
              'SELECT id FROM public.standard_files WHERE standard_id = $1',
              [std.id]
            );
            if (files.rows.length > 0) {
              results.hasLinkedFiles = true;
              break;
            }
          }
        } catch (e) {
          results.errors.push(`Cannot check standard-file links: ${e.message}`);
        }
      }
      
      const allPassed = results.canReadStandards && results.canReadFiles && results.canReadRequirements;
      
      return {
        success: allPassed,
        message: allPassed 
          ? `Requirements Library is fully connected. Standards: ${results.standardsCount}, Files: ${results.filesCount}, Requirements: ${results.requirementsCount}`
          : `Requirements Library has connection issues: ${results.errors.join('; ')}`,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        message: `Integration test failed: ${error.message}`,
        error: error,
        data: results
      };
    }
  }
});

// Test 7: Verify all save points in codebase
tests.push({
  name: 'Verify Save Points - Check Code References',
  test: async () => {
    const savePoints = [];
    
    // This test checks if the code is using the right functions
    // We'll verify by checking the actual database connections work
    const checks = [
      {
        name: 'upload.js - standards INSERT',
        db: 'EDCAT AI',
        test: async () => {
          // Simulate what upload.js does
          await queryEdcatAI('BEGIN');
          try {
            await queryEdcatAI(`
              INSERT INTO standards (id, code, name, sector, uploaded_at)
              VALUES (gen_random_uuid(), 'TEST_SAVE', 'Test Save', 'test', NOW())
              ON CONFLICT (code) DO NOTHING
            `);
            await queryEdcatAI('ROLLBACK');
            return { success: true, message: 'Standards INSERT works' };
          } catch (e) {
            await queryEdcatAI('ROLLBACK');
            return { success: false, message: e.message };
          }
        }
      },
      {
        name: 'upload.js - standard_files INSERT',
        db: 'Customer Data',
        test: async () => {
          // Get a valid standard_id from EDCAT AI DB
          let testStandardId = null;
          try {
            const stdResult = await queryEdcatAI('SELECT id FROM standards LIMIT 1');
            if (stdResult.rows.length > 0) {
              testStandardId = stdResult.rows[0].id;
            } else {
              testStandardId = '00000000-0000-0000-0000-000000000000';
            }
          } catch (e) {
            testStandardId = '00000000-0000-0000-0000-000000000000';
          }
          
          await queryPostgres('BEGIN');
          try {
            await queryPostgres(`
              INSERT INTO public.standard_files 
              (id, file_name, file_path, file_size, file_type, file_category, standard_id, uploaded_at)
              VALUES (gen_random_uuid(), 'TEST_FILE', '/test', 0, 'test', 'test', $1, NOW())
            `, [testStandardId]);
            await queryPostgres('ROLLBACK');
            return { success: true, message: 'standard_files INSERT works' };
          } catch (e) {
            await queryPostgres('ROLLBACK');
            return { success: false, message: e.message };
          }
        }
      },
      {
        name: 'parse.js - parsed_requirements INSERT',
        db: 'EDCAT AI',
        test: async () => {
          // First get a test standard_id
          const std = await queryEdcatAI('SELECT id FROM standards LIMIT 1');
          if (std.rows.length === 0) {
            return { success: false, message: 'No standards found to test with' };
          }
          
          await queryEdcatAI('BEGIN');
          try {
            await queryEdcatAI(`
              INSERT INTO parsed_requirements 
              (standard_id, clause_number, requirement_text, extracted_at, is_in_scope)
              VALUES ($1, 'TEST', 'Test requirement', NOW(), true)
            `, [std.rows[0].id]);
            await queryEdcatAI('ROLLBACK');
            return { success: true, message: 'parsed_requirements INSERT works' };
          } catch (e) {
            await queryEdcatAI('ROLLBACK');
            return { success: false, message: e.message };
          }
        }
      },
      {
        name: 'requirements.js - standards SELECT',
        db: 'EDCAT AI',
        test: async () => {
          const result = await queryEdcatAI('SELECT id, code, name FROM standards LIMIT 1');
          return {
            success: result.rows.length >= 0, // Even 0 rows is OK
            message: `Standards SELECT works (found ${result.rows.length} records)`
          };
        }
      },
      {
        name: 'requirements.js - parsed_requirements SELECT',
        db: 'EDCAT AI',
        test: async () => {
          const result = await queryEdcatAI('SELECT id, standard_id, clause_number FROM parsed_requirements LIMIT 1');
          return {
            success: result.rows.length >= 0,
            message: `parsed_requirements SELECT works (found ${result.rows.length} records)`
          };
        }
      },
      {
        name: 'requirements.js - standard_files SELECT',
        db: 'Customer Data',
        test: async () => {
          const result = await queryPostgres('SELECT id, file_name, standard_id FROM public.standard_files LIMIT 1');
          return {
            success: result.rows.length >= 0,
            message: `standard_files SELECT works (found ${result.rows.length} records)`
          };
        }
      }
    ];
    
    for (const check of checks) {
      try {
        const result = await check.test();
        savePoints.push({
          name: check.name,
          database: check.db,
          success: result.success,
          message: result.message
        });
      } catch (error) {
        savePoints.push({
          name: check.name,
          database: check.db,
          success: false,
          message: `Error: ${error.message}`
        });
      }
    }
    
    const allPassed = savePoints.every(sp => sp.success);
    const failed = savePoints.filter(sp => !sp.success);
    
    return {
      success: allPassed,
      message: allPassed 
        ? `All ${savePoints.length} save points verified`
        : `${failed.length} save points failed: ${failed.map(f => f.name).join(', ')}`,
      data: { 
        savePoints,
        failed: failed.map(f => ({ name: f.name, database: f.database, message: f.message }))
      }
    };
  }
});

// Run all tests
async function runAllTests() {
  console.log('🔍 Starting Comprehensive Database Connection Tests...\n');
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n📋 Testing: ${test.name}`);
    console.log('-'.repeat(80));
    
    try {
      const result = await test.test();
      results.push({
        name: test.name,
        ...result
      });
      
      if (result.success) {
        console.log(`✅ PASS: ${result.message}`);
        if (result.data) {
          console.log(`   Data:`, JSON.stringify(result.data, null, 2));
        }
      } else {
        console.log(`❌ FAIL: ${result.message}`);
        if (result.error) {
          console.log(`   Error:`, result.error.message);
        }
        if (result.fix) {
          console.log(`   Fix: ${result.fix}`);
        }
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      results.push({
        name: test.name,
        success: false,
        message: `Test threw error: ${error.message}`,
        error: error
      });
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

