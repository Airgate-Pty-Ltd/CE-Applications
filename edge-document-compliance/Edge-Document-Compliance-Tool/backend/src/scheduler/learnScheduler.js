/**
 * Learning Scheduler
 * Schedules nightly learning job using node-cron
 */

import cron from 'node-cron';
import { runLearnerJob } from '../scripts/learnNightly.js';

export function initLearnScheduler() {
  if (process.env.LEARN_CRON_ENABLED !== 'true') {
    console.log('⏭️  Learning scheduler disabled (LEARN_CRON_ENABLED != true)');
    return;
  }

  const spec = process.env.LEARN_CRON_SPEC || '30 2 * * *'; // 02:30 daily
  const tz = process.env.LEARN_CRON_TZ || 'America/Boise';

  console.log(`📅 Learning scheduler enabled:`);
  console.log(`   Schedule: ${spec}`);
  console.log(`   Timezone: ${tz}\n`);

  cron.schedule(spec, async () => {
    const started = new Date().toISOString();
    console.log(`\n🔄 [LEARN] Nightly learner starting at ${started}`);
    
    try {
      const summary = await runLearnerJob();
      console.log(`✅ [LEARN] Completed at ${new Date().toISOString()}`);
      console.log(`   Proposals: ${summary.proposals}`);
      console.log(`   Auto-approved: ${summary.autoApproved}`);
      console.log(`   Pending: ${summary.pending}`);
      console.log(`   Reports: ${summary.reportDir}\n`);
    } catch (e) {
      console.error(`❌ [LEARN] Failed: ${e?.message || e}`);
      console.error(`   Stack: ${e?.stack}\n`);
    }
  }, {
    timezone: tz,
    scheduled: true
  });

  console.log('✅ Learning scheduler initialized\n');
}

