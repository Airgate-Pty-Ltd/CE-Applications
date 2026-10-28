'use strict';

const { createRecordRouter } = require('./record-router-factory');

const FIELDS = [
  { db: 'risk_id', api: 'riskId' },
  { db: 'soa_control_ref', api: 'soaControlRef' },
  { db: 'description', api: 'description', required: true },
  { db: 'target_date', api: 'targetDate' },
  { db: 'status', api: 'status' },
  { db: 'owner', api: 'owner' }
];

module.exports = ({ db, integration }) => createRecordRouter({
  db, integration, table: 'risk_treatments', recordType: 'risk_treatment', fields: FIELDS
});
