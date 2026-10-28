import fs from 'fs';
import path from 'path';
import { loadDim } from '../src/mai/dims-loader';
import { generateCharter } from '../src/mai/charter';

// Regenerates a DIM's AUTHORITY-CHARTER.md from its rule JSONs so the Governing
// Rules table can never drift. Run: npx tsx scripts/generate-charter.ts <dimDir>

const dimDir =
  process.argv[2] ?? path.resolve(__dirname, '..', 'dims', 'pma-application-assessment');
const dim = loadDim(dimDir);
const out = path.join(dimDir, 'AUTHORITY-CHARTER.md');
fs.writeFileSync(out, generateCharter(dim));
// eslint-disable-next-line no-console
console.log(`Wrote ${out} (${dim.rules.length} rules)`);
