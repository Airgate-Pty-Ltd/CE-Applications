import { Router } from "express";
import { Pool } from "pg";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.post("/run", async (_req, res) => {
  res.json({ success: true, message: "Discovery job queued (implement scripts/discover-apis.ts)" });
});

export default router;

