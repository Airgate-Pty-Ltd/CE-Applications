import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  applyTheme,
  isThemePreference,
  labelFor,
  readStoredPreference,
  resolveTheme,
  storePreference,
} from '../src/ui/theme/theme.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('theme resolution', () => {
  it('resolves an explicit preference regardless of the machine', () => {
    for (const systemPrefersDark of [true, false]) {
      expect(resolveTheme('light', systemPrefersDark)).toBe('light')
      expect(resolveTheme('dark', systemPrefersDark)).toBe('dark')
    }
  })

  it('follows the machine only when the preference is system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('defaults to following the machine', () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe('system')
  })

  it('offers exactly three preferences, each with a label', () => {
    expect([...THEME_PREFERENCES]).toEqual(['light', 'dark', 'system'])
    for (const preference of THEME_PREFERENCES) {
      expect(labelFor(preference).length).toBeGreaterThan(0)
    }
  })

  it('recognises only the three preferences', () => {
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('nonsense')).toBe(false)
    expect(isThemePreference(null)).toBe(false)
    expect(isThemePreference(undefined)).toBe(false)
  })
})

describe('stored preference', () => {
  it('reads a valid stored value', () => {
    expect(readStoredPreference({ getItem: () => 'dark' })).toBe('dark')
  })

  it('falls back rather than throwing on a value it does not recognise', () => {
    // A bad value in storage is not worth a blank screen.
    expect(readStoredPreference({ getItem: () => 'chartreuse' })).toBe(DEFAULT_THEME_PREFERENCE)
    expect(readStoredPreference({ getItem: () => null })).toBe(DEFAULT_THEME_PREFERENCE)
    expect(readStoredPreference(null)).toBe(DEFAULT_THEME_PREFERENCE)
  })

  it('survives storage that throws outright', () => {
    // Blocked cookies and sandboxed frames both do this.
    const hostile = {
      getItem: () => {
        throw new Error('storage is blocked')
      },
    }
    expect(readStoredPreference(hostile)).toBe(DEFAULT_THEME_PREFERENCE)
    expect(() =>
      storePreference(
        {
          setItem: () => {
            throw new Error('storage is blocked')
          },
        },
        'dark',
      ),
    ).not.toThrow()
  })

  it('writes the preference under the shared key', () => {
    const written: Array<[string, string]> = []
    storePreference({ setItem: (k, v) => written.push([k, v]) }, 'light')
    expect(written).toEqual([[THEME_STORAGE_KEY, 'light']])
  })
})

describe('applying the theme', () => {
  it('adds the class for dark and removes it for light', () => {
    const classes = new Set<string>()
    const root = {
      classList: {
        toggle: (name: string, force: boolean) => (force ? classes.add(name) : classes.delete(name)),
      } as unknown as DOMTokenList,
    }

    applyTheme(root, 'dark')
    expect(classes.has('dark')).toBe(true)
    applyTheme(root, 'light')
    expect(classes.has('dark')).toBe(false)
  })
})

describe('the pre-paint script in index.html', () => {
  // The script is duplicated logic, and duplication that drifts silently is the
  // worst kind. A mismatch here shows up only as a flash of the wrong theme on
  // every load, which is exactly the sort of thing nobody files a bug for.
  const html = readFileSync(resolve(root, 'index.html'), 'utf8')

  it('uses the same storage key as the module', () => {
    expect(html).toContain(THEME_STORAGE_KEY)
  })

  it('knows all three preferences and the system media query', () => {
    for (const preference of THEME_PREFERENCES) {
      expect(html, preference).toContain(`'${preference}'`)
    }
    expect(html).toContain('(prefers-color-scheme: dark)')
  })

  it('toggles the same class name the module writes', () => {
    expect(html).toContain(`classList.toggle('dark'`)
  })

  it('runs before the app module, so the first paint is already correct', () => {
    expect(html.indexOf(THEME_STORAGE_KEY)).toBeLessThan(html.indexOf('/src/main.tsx'))
  })
})

describe('the stylesheet', () => {
  const css = readFileSync(resolve(root, 'src/index.css'), 'utf8')

  const tokens = [
    'surface-base',
    'surface-panel',
    'surface-inset',
    'surface-accent',
    'surface-video',
    'edge',
    'content-primary',
    'content-secondary',
    'content-muted',
    'content-faint',
    'content-ghost',
    'signal-ok',
    'signal-warn',
    'signal-block',
    'signal-info',
  ]

  /**
   * Match the selector at the start of a line followed by an opening brace, so
   * a mention of `.dark` in a comment is not mistaken for the rule itself.
   */
  const block = (selector: string): string => {
    const opener = new RegExp(`^\\s*${selector.replace('.', '\\.')}\\s*\\{`, 'm')
    const match = opener.exec(css)
    expect(match, `${selector} block is missing`).not.toBeNull()
    const open = match!.index + match![0].length
    return css.slice(open, css.indexOf('}', open))
  }

  it('defines every token in both themes', () => {
    // A token defined in one theme and not the other renders as an unstyled
    // element in exactly one mode - the kind of gap that ships because nobody
    // switched themes before merging.
    const light = block(':root')
    const dark = block('.dark')
    for (const name of tokens) {
      expect(light, `light is missing --${name}`).toContain(`--${name}:`)
      expect(dark, `dark is missing --${name}`).toContain(`--${name}:`)
    }
  })

  it('declares color-scheme in both, so form controls and scrollbars follow', () => {
    expect(block(':root')).toContain('color-scheme: light')
    expect(block('.dark')).toContain('color-scheme: dark')
  })

  describe('contrast', () => {
    const readToken = (themeBlock: string, name: string): [number, number, number] => {
      const match = new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`).exec(themeBlock)
      expect(match, `--${name} is missing or not an RGB triplet`).not.toBeNull()
      return [Number(match![1]), Number(match![2]), Number(match![3])]
    }

    const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
      const channel = (value: number): number => {
        const v = value / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }

    const contrast = (a: [number, number, number], b: [number, number, number]): number => {
      const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number]
      return (light + 0.05) / (dark + 0.05)
    }

    const TEXT_TOKENS = ['content-primary', 'content-secondary', 'content-muted', 'content-faint', 'content-ghost']
    const BACKGROUND_TOKENS = ['surface-base', 'surface-panel']

    for (const [themeName, selector] of [
      ['light', ':root'],
      ['dark', '.dark'],
    ] as const) {
      it(`keeps every text token readable on every dominant surface in ${themeName}`, () => {
        // 3:1 rather than 4.5:1 - these tokens carry supporting detail at small
        // sizes, and holding them to body-text contrast would flatten the ramp
        // into a single colour. Anything below 3:1 is not de-emphasised, it is
        // unreadable, which is what this catches.
        const theme = block(selector)
        for (const text of TEXT_TOKENS) {
          for (const background of BACKGROUND_TOKENS) {
            const ratio = contrast(readToken(theme, text), readToken(theme, background))
            expect(ratio, `${themeName}: ${text} on ${background} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
          }
        }
      })

      it(`keeps the text ramp ordered from most to least prominent in ${themeName}`, () => {
        const theme = block(selector)
        const base = readToken(theme, 'surface-base')
        const ratios = TEXT_TOKENS.map((t) => contrast(readToken(theme, t), base))
        for (let i = 1; i < ratios.length; i++) {
          expect(ratios[i]!, `${themeName}: ${TEXT_TOKENS[i]} is not dimmer than ${TEXT_TOKENS[i - 1]}`).toBeLessThan(
            ratios[i - 1]!,
          )
        }
      })
    }
  })
})
