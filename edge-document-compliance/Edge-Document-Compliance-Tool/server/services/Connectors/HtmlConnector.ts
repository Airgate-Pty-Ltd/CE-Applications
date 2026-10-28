import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { sha256 } from "../TextUtils";
import yaml from "yaml";
import { Connector, FetchResult, NormalizedPack } from "./Base";

export class HtmlConnector implements Connector {
  canHandle(u: URL): boolean {
    return ["http:", "https:"].includes(u.protocol);
  }

  async fetch(u: URL): Promise<FetchResult> {
    const r = await fetch(u.toString(), { headers: { "user-agent":"EDCAT/1.0" } as any });
    const buf = await r.buffer();
    return { 
      rawText: buf.toString("utf8"), 
      meta: { 
        url: u.toString(), 
        bytes: buf.length, 
        fetchedAt: new Date().toISOString(), 
        contentType: r.headers.get("content-type") || undefined 
      } 
    };
  }

  async normalize(f: FetchResult): Promise<NormalizedPack> {
    const $ = cheerio.load(f.rawText);
    const text = $("body").text().replace(/\s+\n/g, "\n").trim();

    // Heuristics
    if (/ecfr|faa\.gov|14\W*cfr|§\s*\d{1,3}\.\d+/.test(text.toLowerCase())) {
      const { normalizeCFR } = await import("../Normalizers/CFRNormalizer");
      return normalizeCFR(text, { name: "14 CFR (HTML)" });
    }
    if (/easa|part-145|145\.a\./i.test(text)) {
      const { normalizeEASA } = await import("../Normalizers/EASANormalizer");
      return normalizeEASA(text, "145", { name: "EASA Part-145 (HTML)" });
    }

    // Fallback: single clause
    const meta = { name: "HTML Source", publisher: undefined, jurisdiction: undefined, version: new Date().toISOString() };
    const clauses = [{ id: "UNKNOWN", title: undefined, level: 1, text, modality: [], tags: [] }];
    const yamlSnapshot = yaml.stringify({ meta, clauses });
    const hash = sha256(yamlSnapshot);
    return { meta, clauses, yamlSnapshot, hash };
  }
}

