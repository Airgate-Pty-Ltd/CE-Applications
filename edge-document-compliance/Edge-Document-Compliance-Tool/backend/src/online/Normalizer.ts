/**
 * Text Normalizer
 * Segments text into structured clauses
 */

type Clause = {
  id: string;
  title?: string;
  level: number;
  text: string;
  char_start?: number;
  char_end?: number;
};

export async function normalizeToClauses(label: string, text: string): Promise<Clause[]> {
  const lines = text.split(/\n+/);
  const clauses: Clause[] = [];
  let buf: string[] = [];
  let currentId = "";
  let begin = 0;
  let cursor = 0;

  function flush(titleGuess?: string) {
    if (buf.length === 0) return;

    const body = buf.join(" ").trim();
    if (body.length < 10) {
      // Skip very short clauses
      buf = [];
      return;
    }

    const id = currentId || autoId(clauses.length + 1);
    clauses.push({
      id,
      title: titleGuess,
      level: idLevel(id),
      text: body,
      char_start: begin,
      char_end: cursor
    });

    buf = [];
    currentId = "";
    begin = cursor;
  }

  for (const line of lines) {
    cursor += line.length + 1;
    const trimmed = line.trim();

    // Match CFR patterns: § 21.137(e) or 21.137(e) or Part 145
    const mCFR = trimmed.match(/§?\s*([0-9]{2,3}\.[0-9]+(?:\([a-z0-9]\))*)/i);
    // Match EASA patterns: 145.A.65(b)
    const mEASA = trimmed.match(/([0-9]{3}\.[A-Z]\.[0-9]+(?:\([a-z0-9]\))*)/i);
    // Match Part patterns: Part 145, Part 21, etc.
    const mPart = trimmed.match(/Part\s+([0-9]+[A-Z]?)/i);

    if (mCFR || mEASA || mPart) {
      // New clause boundary
      flush();
      currentId = (mCFR?.[1] || mEASA?.[1] || `Part-${mPart?.[1]}`)!;
      buf.push(trimmed);
      continue;
    }

    // Headings often all-caps or Title-case followed by dots
    if (
      /^\s*[A-Z][A-Za-z0-9 .\-()]{3,}\s*$/.test(trimmed) &&
      buf.length > 20 &&
      trimmed.length < 100
    ) {
      flush(trimmed);
      continue;
    }

    buf.push(trimmed);
  }

  flush();
  return clauses;
}

function autoId(n: number): string {
  return `C${String(n).padStart(4, "0")}`;
}

function idLevel(id: string): number {
  // Very rough heuristic: more dots/parentheses → deeper level
  const dots = (id.match(/[.\(]/g) || []).length;
  return Math.min(1 + dots, 3);
}

