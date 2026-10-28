#!/usr/bin/env node
// Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
//
// Fails (exit 1) if any tracked TypeScript source file is missing the standard
// copyright header. Run via `npm run check:license-headers`; wired into the
// build via the `prebuild` script so a missing header fails `npm run build`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_MARKER = 'Copyright © 2026 Conform-Edge Quality Consulting LLC';

// Directories to scan (relative to repo root). Excludes node_modules, .next,
// generated Prisma client output, and _prototypes (explicitly parked/unverified,
// excluded from tsconfig — see DECISIONS.md D-011).
const SCAN_DIRS = ['src', 'prisma', 'scripts'];
const EXCLUDE_PATTERNS = [/node_modules/, /\.next/, /generated/, /_prototypes/];
const EXTENSIONS = new Set(['.ts', '.tsx']);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (EXCLUDE_PATTERNS.some((p) => p.test(fullPath))) continue;
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const files = SCAN_DIRS.flatMap((dir) => walk(path.join(repoRoot, dir)));

  const missing = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    // Only check the first ~500 chars — the header must be at the top of the file, not
    // buried anywhere in it.
    const head = content.slice(0, 500);
    if (!head.includes(REQUIRED_MARKER)) {
      missing.push(path.relative(repoRoot, file));
    }
  }

  if (missing.length > 0) {
    console.error(`\n✗ ${missing.length} file(s) missing the required copyright header:\n`);
    for (const f of missing) console.error(`  - ${f}`);
    console.error(`\nEvery .ts/.tsx file under src/, prisma/, scripts/ must begin with a header containing:`);
    console.error(`  "${REQUIRED_MARKER}"\n`);
    process.exit(1);
  }

  console.log(`✓ License header check passed — ${files.length} files checked, all compliant.`);
}

main();
