import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { execFileSync } from 'node:child_process'
import type { DenylistEntry, ScanInput } from './types.ts'

/** Directories the gate never reads. */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-ssr', 'coverage', '.vite'])

/**
 * The only content exclusion in the gate.
 *
 * These fixtures exist to prove the detectors fire. They contain synthetic
 * strings shaped like real identifiers, so scanning them would guarantee a
 * finding on every run. The exclusion is asserted by a test, so it cannot be
 * quietly widened into a hiding place.
 */
export const CONTENT_EXCLUSIONS = ['tests/fixtures/scrub']

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz',
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.mkv', '.wav', '.mp3',
])

const MAX_BYTES = 2_000_000

/** Record separator for git log output, and the binary-content sentinel. */
const NUL = String.fromCharCode(0)

function isExcluded(relPath: string): boolean {
  return CONTENT_EXCLUSIONS.some((prefix) => relPath === prefix || relPath.startsWith(`${prefix}/`))
}

export function collectRepoFiles(root: string): ScanInput[] {
  const out: ScanInput[] = []

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        walk(join(dir, entry.name))
        continue
      }
      const abs = join(dir, entry.name)
      const rel = relative(root, abs).split(sep).join('/')
      if (isExcluded(rel)) continue
      const dot = entry.name.lastIndexOf('.')
      if (dot >= 0 && BINARY_EXT.has(entry.name.slice(dot).toLowerCase())) continue
      if (statSync(abs).size > MAX_BYTES) continue
      const text = readFileSync(abs, 'utf8')
      if (text.includes(NUL)) continue // binary content the extension list did not catch
      out.push({ file: rel, text })
    }
  }

  walk(root)
  return out.sort((a, b) => a.file.localeCompare(b.file))
}

/**
 * Added and removed lines from every commit reachable in this repository.
 *
 * Only patch content is scanned. Commit metadata - author name, author email,
 * committer identity - is git plumbing rather than product content, and the
 * owner's own identity in that metadata is expected there. HANDOVER.md records
 * the decision that has to be made about commit identity before the repository
 * changes hands.
 */
export function collectGitHistory(root: string): ScanInput[] {
  if (!existsSync(join(root, '.git'))) return []
  const raw = execFileSync(
    'git',
    ['log', '--all', '--patch', '--no-color', '--format=%x00commit %H'],
    { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  )

  const inputs: ScanInput[] = []
  for (const chunk of raw.split(NUL).slice(1)) {
    const newline = chunk.indexOf('\n')
    const header = newline === -1 ? chunk : chunk.slice(0, newline)
    const body = newline === -1 ? '' : chunk.slice(newline + 1)
    const sha = header.replace('commit ', '').trim().slice(0, 12)

    // Track which file each hunk belongs to. Flattening a commit into one blob
    // loses that, and with it the ability to honour the fixture exclusion - so
    // the gate would flag its own test fixtures the moment they were committed.
    const perFile = new Map<string, string[]>()
    let current: string | null = null

    for (const line of body.split('\n')) {
      const diffHeader = /^diff --git a\/(.+?) b\/(.+)$/.exec(line)
      if (diffHeader) {
        const path = diffHeader[2] ?? diffHeader[1] ?? ''
        current = isExcluded(path) ? null : path
        continue
      }
      if (current === null) continue
      if (line.startsWith('+++') || line.startsWith('---')) continue
      if (!line.startsWith('+') && !line.startsWith('-')) continue
      const existing = perFile.get(current)
      if (existing) existing.push(line.slice(1))
      else perFile.set(current, [line.slice(1)])
    }

    for (const [path, lines] of perFile) {
      const text = lines.join('\n')
      if (text.trim().length > 0) inputs.push({ file: `git-history:${sha}:${path}`, text })
    }
  }
  return inputs
}

/**
 * The owner-held denylist. Never committed; see .gitignore and DESIGN-NOTES.md.
 * Format: one term per line, optional "category: term", "#" starts a comment.
 */
export function loadDenylist(root: string): { entries: DenylistEntry[]; source: string | null } {
  const candidates = [
    process.env['SCRUB_DENYLIST'],
    join(root, 'tools', 'scrub', 'denylist.local.txt'),
  ].filter((p): p is string => typeof p === 'string' && p.length > 0)

  for (const path of candidates) {
    if (!existsSync(path)) continue
    const entries: DenylistEntry[] = []
    for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const line = rawLine.replace(/#.*$/, '').trim()
      if (line.length === 0) continue
      const colon = line.indexOf(':')
      const category = colon === -1 ? 'unclassified' : line.slice(0, colon).trim()
      const term = colon === -1 ? line : line.slice(colon + 1).trim()
      if (term.length >= 3) entries.push({ category, term })
    }
    return { entries, source: path }
  }
  return { entries: [], source: null }
}
