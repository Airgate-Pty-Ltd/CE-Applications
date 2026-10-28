'use strict';

const { createRecordRouter } = require('./record-router-factory');

const FIELDS = [
  { db: 'objective_text', api: 'objectiveText', required: true },
  { db: 'measurable_target', api: 'measurableTarget' },
  { db: 'owner', api: 'owner' },
  { db: 'due_date', api: 'dueDate' },
  { db: 'status', api: 'status' }
];

module.exports = ({ db, integration }) => createRecordRouter({
  db, integration, table: 'objectives', recordType: 'objective', fields: FIELDS
});
