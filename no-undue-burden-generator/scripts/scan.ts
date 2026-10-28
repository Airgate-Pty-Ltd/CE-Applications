/**
 * Shared file walker for the CI gates.
 *
 * Scans two surfaces:
 *   - the source tree, which is what lands in git history and can never be undone
 *   - the emitted bundle in dist/, which is what actually reaches a customer
 *
 * A value can leak into the bundle without appearing in src (a dependency, a
 * generated asset, an inlined JSON fixture), so checking only src would miss it.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

export interface Hit {
  readonly file: string
  readonly line: number
  readonly column: number
  readonly match: string
  readonly ruleId: string
  readonly detail: string
  readonly remedy: string
}

/** Extensions worth reading. Binary assets are skipped. */
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.html', '.css', '.txt', '.yml', '.yaml', '.svg',
])

function hasTextExtension(path: string): boolean {
  const dot = path.lastIndexOf('.')
  return dot !== -1 && TEXT_EXTENSIONS.has(path.slice(dot).toLowerCase())
}

function isIgnored(relPath: string, ignore: readonly string[]): boolean {
  const normalised = relPath.split(sep).join('/')
  return ignore.some(
    (entry) => normalised === entry || normalised.startsWith(`${entry}/`),
  )
}

/**
 * Walk `startDir`, returning readable text files.
 *
 * `ignore` entries are matched against paths relative to `relativeTo`, which
 * defaults to `startDir`. Pass the repository root as `relativeTo` whenever the
 * ignore list is written in repo-relative terms — otherwise scanning
 * `<repo>/tests` produces `gates/scrub.test.ts`, which will never match an
 * ignore entry of `tests/gates`, and the gate silently scans its own fixtures.
 */
export function collectFiles(
  startDir: string,
  ignore: readonly string[],
  relativeTo: string = startDir,
): string[] {
  const found: string[] = []

  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry)
      if (isIgnored(relative(relativeTo, abs), ignore)) continue

      if (statSync(abs).isDirectory()) {
        walk(abs)
      } else if (hasTextExtension(abs)) {
        found.push(abs)
      }
    }
  }

  if (!existsSync(startDir)) return found
  walk(startDir)
  return found
}

export interface Rule {
  readonly id: string
  readonly pattern: RegExp
  readonly detail: string
  readonly remedy: string
  /**
   * Matches that are reserved by a public standard for fictional use and so
   * cannot correspond to anything real. See ScrubPattern.exempt — this is not a
   * general-purpose escape hatch.
   */
  readonly exempt?: RegExp
}

export function scanFiles(
  root: string,
  files: readonly string[],
  rules: readonly Rule[],
  allowlist: readonly string[] = [],
): Hit[] {
  const hits: Hit[] = []

  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const lines = content.split(/\r?\n/)

    for (const rule of rules) {
      lines.forEach((lineText, index) => {
        // Reset lastIndex: the patterns are global and are reused across files.
        rule.pattern.lastIndex = 0
        let match: RegExpExecArray | null
        while ((match = rule.pattern.exec(lineText)) !== null) {
          if (match[0].length === 0) {
            rule.pattern.lastIndex += 1
            continue
          }
          if (allowlist.includes(match[0])) continue
          if (rule.exempt?.test(match[0])) continue
          hits.push({
            file: relative(root, file).split(sep).join('/'),
            line: index + 1,
            column: match.index + 1,
            match: match[0],
            ruleId: rule.id,
            detail: rule.detail,
            remedy: rule.remedy,
          })
        }
      })
    }
  }

  return hits
}

export function formatHits(hits: readonly Hit[]): string {
  return hits
    .map(
      (h) =>
        `  ${h.file}:${h.line}:${h.column}\n` +
        `    matched [${h.ruleId}] "${h.match}"\n` +
        `    ${h.detail}\n` +
        `    remedy: ${h.remedy}`,
    )
    .join('\n\n')
}
