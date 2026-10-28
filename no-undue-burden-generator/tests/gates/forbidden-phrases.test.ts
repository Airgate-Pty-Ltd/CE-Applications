/**
 * THE REGULATORY CLAIM GATE.
 *
 * This software prepares a submission to a federal regulator. It cannot know
 * whether that submission will be accepted, and any string that implies
 * otherwise moves the applicant's regulatory risk onto us. The FAA managing
 * office makes the finding. This product formats the paperwork and reports what
 * is missing.
 *
 * Same two-part structure as the scrub gate: prove the detector works against
 * planted phrases, then assert the repository is clean. This file lives under
 * tests/gates, which FORBIDDEN_IGNORE excludes, so the planted phrases below
 * cannot trip the gate they verify.
 */

import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  FORBIDDEN_PHRASES,
  FORBIDDEN_IGNORE,
  ALLOWED_STATUS_BANNERS,
} from '../../scripts/forbidden-phrases.ts'
import { collectFiles, scanFiles, formatHits, type Rule } from '../../scripts/scan.ts'

const REPO_ROOT = resolve(import.meta.dirname, '../..')

const RULES: Rule[] = FORBIDDEN_PHRASES.map((p) => ({
  id: p.id,
  pattern: p.pattern,
  detail: p.why,
  remedy: p.instead,
}))

/** One planted phrase per rule id. Every rule must be exercised. */
const PLANTED_CLAIMS: Record<string, string> = {
  'ready-for-submission': 'Your package is ready for FAA submission.',
  'submission-ready': 'Generates a submission-ready filing package.',
  'cleared-for-submission': 'This plan is cleared for submission.',
  'guarantees-approval': 'Our engine guarantees FAA approval.',
  'will-be-approved': 'Your facility will be approved by the FAA.',
  'faa-compliant-package': 'Produces a package fully compliant with AC 21-55.',
}

describe('claim gate: proof of detection', () => {
  it('has a planted phrase for every declared rule', () => {
    const declared = FORBIDDEN_PHRASES.map((p) => p.id).sort()
    const covered = Object.keys(PLANTED_CLAIMS).sort()
    expect(covered).toEqual(declared)
  })

  for (const [ruleId, sample] of Object.entries(PLANTED_CLAIMS)) {
    it(`catches a planted claim of [${ruleId}]`, () => {
      const dir = mkdtempSync(join(tmpdir(), 'nub-claim-'))
      try {
        writeFileSync(join(dir, 'copy.ts'), `export const marketing = ${JSON.stringify(sample)}\n`)
        const hits = scanFiles(dir, collectFiles(dir, []), RULES, [])
        expect(
          hits.map((h) => h.ruleId),
          `rule [${ruleId}] failed to match its own planted phrase — the gate is not working`,
        ).toContain(ruleId)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  }

  it('does not flag the legitimate regulatory language it sits next to', () => {
    // The gate has to survive contact with the domain. AC 21-55 is cited
    // constantly in this product; only claims *about acceptance* are forbidden.
    const dir = mkdtempSync(join(tmpdir(), 'nub-claim-ok-'))
    try {
      const legitimate = [
        'Follows the AC 21-55 Appendix A section order.',
        'The FAA managing office makes the final determination.',
        'Approved design data is held by the type certificate holder.',
        'FAA-approved design data must be available at the facility.',
        'Notify the FAA under 14 CFR 21.309 before the change takes effect.',
        'DRAFT — INTERNAL REVIEW ONLY',
        'DRAFTED WITH GAPS',
        'BLOCKED',
      ].join('\n')
      writeFileSync(join(dir, 'legit.md'), legitimate)
      const hits = scanFiles(dir, collectFiles(dir, []), RULES, [])
      expect(
        hits,
        `the gate flagged legitimate regulatory language:\n\n${formatHits(hits)}\n`,
      ).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('claim gate: the repository makes no submission claims', () => {
  it('is clean across source, scripts, tests and docs', () => {
    const roots = ['src', 'scripts', 'tests', 'docs', '.github']
      .map((d) => join(REPO_ROOT, d))
      .filter((d) => existsSync(d))
    const files = roots.flatMap((r) => collectFiles(r, FORBIDDEN_IGNORE, REPO_ROOT))
    const hits = scanFiles(REPO_ROOT, files, RULES, [])
    expect(hits, `forbidden regulatory claims found:\n\n${formatHits(hits)}\n`).toEqual([])
  })

  it('is clean in the repository-root documentation', () => {
    // README and the handover files are where marketing language creeps in.
    const rootDocs = ['README.md', 'DESIGN-NOTES.md', 'TEST-PLAN.md', 'HANDOVER-TO-MIKE.md', 'REGULATORY-SOURCES.md']
      .map((f) => join(REPO_ROOT, f))
      .filter((f) => existsSync(f))
    const hits = scanFiles(REPO_ROOT, rootDocs, RULES, [])
    expect(hits, `forbidden regulatory claims in root docs:\n\n${formatHits(hits)}\n`).toEqual([])
  })

  it('is clean in the emitted bundle', () => {
    const dist = join(REPO_ROOT, 'dist')

    if (!existsSync(dist)) {
      expect(
        process.env.CI,
        'dist/ is missing in CI — the bundle was never scanned. Run the build before the gate.',
      ).toBeFalsy()
      return
    }

    const hits = scanFiles(REPO_ROOT, collectFiles(dist, FORBIDDEN_IGNORE, REPO_ROOT), RULES, [])
    expect(hits, `forbidden regulatory claims in the shipped bundle:\n\n${formatHits(hits)}\n`).toEqual([])
  })
})

describe('claim gate: status banners are a closed set', () => {
  it('permits exactly three values', () => {
    expect([...ALLOWED_STATUS_BANNERS]).toEqual([
      'DRAFT — INTERNAL REVIEW ONLY',
      'DRAFTED WITH GAPS',
      'BLOCKED',
    ])
  })

  it('uses an em dash in the draft banner, not a hyphen', () => {
    // Encoding regressions turn the em dash into a hyphen or a mojibake pair,
    // which changes a banner the FAA reader sees on every page.
    expect(ALLOWED_STATUS_BANNERS[0]).toContain('—')
  })
})
