import { Router } from "express";
import { Pool } from "pg";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get("/greeting", async (_req, res) => {
  const r = await pool.query(`select greeting, compliance_note from edcat.edcat_persona limit 1`);
  const row = r.rows[0] || { greeting: "Hello.", compliance_note: "Bounded." };
  res.json(row);
});

export default router;

