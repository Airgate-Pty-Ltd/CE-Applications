import { Router } from "express";
import { Pool } from "pg";
const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get("/", async (_req, res) => {
  try {
    const r = await pool.query(`select 1`);
    res.json({ ok: true, db: "up", flags: {
      ENABLE_NET: process.env.ENABLE_NET || "false",
      FEATURE_EXCEL_ANALYTICS: process.env.FEATURE_EXCEL_ANALYTICS || "true"
    }});
  } catch {
    res.status(500).json({ ok: false, db: "down" });
  }
});

export default router;

