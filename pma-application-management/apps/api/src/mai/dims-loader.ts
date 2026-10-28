import fs from 'fs';
import path from 'path';
import type { LoadedDim } from './kernel/registry';
import type { DimManifest, Rule } from './kernel/types';

// Loads DIM manifests + rule JSON from disk. This is HOST-side code (uses fs);
// the kernel itself imports nothing and receives already-parsed LoadedDim[].

export function loadDim(dimDir: string): LoadedDim {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dimDir, 'manifest.json'), 'utf8'),
  ) as DimManifest;
  const rulesDir = path.join(dimDir, 'rules');
  const rules: Rule[] = fs.existsSync(rulesDir)
    ? fs
        .readdirSync(rulesDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => JSON.parse(fs.readFileSync(path.join(rulesDir, f), 'utf8')) as Rule)
    : [];
  return { manifest, rules };
}

export function loadAllDims(baseDir: string): LoadedDim[] {
  if (!fs.existsSync(baseDir)) return [];
  return fs
    .readdirSync(baseDir)
    .map((name) => path.join(baseDir, name))
    .filter((p) => fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'manifest.json')))
    .map(loadDim);
}

// Default location of the DIM library, resolved relative to this file so it works
// from src (tsx) and dist (compiled) alike.
export function defaultDimsDir(): string {
  return path.resolve(__dirname, '..', '..', 'dims');
}
