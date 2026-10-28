/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

/**
 * WP-1: exercises the real generator script as a real subprocess (same rationale as
 * WP-5's backup/restore CLI tests — proves the actual command-line contract, sidesteps
 * needing Jest to transform a separate ESM script tree).
 */

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const GENERATOR_SCRIPT = path.join(REPO_ROOT, 'scripts', 'generate-postgres-schema.js');
const SOURCE_SCHEMA = path.join(REPO_ROOT, 'prisma', 'schema.prisma');
const TARGET_SCHEMA = path.join(REPO_ROOT, 'prisma', 'postgresql', 'schema.prisma');

describe('generate-postgres-schema.js — WP-1 dual-provider schema derivation', () => {
  test('real script run produces prisma/schema.postgresql.prisma with provider swapped to postgresql', () => {
    execFileSync('node', [GENERATOR_SCRIPT], { encoding: 'utf8' });

    expect(fs.existsSync(TARGET_SCHEMA)).toBe(true);
    const generated = fs.readFileSync(TARGET_SCHEMA, 'utf8');
    expect(generated).toContain('provider = "postgresql"');
    expect(generated).not.toContain('provider = "sqlite"');
    expect(generated).toContain('GENERATED FILE — DO NOT EDIT DIRECTLY');
  });

  test('every model definition in the source schema survives untouched in the derived schema (only the datasource provider line changes)', () => {
    execFileSync('node', [GENERATOR_SCRIPT], { encoding: 'utf8' });

    const source = fs.readFileSync(SOURCE_SCHEMA, 'utf8');
    const generated = fs.readFileSync(TARGET_SCHEMA, 'utf8');

    const modelNames = [...source.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
    expect(modelNames.length).toBeGreaterThan(20); // sanity: real schema, not an empty/broken read

    for (const name of modelNames) {
      expect(generated).toContain(`model ${name} {`);
    }

    // Byte-identical apart from the single provider line and the generated-file header.
    const sourceBody = source.replace('provider = "sqlite"', 'provider = "postgresql"');
    const generatedBody = generated.replace(/^\/\/ GENERATED[\s\S]*?\n\n/, '');
    expect(generatedBody).toBe(sourceBody);
  });

  test('derivePostgresSchema() throws loudly on input missing the expected sqlite marker (never silently produces a wrong/empty schema)', () => {
    // Real subprocess dynamically importing the exported pure function directly, against a
    // throwaway string — never touches the real prisma/schema.prisma for this negative case.
    const probe = `
      import { derivePostgresSchema } from ${JSON.stringify(pathToFileURL(GENERATOR_SCRIPT).href)};
      try {
        derivePostgresSchema('datasource db {\\n  provider = "mysql"\\n}\\n');
        console.log('NO_THROW');
      } catch (e) {
        console.log('THREW: ' + e.message);
      }
    `;
    const output = execFileSync('node', ['--input-type=module', '-e', probe], { encoding: 'utf8' });
    expect(output).toContain('THREW');
    expect(output).toContain('Expected to find');
  });
});
