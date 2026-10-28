/**
 * Determinism Test - Ensures identical inputs produce identical outputs
 */

import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function hash(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function cleanupOutDir() {
  const outDir = path.join(rootDir, 'out');
  if (fs.existsSync(outDir)) {
    const files = fs.readdirSync(outDir);
    for (const file of files) {
      fs.unlinkSync(path.join(outDir, file));
    }
  }
}

async function testDeterminism() {
  console.log('🧪 Testing determinism...');

  // First run
  cleanupOutDir();
  execSync('npm run teach:as9100d', { 
    stdio: 'inherit', 
    cwd: rootDir,
    env: { ...process.env }
  });

  const h1_gap = hash(path.join(rootDir, 'out/gap.json'));
  const h1_cov = hash(path.join(rootDir, 'out/coverage.json'));
  const h1_csv = hash(path.join(rootDir, 'out/gap.csv'));

  console.log('First run hashes:');
  console.log(`  gap.json: ${h1_gap}`);
  console.log(`  coverage.json: ${h1_cov}`);
  console.log(`  gap.csv: ${h1_csv}`);

  // Second run
  cleanupOutDir();
  execSync('npm run teach:as9100d', { 
    stdio: 'inherit', 
    cwd: rootDir,
    env: { ...process.env }
  });

  const h2_gap = hash(path.join(rootDir, 'out/gap.json'));
  const h2_cov = hash(path.join(rootDir, 'out/coverage.json'));
  const h2_csv = hash(path.join(rootDir, 'out/gap.csv'));

  console.log('Second run hashes:');
  console.log(`  gap.json: ${h2_gap}`);
  console.log(`  coverage.json: ${h2_cov}`);
  console.log(`  gap.csv: ${h2_csv}`);

  // Compare
  if (h1_gap !== h2_gap) {
    console.error('❌ gap.json is NOT deterministic');
    process.exit(1);
  }

  if (h1_cov !== h2_cov) {
    console.error('❌ coverage.json is NOT deterministic');
    process.exit(1);
  }

  if (h1_csv !== h2_csv) {
    console.error('❌ gap.csv is NOT deterministic');
    process.exit(1);
  }

  console.log('✅ All outputs are deterministic!');
}

testDeterminism().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});

