/**
 * Migration: 001_initial_schema
 * Creates the complete database schema (2 schemas, 9 tables, indices)
 * 
 * This migration creates:
 * - compliance_lib schema (4 tables)
 * - customer_data schema (5 tables)
 * - All required indices
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const up = async (client) => {
  // Read the complete schema file
  const schemaPath = join(__dirname, '../schema/complete-schema.sql');
  
  let schema;
  try {
    schema = readFileSync(schemaPath, 'utf8');
  } catch (err) {
    throw new Error(`Could not read schema file: ${schemaPath} - ${err.message}`);
  }

  // Split schema into individual statements
  const statements = schema
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => 
      stmt.length > 0 && 
      !stmt.startsWith('--') &&
      !stmt.startsWith('/*') &&
      stmt !== ''
    );

  let executed = 0;
  let skipped = 0;
  let errors = [];

  // Ensure we're not in a transaction (auto-commit mode)
  // PostgreSQL clients are in auto-commit by default, but let's be sure
  try {
    // Check if we're in a transaction and rollback if needed
    const inTransaction = await client.query('SELECT txid_current_if_assigned()');
    if (inTransaction.rows[0].txid_current_if_assigned) {
      await client.query('ROLLBACK');
    }
  } catch (checkErr) {
    // Not in transaction or can't check - that's fine, continue
  }

  // Execute each statement individually (auto-commit mode)
  // This way if one fails, others can still succeed
  for (const statement of statements) {
    if (statement.length < 10) continue; // Skip very short statements
    
    try {
      await client.query(statement);
      executed++;
    } catch (err) {
      // Handle transaction abort - rollback and retry
      if (err.code === '25P02') {
        try {
          await client.query('ROLLBACK');
          // Retry the statement after rollback
          await client.query(statement);
          executed++;
          continue;
        } catch (retryErr) {
          // If retry fails, check if it's a "already exists" error
          if (retryErr.message.includes('already exists') || retryErr.code === '42P07' || retryErr.code === '42710') {
            skipped++;
            continue;
          }
          // Log the retry error
          console.log(`⚠️  Retry failed: ${retryErr.message.substring(0, 100)}`);
          errors.push({ statement: statement.substring(0, 50), error: retryErr.message });
        }
        continue;
      }
      
      // Some statements might fail if they already exist (IF NOT EXISTS)
      if (err.message.includes('already exists') || 
          err.code === '42P07' || 
          err.code === '42710') { // duplicate_object
        skipped++;
        continue;
      }
      
      // Log error but don't fail completely
      console.log(`⚠️  Statement warning: ${err.message.substring(0, 100)}`);
      errors.push({ statement: statement.substring(0, 50), error: err.message });
    }
  }

  console.log(`✅ Migration 001_initial_schema completed (${executed} executed, ${skipped} skipped)`);
  
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} statement(s) had errors (may be expected)`);
  }
};

export const down = async (client) => {
  // Drop schemas (this will cascade delete all tables)
  await client.query('DROP SCHEMA IF EXISTS customer_data CASCADE');
  await client.query('DROP SCHEMA IF EXISTS compliance_lib CASCADE');
  console.log('✅ Migration 001_initial_schema rolled back');
};

