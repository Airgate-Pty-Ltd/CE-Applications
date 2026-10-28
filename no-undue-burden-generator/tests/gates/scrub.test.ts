/**
 * THE SCRUB GATE — the most important test in this repository.
 *
 * The logic this product derives from was written for a single employer and was
 * full of that employer's controlled data. None of it may reach this repository,
 * because a commit is permanent: an edit removes a string from the working tree
 * but not from history, and history ships with the repo to any future acquirer.
 *
 * This file is deliberately structured in two halves:
 *
 *   1. PROOF OF DETECTION — synthetic values, engineered to match each pattern,
 *      are written to a temp directory and must be caught. Without this half, a
 *      broken regex would leave the gate permanently and silently green.
 *   2. THE GATE — the real scan over src/ and dist/, which must be clean.
 *
 * The synthetic values below are fictional by construction: PQ0000ZZ is not a
 * valid PMA number, 555-01xx is the reserved fictional US telephone range, and
 * .invalid is a reserved non-resolvable TLD (RFC 2606). This file lives under
 * tests/gates, which SCRUB_IGNORE excludes, so these values cannot trip the gate
 * they exist to verify.
 */

import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { SCRUB_PATTERNS, ALLOWLIST, SCRUB_IGNORE } from '../../scripts/scrub-patterns.ts'
import { collectFiles, scanFiles, formatHits, type Rule } from '../../scripts/scan.ts'

const REPO_ROOT = resolve(import.meta.dirname, '../..')

const RULES: Rule[] = SCRUB_PATTERNS.map((p) => ({
  id: p.id,
  pattern: p.pattern,
  detail: p.describes,
  remedy: p.remedy,
  ...(p.exempt === undefined ? {} : { exempt: p.exempt }),
}))

const ALLOWED = ALLOWLIST.map((a) => a.value)

/**
 * One synthetic value per pattern id. Every pattern must be exercised.
 *
 * These deliberately sit OUTSIDE the reserved-for-fiction ranges, because a
 * value inside those ranges is exempt by design and would prove nothing. They
 * are invented, and they live under tests/gates which the gate excludes.
 */
const SYNTHETIC_VIOLATIONS: Record<string, string> = {
  'pma-number': 'const pma = "PQ0000ZZ"',
  'internal-doc-number': 'see procedure ZZ-999-99 for handling',
  'email-address': 'contact: q.public@notarealdomain.co',
  'us-phone-number': 'phone: 555-555-9999',
  'us-street-address': 'facility at 123 Fabrication Road',
}

/**
 * Values reserved by a public standard for fictional use. The fixtures need a
 * phone number and an address to populate Appendix A's header, and these ranges
 * are how that happens without shipping anyone's real contact details.
 */
const RESERVED_FICTIONAL_VALUES: Record<string, string> = {
  'email-address': 'contact: quality@example.invalid',
  'us-phone-number': 'phone: 555-555-0142',
  'us-street-address': 'facility at 1200 Example Parkway',
}

