#!/usr/bin/env tsx
/**
 * The clean-room gate. Exits non-zero on any finding.
 *
 * Usage:
 *   npm run scrub              scan working-tree content
 *   npm run scrub:history      also scan the content of every commit
 *
 * A denylist of owner-held terms is picked up from SCRUB_DENYLIST or from
 * tools/scrub/denylist.local.txt when either exists. Without it the gate still
 * catches every structured identifier; it cannot catch a company or person name
 * it has never been told about, and it says so rather than implying coverage
 * it does not have.
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { collectGitHistory, collectRepoFiles, loadDenylist, CONTENT_EXCLUSIONS } from './collect.ts'
import { collectAllowMarkers, scanFiles } from './scan.ts'
import type { Finding } from './types.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const withHistory = process.argv.includes('--history')

const files = collectRepoFiles(root)
const history = withHistory ? collectGitHistory(root) : []
const { entries: denylist, source: denylistSource } = loadDenylist(root)

const findings: Finding[] = scanFiles([...files, ...history], { denylist })
const markers = collectAllowMarkers(files)

const byGate = (gate: string): Finding[] => findings.filter((f) => f.gate === gate)

console.log('clean-room gate')
console.log(`  files scanned      ${files.length}`)
console.log(`  commits scanned    ${withHistory ? history.length : 'skipped (pass --history)'}`)
console.log(`  denylist           ${denylistSource ? `${denylist.length} terms from ${denylistSource}` : 'NOT SUPPLIED - name-based terms are not covered on this run'}`)
console.log(`  content exclusions ${CONTENT_EXCLUSIONS.join(', ')}`)
console.log(`  allow-markers      ${markers.length}`)
for (const marker of markers) {
  console.log(`      ${marker.file}:${marker.line}  ${marker.ruleId}`)
}

for (const gate of ['identifier', 'opinion'] as const) {
  const gateFindings = byGate(gate)
  const label = gate === 'identifier' ? 'section 1.1 identifier scrub' : 'section 1.2 opinion language'
  if (gateFindings.length === 0) {
    console.log(`\nPASS  ${label}`)
    continue
  }
  console.log(`\nFAIL  ${label} - ${gateFindings.length} finding(s)`)
  for (const f of gateFindings) {
    console.log(`  ${f.file}:${f.line}:${f.column}  [${f.ruleId}]  ${f.redacted}`)
    console.log(`      ${f.rationale}`)
  }
}

if (findings.length > 0) {
  console.log('\nMatches are printed redacted on purpose. Open the file to see the text in context.')
  process.exit(1)
}
