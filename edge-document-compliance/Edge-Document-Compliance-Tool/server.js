import http from 'http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, query } from './database/connection.js';
import customersRouter from './routes/customers.js';
import assessmentsRouter from './routes/assessments.js';
import documentsRouter from './routes/documents.js';
import uploadRouter from './routes/upload.js';
import reportsRouter from './routes/reports.js';
import legalRouter from './routes/legal.js';
import notificationsRouter from './routes/notifications.js';
import libraryRouter from './routes/library.js';
import adminRouter from './routes/admin.js';
import analyticsRouter from './routes/analytics.js';
import remediationRouter from './routes/remediation.js';
import monitoringRouter from './routes/monitoring.js';
import realtimeRouter from './routes/realtime.js';
import configRouter from './routes/config.js';
import searchRouter from './routes/search.js';
import mobileRouter from './routes/mobile.js';
import marketplaceRouter from './routes/marketplace.js';
import executiveRouter from './routes/executive.js';
import usersRouter from './routes/users.js';
import regulatoryRouter from './routes/regulatorySources.js';
import settingsRouter from './routes/settings.js';
import EmailService from './services/EmailService.js';
import SchedulingService from './services/SchedulingService.js';
import RealtimeService from './services/RealtimeService.js';
import { User } from './models/index.js';
import reportBuilderRouter from './routes/reportBuilder.js';
import integrationsRouter from './routes/integrations.js';
import gapAnalysisRouter from './routes/gapAnalysis.js';
import { logLibraryStats } from './public/js/edcat-library.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMeNow!2025';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Behind Railway/other proxies we must trust the forwarded headers so rate limiting works correctly.
// Using "1" trusts the first proxy hop which is sufficient for managed hosting environments.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 120)
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

app.use('/api/customers', customersRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/legal', legalRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/library', libraryRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/remediation', remediationRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/realtime', realtimeRouter);
app.use('/api/config', configRouter);
app.use('/api/search', searchRouter);
app.use('/api/mobile', mobileRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/executive', executiveRouter);
app.use('/api/users', usersRouter);
app.use('/api/regulatory-sources', regulatoryRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/report-builder', reportBuilderRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/gap-analysis', gapAnalysisRouter);
app.use('/api/requirements', (await import('./routes/requirements.js')).default);
app.use('/api/crawler', (await import('./routes/crawler.js')).default);
app.use('/api/dynamic-standards', (await import('./routes/dynamicStandards.js')).default);
app.use('/api/customer-requirements', (await import('./routes/customerRequirements.js')).default);
app.use('/api/ai-assistant', (await import('./routes/aiAssistant.js')).default);

app.get('/api/health', async (_req, res) => {
  try {
    const [[queuedEmails], jobs] = await Promise.all([
      query('SELECT COUNT(*) FROM email_queue WHERE status = $1', ['queued']),
      SchedulingService.listJobs()
    ]);

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      queuedEmails: Number(queuedEmails.count),
      scheduledJobs: jobs.length
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

async function startServer() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Exiting.');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to database...');
    await initializeDatabase();
    console.log('✅ Database ready');
    await ensureInitialAdmins();
    if (process.env.EDCAT_DEBUG === 'true') {
      logLibraryStats(console);
    }

    await SchedulingService.registerJob({
      name: 'email-dispatch',
      cronExpression: '*/5 * * * *',
      task: async () => EmailService.processQueue(20)
    });

    const MonitoringService = (await import('./services/MonitoringService.js')).default;
    await SchedulingService.registerJob({
      name: 'metrics-snapshot',
      cronExpression: '0 * * * *',
      task: async () => MonitoringService.recordSnapshot()
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }

  const server = http.createServer(app);
  RealtimeService.attach(server);

  server.listen(PORT, () => {
    console.log(`\n🚀 EDCAT backend running on port ${PORT}`);
  });
}

startServer();

export default app;

async function ensureInitialAdmins() {
  const adminProfiles = [
    { email: 'brian.olea@conform-edge.com', fullName: 'Brian Olea', role: 'master_admin' },
    { email: 'mike.bower@conform-edge.com', fullName: 'Mike Bower', role: 'master_admin' }
  ];

  for (const profile of adminProfiles) {
    const existing = await User.findWithPasswordByEmail(profile.email);
    if (existing) {
      continue;
    }
    await User.create({
      email: profile.email,
      full_name: profile.fullName,
      role: profile.role,
      password: DEFAULT_ADMIN_PASSWORD
    });
    console.log(`👤 Created bootstrap admin ${profile.email}. Prompt password rotation immediately.`);
  }
}

