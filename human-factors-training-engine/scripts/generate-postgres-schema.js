#!/usr/bin/env node
/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * Phase 4 WP-1: dual-provider schema (closes Q-008).
 *
 * Prisma's `datasource.provider` must be a literal string, not `env(...)` — one schema
 * file cannot target two providers natively. Rather than hand-maintaining two schema files
 * (which drift), `prisma/schema.prisma` (SQLite) stays the single source of truth that a
 * human edits; this script mechanically derives `prisma/postgresql/schema.prisma` from it
 * by swapping only the datasource provider line. It lives in its own subdirectory (not
 * alongside schema.prisma) so Prisma's migration-folder convention — always
 * `<schema-dir>/migrations`, not independently configurable — resolves to a separate
 * `prisma/postgresql/migrations/`, never mixing SQLite and Postgres migration files in the
 * same folder. Run via `npm run db:generate:pg` (and its relatives) before any
 * Postgres-targeted `prisma generate`/`migrate`/`db execute` — never hand-edit the generated
 * file, it will be overwritten.
 *
 * Reconciliation note (DECISIONS.md D-040): Json-as-String fields (src/lib/json.ts's
 * toDb/fromDb boundary) are kept as `String` columns in BOTH providers rather than switched
 * to Postgres's native `Json` type. This is a deliberate parity choice — it means zero
 * provider-conditional application code and byte-identical serialization behavior on both
 * providers, at the cost of not using Postgres's native JSON query operators (not needed by
 * anything in this codebase today). No `@db.*` native-type annotations exist in the source
 * schema (verified: `grep -c '@db\.' prisma/schema.prisma` → 0, per D-001/D-002's original
 * SQLite conversion), so no other type reconciliation was needed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');
const TARGET_DIR = path.resolve(__dirname, '..', 'prisma', 'postgresql');
const TARGET = path.join(TARGET_DIR, 'schema.prisma');
const HEADER =
  '// GENERATED FILE — DO NOT EDIT DIRECTLY.\n' +
  '// Derived from prisma/schema.prisma by scripts/generate-postgres-schema.js (Phase 4 WP-1).\n' +
  '// Edit prisma/schema.prisma (the SQLite source of truth) and re-run `npm run db:generate:pg`.\n\n';

export function derivePostgresSchema(sourceText) {
  const marker = 'provider = "sqlite"';
  if (!sourceText.includes(marker)) {
    throw new Error(`Expected to find ${JSON.stringify(marker)} in prisma/schema.prisma — source schema shape changed, update this script.`);
  }
  return HEADER + sourceText.replace(marker, 'provider = "postgresql"');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const sourceText = fs.readFileSync(SOURCE, 'utf8');
  const derived = derivePostgresSchema(sourceText);
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  fs.writeFileSync(TARGET, derived);
  console.log(`Generated ${TARGET} from ${SOURCE}.`);
}
