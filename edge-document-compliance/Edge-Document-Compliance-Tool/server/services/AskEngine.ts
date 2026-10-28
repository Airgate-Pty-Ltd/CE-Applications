import { Pool } from "pg";
import { parseUserText } from "./QueryInterpreter";
import { decideClarification } from "./Clarifier";
import { personaOpening, quoteClauses, multiSolution, auditorFollowups } from "./AnswerComposer";
import { LookupRepo } from "../db/repo/LookupRepo";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const repo = new LookupRepo(pool);

function standardTermsFromHints(hints: string[]): string[] {
  if (!hints || !hints.length) return [];

  // Map canonicals to search terms
  const map: Record<string,string[]> = {
    "AS9100": ["AS9100","AS 9100","9100"],
    "AS9110": ["AS9110","AS 9110","9110"],
    "AS9120": ["AS9120","AS 9120","9120"],
    "ISO9001": ["ISO 9001","ISO9001","9001"],
    "EASA PART-145": ["EASA 145","Part 145","145.A","145"]
  };

  const out = new Set<string>();
  for (const h of hints) (map[h]||[h]).forEach(t=> out.add(t));
  return Array.from(out);
}

async function presenceAnswer(standardHints: string[]) {
  const terms = standardTermsFromHints(standardHints);
  if (!terms.length) {
    // If no explicit standard mentioned, list a few top standards and ask user to confirm
    const { rows } = await repo.listAllStandards(10);
    const list = rows.map((r:any)=> `- ${r.label} (${r.authority.toUpperCase()} ${r.reg_id})${r.last_ingested ? " — ingested" : ""}`).join("\n");
    return {
      type: "answer",
      opening: "I looked through your libraries.",
      quoted: "",
      options: `I can see these standards registered:\n${list}\n\nTell me which one to open, or say "capture to library" with a URL to ingest a new one.`,
      followups: "**Next:** Would you like me to open AS9100 or another standard from this list?"
    };
  }

  // Search packs, sources, and uploads for each term
  const found: string[] = [];
  const notFound: string[] = [];
  const details: string[] = [];

  for (const term of terms) {
    const packs = await repo.findStandardPacksLike(term);
    const sources = await repo.findStandardSourcesLike(term);
    const uploads = await repo.findUploadsLike(term);

    if (packs.rowCount || sources.rowCount || uploads.rowCount) {
      found.push(term);
      if (packs.rowCount) {
        details.push(`**Ingested packs for "${term}"**:\n` +
          packs.rows.map((p:any)=> `• ${p.label} — version ${p.version || "n/a"} — ingested ${new Date(p.created_at).toISOString().slice(0,10)}`).join("\n"));
      }
      if (sources.rowCount) {
        details.push(`**Registered sources for "${term}"**:\n` +
          sources.rows.map((s:any)=> `• ${s.label} (${s.authority.toUpperCase()} ${s.reg_id}) — ${s.url || "[no URL saved]"}`).join("\n"));
      }
      if (uploads.rowCount) {
        details.push(`**Raw uploads matching "${term}"**:\n` +
          uploads.rows.map((u:any)=> `• ${u.filename} (${u.mimetype}, ${Math.round(u.size_bytes/1024)} KB)`).join("\n"));
      }
    } else {
      notFound.push(term);
    }
  }

  const opening = found.length
    ? `Yes — I can see ${found.length} match${found.length>1?"es":""} for your standard in the libraries.`
    : `I don't see that standard in the libraries yet.`;

  const quoted = ""; // presence answers don't quote clauses

  const nextSteps: string[] = [];
  if (found.length) {
    nextSteps.push("Open a specific pack and quote clauses (e.g., "show AS9100 8.5.1.2").");
    nextSteps.push("Run a gap check against a client procedure (e.g., "gap P-720-01 vs AS9100 7.2").");
  }
  if (notFound.length) {
    nextSteps.push(`Capture a regulator link for ${notFound.join(", ")} so I can ingest it (use your "Capture to Library" button).`);
    nextSteps.push("Or upload a PDF/DOCX of the standard and I'll parse it.");
  }

  return {
    type: "answer",
    opening,
    quoted,
    options: details.join("\n\n") || "No matching entries were found.",
    followups: `**Next:** ${nextSteps.join(" ")}`
  };
}

async function findRegCandidates(authority?: string, numberHint?: string, topK = 5) {
  const params: any[] = [];
  let where = `enabled = true`;
  if (authority) { params.push(authority); where += ` and authority = $${params.length}`; }
  if (numberHint) {
    params.push(numberHint);
    where += ` and (similarity(reg_id, $${params.length}) > 0.2 or similarity(label, $${params.length}) > 0.2)`;
  }
  const sql = `
    select authority, reg_id, label,
      greatest(
        case when $1::text is null then 0 else similarity(reg_id, $2::text) end,
        case when $1::text is null then 0 else similarity(label, $2::text) end
      ) as sim
    from edcat.reg_sources
    where ${where}
    order by sim desc nulls last, label asc
    limit ${topK}`;
  const { rows } = await pool.query(sql, [numberHint || null, numberHint || null]);
  return rows.map((r: any)=> ({ authority: r.authority, reg_id: r.reg_id, label: r.label, score: r.sim || 0 }));
}

