import yaml from "yaml";
import { sha256, extractModality, extractTags } from "../TextUtils";
import { NormalizedPack } from "../Connectors/Base";

/**
 * Normalizes Title 14 CFR style text into clauses.
 * Splits on "§" headers like "§ 21.137(e)" and carries text until next §-header.
 */
export function normalizeCFR(rawText: string, metaHint?: Partial<NormalizedPack["meta"]>): NormalizedPack {
  const lines = rawText
    .replace(/\r/g, "")
    .split("\n")
    .map(l => l.replace(/\s+$/,""));

  // Identify clause headers: e.g., "§ 21.137" or "§21.137(e)" or "Sec. 21.137"
  const headerRe = /^\s*(?:§|Sec\.)\s*([0-9]{1,3}\.[0-9]+(?:\([a-z0-9]\))*)\s*(.*)$/i;

  type Clause = { id: string; title?: string; level: number; text: string; modality: string[]; tags: string[]; };
  const clauses: Clause[] = [];
  let currentId = "";
  let currentTitle = "";
  let buf: string[] = [];

  function pushCurrent() {
    if (!currentId) return;
    const text = buf.join("\n").trim();
    const modality = extractModality(text);
    const tags = extractTags(text);
    clauses.push({ id: currentId, title: currentTitle || undefined, level: 1, text, modality, tags });
  }

  for (const l of lines) {
    const m = l.match(headerRe);
    if (m) {
      // new clause
      if (currentId) pushCurrent();
      currentId = m[1].trim();
      currentTitle = (m[2] || "").trim();
      buf = [];
    } else {
      // keep accumulating
      buf.push(l);
    }
  }
  pushCurrent();

  const meta = {
    name: metaHint?.name || "14 CFR (detected)",
    publisher: metaHint?.publisher || "FAA",
    jurisdiction: metaHint?.jurisdiction || "US",
    version: metaHint?.version || new Date().toISOString()
  };
  const yamlSnapshot = yaml.stringify({ meta, clauses });
  const hash = sha256(yamlSnapshot);

  return { meta, clauses, yamlSnapshot, hash };
}

