/**
 * Check for placeholder content in outputs
 * Ensures no example/fake data in generated artifacts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const files = [
  'out/gap.json',
  'out/coverage.json',
  'out/gap.csv',
  'out/teaching_report.md'
];

const banned = [
  /placeholder/i,
  /lorem ipsum/i,
  /example only/i,
  /fake/i,
  /dummy/i,
  /test data/i,
  /sample data/i
];

let failed = false;

for (const f of files) {
  const filePath = path.join(rootDir, f);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${f} (skipping)`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const pattern of banned) {
    if (pattern.test(content)) {
      console.error(`❌ Placeholder-like content found in ${f}: ${pattern}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\n❌ Placeholder check FAILED. Remove placeholder content before proceeding.');
  process.exit(2);
}

console.log('✅ No placeholder content detected.');

