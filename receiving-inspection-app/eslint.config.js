import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        __TEST_DASHBOARD__: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    /* The engine decides inspection paths and dispositions. It is pure by
       contract: no I/O, no clock, no randomness. A determination that varies
       between two runs of the same input is not a determination. */
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'The engine is pure. Pass time in as an argument.' },
        { name: 'fetch', message: 'The engine performs no I/O.' },
        { name: 'localStorage', message: 'The engine performs no I/O.' },
        { name: 'indexedDB', message: 'The engine performs no I/O.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'The engine is deterministic.' },
        { object: 'Date', property: 'now', message: 'Pass time in as an argument.' },
      ],
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'e2e/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  }
);
