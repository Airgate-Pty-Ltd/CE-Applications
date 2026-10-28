/**
 * Express Application Setup
 * Main application with health endpoint for Railway
 */

// CRITICAL: Log immediately to verify module is loading
process.stdout.write('[app] Starting app.js module load...\n');

import './polyfills/web.js';
process.stdout.write('[app] ✅ Polyfills loaded\n');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
process.stdout.write('[app] ✅ Core modules loaded\n');

// CRITICAL: Import database connection (synchronous import)
// If this fails, we'll see the error in logs
import { query as dbQuery } from './database/connection.js';
process.stdout.write('[app] ✅ Database connection module loaded\n');

// CRITICAL FIX: Import routes at top level for synchronous registration
// Use static imports - if any fail, the module won't load and we'll see the error
process.stdout.write('[app] Loading route modules...\n');

import uploadRouter from './routes/upload.js';
import requirementsRouter from './routes/requirements.js';
import personaRouter from './routes/persona.js';
import regulatoryRouter from './routes/regulatory.js';
import gapRouter from './routes/gap.js';
import parseRouter from './routes/parse.js';
import chatRouter from './routes/chat.js';
import customersRouter from './routes/customers.js';
import customerArchiveRouter from './routes/customerArchive.js';
import usersRouter from './routes/users.js';
import adminRouter from './routes/admin.js';
import feedbackRouter from './routes/feedback.js';
import learningRouter from './routes/learning.js';
import dbIntrospectRouter from './routes/dbIntrospect.js';
import regIntelRouter from './routes/regIntel.js';
import cron from 'node-cron';
import RegulatoryIntelligenceHub from './services/regulatoryIntelligenceHub.js';
import reportsRouter from './routes/reports.js';
import mappingsRouter from './routes/mappings.js';
import documentsRouter from './routes/documents.js';
import capaRouter from './routes/capa.js';
import trainingRouter from './routes/training.js';
import kpiRouter from './routes/kpi.js';
import qmsRouter from './routes/qms.js';
import industryRouter from './routes/industry.js';
import i18nRouter from './routes/i18n.js';
import anomaliesRouter from './routes/anomalies.js';
import integrationsRouter from './routes/integrations.js';
import enterpriseMiddleware from './middleware/enterpriseMiddleware.js';
import auditRouter from './routes/audit.js';
import predictionsRouter from './routes/predictions.js';
import diagnosticsRouter from './routes/diagnostics.js';
import veraRouter from './routes/vera.js';
import veraChatRoute from './routes/veraChatRoute.js';
import veraAdminRouter from './routes/veraAdmin.routes.js';
import veraDiagnosticsRouter from './routes/veraDiagnostics.routes.js';
import veraRequirementsScannerRouter from './routes/vera-requirements-scanner.js';
import veraHealthRouter from './routes/veraHealth.js';
import veraDebugAuditRouter from './routes/veraDebugAudit.routes.js';
import veraDebugComparisonRouter from './routes/veraDebugComparison.routes.js';
import veraFeedbackRouter from './routes/veraFeedback.routes.js';
import veraLearningRouter from './routes/veraLearning.routes.js';
import veraCapabilityRouter from './routes/veraCapability.routes.js';
import veraAuditScenariosRouter from './routes/veraAuditScenarios.routes.js';
import complianceGapRouter from './compliancegap/server.js';
import complianceGapApiRouter from './routes/compliancegap.js';
import veraRCARouter from './routes/veraRCA.js';
import veraSearchRouter from './routes/veraSearch.js';
import veraCredentialsRouter from './routes/vera-credentials.js';
import veraMetricsRouter from './routes/veraMetrics.js';
import mistralRouter from './routes/mistral.js';

// Log that imports succeeded
process.stdout.write('[app] ✅ All route modules imported successfully\n');
console.log('[app]    Upload router:', typeof uploadRouter, uploadRouter ? 'loaded' : 'null');
console.log('[app]    Parse router:', typeof parseRouter, parseRouter ? 'loaded' : 'null');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

