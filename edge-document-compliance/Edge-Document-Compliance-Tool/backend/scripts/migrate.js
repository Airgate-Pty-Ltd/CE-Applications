/**
 * Advanced migration runner with checksums, dry-run and diagnostics.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '../migrations');
const LEDGER_TABLE = 'schema_migrations_edcat';

const MIGRATE_DRYRUN =
  process.argv.includes('--dry-run') || process.env.MIGRATE_DRYRUN === '1';
const CONTINUE_ON_ERROR = process.env.MIGRATE_CONTINUE_ON_ERROR === '1';

if (!process.env.DATABASE_URL) {
  console.error('[migrate] DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production' ||
    process.env.DATABASE_URL.includes('railway')
      ? { rejectUnauthorized: false }
      : undefined
});

function splitSQLStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inMultiLineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    // Handle comments
    if (!inSingleQuote && !inDoubleQuote) {
      if (!inMultiLineComment && char === '-' && nextChar === '-') {
        while (i < sql.length && sql[i] !== '\n') {
          i++;
        }
        continue;
      }

      if (!inMultiLineComment && char === '/' && nextChar === '*') {
        inMultiLineComment = true;
        i++;
        continue;
      }

      if (inMultiLineComment && char === '*' && nextChar === '/') {
        inMultiLineComment = false;
        i++;
        continue;
      }
    }

    if (inMultiLineComment) {
      continue;
    }

    if (char === '\'' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    }

    current += char;

    if (!inSingleQuote && !inDoubleQuote && char === ';') {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

function loadMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

async function ensureSchemaMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.${LEDGER_TABLE} (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureExtensions() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
}

async function loadAppliedMigrations() {
  try {
    const result = await pool.query(
      `SELECT filename, checksum FROM public.${LEDGER_TABLE}`
    );
    return result.rows.reduce((acc, row) => {
      acc[row.filename] = row;
      return acc;
    }, {});
  } catch (error) {
    if (error.code === '42P01') {
      // Ledger not created yet
      return {};
    }
    if (error.code === '42703') {
      console.warn(
        `[migrate] Ledger table public.${LEDGER_TABLE} is missing expected columns. Recreating...`
      );
      await pool.query(`DROP TABLE IF EXISTS public.${LEDGER_TABLE}`);
      await ensureSchemaMigrations();
      return {};
    }
    throw error;
  }
}

function logMigrationError(fileName, statement, error) {
  console.error(`[migrate] ❌ Error in ${fileName}`);
  console.error(`   code: ${error.code}`);
  if (error.schema) console.error(`   schema: ${error.schema}`);
  if (error.table) console.error(`   table: ${error.table}`);
  if (error.column) console.error(`   column: ${error.column}`);
  if (error.constraint) console.error(`   constraint: ${error.constraint}`);
  console.error(
    `   SQL: ${statement.replace(/\s+/g, ' ').trim().slice(0, 1000)}`
  );
  if (error.code === '42703') {
    console.error(
      "   hint: Check whether the referenced table actually has column 'id' or uses a different PK name. See /__db/introspect for details."
    );
  }
}

async function applyStatements(client, fileName, statements) {
  await client.query('BEGIN');
  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (error) {
      logMigrationError(fileName, statement, error);
      await client.query('ROLLBACK');
      throw error;
    }
  }
  await client.query('COMMIT');
}

async function upsertMigrationRecord(fileName, checksum) {
  await pool.query(
    `
      INSERT INTO public.${LEDGER_TABLE} (filename, checksum)
      VALUES ($1, $2)
      ON CONFLICT (filename)
      DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW()
    `,
    [fileName, checksum]
  );
}

async function run() {
  console.log('[migrate] Starting migration run...');
  console.log(`[migrate] dryRun=${MIGRATE_DRYRUN} continueOnError=${CONTINUE_ON_ERROR}`);

  if (MIGRATE_DRYRUN) {
    console.log(
      `[migrate] (dry-run) Would ensure pgcrypto extension and ledger table public.${LEDGER_TABLE}.`
    );
  } else {
    await ensureExtensions();
    await ensureSchemaMigrations();
  }

  const applied = MIGRATE_DRYRUN ? {} : await loadAppliedMigrations();
  const files = loadMigrationFiles();

  let hasErrors = false;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const statements = splitSQLStatements(sql);

    const existing = applied[file];
    if (existing && existing.checksum === checksum && !MIGRATE_DRYRUN) {
      console.log(`↺ Skipping ${file} (already applied, checksum match)`);
      continue;
    }

    if (MIGRATE_DRYRUN) {
      console.log(
        `[migrate] (dry-run) ${file} -> ${statements.length} statements (checksum ${checksum.slice(
          0,
          8
        )})`
      );
      statements.forEach((stmt, idx) => {
        console.log(
          `   • [${idx + 1}] ${stmt.replace(/\s+/g, ' ').trim().slice(0, 160)}${
            stmt.length > 160 ? '…' : ''
          }`
        );
      });
      continue;
    }

    const client = await pool.connect();
    try {
      await applyStatements(client, file, statements);
      await upsertMigrationRecord(file, checksum);
      console.log(`✅ Applied migration ${file}`);
    } catch (error) {
      hasErrors = true;
      if (!CONTINUE_ON_ERROR) {
        throw error;
      }
      console.warn(`[migrate] ⚠️ Continuing after failure in ${file}`);
    } finally {
      client.release();
    }
  }

  if (hasErrors) {
    console.warn('[migrate] Completed with errors');
  } else {
    console.log('[migrate] All migrations processed');
  }
}

run()
  .then(() => pool.end())
  .catch((err) => {
    console.error('[migrate] Migration run failed:', err.message);
    pool.end(() => process.exit(1));
  });

