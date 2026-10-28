/**
 * Regulatory Ingestion Routes
 * Single-URL ingestion endpoint for regulatory content
 */

import express from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';
import yaml from 'js-yaml';
import { query } from '../database/connection.js';
import { upsertSource, savePack, saveClauses, updateSourceAfterCrawl, sha256 } from '../database/repos/regs.repo.js';

const router = express.Router();

function mustNet() {
  if ((process.env.ENABLE_NET || '').toLowerCase() !== 'true') {
    const e = new Error('Networking disabled. Set ENABLE_NET=true.');
    e.code = 'NET_DISABLED';
    throw e;
  }
}

function looksLikeHTML(s) {
  return /<html[\s>]/i.test(s) || /<(section|div|p)[\s>]/i.test(s);
}

function clean(s) {
  return s
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchAsText(url, ua) {
  const res = await fetch(url, {
    headers: { 'user-agent': ua, accept: '*/*' },
    redirect: 'follow',
    timeout: 45000
  });

  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status}: ${url}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const sig = buf.slice(0, 4).toString('hex');

  if (sig === '25504446') {
    // PDF
    const data = await pdfParse(buf);
    return clean(data.text || '');
  }

  const s = buf.toString('utf8');
  if (looksLikeHTML(s)) {
    const $ = cheerio.load(s);
    const text = $('body').text();
    return clean(text);
  }

  return clean(s);
}

function detectModalities(text) {
  const t = text.toLowerCase();
  const m = [];
  if (/\bshall\b/.test(t)) m.push('shall');
  if (/\bmust\b/.test(t)) m.push('must');
  if (/\bwill\b/.test(t)) m.push('will');
  if (/\bshould\b/.test(t)) m.push('should');
  if (/\bmay\b/.test(t)) m.push('may');
  return m;
}

function normalizeToClauses(label, raw) {
  const lines = raw.split(/\n+/);
  const clauses = [];
  let buf = [];
  let currentId = '';
  let begin = 0;
  let cursor = 0;

  function idLevel(id) {
    const dots = (id.match(/[.\(]/g) || []).length;
    return Math.min(1 + dots, 3);
  }

  function autoId(n) {
    return `C${String(n).padStart(4, '0')}`;
  }

  function flush(title) {
    if (!buf.length) return;
    const body = buf.join(' ').trim();
    const id = currentId || autoId(clauses.length + 1);
    clauses.push({
      id,
      title,
      level: idLevel(id),
      text: body,
      modality: detectModalities(body)
    });
    buf = [];
    currentId = '';
  }

  for (const line of lines) {
    cursor += line.length + 1;
    const mCFR = line.match(/§?\s*([0-9]{2,3}\.[0-9]+(?:\([a-z0-9]\))*)/); // 21.137(e)
    const mEASA = line.match(/([0-9]{3}\.[A-Z]\.[0-9]+(?:\([a-z0-9]\))*)/); // 145.A.65(b)

    if (mCFR || mEASA) {
      flush();
      currentId = (mCFR?.[1] || mEASA?.[1]);
      buf.push(line.trim());
      continue;
    }

    if (/^\s*[A-Z][A-Za-z0-9 .\-()]{3,}\s*$/.test(line) && buf.length > 20) {
      flush(line.trim());
      continue;
    }

    buf.push(line.trim());
  }

  flush();
  return clauses;
}

/**
 * POST /api/regs/ingest
 * Ingest a single regulatory URL
 */
router.post('/ingest', async (req, res) => {
  try {
    mustNet();

    // Ensure edcat schema exists (graceful fallback if migration hasn't run)
    try {
      await query('CREATE SCHEMA IF NOT EXISTS edcat');
    } catch (schemaErr) {
      // Schema might already exist or we might not have permissions - continue anyway
      console.log('Note: Could not create edcat schema (may already exist):', schemaErr.message);
    }

    const { authority, reg_id, label, url, force } = req.body || {};

    if (!authority || !reg_id || !label || !url) {
      return res.status(400).json({ error: 'BAD_REQUEST', detail: 'Missing required fields: authority, reg_id, label, url' });
    }

    const ua = 'Conform-Edge-RegCrawler/1.0';
    const text = await fetchAsText(url, ua);

    if (!text || text.length < 200) {
      return res.status(422).json({ error: 'UNPARSEABLE', detail: 'Too little text extracted' });
    }

    const clauses = normalizeToClauses(label, text);
    if (!clauses.length) {
      return res.status(422).json({ error: 'NO_CLAUSES', detail: 'No clauses detected in extracted text' });
    }

    const meta = {
      name: label,
      version: new Date().toISOString().slice(0, 10),
      publisher: authority.toUpperCase(),
      scope: 'Regulatory',
      jurisdiction: authority.toUpperCase()
    };

    const pack = { meta, clauses };
    const packYaml = yaml.dump(pack, { lineWidth: 120 });
    const hash = sha256(packYaml);

    const sourceId = await upsertSource(authority, reg_id, label, url);

    // Skip if hash unchanged (unless force)
    if (!force) {
      try {
        const r = await query(`SELECT last_hash FROM edcat.reg_sources WHERE id = $1`, [sourceId]);
        if (r.rows?.[0]?.last_hash === hash) {
          return res.status(200).json({ status: 'UNCHANGED', clause_count: clauses.length });
        }
      } catch (dbErr) {
        // Table might not exist yet - continue with save
        console.log('Note: Could not check last_hash (table may not exist):', dbErr.message);
      }
    }

    const packId = await savePack(sourceId, meta.version, hash, meta, text, packYaml);
    await saveClauses(packId, clauses);
    await updateSourceAfterCrawl(sourceId, 200, hash);

    return res.json({ status: 'OK', pack_id: packId, clause_count: clauses.length });
  } catch (e) {
    const code = e.code === 'NET_DISABLED' ? 403 : 500;
    console.error('Reg ingest error:', e);
    return res.status(code).json({ error: e.code || 'INGEST_FAILED', detail: e.message || String(e) });
  }
});

export default router;

