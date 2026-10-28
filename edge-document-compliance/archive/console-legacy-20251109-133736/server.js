const path = require('path');
const express = require('express');
const db = require('./database/db');

const { initializeDatabase, pool, query } = db;

// Import routes
const customersRouter = require('./routes/customers');
const standardsRouter = require('./routes/standards');
const documentsRouter = require('./routes/documents');
const assessmentsRouter = require('./routes/assessments');
const regulatoryRouter = require('./routes/regulatory');
const libraryRouter = require('./routes/library');
const tenantsRouter = require('./routes/tenants');
const analyticsRouter = require('./routes/analytics');

const {
  listTenantsHandler,
  getTenantHandler,
  upsertTenantHandler,
  provisionTenantHandler,
  verifyTenantHandler
} = require('./src/server/edcat-routes');
const { seedEdcatDefaults } = require('./src/server/seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/customers', customersRouter);
app.use('/api/standards', standardsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/regulatory', regulatoryRouter);
app.use('/api/library', libraryRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/analytics', analyticsRouter);

// EDCAT control-plane endpoints
app.get('/api/edcat/tenants-list', listTenantsHandler);
app.get('/api/edcat/tenants/:id', getTenantHandler);
app.post('/api/edcat/tenants', upsertTenantHandler);
app.post('/api/edcat/tenants/:id/provision', provisionTenantHandler);
app.get('/api/edcat/tenants/:id/verify', verifyTenantHandler);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', checked_at: new Date().toISOString() });
});

// Command Center summary (data-driven)
app.get('/api/command-center/summary', async (_req, res) => {
  try {
    const assessmentsResult = await query(
      'SELECT progress, gap_count, fulfilled_requirements, partial_requirements FROM assessments'
    );
    const assessments = assessmentsResult.rows;
    const totalAssessments = assessments.length;

    const overallScore = totalAssessments
      ? Math.round(
          assessments.reduce((sum, row) => sum + Number(row.progress || 0), 0) /
            totalAssessments
        )
      : 0;

    const gapsResult = await query(
      'SELECT status, COUNT(*)::int AS total FROM gaps GROUP BY status'
    );

    const gapStats = gapsResult.rows.reduce(
      (acc, row) => {
        if (row.status === 'NOT_MET') acc.critical += row.total;
        if (row.status === 'PARTIAL') acc.partial += row.total;
        return acc;
      },
      { critical: 0, partial: 0 }
    );

    const regulatorySets = await query(
      'SELECT id, label, metadata FROM requirement_sets WHERE metadata ? \'catalog_id\''
    );

    const latestSync = regulatorySets.rows.reduce((latest, row) => {
      if (!row.last_synced_at) return latest;
      const current = new Date(row.last_synced_at).getTime();
      return current > latest ? current : latest;
    }, 0);

    res.json({
      success: true,
      summary: {
        overallScore,
        auditReadiness: overallScore,
        criticalGaps: gapStats.critical,
        activeRemediations: gapStats.partial,
        signals: []
      },
      regulatorySync: {
        status: regulatorySets.rows.length ? 'configured' : 'not_configured',
        updatedAt: latestSync ? new Date(latestSync).toISOString() : null,
        sources: regulatorySets.rows.map((row) => {
          const metadataRaw = row.metadata || {};
          const metadata = typeof metadataRaw === 'string' ? JSON.parse(metadataRaw) : metadataRaw;
          return {
            id: row.id,
            label: row.label,
            catalog_id: metadata.catalog_id,
            jurisdiction: metadata.jurisdiction,
            group: metadata.group,
            last_synced_at: metadata.last_synced_at,
            last_sync_status: metadata.last_sync_status || 'unknown',
            last_sync_error: metadata.last_sync_error || null,
            requirement_count: typeof metadata.requirement_count === 'number' ? metadata.requirement_count : null,
            previous_count: typeof metadata.previous_count === 'number' ? metadata.previous_count : null
          };
        })
      }
    });
  } catch (error) {
    console.error('Failed to build command center summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  // Check database connectivity
  if (process.env.DATABASE_URL) {
    try {
      const start = Date.now();
      await pool.query('SELECT NOW()');
      const duration = Date.now() - start;
      health.database = {
        status: 'connected',
        responseTime: `${duration}ms`
      };
    } catch (error) {
      health.database = {
        status: 'error',
        message: error.message
      };
      health.status = 'degraded';
    }
  } else {
    health.database = {
      status: 'not_configured',
      message: 'DATABASE_URL not set'
    };
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Serve static files
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Catch-all route for SPA
app.use((_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Initialize database and start server
async function startServer() {
  let dbInitialized = false;

  try {
    // Initialize database schema
    if (process.env.DATABASE_URL) {
      try {
        console.log('🔌 Attempting database connection...');
        await initializeDatabase();
        dbInitialized = true;
        console.log('✅ Database initialized successfully');
        try {
          await seedEdcatDefaults();
        } catch (seedError) {
          console.error('❌ Failed to seed EDCAT defaults:', seedError.message);
        }
      } catch (dbError) {
        console.error('❌ Database initialization failed:', dbError.message);
        console.warn('⚠️  Server will start without database. Some features will be unavailable.');
        console.warn('   Please check your DATABASE_URL and database availability.');
      }
    } else {
      console.warn('⚠️  No DATABASE_URL environment variable found.');
      console.warn('   Running in demo mode with limited functionality.');
      console.warn('   Set DATABASE_URL to enable full features.');
    }

    // Start server regardless of database status
    app.listen(PORT, () => {
      console.log(`\n🚀 Edge Document Compliance Server`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${dbInitialized ? '✅ Connected' : '❌ Not available'}`);
      console.log(`\n📋 Available endpoints:`);
      console.log(`  GET  /health - Health check`);
      if (dbInitialized) {
        console.log(`  GET  /api/customers - List customers`);
        console.log(`  POST /api/customers - Create customer`);
        console.log(`  GET  /api/standards - List standards`);
        console.log(`  POST /api/standards/upload - Upload standard`);
        console.log(`  GET  /api/documents - List documents`);
        console.log(`  POST /api/documents/upload - Upload document`);
        console.log(`  GET  /api/assessments - List assessments`);
        console.log(`  POST /api/assessments - Create assessment`);
        console.log(`  GET  /api/assessments/:id - Assessment details`);
        console.log(`  GET  /api/assessments/:id/rtm - Requirements Traceability Matrix`);
        console.log(`  GET  /api/regulatory/options - Regulatory catalog`);
        console.log(`  POST /api/regulatory/fetch - Fetch regulation content`);
        console.log(`  GET  /api/library/matrix - Document library matrix`);
        console.log(`  GET  /api/tenants - List tenants`);
        console.log(`  POST /api/tenants - Create or update tenant`);
        console.log(`  GET  /api/tenants/profiles - List tenant profiles`);
        console.log(`  POST /api/tenants/profiles - Create or update profile`);
        console.log(`  GET  /api/analytics/accuracy - Accuracy metrics`);
      } else {
        console.log(`  dY", Static file serving only (database unavailable)`);
      }
      console.log(`\no" Server ready!\n`);
    });
  } catch (error) {
    console.error('?O Fatal error starting server:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing server');
  process.exit(0);
});

startServer();

module.exports = app;
