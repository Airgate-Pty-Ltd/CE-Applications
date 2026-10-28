/**
 * Verify what Railway UI is showing vs what's actually in database
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function verifyData() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Verifying database vs Railway UI...\n');

    // Check the specific entries Railway UI shows
    const railwayEntries = [
      'title_49_part_40',
      'AS9100D',
      'bs-en-iso-14971-2019-download',
      'AS9100D - Copy'
    ];

    console.log('📋 Checking Railway UI entries:\n');
    for (const code of railwayEntries) {
      const result = await pool.query(
        'SELECT id, code, name, sector, file_category, uploaded_at FROM public.standards WHERE code = $1 OR name = $1',
        [code]
      );
      
      if (result.rows.length > 0) {
        result.rows.forEach(row => {
          console.log(`✅ Found: ${row.code}`);
          console.log(`   Name: ${row.name}`);
          console.log(`   Sector: ${row.sector}`);
          console.log(`   File Category: ${row.file_category}`);
          console.log(`   Uploaded: ${row.uploaded_at}`);
        });
      } else {
        console.log(`❌ NOT FOUND: ${code}`);
        // Check if it exists with different code
        const similar = await pool.query(
          'SELECT code, name FROM public.standards WHERE code LIKE $1 OR name LIKE $1 LIMIT 5',
          [`%${code.replace(/[^a-z0-9]/gi, '%')}%`]
        );
        if (similar.rows.length > 0) {
          console.log(`   Similar entries found:`);
          similar.rows.forEach(row => {
            console.log(`     - ${row.code}: ${row.name}`);
          });
        }
      }
      console.log('');
    }

    // Show total count and breakdown
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN file_category = 'standard' THEN 1 END) as standards,
        COUNT(CASE WHEN file_category = 'regulatory' THEN 1 END) as regulatory,
        COUNT(CASE WHEN file_category = 'customer_requirements' THEN 1 END) as customer,
        COUNT(CASE WHEN sector = 'compliance' THEN 1 END) as wrong_sector_compliance,
        COUNT(CASE WHEN sector = 'customer_require' THEN 1 END) as wrong_sector_customer_require
      FROM public.standards
    `);

    console.log('📊 Database Statistics:\n');
    console.log(`   Total standards: ${stats.rows[0].total}`);
    console.log(`   Standards: ${stats.rows[0].standards}`);
    console.log(`   Regulatory: ${stats.rows[0].regulatory}`);
    console.log(`   Customer: ${stats.rows[0].customer}`);
    console.log(`   ⚠️  Wrong sector "compliance": ${stats.rows[0].wrong_sector_compliance}`);
    console.log(`   ⚠️  Wrong sector "customer_require": ${stats.rows[0].wrong_sector_customer_require}`);

    // Show all standards with wrong sectors
    if (stats.rows[0].wrong_sector_compliance > 0 || stats.rows[0].wrong_sector_customer_require > 0) {
      console.log('\n⚠️  Standards with incorrect sectors:\n');
      const wrong = await pool.query(`
        SELECT code, name, sector, file_category 
        FROM public.standards 
        WHERE sector = 'compliance' OR sector = 'customer_require'
        ORDER BY code
      `);
      wrong.rows.forEach(row => {
        console.log(`   ${row.code}: sector="${row.sector}", category="${row.file_category || 'NULL'}"`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyData();

