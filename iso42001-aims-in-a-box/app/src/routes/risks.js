'use strict';

const { createRecordRouter } = require('./record-router-factory');

const FIELDS = [
  { db: 'risk_ref', api: 'riskRef', required: true },
  { db: 'description', api: 'description', required: true },
  { db: 'likelihood', api: 'likelihood' },
  { db: 'impact', api: 'impact' },
  // `score` is fully system-computed (Bug 2 / FSA G3 fix, 2026-07-12): the
  // user only ever enters likelihood and impact; `computed: true` (see
  // record-router-factory.js apiBodyToDb) means a client-supplied `score`
  // value in the request body is silently ignored on both POST and PUT —
  // deriveOnWrite below is the ONLY thing that ever sets this column.
  { db: 'score', api: 'score', computed: true },
  { db: 'owner', api: 'owner' },
  { db: 'status', api: 'status' }
];

// score = likelihood x impact, recomputed unconditionally on every write
// whenever both inputs are present (deterministic, no LLM, no user override).
function deriveOnWrite(record) {
  if (record.likelihood !== undefined && record.likelihood !== null
      && record.impact !== undefined && record.impact !== null) {
    return { score: Number(record.likelihood) * Number(record.impact) };
  }
  return {};
}

module.exports = ({ db, integration }) => createRecordRouter({
  db, integration, table: 'risk_register', recordType: 'risk', fields: FIELDS, deriveOnWrite
});
