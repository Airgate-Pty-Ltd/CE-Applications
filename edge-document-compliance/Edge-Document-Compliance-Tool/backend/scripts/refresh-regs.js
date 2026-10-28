/**
 * Refresh Regulations CLI
 * Fetches and processes regulations from whitelisted sources
 */

import { runRegRefresh } from "../src/online/RegCrawler.js";

(async () => {
  try {
    const results = await runRegRefresh();

    const failures = results.filter((r) => !r.ok);
    const flagged = results.filter((r) => r.flagged);

    console.table(
      results.map((r) => ({
        authority: r.authority,
        reg: r.reg_id,
        ok: r.ok,
        flagged: !!r.flagged,
        msg: r.message?.slice(0, 120) || ""
      }))
    );

    if (failures.length || flagged.length) {
      console.error("RED FLAG:", {
        failures: failures.length,
        flagged: flagged.length
      });
      process.exit(2);
    }

    console.log("Regulation refresh complete without flags.");
  } catch (e) {
    console.error("RED FLAG: fatal error:", e?.message || String(e));
    process.exit(2);
  }
})();
