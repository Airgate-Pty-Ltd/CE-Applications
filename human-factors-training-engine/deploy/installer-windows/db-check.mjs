// Copyright (c) 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
// This source code is proprietary and confidential. Unauthorized copying,
// distribution, or use of this file, via any medium, is strictly prohibited
// without prior written permission from Conform-Edge Quality Consulting LLC.
// See LICENSE and NOTICE at the repository root.
//
// Standalone Packaging Directive G4: a preflight integrity check start.ps1 runs against an
// EXISTING database file before starting the server. Two questions, not one:
//   1. Can this file even be opened as a SQLite database (PRAGMA integrity_check)?
//   2. Does it actually contain real tables?
// Question 2 exists specifically because SQLite silently treats a missing, empty, or
// zero-byte file as a brand-new valid database when opened for read/write -- a corrupted or
// accidentally-truncated file would pass a naive "does it open" check while actually being
// data loss. start.ps1 combines this script's output with its own knowledge of whether this
// installation was previously initialized (the data/.initialized marker) to decide whether
// an empty-looking database is a genuine fresh install or a red flag.
//
// Copied into app/ by build-package.ps1 (needs app/node_modules/@prisma/client to run) and
// invoked by start.ps1 with the target db path as argv[2]. Prints one JSON line to stdout on
// success; a non-zero exit code and a message on stderr means the file could not even be
// opened.

import { PrismaClient } from '@prisma/client';

const dbPath = process.argv[2];
if (!dbPath) {
  console.error('Usage: node db-check.mjs <absolute-db-path>');
  process.exit(2);
}

const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath.replace(/\\/g, '/')}` } },
});

try {
  const integrityRows = await prisma.$queryRawUnsafe('PRAGMA integrity_check');
  const integrityOk = Array.isArray(integrityRows) && integrityRows.length === 1 && integrityRows[0].integrity_check === 'ok';

  const tableRows = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  const tableNames = tableRows.map((r) => r.name);

  console.log(JSON.stringify({
    ok: true,
    integrityOk,
    tableCount: tableNames.length,
    hasUserTable: tableNames.includes('User'),
  }));
  await prisma.$disconnect();
  process.exit(0);
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
}
