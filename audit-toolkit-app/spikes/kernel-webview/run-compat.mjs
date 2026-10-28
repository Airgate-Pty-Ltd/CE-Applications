// Usage (from a folder where esbuild is installed, e.g. npm i esbuild@0.25.0):
//   node run-compat.mjs <kernelSrcDir> <tag>
// 1) builds a NODE reference bundle (real node:crypto)  2) builds the BROWSER bundle (shim alias)
// 3) runs the browser bundle inside node:vm with NO Node builtins  4) compares byte-for-byte with node output.
// Kernel source is read only; all outputs go to ./out under the current working directory.
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const { build } = createRequire(process.cwd() + '/x.js')('esbuild');
const here = path.dirname(fileURLToPath(import.meta.url));
const [src, tag] = process.argv.slice(2);
const outDir = path.join(process.cwd(), 'out'); fs.mkdirSync(outDir, { recursive: true });
const nodeOut = path.join(outDir, `evaluate.node.${tag}.mjs`), brOut = path.join(outDir, `evaluate.browser.${tag}.js`);
const shim = path.join(here, 'node-crypto-shim.js');
await build({ entryPoints: [path.join(src, 'evaluate.ts')], bundle: true, platform: 'node', format: 'esm', outfile: nodeOut, logLevel: 'error' });
await build({ entryPoints: [path.join(src, 'evaluate.ts')], bundle: true, platform: 'browser', format: 'iife', globalName: 'MAIEvaluate', target: 'es2020', outfile: brOut, logLevel: 'error',
  alias: { 'node:crypto': shim, crypto: shim } });
const input = JSON.parse(fs.readFileSync(path.join(here, 'test-input.json'), 'utf8'));
const strip = r => { const c = JSON.parse(JSON.stringify(r)); delete c.evaluationDurationMs; return c; };
const clone = o => JSON.parse(JSON.stringify(o));
const toUrl = p => 'file:///' + p.replace(/\\/g, '/');
const N = await import(toUrl(nodeOut));
const brSrc = fs.readFileSync(brOut, 'utf8');
const mkCtx = (extra = {}, pre = '') => { const c = vm.createContext({ TextEncoder, ...extra }); if (pre) vm.runInContext(pre, c); vm.runInContext(brSrc, c); return c; };
const ctx = mkCtx();
const probe = vm.runInContext('[typeof process, typeof require, typeof Buffer, typeof module, typeof crypto, typeof setTimeout].join(",")', ctx);
const B = vm.runInContext('MAIEvaluate', ctx);
const run = (M, inp) => ({
  result: strip(M.evaluate(inp)),
  hash: M.createDeterminationHash(inp.subject, inp.facts, inp.rules, inp.manifestRef, inp.event, inp.authorityContext, '2026-10-01T10:00:05.000Z'),
  rules: JSON.stringify(M.evaluateRules(inp.subject, inp.facts, inp.rules, inp.event)) });
const nA = run(N, clone(input)), bA = run(B, clone(input));
const report = { tag, vm_typeof_process_require_Buffer_module_crypto_setTimeout: probe,
  node_determinationHash: nA.result.determinationHash, browserlike_determinationHash: bA.result.determinationHash,
  evaluate_result_byte_equal: JSON.stringify(nA.result) === JSON.stringify(bA.result),
  createDeterminationHash_equal: nA.hash === bA.hash, evaluateRules_equal: nA.rules === bA.rules,
  governedDecisions: nA.result.governedDecisions.length, conditionMet: nA.result.evaluations.map(e => `${e.ruleId}:${e.conditionMet}`) };
report.same_input_twice_node = JSON.stringify(run(N, clone(input)).result) === JSON.stringify(nA.result);
report.same_input_twice_browserlike = JSON.stringify(run(B, clone(input)).result) === JSON.stringify(bA.result);
const rev = v => Array.isArray(v) ? v.map(rev) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, rev(x)])) : v;
report.keyorder_reversed_hash_equal_node = N.evaluate(rev(clone(input))).determinationHash === nA.result.determinationHash;
report.keyorder_reversed_hash_equal_browserlike = B.evaluate(rev(clone(input))).determinationHash === bA.result.determinationHash;
const shuf = clone(input); shuf.rules.reverse();
report.rule_array_reversed_hash_equal = N.evaluate(shuf).determinationHash === nA.result.determinationHash;
const c2 = mkCtx({}, 'Date = class extends Date { constructor(...a) { a.length ? super(...a) : super(1e12); } static now() { return 1e12; } };');
report.hash_with_clock_forced_to_2001_equal = vm.runInContext('MAIEvaluate', c2).evaluate(clone(input)).determinationHash === nA.result.determinationHash;
const { createHash } = await import('node:crypto'); const sh = await import(toUrl(shim));
let ok = 0, tot = 0;
for (const n of [0,1,3,55,56,57,63,64,65,119,120,1000,100000]) for (const s of ['a', 'é€😀']) { const m = s.repeat(n); tot++; if (createHash('sha256').update(m).digest('hex') === sh.createHash('sha256').update(m).digest('hex')) ok++; }
report.shim_vs_node_crypto_sha256 = `${ok}/${tot} match`;
// SIMULATION (not a real different-ICU run): force default-collation localeCompare to Swedish to show hash sensitivity.
const c3 = mkCtx({}, "String.prototype.localeCompare = function (o) { return new Intl.Collator('sv').compare(String(this), o); };");
report.SIMULATED_sv_collation_hash = vm.runInContext('MAIEvaluate', c3).evaluate(clone(input)).determinationHash;
report.SIMULATED_sv_collation_hash_equal = report.SIMULATED_sv_collation_hash === nA.result.determinationHash;
report.node_default_locale = Intl.DateTimeFormat().resolvedOptions().locale;
fs.writeFileSync(path.join(outDir, `compat-report.${tag}.json`), JSON.stringify({ report, nodeResult: nA.result }, null, 2));
console.log(JSON.stringify(report, null, 2));
