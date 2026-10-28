// One-shot report generator for local testing.
//
//   npm run generate            → generate a report and save it to Supabase
//   npm run generate -- --dry-run → generate and print to stdout, save nothing
//
// --dry-run needs no credentials at all: the sources are public APIs. Use it
// to verify the ingestion pipeline before wiring up Supabase.

import 'dotenv/config';
import { generateDailyReport } from './ingest';
import { saveReport, markReportError } from './supabase';

const dryRun = process.argv.includes('--dry-run');

function requireEnv(names: string[]): void {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('Copy .env.example to worker/.env and fill these in.');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  requireEnv(dryRun ? [] : ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const started = Date.now();
  console.log(
    `Pulling authoritative sources${dryRun ? ' — DRY RUN, nothing will be saved' : ''}`
  );

  const today = new Date().toISOString().split('T')[0];

  try {
    const result = await generateDailyReport();
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);

    console.log(`\nFound ${result.total_items_found} items in ${elapsed}s`);
    console.log(`Sources with no new items: ${result.no_activity.length}`);

    if (dryRun) {
      console.log('\n' + '='.repeat(60));
      console.log(result.full_report_markdown);
      console.log('='.repeat(60));
      console.log('\nDry run — nothing written to Supabase.');
      return;
    }

    await saveReport(result);
    console.log('Saved to Supabase.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Report generation failed:', message);

    if (!dryRun) {
      // Record the failure so the dashboard shows an error rather than
      // hanging on "generating..." forever.
      await markReportError(today, message).catch((e) =>
        console.error('Additionally failed to record the error state:', e)
      );
    }
    process.exit(1);
  }
}

main();
