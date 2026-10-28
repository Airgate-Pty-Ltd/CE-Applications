import { Router } from "express";
import { Pool } from "pg";
import { LookupRepo } from "../db/repo/LookupRepo";

const router = Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const repo = new LookupRepo(pool);

router.get("/standards", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    const r = await repo.listAllStandards(50);
    return res.json({ items: r.rows });
  }
  const packs = await repo.findStandardPacksLike(q);
  const sources = await repo.findStandardSourcesLike(q);
  res.json({ packs: packs.rows, sources: sources.rows });
});

export default router;