async function packExists(authority: string, reg_id: string) {
  const r = await pool.query(`
    select 1 from edcat.reg_packs p join edcat.reg_sources s on s.id=p.source_id
    where s.authority=$1 and s.reg_id=$2 limit 1`, [authority, reg_id]);
  return !!r.rowCount;
}

async function sourceUrl(authority: string, reg_id: string) {
  const r = await pool.query(`select url from edcat.reg_sources where authority=$1 and reg_id=$2`, [authority, reg_id]);
  return r.rows[0]?.url || null;
}

async function ingestOnce(authority: string, reg_id: string, label: string, url: string) {
  // Simple internal call: reuse regs.routes service (or directly call the service if exported)
  const fetch = (await import("node-fetch")).default as any;
  const resp = await fetch(`${process.env.PUBLIC_URL || ""}/api/regs/ingest`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ authority, reg_id, label, url })
  });
  if (!resp.ok) throw new Error(`INGEST_FAILED_${resp.status}`);
}

async function getClauses(authority: string, reg_id: string, numberHint?: string, limit = 8) {
  const sql = `
    with latest as (
      select p.id
      from edcat.reg_packs p join edcat.reg_sources s on s.id=p.source_id
      where s.authority=$1 and s.reg_id=$2
      order by p.created_at desc
      limit 1
    )
    select clause_id, title, text
    from edcat.reg_clauses
    where pack_id=(select id from latest)
    order by case when $3::text is not null then similarity(clause_id, $3) else 0 end desc nulls last
    limit ${limit}`;
  const { rows } = await pool.query(sql, [authority, reg_id, numberHint || null]);
  return rows;
}

export async function ask(q: string) {
  const parsed = parseUserText(q);

  // NEW: Capabilities banner only on empty question
  if (parsed.askKind === "capabilities") {
    return {
      type: "answer",
      opening: "I'm your bounded QMS auditor. Ask me about clauses, visibility, or to run a check.",
      quoted: "",
      options: `Examples:
- "Can you see AS9100?"
- "Show 21.137(e)"
- "List my uploaded files"
- "Gap our P-720-01 against AS9100 7.2"
- "Refresh regulations"`,
      followups: "**Tip:** If you paste a URL to a regulator page, say "capture to library" and I'll ingest it."
    };
  }

  // NEW: Presence / visibility questions ("Can you see AS9100?")
  if (parsed.askKind === "presence" || parsed.askKind === "list-standards") {
    return await presenceAnswer(parsed.standardHints);
  }

  // NEW: List uploads quickly
  if (parsed.askKind === "list-uploads") {
    const { rows } = await repo.listUploads(25);
    const list = rows.length
      ? rows.map((u:any)=> `• ${u.filename} (${u.mimetype}, ${Math.round(u.size_bytes/1024)} KB) — ${new Date(u.created_at).toISOString().slice(0,10)}`).join("\n")
      : "No uploads yet.";
    return {
      type: "answer",
      opening: "Here are your most recent uploads.",
      quoted: "",
      options: list,
      followups: "**Next:** Say "analyze <file>" for Excel KPI extraction, or "ingest" to parse a standard."
    };
  }

  // existing logic continues below (clause/clarify/ingest/quote)
  const candidates = await findRegCandidates(parsed.authorityHint, parsed.numberHint, 5);
  const decision = decideClarification(candidates, parsed);

  if (decision.kind === "ask") {
    return {
      type: "clarify",
      question: decision.question,
      options: decision.options.map(o=> ({ authority: o.authority, reg_id: o.reg_id, label: o.label }))
    };
  }

  const pick = decision.pick;
  if (!(await packExists(pick.authority, pick.reg_id))) {
    const url = await sourceUrl(pick.authority, pick.reg_id);
    if (url && (process.env.ENABLE_NET || "").toLowerCase() === "true") {
      await ingestOnce(pick.authority, pick.reg_id, pick.label, url);
    }
  }

  const clauses = await getClauses(pick.authority, pick.reg_id, parsed.numberHint, 8);
  if (!clauses.length) return { type: "no-results", message: `No clauses found in ${pick.label}.` };

  const opening = personaOpening();
  const quoted = quoteClauses(pick.label, clauses);
  const topic = (parsed.topicHints[0] || "");
  const options = multiSolution(topic);
  const followups = auditorFollowups(topic);

  return {
    type: "answer",
    opening, quoted, options, followups,
    source: { authority: pick.authority, reg_id: pick.reg_id }
  };
}
