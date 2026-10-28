const db = require('../database/db');

const { initializeDatabase, query, pool } = db;

async function seedCustomer() {
  const defaultCustomer = {
    name: process.env.SEED_CUSTOMER_NAME || 'Test Organization',
    contactName: process.env.SEED_CUSTOMER_CONTACT || 'Quality Administrator',
    contactEmail: process.env.SEED_CUSTOMER_EMAIL || 'test.organization@example.com'
  };

  const existing = await query(
    'SELECT id FROM customers WHERE company_name = $1 LIMIT 1',
    [defaultCustomer.name]
  );

  if (existing.rows.length) {
    await query(
      `UPDATE customers
       SET contact_name = $1,
           contact_email = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [defaultCustomer.contactName, defaultCustomer.contactEmail, existing.rows[0].id]
    );
    console.log(`ℹ️  Updated existing customer: ${defaultCustomer.name}`);
  } else {
    await query(
      `INSERT INTO customers (company_name, contact_name, contact_email)
       VALUES ($1, $2, $3)`,
      [defaultCustomer.name, defaultCustomer.contactName, defaultCustomer.contactEmail]
    );
    console.log(`✅ Created seed customer: ${defaultCustomer.name}`);
  }
}

async function main() {
  try {
    await initializeDatabase();
    await seedCustomer();
    console.log('✨ Seed complete');
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();

