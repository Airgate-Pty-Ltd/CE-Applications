// Without this file Tailwind never runs and the app renders completely
// unstyled — tailwind.config.ts alone is not enough.

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
