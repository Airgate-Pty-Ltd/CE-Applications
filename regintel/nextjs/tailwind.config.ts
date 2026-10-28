import type { Config } from 'tailwindcss';

// Colours are driven by CSS custom properties defined in app/globals.css.
// Because the tokens themselves swap under `prefers-color-scheme: dark`, the
// same utility class (e.g. `bg-surface`) renders correctly in both themes with
// no `dark:` variants needed.
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces & neutrals
        canvas: 'var(--canvas)',
        surface: { DEFAULT: 'var(--surface)', '2': 'var(--surface-2)' },
        line: { DEFAULT: 'var(--line)', strong: 'var(--line-strong)' },
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',

        // Brand
        rail: { DEFAULT: 'var(--rail)', ink: 'var(--rail-ink)', dim: 'var(--rail-dim)' },
        brand: 'var(--brand)',
        accent: { DEFAULT: 'var(--accent)', soft: 'var(--accent-soft)', ink: 'var(--accent-ink)' },

        // Kept for backwards-compatibility with any arbitrary-value usage
        navy: { DEFAULT: '#1a2744', light: '#243358', dark: '#0f1830' },
        steel: { DEFAULT: 'var(--steel)', light: '#6b8fc5', dark: '#2e4f80' },

        // Semantic severity — separate from the accent hue
        crit: { bg: 'var(--crit-bg)', line: 'var(--crit-line)', ink: 'var(--crit-ink)' },
        high: { bg: 'var(--high-bg)', line: 'var(--high-line)', ink: 'var(--high-ink)' },
        norm: { bg: 'var(--norm-bg)', line: 'var(--norm-line)', ink: 'var(--norm-ink)' },
        low: { bg: 'var(--low-bg)', line: 'var(--low-line)', ink: 'var(--low-ink)' },
        good: { bg: 'var(--good-bg)', line: 'var(--good-line)', ink: 'var(--good-ink)' },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
          '"Helvetica Neue"', 'Arial', 'sans-serif',
        ],
        mono: ['"SF Mono"', 'ui-monospace', '"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,23,41,.04), 0 1px 3px rgba(16,23,41,.06)',
        lift: '0 6px 16px rgba(16,23,41,.10), 0 2px 6px rgba(16,23,41,.06)',
      },
    },
  },
  plugins: [],
};

export default config;
