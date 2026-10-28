/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // Legacy data-boundary code still uses `any`; typecheck remains mandatory while those
      // boundaries are migrated incrementally to unknown + validated domain types.
      '@typescript-eslint/no-explicit-any': 'off',
      // Initial async fetches in effects are intentional throughout the existing UI. This
      // React 19 performance advisory is tracked separately from correctness lint failures.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'vendor/**',
    'deploy/dist/**',
    'deploy/installer-windows/app/**',
    'exports/**',
    'coverage/**',
    'next-env.d.ts',
    '_prototypes/**',
  ]),
]);
