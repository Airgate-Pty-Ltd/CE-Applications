/**
 * Verify Database Connection and Data
 * Checks which database we're connected to and what data exists
 */

import dotenv from 'dotenv';
import { queryPostgres, queryEdcatAI, postgresPool, edcatPool } from '../config/databases.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function verifyDatabaseConnection() {
  console.log('\n🔍 Verifying Database Connections and Data...\n');
  console.log('='.repeat(60));
  
  // 1. Check DATABASE_URL
  console.log('\n📋 Environment Variables:');
  const dbUrl = process.env.DATABASE_URL;
  const edcatUrl = process.env.EDCAT_AI_DATABASE_URL || dbUrl;
  
  if (dbUrl) {
    // Mask password in URL
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`  DATABASE_URL: ${maskedUrl}`);
  } else {
    console.log('  ⚠️  DATABASE_URL not set!');
  }
  
  if (edcatUrl && edcatUrl !== dbUrl) {
    const maskedEdcatUrl = edcatUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`  EDCAT_AI_DATABASE_URL: ${maskedEdcatUrl}`);
  } else {
    console.log(`  EDCAT_AI_DATABASE_URL: (using DATABASE_URL)`);
  }
  
  // 2. Test PostgreSQL connection
  console.log('\n🔌 Testing PostgreSQL Connection (DATABASE_URL):');
  try {
    const pgResult = await queryPostgres('SELECT current_database() as db_name, current_user as user_name, version() as version');
    console.log(`  ✅ Connected to database: ${pgResult.rows[0].db_name}`);
    console.log(`  ✅ User: ${pgResult.rows[0].user_name}`);
    console.log(`  ✅ PostgreSQL version: ${pgResult.rows[0].version.split(' ')[0]} ${pgResult.rows[0].version.split(' ')[1]}`);
    
    // Check if public.standards table exists
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standards'
      ) as exists
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log(`  ✅ public.standards table exists`);
      
      // Count rows
      const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
      const totalCount = parseInt(countResult.rows[0].count || '0', 10);
      console.log(`  📊 Total rows in public.standards: ${totalCount}`);
      
      // Count by sector
      const sectorCount = await queryPostgres(`
        SELECT sector, COUNT(*) as count 
        FROM public.standards 
        GROUP BY sector 
        ORDER BY count DESC
      `);
      
      if (sectorCount.rows.length > 0) {
        console.log(`  📊 Breakdown by sector:`);
        sectorCount.rows.forEach(row => {
          console.log(`     - ${row.sector || '(null)'}: ${row.count}`);
        });
      }
      
      // Count with uploaded_at
      const uploadedCount = await queryPostgres(`
        SELECT COUNT(*) as count 
        FROM public.standards 
        WHERE uploaded_at IS NOT NULL
      `);
      console.log(`  📊 Standards with uploaded_at: ${uploadedCount.rows[0].count}`);
      
      // Show sample data
      if (totalCount > 0) {
        const sample = await queryPostgres(`
          SELECT id, code, name, sector, file_category, uploaded_at 
          FROM public.standards 
          ORDER BY uploaded_at DESC NULLS LAST 
          LIMIT 10
        `);
        
        console.log(`  📋 Sample data (first 10 rows):`);
        sample.rows.forEach((row, idx) => {
          console.log(`     ${idx + 1}. ${row.code} (${row.sector || 'null'}) - ${row.file_category || 'null'} - uploaded: ${row.uploaded_at ? 'YES' : 'NO'}`);
        });
      }
    } else {
      console.log(`  ❌ public.standards table does NOT exist!`);
    }
    
    // Check for other standards-related tables
    const otherTables = await queryPostgres(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%standard%'
      ORDER BY table_name
    `);
    
    if (otherTables.rows.length > 0) {
      console.log(`  📋 Other standard-related tables:`);
      otherTables.rows.forEach(row => {
        console.log(`     - ${row.table_name}`);
      });
    }
    
  } catch (error) {
    console.log(`  ❌ PostgreSQL connection failed: ${error.message}`);
  }
  
  // 3. Test EDCAT AI connection
  console.log('\n🔌 Testing EDCAT AI Connection:');
  try {
    const edcatResult = await queryEdcatAI('SELECT current_database() as db_name, current_user as user_name');
    console.log(`  ✅ Connected to database: ${edcatResult.rows[0].db_name}`);
    console.log(`  ✅ User: ${edcatResult.rows[0].user_name}`);
    
    // Check if standards table exists in EDCAT AI
    const edcatTableCheck = await queryEdcatAI(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standards'
      ) as exists
    `).catch(() => ({ rows: [{ exists: false }] }));
    
    if (edcatTableCheck.rows[0].exists) {
      // NOTE: public.standards should NOT exist in EDCAT AI DB - this is a duplicate
      // Standards should ONLY be in Customer Data DB (public.* schema)
      // NOTE: This is checking for DUPLICATE public.standards in EDCAT AI DB (shouldn't exist)
      // We use queryEdcatAI here because we're checking the EDCAT AI DB for duplicates
      const edcatCount = await queryEdcatAI('SELECT COUNT(*) as count FROM public.standards');
      console.log(`  ⚠️  WARNING: public.standards exists in EDCAT AI DB (${edcatCount.rows[0].count} rows) - this is a duplicate that should be removed`);
      console.log(`  ℹ️  Standards should only be in Customer Data DB (DATABASE_URL), not EDCAT AI DB (EDCAT_AI_DATABASE_URL)`);
    } else {
      console.log(`  ✓ EDCAT AI public.standards table does not exist (correct - standards only in Customer Data DB)`);
    }
    
  } catch (error) {
    console.log(`  ⚠️  EDCAT AI connection issue: ${error.message}`);
  }
  
  // 4. Check Requirements folder
  console.log('\n📁 Checking Requirements Folder:');
  const requirementsDir = join(__dirname, '../../EDCAT AIP/Requirements');
  const fs = await import('fs');
  
  try {
    if (fs.existsSync(requirementsDir)) {
      console.log(`  ✅ Requirements folder exists: ${requirementsDir}`);
      
      const standardsDir = join(requirementsDir, 'Standards');
      const regulatoryDir = join(requirementsDir, 'Regulatory');
      const customerDir = join(requirementsDir, 'Customer');
      
      if (fs.existsSync(standardsDir)) {
        const standardsFiles = fs.readdirSync(standardsDir).filter(f => 
          ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'].some(ext => f.toLowerCase().endsWith(ext))
        );
        console.log(`  📚 Standards folder: ${standardsFiles.length} files`);
      }
      
      if (fs.existsSync(regulatoryDir)) {
        const regulatoryFiles = fs.readdirSync(regulatoryDir).filter(f => 
          ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'].some(ext => f.toLowerCase().endsWith(ext))
        );
        console.log(`  ⚖️  Regulatory folder: ${regulatoryFiles.length} files`);
      }
      
      if (fs.existsSync(customerDir)) {
        const customerFiles = fs.readdirSync(customerDir).filter(f => 
          ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'].some(ext => f.toLowerCase().endsWith(ext))
        );
        console.log(`  🏢 Customer folder: ${customerFiles.length} files`);
      }
    } else {
      console.log(`  ❌ Requirements folder does NOT exist: ${requirementsDir}`);
      console.log(`     This means files won't be processed on Railway!`);
    }
  } catch (error) {
    console.log(`  ⚠️  Error checking Requirements folder: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Verification complete!\n');
}

verifyDatabaseConnection()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

