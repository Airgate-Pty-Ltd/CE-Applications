// Replicates hashSourceTree() from kernel/scripts/build-manifest.ts (read-only), with a path-separator switch.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
const root = process.argv[2];            // .../kernel
const mode = process.argv[3] || 'native'; // native (win32 backslash) | posix
const hashFile = p => createHash('sha256').update(readFileSync(p)).digest('hex');
function collect(d) { const r = []; for (const e of readdirSync(d, { withFileTypes: true })) { const f = join(d, e.name); if (e.isDirectory()) { if (e.name === 'node_modules' || e.name === 'dist') continue; r.push(...collect(f)); } else r.push(f); } return r; }
const h = createHash('sha256');
for (const f of collect(join(root, 'src')).sort()) { let rel = relative(root, f); if (mode === 'posix') rel = rel.split('\\').join('/'); h.update(rel); h.update(hashFile(f)); }
console.log(mode, h.digest('hex'));
