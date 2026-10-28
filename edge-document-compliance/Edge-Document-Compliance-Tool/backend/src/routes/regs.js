/**
 * Regulatory Refresh Routes
 * API endpoints for triggering regulation crawls
 */

import express from "express";
import fs from "fs";
import path from "path";
import { recordRun } from "../database/repos/regs.repo.js";

let runRegRefreshLoader;
async function getRunRegRefresh() {
  if (!runRegRefreshLoader) {
    runRegRefreshLoader = (async () => {
      await import("../polyfills/web.js");
      const module = await import("../online/RegCrawler.js");
      return module.runRegRefresh;
    })();
  }
  return runRegRefreshLoader;
}

const router = express.Router();

/**
 * POST /api/regs/refresh
 * Trigger a refresh of all regulations
 */
router.post("/refresh", async (req, res) => {
  const started = new Date();
  try {
    if (String(process.env.ENABLE_NET).toLowerCase() !== "true") {
      return res.status(403).json({
        error: "NET_DISABLED",
        detail: "Set ENABLE_NET=true to refresh regulations."
      });
    }

    const runRegRefresh = await getRunRegRefresh();
    const results = await runRegRefresh();
    const ok = results.filter((r) => r.ok).length;
    const fail = results.filter((r) => !r.ok).length;
    const flagged = results.filter((r) => r.flagged).length;

    // Record the run in database (graceful fallback if tables don't exist)
    try {
      await recordRun(started, {
        ok,
        fail,
        flagged,
        summary: results
      });
    } catch (dbErr) {
      console.log('Note: Could not record crawl run (edcat schema may not exist):', dbErr.message);
      // Continue without database logging
    }

    const status = fail || flagged ? 207 : 200; // RED FLAG state

    res.status(status).json({
      ok,
      fail,
      flagged,
      results,
      total: results.length
    });
  } catch (e) {
    // Record failed run (graceful fallback)
    try {
      await recordRun(started, {
        ok: 0,
        fail: 1,
        flagged: 0,
        summary: { error: e?.message || String(e) }
      });
    } catch (dbErr) {
      // Ignore database errors during error handling
    }

    console.error("Reg refresh error:", e);
    res.status(500).json({
      error: "REFRESH_FAILED",
      detail: e?.message || String(e)
    });
  }
});

/**
 * GET /api/regs/status
 * Get status of regulation packs
 */
router.get("/status", async (req, res) => {
  try {
    const regsDir = path.join(process.cwd(), "regs");

    if (!fs.existsSync(regsDir)) {
      return res.json({
        success: true,
        packs: [],
        total: 0
      });
    }

    const packs = [];
    const authorities = fs.readdirSync(regsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const auth of authorities) {
      const authDir = path.join(regsDir, auth);
      const regs = fs.readdirSync(authDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const reg of regs) {
        const packPath = path.join(authDir, reg, "pack.yaml");
        const hashPath = path.join(authDir, reg, "latest.hash");
        
        if (fs.existsSync(packPath)) {
          const hash = fs.existsSync(hashPath)
            ? fs.readFileSync(hashPath, "utf8").trim()
            : null;

          packs.push({
            authority: auth,
            reg_id: reg,
            packPath,
            hash,
            lastModified: fs.statSync(packPath).mtime
          });
        }
      }
    }

    res.json({
      success: true,
      packs,
      total: packs.length
    });
  } catch (e) {
    console.error("Reg status error:", e);
    res.status(500).json({
      error: "STATUS_FAILED",
      detail: e?.message || String(e)
    });
  }
});

export default router;

