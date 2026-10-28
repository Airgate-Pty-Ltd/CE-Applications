module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // All suites share one SQLite file (dev.db). SQLite has limited concurrent-writer
  // support — running suites across parallel Jest worker processes causes intermittent
  // "database is locked" failures under load (observed directly: ~1 spurious failure per
  // few full-suite runs, always resolved by rerunning). Forcing serial execution trades a
  // few seconds of wall-clock time for deterministic results, which matters more for a
  // suite whose entire purpose is being trustworthy evidence. See DECISIONS.md D-023.
  maxWorkers: 1,
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
    }],
    // @mai/kernel ships ESM-only (no CJS build). npm links the verified internal vendor
    // runtime package into node_modules, and Jest resolves that link to its real vendor path
    // before selecting a transform. Transpile only the verified source/runtime built surfaces.
    'vendor[/\\\\]m-ai-kernel[/\\\\].+[/\\\\](?:kernel|runtime)[/\\\\]dist[/\\\\].+\\.js$': ['babel-jest', {
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    }],
  },
};
