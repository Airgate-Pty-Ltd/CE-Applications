import fetch from "node-fetch";
import pdfParse from "pdf-parse";
import { Connector, FetchResult, NormalizedPack } from "./Base";
import { normalizeCFR } from "../Normalizers/CFRNormalizer";
import { normalizeEASA } from "../Normalizers/EASANormalizer";

/**
 * A PDF fetcher with simple auto-normalization:
 * - If URL hints at CFR (faa.gov / eCFR) → CFR normalizer
 * - If URL hints at EASA Part-145 → EASA normalizer
 * - Else: single clause with whole text (fallback)
 */
export class PdfConnector implements Connector {
  canHandle(u: URL): boolean {
    return ["http:", "https:"].includes(u.protocol) && /\.pdf(\?|$)/i.test(u.pathname);
  }

  async fetch(u: URL): Promise<FetchResult> {
    const r = await fetch(u.toString(), { headers: { "user-agent":"EDCAT/1.0" } as any });
    const buf = await r.buffer();
    const parsed = await pdfParse(buf);
    return {
      rawText: parsed.text,
      meta: { 
        url: u.toString(), 
        bytes: buf.length, 
        fetchedAt: new Date().toISOString(), 
        contentType: r.headers.get("content-type") || undefined 
      }
    };
  }

  async normalize(f: FetchResult): Promise<NormalizedPack> {
    const url = f.meta.url.toLowerCase();

    // Heuristics to select parser
    if (/ecfr|faa\.gov|14\W*cfr/.test(url)) {
      return normalizeCFR(f.rawText, { name: "14 CFR (PDF)" });
    }
    if (/easa|part-145|145\.a\./.test(url)) {
      return normalizeEASA(f.rawText, "145", { name: "EASA Part-145 (PDF)" });
    }

    // Fallback: one clause with entire text
    const { sha256 } = await import("../TextUtils");
    const yaml = (await import("yaml")).default;
    const meta = { name: "PDF Source", publisher: undefined, jurisdiction: undefined, version: new Date().toISOString() };
    const clauses = [{ id: "UNKNOWN", title: undefined, level: 1, text: f.rawText, modality: [], tags: [] }];
    const yamlSnapshot = yaml.stringify({ meta, clauses });
    const hash = sha256(yamlSnapshot);
    return { meta, clauses, yamlSnapshot, hash };
  }
}

