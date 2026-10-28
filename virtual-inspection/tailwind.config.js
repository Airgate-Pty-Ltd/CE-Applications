import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Content globs are resolved against the process working directory, not against
// this file. Anchoring them to the config's own location keeps the build correct
// when the dev server is launched from somewhere other than the project root.
const here = dirname(fileURLToPath(import.meta.url))

/**
 * Colours are semantic tokens backed by CSS custom properties, not fixed
 * values. Both themes define the same token set in src/index.css, so a
 * component never states which theme it is in - `bg-surface-panel` is correct
 * on a shop floor at midday and at a desk at night.
 *
 * The alternative - redefining Tailwind's own `slate` scale so the built-in
 * class names flip - would have been a smaller diff and a worse repository:
 * nobody reading `text-slate-200` later would expect it to render near-black.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: [join(here, 'index.html'), join(here, 'src/**/*.{ts,tsx}')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          base: token('surface-base'),
          panel: token('surface-panel'),
          inset: token('surface-inset'),
          accent: token('surface-accent'),
          // The video well stays dark in both themes. A bright surround changes
          // how an inspector reads what is on the stream, and the stream is the
          // thing being judged.
          video: token('surface-video'),
        },
        edge: token('edge'),
        content: {
          primary: token('content-primary'),
          secondary: token('content-secondary'),
          muted: token('content-muted'),
          faint: token('content-faint'),
          ghost: token('content-ghost'),
        },
        signal: {
          ok: token('signal-ok'),
          warn: token('signal-warn'),
          block: token('signal-block'),
          info: token('signal-info'),
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