<<<<<<< HEAD
// CRITICAL: Health check MUST be FIRST - before ANY other code that could fail
// This ensures Railway health checks pass even if other services are down
app.get('/health', (req, res) => {
=======
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint: must be fast, no DB calls, always 200 if process is up
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Optional: Run migrations on startup if enabled (non-blocking)
// NOTE: This runs AFTER app export to avoid blocking module load
// Migrations will be triggered after server starts if RUN_MIGRATIONS=true

// API Routes (must be before static file serving)
import uploadRoutes from './routes/upload.js';
import dbStatusRoutes from './routes/db-status.js';
import testDbRoutes from './routes/test-db.js';
import requirementsRoutes from './routes/requirements.js';
import regulatoryRoutes from './routes/regulatory.js';
import chatRoutes from './routes/chat.js';
import parseRoutes from './routes/parse.js';
import personaRoutes from './routes/persona.js';
import gapRoutes from './routes/gap.js';
import adminRoutes from './routes/admin.js';
import diagnosticsRoutes from './routes/diagnostics.js';
import parserTrainingRoutes from './routes/parser-training.js';
import customerRoutes from './routes/customers.js';
import gapAnalysisRoutes from './routes/gap-analysis.js';
import regsRoutes from './routes/regs.js';
import regsIngestRoutes from './routes/regs.ingest.js';
import { customerContext } from './middleware/customerContext.js';
import authRoutes from './modules/auth/authRoutes.js';
import auditRoutes from './modules/audits/api/auditRoutes.js';

// Customer management (no customer context required)
app.use('/api/customers', customerRoutes);

// Routes that optionally use customer context (will work without it for general queries)
app.use('/api/chat', customerContext, chatRoutes);
app.use('/api/gap', customerContext, gapRoutes);

// Parse routes: standards parsing doesn't require customer context, but customer document parsing does
// We'll handle this in the route itself
app.use('/api/parse', parseRoutes);

// Routes that don't require customer context (shared knowledge base)
// Uploads: standards and regulatory files are shared, customer documents require context
// Apply customerContext middleware optionally (won't block if no customer ID provided)
app.use('/api/upload', customerContext, uploadRoutes);
// Regulatory websites: shared knowledge base resource
app.use('/api/regulatory', regulatoryRoutes);

// Routes that don't require customer context
app.use('/api/db', dbStatusRoutes);
app.use('/api/test', testDbRoutes);

// Add DB health endpoint
app.get('/api/db/health', async (req, res) => {
>>>>>>> 9004f69 (feat: Integrate Audit Tool module into EDC)
  try {
    res.status(200).json({ 
      status: 'ok', 
      service: 'edcat-backend',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({ 
      status: 'ok', 
      service: 'edcat-backend',
      timestamp: new Date().toISOString(),
      note: 'Health check responded despite error'
    });
  }
});

<<<<<<< HEAD
// CRITICAL: Trust proxy for Railway (needed for rate limiting and X-Forwarded-For)
app.set('trust proxy', true);
=======
// Authentication routes (no auth required for login)
app.use('/api/auth', authRoutes);

// Audit routes (require authentication)
app.use('/api', auditRoutes);

// Routes that don't require customer context
app.use('/api/persona', personaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/api/parser', parserTrainingRoutes);
app.use('/api/gap-analysis', gapAnalysisRoutes);
app.use('/api/regs', regsRoutes);
app.use('/api/regs', regsIngestRoutes);
>>>>>>> 9004f69 (feat: Integrate Audit Tool module into EDC)

// Enterprise Middleware (Phase 5)
// Apply security headers
app.use(enterpriseMiddleware.securityHeaders);

// Apply correlation ID middleware
app.use(enterpriseMiddleware.correlationId);

// Apply tenant isolation (non-blocking, adds req.tenantId if present)
app.use(enterpriseMiddleware.tenantIsolation);

// Apply audit logging (if enabled)
app.use(enterpriseMiddleware.auditLog);

// Apply rate limiting to API routes (can be overridden per route)
app.use('/api', enterpriseMiddleware.apiRateLimiter);

// Standard Middleware
app.use(cors(enterpriseMiddleware.corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Favicon handler (browsers automatically request this)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

// CRITICAL FIX: Mount core routes SYNCHRONOUSLY
// Routes are imported at top level, now mount them immediately
app.use('/api/upload', uploadRouter);
app.use('/api/requirements', requirementsRouter);
app.use('/api/persona', personaRouter);
console.log('[app] ✅ Core routes registered synchronously (upload, requirements, persona, regulatory, gap, parse, chat, customers, users, admin)');
app.use('/api/regulatory', regulatoryRouter);
app.use('/api/gap', gapRouter);
app.use('/api/parse', parseRouter);
app.use('/api/chat', chatRouter);
app.use('/api/customers', customersRouter);
app.use('/api/customer-archive', customerArchiveRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/learning', learningRouter);
app.use('/api/diagnostics', diagnosticsRouter);
app.use(dbIntrospectRouter);
app.use('/api/reg-intel', regIntelRouter);
app.use('/api/audit', auditRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/mappings', mappingsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/capa', capaRouter);
app.use('/api/training', trainingRouter);
app.use('/api/kpi', kpiRouter);
app.use('/api/qms', qmsRouter);

// Phase 5 Routes
app.use('/api/industry', industryRouter);
app.use('/api/i18n', i18nRouter);
app.use('/api/ai', anomaliesRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/vera', veraChatRoute);
app.use('/api/vera/admin', veraAdminRouter);
app.use('/api/vera/diagnostics', veraDiagnosticsRouter);
app.use('/api/vera/requirements', veraRequirementsScannerRouter);
app.use('/api/vera', veraHealthRouter);
app.use('/api/vera', veraDebugAuditRouter);
app.use('/api/vera', veraDebugComparisonRouter);
app.use('/api/vera', veraFeedbackRouter);
app.use('/api/vera/learning', veraLearningRouter);
app.use('/api/vera/capability', veraCapabilityRouter);
app.use('/api/vera/audit-scenarios', veraAuditScenariosRouter);
app.use('/api/compliancegap', complianceGapRouter);
app.use('/api/compliancegap', complianceGapApiRouter);
app.use('/api/vera/rca', veraRCARouter);
app.use('/api/vera', veraSearchRouter);
app.use('/api/vera/credentials', veraCredentialsRouter);
app.use('/api/vera/metrics', veraMetricsRouter);
app.use('/api/mistral', mistralRouter);

console.log('[app] ✅ Core routes registered synchronously (upload, requirements, persona, regulatory, gap, parse, chat, customers, users, admin)');
console.log('[app] ✅ Phase 5 routes registered (industry, i18n, anomalies, integrations)');

// Verify parse router is loaded correctly
if (parseRouter && typeof parseRouter.use === 'function') {
  console.log('[app] ✅ Parse router loaded successfully');
  if (parseRouter.stack && parseRouter.stack.length > 0) {
    console.log(`[app]    Parse router has ${parseRouter.stack.length} handlers`);
    parseRouter.stack.forEach((layer, idx) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`[app]      ${idx + 1}. ${methods} ${layer.route.path}`);
      }
    });
  }
} else {
  console.error('[app] ❌ Parse router failed to load!', typeof parseRouter);
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is running!' 
  });
});

// Serve static files from public directory (AFTER API routes to avoid conflicts)
const publicDir = path.join(__dirname, '../../public');
app.use(express.static(publicDir));

// Also serve frontend directory if it exists
const frontendDir = path.join(__dirname, '../../frontend');
app.use('/frontend', express.static(frontendDir));

// Serve uploads directory
const uploadsDir = path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsDir));

// Direct route for cleanup page
app.get('/cleanup.html', (req, res) => {
  const cleanupPath = path.join(publicDir, 'cleanup.html');
  res.sendFile(cleanupPath, (err) => {
    if (err) {
      console.error('[app] Error serving cleanup.html:', err.message);
      res.status(404).json({
        error: 'cleanup.html not found',
        path: cleanupPath,
        hint: 'Make sure cleanup.html exists in the public directory'
      });
    }
  });
});

// Root endpoint - serve the main UI (must be after API routes and static files)
app.get('/', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[app] Error serving index.html:', err.message);
      // Fallback to JSON if file not found
      res.json({ 
        status: 'ok',
        service: 'ComplianceGap Backend',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          test: '/api/test',
          cleanup: '/cleanup.html'
        },
        timestamp: new Date().toISOString(),
        note: 'UI files not found - serving API info instead'
      });
    }
  });
});

