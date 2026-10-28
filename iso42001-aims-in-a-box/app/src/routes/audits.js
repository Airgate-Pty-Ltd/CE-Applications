'use strict';

const { createRecordRouter } = require('./record-router-factory');

const FIELDS = [
  { db: 'finding_ref', api: 'findingRef', required: true },
  { db: 'description', api: 'description', required: true },
  { db: 'severity', api: 'severity', required: true },
  { db: 'clause_ref', api: 'clauseRef' },
  { db: 'status', api: 'status' }
];

module.exports = ({ db, integration }) => createRecordRouter({
  db, integration, table: 'audit_findings', recordType: 'audit_finding', fields: FIELDS
});
