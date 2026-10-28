'use strict';

const express = require('express');

module.exports = ({ integration }) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const tenantId = req.header('X-Tenant-Id') || 'default';
    try {
      const evidence = integration.exportEvidence(tenantId);
      res.json(evidence);
    } catch (err) {
      res.status(500).json({ error: 'export_failed', message: err.message });
    }
  });

  return router;
};
