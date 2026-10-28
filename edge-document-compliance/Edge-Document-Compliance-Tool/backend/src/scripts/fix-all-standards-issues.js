/**
 * Fix All Standards Data Issues
 * 1. Remove duplicates (AS9100D - Copy)
 * 2. Fix incorrect sector values (compliance, customer_require should be standard/regulatory/customer)
 * 3. Fix title 49 part 40 categorization
 * 4. Ensure all 31 standards are properly categorized
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function fixAllIssues() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Fixing all standards data issues...\n');

    // 1. Find and remove duplicates (AS9100D - Copy, etc.)
    console.log('1️⃣  Removing duplicates...');
    const duplicates = await pool.query(`
      SELECT code, COUNT(*) as count, array_agg(id) as ids
      FROM public.standards
      GROUP BY code
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length > 0) {
      console.log(`   Found ${duplicates.rows.length} duplicate codes`);
      for (const dup of duplicates.rows) {
        const ids = dup.ids;
        // Keep the first one, delete the rest
        const toDelete = ids.slice(1);
        for (const id of toDelete) {
          await pool.query('DELETE FROM public.standards WHERE id = $1', [id]);
          console.log(`   ✅ Deleted duplicate: ${dup.code} (ID: ${id})`);
        }
      }
    } else {
      console.log('   ✅ No duplicates found');
    }

    // 2. Fix incorrect sector values
    console.log('\n2️⃣  Fixing incorrect sector values...');
    
    // Fix "compliance" -> should be "standard" or "regulatory" based on file_category
    await pool.query(`
      UPDATE public.standards 
      SET sector = CASE 
        WHEN file_category = 'regulatory' THEN 'regulatory'
        WHEN file_category = 'customer_requirements' THEN 'customer'
        ELSE 'standard'
      END
      WHERE sector = 'compliance' OR sector IS NULL
    `);
    console.log('   ✅ Fixed "compliance" and NULL sectors');

    // Fix "customer_require" -> should be "customer"
    await pool.query(`
      UPDATE public.standards 
      SET sector = 'customer',
          file_category = 'customer_requirements'
      WHERE sector = 'customer_require' OR sector LIKE '%customer%'
    `);
    console.log('   ✅ Fixed "customer_require" sectors');

    // 3. Fix specific issues
    console.log('\n3️⃣  Fixing specific categorization issues...');
    
    // Fix title 49 part 40 - should be regulatory
    await pool.query(`
      UPDATE public.standards 
      SET sector = 'regulatory',
          file_category = 'regulatory'
      WHERE code LIKE '%title%49%part%40%' OR code = 'title_49_part_40'
    `);
    console.log('   ✅ Fixed title 49 part 40 categorization');

    // Fix FDA 21 CFR Part 11 - should be regulatory
    await pool.query(`
      UPDATE public.standards 
      SET sector = 'regulatory',
          file_category = 'regulatory'
      WHERE code LIKE '%FDA%21%CFR%11%' OR code = 'FDA21CFR11'
    `);
    console.log('   ✅ Fixed FDA 21 CFR Part 11 categorization');

    // 4. Ensure all standards have proper file_category
    console.log('\n4️⃣  Ensuring all standards have file_category...');
    await pool.query(`
      UPDATE public.standards 
      SET file_category = CASE 
        WHEN sector = 'regulatory' THEN 'regulatory'
        WHEN sector = 'customer' THEN 'customer_requirements'
        ELSE 'standard'
      END
      WHERE file_category IS NULL
    `);
    console.log('   ✅ Set file_category for all NULL values');

    // 5. Show final state
    console.log('\n📊 Final state:\n');
    const final = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN file_category = 'standard' THEN 1 END) as standards,
        COUNT(CASE WHEN file_category = 'regulatory' THEN 1 END) as regulatory,
        COUNT(CASE WHEN file_category = 'customer_requirements' THEN 1 END) as customer
      FROM public.standards
    `);
    
    console.log(`   Total: ${final.rows[0].total}`);
    console.log(`   Standards: ${final.rows[0].standards}`);
    console.log(`   Regulatory: ${final.rows[0].regulatory}`);
    console.log(`   Customer: ${final.rows[0].customer}`);

    // Show all standards
    const all = await pool.query(`
      SELECT code, name, sector, file_category 
      FROM public.standards 
      ORDER BY file_category, code
    `);
    
    console.log('\n📋 All standards by category:\n');
    all.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. [${row.file_category || 'NULL'}] ${row.code} - ${row.name} (sector: ${row.sector})`);
    });

    await pool.end();
    console.log('\n✅ All fixes applied!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

fixAllIssues();

