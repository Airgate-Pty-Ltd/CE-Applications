'use strict';

const express = require('express');

const VALID_RESPONSES = ['confirm', 'dismiss_incorrect', 'not_applicable'];

module.exports = ({ integration }) => {
  const router = express.Router();

  function tenantOf(req) {
    return req.header('X-Tenant-Id') || 'default';
  }

  router.get('/', (req, res) => {
    const tenantId = tenantOf(req);
    const conditions = integration.getConditions(tenantId, { status: req.query.status });
    res.json(conditions);
  });

  router.get('/:id/charter', (req, res) => {
    try {
      const charter = integration.getCharter();
      res.type('text/markdown').send(charter);
    } catch (err) {
      res.status(500).json({ error: 'charter_unavailable', message: err.message });
    }
  });

  router.post('/:id/respond', async (req, res) => {
    const tenantId = tenantOf(req);
    const { response, respondedBy } = req.body || {};

    if (!VALID_RESPONSES.includes(response)) {
      return res.status(400).json({ error: 'validation_error', message: `response must be one of: ${VALID_RESPONSES.join(', ')}` });
    }
    if (!respondedBy) {
      return res.status(400).json({ error: 'validation_error', message: 'respondedBy is required' });
    }

    const result = await integration.respondToCondition(tenantId, req.params.id, response, respondedBy);
    if (!result.success) {
      return res.status(404).json({ error: 'not_found', message: result.error });
    }
    return res.json(result.condition);
  });

  return router;
};
