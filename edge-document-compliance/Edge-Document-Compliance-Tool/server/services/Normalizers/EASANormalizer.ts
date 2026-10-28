import yaml from "yaml";
import { sha256, extractModality, extractTags } from "../TextUtils";
import { NormalizedPack } from "../Connectors/Base";

/**
 * Normalizes EASA Part-145 style text (145.A.30, 145.A.35, 145.A.65, etc.)
 * Splits on "145.A.xx" headers and carries text until next header.
 */
export function normalizeEASA(rawText: string, part = "145", metaHint?: Partial<NormalizedPack["meta"]>): NormalizedPack {
  const text = rawText.replace(/\r/g,"");
  const re = new RegExp(`(^|\\n)\\s*(${part}\\.A\\.[0-9]+[a-z]?)\\s*(.*)`, "gi");

  const headers: Array<{ idx: number; id: string; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    headers.push({ idx: m.index + (m[1]?.length || 0), id: m[2].trim(), title: (m[3] || "").trim() });
  }
  headers.sort((a,b)=> a.idx - b.idx);

  type Clause = { id: string; title?: string; level: number; text: string; modality: string[]; tags: string[]; };
  const clauses: Clause[] = [];
  for (let i=0;i<headers.length;i++) {
    const h = headers[i];
    const start = h.idx;
    const end = (i+1 < headers.length) ? headers[i+1].idx : text.length;
    const body = text.substring(start, end).split("\n").slice(1).join("\n").trim(); // drop header line
    const modality = extractModality(body);
    const tags = extractTags(body);
    clauses.push({ id: h.id, title: h.title || undefined, level: 1, text: body, modality, tags });
  }

  const meta = {
    name: metaHint?.name || `EASA Part-${part} (detected)`,
    publisher: metaHint?.publisher || "EASA",
    jurisdiction: metaHint?.jurisdiction || "EU",
    version: metaHint?.version || new Date().toISOString()
  };
  const yamlSnapshot = yaml.stringify({ meta, clauses });
  const hash = sha256(yamlSnapshot);
  return { meta, clauses, yamlSnapshot, hash };
}

