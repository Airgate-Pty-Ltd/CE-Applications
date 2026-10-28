'use strict';

const { createRecordRouter } = require('./record-router-factory');

const FIELDS = [
  { db: 'person_name', api: 'personName', required: true },
  { db: 'role', api: 'role' },
  { db: 'last_review_date', api: 'lastReviewDate', required: true },
  // competence_review_due_date is fully system-computed (Bug 2 / FSA G3 fix,
  // 2026-07-12): last_review_date + 365 days, always. `computed: true` means
  // a client-supplied competenceReviewDueDate in the request body is
  // silently ignored (record-router-factory.js apiBodyToDb) — deriveOnWrite
  // below is the ONLY thing that ever sets this column, on both create and
  // update, so the UI can only ever display it, never edit it directly.
  { db: 'competence_review_due_date', api: 'competenceReviewDueDate', computed: true },
  { db: 'status', api: 'status' }
];

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// competence_review_due_date = last_review_date + 365 days, recomputed
// unconditionally on every write (create AND update) so the field can never
// drift out of sync with last_review_date, per the build spec.
function deriveOnWrite(record) {
  if (record.last_review_date) {
    const due = new Date(new Date(record.last_review_date).getTime() + ONE_YEAR_MS);
    return { competence_review_due_date: due.toISOString().slice(0, 10) };
  }
  return {};
}

module.exports = ({ db, integration }) => createRecordRouter({
  db, integration, table: 'competence_records', recordType: 'competence', fields: FIELDS, deriveOnWrite
});
