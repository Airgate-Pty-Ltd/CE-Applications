# Tests

`smoke.test.js` is a minimal Node `node:test` smoke suite (snapshot hashing
determinism, condition evaluator correctness, and one real end-to-end
event -> System-Detected Condition -> response flow against an in-memory
SQLite DB). It is NOT the AT-01..16 acceptance suite.

The full AT-01..16 suite (see
`skills/mai-kernel-integration/references/acceptance-tests.md`) is intended
to be authored as a follow-up pass, run against this same DB/adapter/kernel
wiring (`src/adapter/aims-adapter.js`). Each AT should hit the real Express
routes / DB rows, not kernel memory, per the skill's evidence rules.

Run what exists today with:

```
npm test
```
