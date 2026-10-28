/**
 * Test Database Routes
 * Simple endpoint to test database connectivity and verify tables exist
 */

import express from 'express';
import { queryPostgres } from '../config/databases.js';

const router = express.Router();

/**
 * GET /api/test/db
 * Test database connection and verify tables
 */
router.get('/db', async (req, res) => {
  try {
    // Test basic connection
    await queryPostgres('SELECT NOW()');
    
    // Check if tables exist in public schema
    const tablesResult = await queryPostgres(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
        AND table_name IN ('standards', 'standard_files', 'parsed_requirements', 'gap_analyses', 'tenants', 'customer_procedures', 'audit_trail')
      ORDER BY table_name
    `);
    
    // Check standards table specifically
    let standardsCount = 0;
    try {
      const countResult = await queryPostgres('SELECT COUNT(*) as count FROM public.standards');
      standardsCount = parseInt(countResult.rows[0].count);
    } catch (err) {
      // Table might not exist yet
    }
    
    // Check migrations
    let migrationsCount = 0;
    try {
      const migrationsResult = await queryPostgres('SELECT COUNT(*) as count FROM schema_migrations');
      migrationsCount = parseInt(migrationsResult.rows[0].count);
    } catch (err) {
      // Migrations table might not exist
    }
    
    res.json({
      connected: true,
      tables: {
        count: tablesResult.rows.length,
        list: tablesResult.rows.map(row => `${row.table_schema}.${row.table_name}`)
      },
      standards: {
        tableExists: standardsCount >= 0,
        count: standardsCount
      },
      migrations: {
        count: migrationsCount
      },
      status: tablesResult.rows.length >= 7 ? 'ready' : 'needs_migration'
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message,
      message: 'Database not available or tables not created'
    });
  }
});

export default router;

