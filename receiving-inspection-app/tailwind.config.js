/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      minHeight: {
        touch: 'var(--touch-target-min)',
      },
      minWidth: {
        touch: 'var(--touch-target-min)',
      },
    },
  },
  plugins: [],
};
