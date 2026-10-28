import { Router } from "express";
import { Pool } from "pg";
import { HtmlConnector } from "../services/Connectors/HtmlConnector";
import { PdfConnector } from "../services/Connectors/PdfConnector";
import { OpenAPIConnector } from "../services/Connectors/OpenAPIConnector";
import { Connector } from "../services/Connectors/Base";
import crypto from "crypto";
import yaml from "yaml";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function pickConnector(urlStr: string, preferred?: string): Connector {
  const u = new URL(urlStr);
  const candidates: Connector[] = [
    new OpenAPIConnector(),
    new PdfConnector(),
    new HtmlConnector()
  ];

  if (preferred) {
    const map: Record<string, number> = { api: 0, pdf: 1, html: 2 };
    const ix = map[preferred] ?? -1;
    if (ix >= 0 && candidates[ix].canHandle(u)) return candidates[ix];
  }

  for (const c of candidates) {
    if (c.canHandle(u)) return c;
  }
  return new HtmlConnector();
}

async function upsertPack(source_id: string, pack: any) {
  const { meta, clauses, yamlSnapshot, hash } = pack;
  const pr = await pool.query(
    `insert into edcat.reg_packs (source_id,name,publisher,jurisdiction,version,yaml_snapshot,hash)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [source_id, meta.name, meta.publisher || null, meta.jurisdiction || null, meta.version || null, yamlSnapshot, hash]
  );
  const pack_id = pr.rows[0].id;

  const text = `insert into edcat.reg_clauses (pack_id, clause_id, title, level, text, modality, tags)
                values ($1,$2,$3,$4,$5,$6,$7)`;
  for (const c of clauses) {
    await pool.query(text, [pack_id, c.id, c.title || null, c.level || 1, c.text, c.modality || [], c.tags || []]);
  }
  return pack_id;
}

router.post("/ingest", async (req, res) => {
  try {
    const { authority, reg_id, label, url, preferred_kind } = req.body || {};
    if (!authority || !reg_id || !label || !url) return res.status(400).json({ error: "MISSING_FIELDS" });

    const sr = await pool.query(
      `insert into edcat.reg_sources(authority, reg_id, label, url, enabled, preferred_kind)
       values ($1,$2,$3,$4,true,$5)
       on conflict (authority, reg_id) do update set label=excluded.label, url=excluded.url, preferred_kind=excluded.preferred_kind
       returning id`, [authority, reg_id, label, url, preferred_kind || null]);
    const source_id = sr.rows[0].id;

    const connector = pickConnector(url, preferred_kind);
    const f = await connector.fetch(new URL(url));
    const pack = await connector.normalize(f);

    const hr = await pool.query(`select id from edcat.reg_packs where source_id=$1 and hash=$2`, [source_id, pack.hash]);
    if (hr.rowCount) return res.json({ status: "UNCHANGED" });

    const pack_id = await upsertPack(source_id, pack);
    await pool.query(`insert into edcat.compliance_events(kind, scope, summary, counters, hash)
                      values ('ingest', $1, $2, $3, $4)`,
                      [JSON.stringify({ authority, reg_id, url }), "ingest completed", JSON.stringify({ clauses: pack.clauses.length }), pack.hash]);

    res.json({ status: "OK", pack_id, clause_count: pack.clauses.length });
  } catch (e: any) {
    res.status(500).json({ error: "INGEST_FAILED", detail: e?.message || String(e) });
  }
});

router.post("/refresh", async (_req, res) => {
  let total = 0, failures = 0, flagged = 0;
  const { rows: sources } = await pool.query(`select id, authority, reg_id, label, url, preferred_kind from edcat.reg_sources where enabled=true`);
  for (const s of sources) {
    try {
      total++;
      const connector = pickConnector(s.url, s.preferred_kind || undefined);
      const f = await connector.fetch(new URL(s.url));
      const pack = await connector.normalize(f);
      const hr = await pool.query(`select id from edcat.reg_packs where source_id=$1 and hash=$2`, [s.id, pack.hash]);
      if (hr.rowCount) continue;
      await upsertPack(s.id, pack);
      flagged++;
    } catch (e) {
      failures++;
    }
  }
  await pool.query(`insert into edcat.compliance_events(kind, scope, summary, counters)
                    values ('refresh', $1, $2, $3)`,
                   [JSON.stringify({ sources: sources.length }), "refresh run", JSON.stringify({ total, flagged, failures })]);
  const code = flagged || failures ? 207 : 200;
  res.status(code).json({ success: true, total, flagged, failures });
});

export default router;

