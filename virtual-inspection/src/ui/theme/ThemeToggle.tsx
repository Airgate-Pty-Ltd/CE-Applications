import { THEME_PREFERENCES, labelFor } from './theme.ts'
import { useTheme } from './useTheme.ts'

/**
 * Light / Dark / System, as a segmented control.
 *
 * Three options rather than a two-state switch, because "follow my machine" is
 * a distinct answer from "light", and collapsing them loses the ability to say
 * it. The resolved theme is named next to the control when `System` is active,
 * so the control never leaves the user guessing what it actually did.
 */
export function ThemeToggle({ className = '' }: { className?: string }): JSX.Element {
  const { preference, resolved, setPreference } = useTheme()

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className="inline-flex overflow-hidden rounded border border-edge"
        role="group"
        aria-label="Colour theme"
      >
        {THEME_PREFERENCES.map((option) => {
          const active = option === preference
          return (
            <button
              key={option}
              type="button"
              onClick={() => setPreference(option)}
              aria-pressed={active}
              className={`px-2 py-1 text-xs transition ${
                active
                  ? 'bg-signal-info/20 text-content-primary'
                  : 'bg-surface-panel text-content-muted hover:bg-surface-inset'
              }`}
            >
              {labelFor(option)}
            </button>
          )
        })}
      </div>
      {preference === 'system' ? (
        <span className="text-[11px] text-content-faint">following your machine — {resolved}</span>
      ) : null}
    </div>
  )
}
