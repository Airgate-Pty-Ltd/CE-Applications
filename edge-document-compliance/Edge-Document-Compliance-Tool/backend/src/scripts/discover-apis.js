/**
 * API Discovery CLI
 * Batch discovery for all configured regulatory sources
 */

import { query } from '../database/connection.js';
import { discoverForSource } from '../online/discovery/ApiDiscovery.js';

(async () => {
  try {
    // Find all configured sources and probe their domains
    const { rows } = await query(
      `SELECT id, url, authority FROM edcat.reg_sources WHERE enabled = true`
    );

    if (rows.length === 0) {
      console.log('No enabled regulatory sources found. Add sources to edcat.reg_sources first.');
      process.exit(0);
    }

    for (const s of rows) {
      try {
        const urlObj = new URL(s.url);
        const domain = urlObj.hostname;
        console.log(`🔎 Discovering API surfaces for ${s.authority} @ ${domain}`);
        const r = await discoverForSource(s.id, domain);
        console.log(`  → ${r.map(x => `${x.kind}:${x.status}`).join(', ')}`);
      } catch (err) {
        console.error(`  ❌ Error discovering ${s.authority}: ${err.message}`);
      }
    }

    console.log('\n✓ Discovery complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
})();