// Error handling middleware - catch ALL errors
app.use((err, req, res, next) => {
  console.error('[app] Error:', err.message);
  console.error('[app] Stack:', err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Debug endpoint to list all registered routes
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  const routeDetails = [];
  
  app._router.stack.forEach((middleware, idx) => {
    if (middleware.route) {
      // Direct route
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      routes.push(`${methods} ${middleware.route.path}`);
      routeDetails.push({
        type: 'direct',
        methods: methods,
        path: middleware.route.path,
        index: idx
      });
    } else if (middleware.name === 'router') {
      // Router middleware - extract mount path
      const mountPath = middleware.regexp.source.replace(/\\\//g, '/').replace(/\^|\$|\?/g, '').replace(/\(.*?\)/g, '');
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
          const fullPath = mountPath + handler.route.path;
          routes.push(`${methods} ${fullPath}`);
          routeDetails.push({
            type: 'router',
            methods: methods,
            mountPath: mountPath,
            routePath: handler.route.path,
            fullPath: fullPath,
            index: idx
          });
        } else {
          // Middleware or sub-router
          routeDetails.push({
            type: 'middleware',
            mountPath: mountPath,
            index: idx
          });
        }
      });
    }
  });
  
  res.json({ 
    routes, 
    count: routes.length,
    details: routeDetails,
    message: 'Check Railway logs for route registration messages'
  });
});

