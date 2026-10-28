/**
 * The most important test in the repository.
 *
 * Two gates, proved three ways:
 *   1. every rule fires on a synthetic sample, so no rule is decorative;
 *   2. clean prose produces nothing, so the gates are usable;
 *   3. the repository itself is clean.
 *
 * Written before any feature code, per BUILD PROMPT 3 section 8 step 1.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ALL_RULES, redact, scanText, scanFiles, collectAllowMarkers } from '../tools/scrub/scan.ts'
import { IDENTIFIER_RULES } from '../tools/scrub/rules.identifier.ts'
import { OPINION_RULES } from '../tools/scrub/rules.opinion.ts'
import { CONTENT_EXCLUSIONS, collectGitHistory, collectRepoFiles } from '../tools/scrub/collect.ts'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

interface Samples {
  identifier: Record<string, string>
  opinion: Record<string, string>
  clean: string[]
}

const samples: Samples = JSON.parse(
  readFileSync(resolve(here, 'fixtures/scrub/samples.json'), 'utf8'),
) as Samples

describe('section 1.1 - clean-room identifier gate', () => {
  it('has a synthetic sample for every identifier rule', () => {
    const covered = Object.keys(samples.identifier).sort()
    const declared = IDENTIFIER_RULES.map((r) => r.id).sort()
    expect(covered).toEqual(declared)
  })

  for (const rule of IDENTIFIER_RULES) {
    it(`fires on ${rule.id}`, () => {
      const text = samples.identifier[rule.id]
      expect(text, `no sample for ${rule.id}`).toBeTruthy()
      const findings = scanText({ file: 'sample.txt', text: text as string })
      expect(findings.map((f) => f.ruleId)).toContain(rule.id)
    })
  }

  it('exempts documentation placeholder mailboxes', () => {
    const findings = scanText({ file: 'sample.txt', text: 'write to inspector@example.com today' })
    expect(findings.filter((f) => f.ruleId === 'email-address')).toHaveLength(0)
  })
})

describe('section 1.2 - opinion language gate', () => {
  it('has a synthetic sample for every opinion rule', () => {
    const covered = Object.keys(samples.opinion).sort()
    const declared = OPINION_RULES.map((r) => r.id).sort()
    expect(covered).toEqual(declared)
  })

  for (const rule of OPINION_RULES) {
    it(`fires on ${rule.id}`, () => {
      const text = samples.opinion[rule.id]
      expect(text, `no sample for ${rule.id}`).toBeTruthy()
      const findings = scanText({ file: 'sample.txt', text: text as string })
      expect(findings.map((f) => f.ruleId)).toContain(rule.id)
    })
  }
})

describe('gate mechanics', () => {
  it('passes clean product prose', () => {
    for (const text of samples.clean) {
      expect(scanText({ file: 'sample.txt', text })).toEqual([])
    }
  })

  it('never echoes the offending text back into the log', () => {
    const text = samples.identifier['telephone-number'] as string
    const [finding] = scanText({ file: 'sample.txt', text })
    expect(finding).toBeDefined()
    expect(text).not.toContain(finding!.redacted)
    expect(finding!.redacted).toContain('•')
  })

  it('keeps only the first two characters of a match', () => {
    expect(redact('ABC123')).toBe('AB••••')
  })

  it('honours an inline allow-marker for the named rule only', () => {
    // Both source lines below carry a marker for opinion-satisfies so the
    // repository scan stays clean; the markers inside the string literals are
    // what the assertions are actually about.
    const line = 'quoted: this satisfies section 145.211 // SCRUB-ALLOW: opinion-satisfies' // SCRUB-ALLOW: opinion-satisfies
    expect(scanText({ file: 'q.ts', text: line })).toEqual([])

    const otherRule = 'quoted: this satisfies section 145.211 // SCRUB-ALLOW: opinion-complies-with' // SCRUB-ALLOW: opinion-satisfies
    expect(scanText({ file: 'q.ts', text: otherRule }).map((f) => f.ruleId)).toContain(
      'opinion-satisfies',
    )
  })

  it('applies an owner-supplied denylist term across separator styles', () => {
    const denylist = [{ category: 'company', term: 'Northwind Aero' }]
    for (const variant of ['Northwind Aero', 'northwind-aero', 'NORTHWIND_AERO', 'northwindaero']) {
      const findings = scanText({ file: 'x.ts', text: `owned by ${variant}` }, { denylist })
      expect(findings.map((f) => f.gate), variant).toContain('identifier')
    }
  })

  it('does not match a denylist term inside a longer word', () => {
    const denylist = [{ category: 'company', term: 'Aero' }]
    expect(scanText({ file: 'x.ts', text: 'aerodynamic loading' }, { denylist })).toEqual([])
  })

  it('no rule source matches itself', () => {
    // A rule that fires on its own definition makes the gate unusable, because
    // the scanner reads the whole repository including the rule files.
    for (const rule of ALL_RULES) {
      const source = rule.pattern.source
      rule.pattern.lastIndex = 0
      expect(rule.pattern.test(source), `${rule.id} matches its own pattern source`).toBe(false)
    }
  })

  it('no rule id trips any rule', () => {
    // Rule ids are written into findings, logs, dashboard panels and this file,
    // so an id containing a banned word would fire everywhere it is mentioned.
    for (const rule of ALL_RULES) {
      const findings = scanText({ file: 'ids.txt', text: rule.id })
      expect(findings.map((f) => f.ruleId), `id "${rule.id}" is itself a violation`).toEqual([])
    }
  })
})

describe('the repository itself', () => {
  const files = collectRepoFiles(root)

  it('reads a non-trivial number of files', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it('excludes exactly one directory from content scanning', () => {
    // Widening this list is how a gate quietly becomes decorative.
    expect(CONTENT_EXCLUSIONS).toEqual(['tests/fixtures/scrub'])
  })

  it('carries no identifier and no compliance conclusion', () => {
    const findings = scanFiles(files)
    const report = findings
      .map((f) => `${f.file}:${f.line}:${f.column} [${f.ruleId}] ${f.redacted}`)
      .join('\n')
    expect(findings, report).toEqual([])
  })

  it('applies the content exclusion to commit history as well as the working tree', () => {
    // Flattening a commit into one blob loses which file each hunk came from,
    // and with it the ability to honour the exclusion - so the gate flagged its
    // own fixtures the moment they were committed. Both scans must agree.
    const history = collectGitHistory(root)
    if (history.length === 0) return // not a git checkout; nothing to assert
    for (const prefix of CONTENT_EXCLUSIONS) {
      expect(history.filter((h) => h.file.includes(`:${prefix}`))).toEqual([])
    }
    expect(scanFiles(history)).toEqual([])
  })

  it('accounts for every allow-marker in the tree', () => {
    // Opt-outs are legitimate for verbatim regulatory quotation, and each one
    // is listed here so it has to be re-justified when this test is updated.
    const markers = [
      ...new Set(collectAllowMarkers(files).map((m) => `${m.file}#${m.ruleId}`)),
    ].sort()
    expect(markers).toEqual([
      // The one place the cancelled notice may be named, in order to record
      // that it must never be cited by this product.
      'REGULATORY-SOURCES.md#cancelled-notice-citation',
      // The gate's own tests, which have to contain the strings they detect.
      'tests/scrub.test.ts#opinion-complies-with',
      'tests/scrub.test.ts#opinion-satisfies',
    ])
  })
})
