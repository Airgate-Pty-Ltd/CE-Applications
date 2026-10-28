/**
 * Migration: 002_add_regulatory_websites
 * Adds table for storing regulatory requirement websites
 */

export const up = async (client) => {
  // Create table for regulatory websites
  await client.query(`
    CREATE TABLE IF NOT EXISTS customer_data.regulatory_websites (
      regulatory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      url VARCHAR(512) NOT NULL UNIQUE,
      name VARCHAR(255),
      description TEXT,
      agency VARCHAR(100),
      added_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create index for faster lookups
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_regulatory_websites_url 
    ON customer_data.regulatory_websites(url)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_regulatory_websites_agency 
    ON customer_data.regulatory_websites(agency)
  `);

  console.log('✅ Migration 002_add_regulatory_websites completed');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS customer_data.regulatory_websites');
  console.log('✅ Migration 002_add_regulatory_websites rolled back');
};

