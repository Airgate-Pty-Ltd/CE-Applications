#!/usr/bin/env node

/**
 * EDCAT database bootstrap.
 * 
 * This script is designed to run inside Railway (or any environment with
 * DATABASE_URL configured). It calls initializeDatabase(), which executes
 * database/schema.sql and applies any safety drops for legacy tables.
 *
 * Usage:
 *   railway run node scripts/init-db.js
 */

const { initializeDatabase, pool } = require('../database/db');

async function main() {
  try {
    await initializeDatabase();
    console.log('✅ Database schema initialised.');
  } catch (error) {
    console.error('❌ Failed to initialise database schema:', error);
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();

