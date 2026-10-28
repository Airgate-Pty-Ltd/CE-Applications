// Usage: node build-bundle.mjs <kernelSrcDir> <outFile>
// Bundles kernel/src/evaluate.ts for the browser WITHOUT touching Kernel source.
import { createRequire } from 'node:module';
// esbuild is resolved from the CURRENT WORKING DIRECTORY (run from a folder where 'npm i esbuild@0.25.0' was done)
const { build } = createRequire(process.cwd() + '/x.js')('esbuild');
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [src, out] = process.argv.slice(2);
const shim = path.join(here, 'node-crypto-shim.js');
const res = await build({
  entryPoints: [path.join(src, 'evaluate.ts')],
  bundle: true, platform: 'browser', format: 'iife', globalName: 'MAIEvaluate',
  target: 'es2020', outfile: out, metafile: true, logLevel: 'info',
  alias: { 'node:crypto': shim, crypto: shim },   // config-only shim
});
const inputs = Object.keys(res.metafile.inputs);
console.log('bundled inputs:\n  ' + inputs.join('\n  '));
