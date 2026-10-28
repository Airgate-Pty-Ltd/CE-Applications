import { useCallback, useEffect, useState } from 'react'
import {
  applyTheme,
  readStoredPreference,
  resolveTheme,
  storePreference,
  type ResolvedTheme,
  type ThemePreference,
} from './theme.ts'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches
}

export interface Theme {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

/**
 * Bind the theme to the document.
 *
 * The system query is subscribed to rather than read once: a user on `system`
 * whose machine flips at sunset should follow it without reloading, and a user
 * who chose `light` explicitly should not move.
 */
export function useTheme(): Theme {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readStoredPreference(typeof window === 'undefined' ? null : window.localStorage),
  )
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia(DARK_QUERY)
    const listener = (event: MediaQueryListEvent): void => setPrefersDark(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  const resolved = resolveTheme(preference, prefersDark)

  useEffect(() => {
    applyTheme(document.documentElement, resolved)
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    storePreference(typeof window === 'undefined' ? null : window.localStorage, next)
  }, [])

  return { preference, resolved, setPreference }
}