describe('scrub gate: proof of detection', () => {
  it('has a synthetic violation for every declared pattern', () => {
    // If a pattern is added without a synthetic case, it ships unverified.
    const declared = SCRUB_PATTERNS.map((p) => p.id).sort()
    const covered = Object.keys(SYNTHETIC_VIOLATIONS).sort()
    expect(covered).toEqual(declared)
  })

  for (const [ruleId, sample] of Object.entries(SYNTHETIC_VIOLATIONS)) {
    it(`catches a planted violation of [${ruleId}]`, () => {
      const dir = mkdtempSync(join(tmpdir(), 'nub-scrub-'))
      try {
        writeFileSync(join(dir, 'planted.ts'), `// planted for gate verification\n${sample}\n`)
        const hits = scanFiles(dir, collectFiles(dir, []), RULES, ALLOWED)
        expect(
          hits.map((h) => h.ruleId),
          `pattern [${ruleId}] failed to match its own synthetic case — the gate is not working`,
        ).toContain(ruleId)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  }

  it('reads real files rather than reporting an empty walk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nub-scrub-walk-'))
    try {
      writeFileSync(join(dir, 'a.ts'), 'export const clean = true\n')
      writeFileSync(join(dir, 'b.md'), '# clean\n')
      expect(collectFiles(dir, []).length).toBe(2)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  for (const [ruleId, sample] of Object.entries(RESERVED_FICTIONAL_VALUES)) {
    it(`exempts the reserved fictional range for [${ruleId}]`, () => {
      const dir = mkdtempSync(join(tmpdir(), 'nub-scrub-reserved-'))
      try {
        writeFileSync(join(dir, 'fixture.ts'), `${sample}\n`)
        const hits = scanFiles(dir, collectFiles(dir, []), RULES, ALLOWED)
        expect(
          hits.map((h) => h.ruleId),
          `[${ruleId}] flagged a standards-reserved fictional value — fixtures cannot be written`,
        ).not.toContain(ruleId)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  }

  it('still catches a real-looking value in a rule that has an exemption', () => {
    // The exemptions must be narrow. A phone number outside the reserved 555-01xx
    // block has to keep tripping the gate, or the exemption has swallowed the rule.
    const dir = mkdtempSync(join(tmpdir(), 'nub-scrub-narrow-'))
    try {
      writeFileSync(join(dir, 'leak.ts'), 'phone: 555-555-0200\naddress: 400 Industrial Boulevard\n')
      const ids = scanFiles(dir, collectFiles(dir, []), RULES, ALLOWED).map((h) => h.ruleId)
      expect(ids).toContain('us-phone-number')
      expect(ids).toContain('us-street-address')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('resolves ignore entries against the repository root, not the scan root', () => {
    // Regression: the ignore list is written repo-relative ("tests/gates"), but
    // the walk starts at <repo>/tests, which yields "gates/...". Without the
    // relativeTo argument the exclusion never matches and the gate scans its own
    // planted fixtures — which is exactly how this bug first surfaced.
    const found = collectFiles(join(REPO_ROOT, 'tests'), SCRUB_IGNORE, REPO_ROOT)
    expect(found.filter((f) => f.includes('gates'))).toEqual([])
  })
})

describe('scrub gate: the repository is clean', () => {
  it('finds no proprietary content in the source tree', () => {
    const src = join(REPO_ROOT, 'src')
    const hits = scanFiles(REPO_ROOT, collectFiles(src, SCRUB_IGNORE, REPO_ROOT), RULES, ALLOWED)
    expect(hits, `proprietary content in source:\n\n${formatHits(hits)}\n`).toEqual([])
  })

  it('finds no proprietary content in scripts, tests or docs', () => {
    const roots = ['scripts', 'tests', 'docs', '.github']
      .map((d) => join(REPO_ROOT, d))
      .filter((d) => existsSync(d))
    const files = roots.flatMap((r) => collectFiles(r, SCRUB_IGNORE, REPO_ROOT))
    const hits = scanFiles(REPO_ROOT, files, RULES, ALLOWED)
    expect(hits, `proprietary content outside src:\n\n${formatHits(hits)}\n`).toEqual([])
  })

  it('finds no proprietary content in the emitted bundle', () => {
    const dist = join(REPO_ROOT, 'dist')

    if (!existsSync(dist)) {
      // In CI the bundle is always built before the gate runs. A missing dist
      // there means the gate checked nothing, which must fail rather than skip.
      expect(
        process.env.CI,
        'dist/ is missing in CI — the bundle was never scanned. Run the build before the gate.',
      ).toBeFalsy()
      return
    }

    const hits = scanFiles(REPO_ROOT, collectFiles(dist, SCRUB_IGNORE, REPO_ROOT), RULES, ALLOWED)
    expect(hits, `proprietary content in the shipped bundle:\n\n${formatHits(hits)}\n`).toEqual([])
  })
})

describe('scrub gate: the allowlist stays closed', () => {
  it('carries a written justification for every entry', () => {
    for (const entry of ALLOWLIST) {
      expect(
        entry.why.trim().length,
        `allowlist entry "${entry.value}" has no justification`,
      ).toBeGreaterThan(20)
    }
  })

  it('has not quietly grown', () => {
    // An allowlist entry is a permanent hole in this gate. Raising this number
    // is a deliberate act that should be argued for in the pull request.
    expect(ALLOWLIST.length).toBeLessThanOrEqual(0)
  })
})
