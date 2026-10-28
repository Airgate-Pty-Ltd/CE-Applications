'use strict';

const { createRecordRouter } = require('./record-router-factory');

const FIELDS = [
  { db: 'ncr_ref', api: 'ncrRef', required: true },
  { db: 'description', api: 'description', required: true },
  { db: 'corrective_action', api: 'correctiveAction' },
  { db: 'due_date', api: 'dueDate' },
  { db: 'status', api: 'status' },
  { db: 'linked_finding_id', api: 'linkedFindingId' }
];

module.exports = ({ db, integration }) => createRecordRouter({
  db, integration, table: 'ncr_entries', recordType: 'ncr', fields: FIELDS
});
