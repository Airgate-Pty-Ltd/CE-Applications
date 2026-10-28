/**
 * Database Status Routes
 * Provides endpoints to check database schema and migration status
 */

import express from 'express';
import { queryPostgres } from '../config/databases.js';

const router = express.Router();

/**
 * GET /api/db/status
 * Get database schema and migration status
 */
router.get('/status', async (req, res) => {
  try {
    // Check if database is available
    let dbInfo = {};
    try {
      const dbResult = await queryPostgres('SELECT current_database(), current_user, version()');
      dbInfo = {
        database: dbResult.rows[0].current_database,
        user: dbResult.rows[0].current_user,
        version: dbResult.rows[0].version.split('\n')[0]
      };
      await queryPostgres('SELECT NOW()');
    } catch (err) {
      return res.json({
        connected: false,
        error: 'Database not available',
        message: err.message
      });
    }

    // Get table count in public schema
    let tablesCount = 0;
    let tables = [];
    try {
      const tablesResult = await queryPostgres(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
          AND table_name IN ('standards', 'standard_files', 'parsed_requirements', 'gap_analyses', 'tenants', 'customer_procedures', 'audit_trail')
        ORDER BY table_name
      `);
      tablesCount = tablesResult.rows.length;
      tables = tablesResult.rows.map(row => `${row.table_schema}.${row.table_name}`);
    } catch (err) {
      // Tables might not exist yet
    }

    // Get migration count
    let migrationsCount = 0;
    let migrations = [];
    try {
      const migrationsResult = await queryPostgres(`
        SELECT version, executed_at 
        FROM schema_migrations 
        ORDER BY executed_at
      `);
      migrationsCount = migrationsResult.rows.length;
      migrations = migrationsResult.rows.map(row => ({
        version: row.version,
        executedAt: row.executed_at
      }));
    } catch (err) {
      // Migrations table might not exist yet
    }

    // Check expected tables in public schema
    const expectedTables = [
      'public.standards',
      'public.standard_files',
      'public.parsed_requirements',
      'public.gap_analyses',
      'public.tenants',
      'public.customer_procedures',
      'public.audit_trail'
    ];

    const missingTables = expectedTables.filter(table => !tables.includes(table));

    res.json({
      connected: true,
      database: dbInfo,
      tables: {
        count: tablesCount,
        expected: expectedTables.length,
        list: tables,
        missing: missingTables
      },
      migrations: {
        count: migrationsCount,
        list: migrations
      },
      status: tablesCount === expectedTables.length ? 'ready' : 'needs_migration',
      note: 'Railway UI may only show tables in the public schema. Use /api/db/tables to see all schemas.'
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

/**
 * GET /api/db/tables
 * List all tables in all schemas (for Railway UI visibility)
 */
router.get('/tables', async (req, res) => {
  try {
    const result = await queryPostgres(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename
    `);

    const tablesBySchema = {};
    result.rows.forEach(row => {
      if (!tablesBySchema[row.schemaname]) {
        tablesBySchema[row.schemaname] = [];
      }
      tablesBySchema[row.schemaname].push({
        name: row.tablename,
        owner: row.tableowner
      });
    });

    res.json({
      success: true,
      schemas: tablesBySchema,
      totalTables: result.rows.length,
      message: 'Railway UI may only show public schema tables. Use this endpoint to see all schemas.'
    });
  } catch (error) {
    console.error('Error listing tables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

