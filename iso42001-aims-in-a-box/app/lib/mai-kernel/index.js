/**
 * M-AI Kernel Main Export (lib/mai-kernel/index.js)
 *
 * Deterministic rules-only assessment kernel, self-contained inside this
 * product (copied, not required as an unpublished npm package — see
 * BUILD-NOTES in ../../README.md).
 */

const MaiKernel = require('./lib/kernel');
const Snapshot = require('./lib/snapshot');
const ConditionEvaluator = require('./lib/condition-evaluator');
const ManifestLoader = require('./lib/manifest-loader');
const Validators = require('./lib/validators');
const AdapterContract = require('./adapters/adapter-contract');
const SqliteAdapter = require('./adapters/sqlite-adapter');

module.exports = {
  MaiKernel,
  Snapshot,
  ConditionEvaluator,
  ManifestLoader,
  Validators,
  AdapterContract,
  SqliteAdapter
};
