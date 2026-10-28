import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';

const sourceGlobs = ['app/**/*.ts', 'app/**/*.tsx', 'lib/**/*.ts', 'components/**/*.tsx'];

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    name: 'ignore-build-artifacts',
    ignores: ['.next/**', 'node_modules/**', 'dist/**'],
  },
  {
    name: 'typescript/base',
    files: sourceGlobs,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    name: 'typescript/recommended',
    files: sourceGlobs,
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  {
    name: 'next/core-web-vitals',
    files: sourceGlobs,
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];

export default eslintConfig;
