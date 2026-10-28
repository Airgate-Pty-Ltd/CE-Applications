import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateDailyReport } from './ingest';
import { saveReport, markReportError } from './supabase';

const app = express();

// CORS: restrict to known origins. The worker has no browser callers in normal
// operation, so default to no cross-origin access.
const allowedOrigin = process.env.ALLOWED_ORIGIN;
if (allowedOrigin) {
  app.use(cors({ origin: allowedOrigin, methods: ['GET', 'POST'] }));
} else {
  app.use(cors({ origin: false }));
}

app.use(express.json());

const PORT = process.env.PORT || 3001;

// Health check — Railway uses this to confirm the service is up.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', pipeline: 'deterministic' });
});

// Trigger report generation — called by Railway Cron or the Next.js cron proxy.
app.post('/api/generate', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date().toISOString().split('T')[0];
  console.log(`[${new Date().toISOString()}] Starting report generation for ${today}`);

  // Respond immediately — generation runs in the background.
  res.json({ message: 'Report generation started', date: today });

  try {
    const result = await generateDailyReport();
    await saveReport(result);
    console.log(
      `[${new Date().toISOString()}] Report complete — ${result.total_items_found} items`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] Report generation failed:`, message);
    // Record the failure so the dashboard shows an error rather than sitting
    // on "generating…" forever.
    await markReportError(today, message).catch((e) =>
      console.error('Additionally failed to record the error state:', e)
    );
  }
});

app.listen(PORT, () => {
  console.log(`RegIntel worker running on port ${PORT}`);
});
