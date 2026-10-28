/**
 * Fix Critical Column Mismatches
 * 
 * This script fixes the immediate column errors:
 * 1. vera_query_response_bank: response_template → response_text
 * 2. ai_conversation_history: Add missing user_id, tenant_id, message_text
 * 3. terms_and_definitions: Add missing context column
 * 4. Reload Q&A data with actual content
 * 
 * Usage: node backend/src/scripts/fix-critical-columns.js
 */

import { queryEdcatAI } from '../config/databases.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run the critical column fix migration
 */
async function runColumnFixMigration() {
  console.log('\n🔧 Running critical column fix migration...');
  
  const migrationPath = path.join(__dirname, '../../migrations/074_fix_critical_column_mismatches.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    return false;
  }

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim().length > 0 && !statement.trim().startsWith('--')) {
        try {
          await queryEdcatAI(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate') &&
              !error.message.includes('does not exist')) {
            console.warn('⚠️  Statement warning:', error.message.substring(0, 100));
          }
        }
      }
    }
    
    console.log('✅ Column fix migration completed');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

/**
 * Reload Q&A data with actual content
 * Uses exact SQL from user's requirements
 */
async function reloadQAData() {
  console.log('\n📚 Reloading Q&A data...');
  
  try {
    // STEP 1: Verify what's in there NOW
    console.log('  Step 1: Checking current state...');
    const beforeResult = await queryEdcatAI(
      `SELECT COUNT(*) as total, 
              COUNT(CASE WHEN response_text IS NOT NULL THEN 1 END) as with_content
       FROM edcat.vera_query_response_bank`
    );
    const beforeTotal = parseInt(beforeResult.rows[0]?.total || '0', 10);
    const beforeWithContent = parseInt(beforeResult.rows[0]?.with_content || '0', 10);
    console.log(`    Before: ${beforeTotal} total, ${beforeWithContent} with content`);

    // STEP 2: DELETE ALL empty rows (the 99 placeholders)
    console.log('  Step 2: Deleting empty rows...');
    const deleteResult = await queryEdcatAI(
      `DELETE FROM edcat.vera_query_response_bank 
       WHERE response_text IS NULL OR response_text = '' OR response_text ~ '^\\s*$'`
    );
    console.log(`    Deleted ${deleteResult.rowCount || 0} empty rows`);

    // STEP 3: Verify they're gone
    const afterDeleteResult = await queryEdcatAI(
      `SELECT COUNT(*) as remaining_after_delete FROM edcat.vera_query_response_bank`
    );
    const remaining = parseInt(afterDeleteResult.rows[0]?.remaining_after_delete || '0', 10);
    console.log(`    Remaining after delete: ${remaining}`);

    // STEP 4: Insert REAL responses with ACTUAL CONTENT
    console.log('  Step 4: Inserting real Q&A responses...');
    const qaEntries = [
      {
        pattern: 'what is quality',
        response: 'Quality is the degree to which a set of inherent characteristics fulfills requirements. In compliance contexts, quality means systematic adherence to standards, procedures, and defined specifications to meet customer and regulatory expectations.',
        confidence: 0.95
      },
      {
        pattern: 'quality',
        response: 'Quality is the degree to which a set of inherent characteristics fulfills requirements. In compliance contexts, quality means systematic adherence to standards, procedures, and defined specifications to meet customer and regulatory expectations.',
        confidence: 0.95
      },
      {
        pattern: 'what is iso 9001',
        response: 'ISO 9001:2015 is the international standard for Quality Management Systems. It specifies requirements for organizations to establish, implement, maintain, and continually improve a QMS. It applies to organizations of any size across all sectors.',
        confidence: 0.96
      },
      {
        pattern: 'iso 9001',
        response: 'ISO 9001:2015 is the international standard for Quality Management Systems. It specifies requirements for organizations to establish, implement, maintain, and continually improve a QMS. It applies to organizations of any size across all sectors.',
        confidence: 0.96
      },
      {
        pattern: 'what is as9100',
        response: 'AS9100 is the aerospace quality management standard. Revision D (AS9100D) adds requirements for configuration management, product safety, counterfeit part prevention, and foreign object damage (FOD) prevention. Built on ISO 9001 with aerospace-specific requirements.',
        confidence: 0.95
      },
      {
        pattern: 'as9100',
        response: 'AS9100 is the aerospace quality management standard. Revision D (AS9100D) adds requirements for configuration management, product safety, counterfeit part prevention, and foreign object damage (FOD) prevention. Built on ISO 9001 with aerospace-specific requirements.',
        confidence: 0.95
      },
      {
        pattern: 'gap analysis',
        response: 'A gap analysis is a systematic process identifying the difference between current state (what exists now) and desired state (what should exist per requirements). In compliance, gap analysis determines which requirements are covered by procedures and which are not.',
        confidence: 0.94
      },
      {
        pattern: 'what is a gap analysis',
        response: 'A gap analysis is a systematic process identifying the difference between current state (what exists now) and desired state (what should exist per requirements). In compliance, gap analysis determines which requirements are covered by procedures and which are not.',
        confidence: 0.94
      },
      {
        pattern: 'what can you do',
        response: 'I can: 1) Answer questions about quality standards and compliance requirements, 2) Analyze gaps between your procedures and standards, 3) Define compliance terminology, 4) Provide guidance on compliance requirements, 5) Help you understand regulatory frameworks.',
        confidence: 0.92
      },
      {
        pattern: 'define quality assurance',
        response: 'Quality Assurance (QA) is the systematic process of building confidence that a product or service will satisfy given requirements. QA focuses on prevention of defects through process design and execution, including planning, design review, and process monitoring.',
        confidence: 0.93
      },
      {
        pattern: 'quality assurance',
        response: 'Quality Assurance (QA) is the systematic process of building confidence that a product or service will satisfy given requirements. QA focuses on prevention of defects through process design and execution, including planning, design review, and process monitoring.',
        confidence: 0.93
      },
      {
        pattern: 'define quality control',
        response: 'Quality Control (QC) is the process of inspecting and testing finished products or services to identify and eliminate defects. QC is detection-focused, whereas QA is prevention-focused. Both are essential parts of a quality management system.',
        confidence: 0.93
      }
    ];

    let inserted = 0;
    let errors = 0;

    for (const qa of qaEntries) {
      try {
        const result = await queryEdcatAI(
          `INSERT INTO edcat.vera_query_response_bank 
           (user_query_pattern, response_text, confidence_score, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_query_pattern) 
           DO UPDATE SET 
             response_text = EXCLUDED.response_text,
             confidence_score = EXCLUDED.confidence_score,
             updated_at = NOW()`,
          [qa.pattern, qa.response, qa.confidence]
        );
        
        inserted++;
      } catch (error) {
        console.warn(`    ⚠️  Failed to insert "${qa.pattern}":`, error.message);
        errors++;
      }
    }

    console.log(`    ✅ Inserted/Updated: ${inserted}, Errors: ${errors}`);

    // STEP 5: Verify new data
    console.log('  Step 5: Verifying new data...');
    const verifyResult = await queryEdcatAI(
      `SELECT COUNT(*) as total_rows, 
              COUNT(CASE WHEN response_text IS NOT NULL AND response_text != '' THEN 1 END) as rows_with_real_content
       FROM edcat.vera_query_response_bank`
    );

    const total = parseInt(verifyResult.rows[0]?.total_rows || '0', 10);
    const withContent = parseInt(verifyResult.rows[0]?.rows_with_real_content || '0', 10);

    console.log(`    Total rows: ${total}, With real content: ${withContent}`);

    // STEP 6: Show sample
    console.log('  Step 6: Sample data:');
    const sampleResult = await queryEdcatAI(
      `SELECT user_query_pattern, LEFT(response_text, 60) as preview 
       FROM edcat.vera_query_response_bank 
       LIMIT 3`
    );
    
    sampleResult.rows.forEach((row, idx) => {
      console.log(`    ${idx + 1}. "${row.user_query_pattern}" → "${row.preview}..."`);
    });

    if (withContent === 0) {
      console.error('  ❌ ERROR: No rows with content!');
      return false;
    }

    if (withContent < 10) {
      console.warn(`  ⚠️  WARNING: Only ${withContent} rows with content (expected 12+)`);
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to reload Q&A data:', error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 Fixing Critical Column Mismatches');
  console.log('='.repeat(60));

  const migrationOk = await runColumnFixMigration();
  if (!migrationOk) {
    console.error('\n❌ Migration failed. Cannot proceed.');
    process.exit(1);
  }

  const qaOk = await reloadQAData();
  if (!qaOk) {
    console.error('\n❌ Q&A reload failed.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All critical column fixes applied successfully!');
  console.log('='.repeat(60) + '\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export default main;