// 404 handler - log detailed info for debugging
app.use((req, res) => {
  console.log(`[app] 404 - Route not found: ${req.method} ${req.path}`);
  console.log(`[app]    Original URL: ${req.originalUrl}`);
  console.log(`[app]    Base URL: ${req.baseUrl}`);
  console.log(`[app]    Query: ${JSON.stringify(req.query)}`);
  console.log(`[app]    Registered routes: /api/upload, /api/requirements, /api/persona, /api/regulatory, /api/gap, /api/parse, /api/chat`);
  
  // Check if it's a requirements route that's failing
  if (req.path.includes('/standards') || req.path.includes('standards')) {
    console.log(`[app] ⚠️  Standards route 404 - checking route registration...`);
    console.log(`[app]    Expected: GET /api/requirements/standards`);
    console.log(`[app]    Received: ${req.method} ${req.path}`);
    console.log(`[app]    Full URL: ${req.originalUrl}`);
    console.log(`[app]    Suggestion: Check if frontend is calling /api/requirements/standards (not just /standards)`);
  }
  
  // Check if it's a parse route that's failing
  if (req.path.includes('/parse/standard/')) {
    console.log(`[app] ⚠️  Parse route 404 - checking route registration...`);
    console.log(`[app]    Expected: POST /api/parse/standard/:standardId`);
    console.log(`[app]    Received: ${req.method} ${req.path}`);
  }
  
  res.status(404).json({
    status: 'error',
    message: 'Not found',
    path: req.path,
    method: req.method,
    originalUrl: req.originalUrl,
    availableEndpoints: ['/', '/health', '/api/test', '/api/debug/routes', '/api/upload', '/api/requirements', '/api/persona', '/api/regulatory', '/api/gap', '/api/parse', '/api/chat'],
    hint: req.path.includes('standards') ? 'Try /api/requirements/standards instead of /standards' : undefined
  });
});

export default app;

// Schedule regulatory scan daily at 2 AM if enabled
try {
  if (String(process.env.ENABLE_REG_INTEL || '').toLowerCase() === 'true' &&
      String(process.env.ENABLE_NET || '').toLowerCase() === 'true') {
    const hub = new RegulatoryIntelligenceHub();
    cron.schedule('0 2 * * *', async () => {
      console.log('[cron] Regulatory scan starting...');
      try {
        const updates = await hub.monitorRegulatoryChanges();
        console.log(`[cron] Regulatory scan complete. Updates: ${updates.length}`);
      } catch (e) {
        console.error('[cron] Regulatory scan failed:', e?.message || e);
      }
    });
    console.log('[cron] Regulatory intelligence daily scan scheduled (02:00).');
  }
} catch (e) {
  console.warn('[cron] Skipping regulatory scan scheduling:', e?.message || e);
}
