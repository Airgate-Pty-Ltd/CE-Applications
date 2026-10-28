'use strict';

const { createRecordRouter } = require('./record-router-factory');

const FIELDS = [
  { db: 'control_ref', api: 'controlRef', required: true },
  { db: 'control_title', api: 'controlTitle', required: true },
  { db: 'applicability', api: 'applicability', required: true },
  { db: 'justification', api: 'justification' },
  { db: 'status', api: 'status' },
  { db: 'owner', api: 'owner' }
];

module.exports = ({ db, integration }) => createRecordRouter({
  db, integration, table: 'soa_entries', recordType: 'soa', fields: FIELDS
});
