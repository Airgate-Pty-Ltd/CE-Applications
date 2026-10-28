const fs = require('fs/promises');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'config', 'requirement-learning.json');

let storeCache = null;
let writeLock = Promise.resolve();

function normalise(text) {
  return text ? text.toLowerCase().replace(/\s+/g, ' ').trim() : '';
}

async function ensureStore() {
  try {
    await fs.access(STORE_PATH);
  } catch (error) {
    await fs.writeFile(STORE_PATH, JSON.stringify({ patterns: {} }, null, 2), 'utf8');
  }
}

async function loadStore() {
  if (storeCache) return storeCache;
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, 'utf8');
  storeCache = JSON.parse(raw || '{"patterns":{}}');
  if (!storeCache.patterns) {
    storeCache.patterns = {};
  }
  return storeCache;
}

async function persistStore(store) {
  storeCache = store;
  writeLock = writeLock.then(() => fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8'));
  await writeLock;
  return storeCache;
}

async function recordFeedback(text, verified) {
  const normalized = normalise(text);
  if (!normalized) return;
  const store = await loadStore();
  const pattern = store.patterns[normalized] || { count: 0 };
  pattern.count = Math.max(0, (pattern.count || 0) + (verified ? 1 : -1));
  pattern.last_review = new Date().toISOString();
  store.patterns[normalized] = pattern;
  await persistStore(store);
}

async function getLearnedPatterns(minCount = 1) {
  const store = await loadStore();
  return Object.entries(store.patterns)
    .filter(([, data]) => (data.count || 0) >= minCount)
    .map(([pattern]) => pattern);
}

async function getLearnedPatternSet(minCount = 1) {
  const patterns = await getLearnedPatterns(minCount);
  return new Set(patterns);
}

module.exports = {
  recordFeedback,
  getLearnedPatterns,
  getLearnedPatternSet,
  normalise
};
