import type { Request, Response } from 'express';
import crypto from 'crypto';

/**
 * POST /api/ai/ingest
 * Body: { tenant_id, doc_id, title?, kind, file_path }
 *  - Parses the document, chunks into page/line snippets, computes sha256, stores in ai_source_doc & retrieval index.
 */
export async function ingestHandler(req: Request, res: Response) {
  const { tenant_id, doc_id, title, kind = 'customer', file_path } = req.body || {};
  if (!tenant_id || !doc_id || !file_path) return res.status(400).json({ error: 'Missing required fields' });

  // Parse (placeholder - replace with your PDF/Word parser)
  const pages = await parser.parse(file_path); // returns [{page, lines:[{n,text}]}]
  const text = pages.map(p => p.lines.map(l => l.text).join('\n')).join('\n');
  const sha256 = crypto.createHash('sha256').update(text).digest('hex');

  const sourceId = await db.upsertSourceDoc({ tenant_id, doc_id, title, kind, sha256, pages: pages.length });

  // Build snippets to index
  const snippets:any[] = [];
  for (const p of pages) {
    let buffer = [];
    let start = null;
    for (const ln of p.lines) {
      if (start === null) start = ln.n;
      buffer.push(ln.text);
      if (buffer.join(' ').length > 600) { // simple chunker
        snippets.push({ doc_id, page: p.page, line_start: start, line_end: ln.n, text: buffer.join(' ') });
        buffer = [];
        start = null;
      }
    }
    if (buffer.length) {
      snippets.push({ doc_id, page: p.page, line_start: start, line_end: p.lines[p.lines.length-1].n, text: buffer.join(' ') });
    }
  }

  await retrievalIndex.upsert(tenant_id, doc_id, snippets);
  return res.status(200).json({ source_doc_id: sourceId, pages: pages.length, snippets: snippets.length, sha256 });
}

// placeholders
const parser = { parse: async (file_path:string)=>[{page:1,lines:[{n:1,text:'Example'}]}] };
const db = { upsertSourceDoc: async (row:any)=>'0000-0000' };
const retrievalIndex = { upsert: async (tenant_id:string, doc_id:string, snippets:any[])=>{} };
