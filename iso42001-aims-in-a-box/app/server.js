'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { openDb } = require('./src/db/init');
const { AimsIntegration } = require('./src/adapter/aims-adapter');

const PORT = process.env.PORT || 3100;

function createApp() {
  const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : require('./src/db/init').DEFAULT_DB_PATH;
  if (!fs.existsSync(dbPath)) {
    // eslint-disable-next-line no-console
    console.warn(`[server] Database not found at ${dbPath} — run "npm run setup" first.`);
  }
  const db = openDb(dbPath);
  let dbConnected = true;

  let integration = null;
  let kernelActive = false;
  try {
    integration = new AimsIntegration(db);
    kernelActive = true;
    // eslint-disable-next-line no-console
    console.log(`[server] M-AI Kernel active. Rule registry: ${integration.registryStats.loadedCount} loaded, ${integration.registryStats.rejectedCount} rejected.`);
  } catch (err) {
    // Design Law 3: if the kernel fails to initialize, the host must still work.
    // eslint-disable-next-line no-console
    console.error('[server] M-AI Kernel failed to initialize — host will run with kernel disabled.', err);
    integration = {
      emitEvent: async () => ({ skipped: true, reason: 'kernel_disabled' }),
      getConditions: () => [],
      getConditionById: () => null,
      respondToCondition: async () => ({ success: false, error: 'kernel_disabled' }),
      getCharter: () => 'M-AI Kernel is currently disabled; no Authority Charter is available.',
      getMetrics: () => ({ eventCount: 0, confirmations: 0, dismissals: 0, errorCount: 0, activeCount: 0 }),
      exportEvidence: () => ({ manifest: { note: 'kernel_disabled' }, assessments: [], ruleRegistry: [], charter: '' })
    };
  }

  const app = express();
  app.use(express.json());

  // Serve the FSA-compliant UI same-origin so config.js's same-origin
  // detection (window.location.port === '3100' -> API_BASE '') is correct
  // and the frontend needs no separate dev server. express.static serves
  // src/ui/index.html automatically at '/'.
  app.use(express.static(path.join(__dirname, 'src', 'ui')));

  app.get('/health', (req, res) => {
    try {
      db.prepare('SELECT 1').get();
      dbConnected = true;
    } catch (err) {
      dbConnected = false;
    }
    res.json({ status: 'ok', kernelActive, dbConnected });
  });

  app.use('/api/soa', require('./src/routes/soa')({ db, integration }));
  app.use('/api/risks', require('./src/routes/risks')({ db, integration }));
  app.use('/api/treatments', require('./src/routes/treatments')({ db, integration }));
  app.use('/api/objectives', require('./src/routes/objectives')({ db, integration }));
  app.use('/api/audits', require('./src/routes/audits')({ db, integration }));
  app.use('/api/ncrs', require('./src/routes/ncrs')({ db, integration }));
  app.use('/api/competence', require('./src/routes/competence')({ db, integration }));
  app.use('/api/conditions', require('./src/routes/conditions')({ integration }));
  app.use('/api/export', require('./src/routes/export')({ integration }));
  app.use('/api/events', require('./src/routes/events')({ db }));

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error('[server] Unhandled route error', err);
    res.status(500).json({ error: 'internal_error' });
  });

  return { app, db, integration };
}

if (require.main === module) {
  const { app } = createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`ISO/IEC 42001 AIMS Command Center listening on port ${PORT}`);
  });
}

module.exports = { createApp };
