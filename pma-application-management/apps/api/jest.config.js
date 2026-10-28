/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 30000,
  // Acceptance tests talk to a real Postgres; run them serially for clarity.
  maxWorkers: 1,
};
