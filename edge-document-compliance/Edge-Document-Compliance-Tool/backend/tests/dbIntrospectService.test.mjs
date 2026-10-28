import assert from 'node:assert/strict';
import { normalizeArray } from '../src/services/dbIntrospectService.js';

const cases = [
  { input: ['a', 'b'], expected: ['a', 'b'] },
  { input: '{a,b}', expected: ['a', 'b'] },
  { input: '{ "a","b" }', expected: ['a', 'b'] },
  { input: 'a', expected: ['a'] },
  { input: null, expected: [] },
  { input: undefined, expected: [] },
  { input: '', expected: [] },
  { input: 42, expected: [42] },
];

cases.forEach(({ input, expected }, idx) => {
  const actual = normalizeArray(input);
  assert.deepEqual(actual, expected, `Case ${idx + 1} failed for input ${JSON.stringify(input)}`);
});

console.log('normalizeArray tests passed');


