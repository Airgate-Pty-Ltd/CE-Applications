/**
 * Theme resolution.
 *
 * Pure, and kept apart from the React binding so it can be tested without a
 * DOM. Three preferences, two outcomes: `system` is a preference, not a theme,
 * and the distinction matters because a user who chose `system` should follow
 * their machine when it changes, while a user who chose `light` should not.
 */

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system']

/**
 * Also read by the inline script in index.html that applies the theme before
 * first paint. A test asserts the two agree, because a silent drift here shows
 * up as a flash of the wrong theme on every load and nowhere else.
 */
export const THEME_STORAGE_KEY = 'remote-inspection.theme'

/** Default until the user says otherwise: follow the machine. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

/** Anything unrecognised falls back rather than throwing. A bad value in storage is not worth a blank screen. */
export function readStoredPreference(storage: Pick<Storage, 'getItem'> | null): ThemePreference {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE
  } catch {
    // Storage can throw outright when cookies are blocked or the page is
    // sandboxed. A theme preference is not worth taking the app down for.
    return DEFAULT_THEME_PREFERENCE
  }
}

export function storePreference(storage: Pick<Storage, 'setItem'> | null, preference: ThemePreference): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // As above: the preference simply will not survive a reload.
  }
}

/** The single place the class is written. Tailwind's darkMode is 'class'. */
export function applyTheme(root: { classList: DOMTokenList }, resolved: ResolvedTheme): void {
  root.classList.toggle('dark', resolved === 'dark')
}

export function labelFor(preference: ThemePreference): string {
  return preference === 'system' ? 'System' : preference === 'dark' ? 'Dark' : 'Light'
}
