/**
 * Text Normalizer
 * Segments text into structured clauses
 */

export async function normalizeToClauses(label, text) {
  const lines = text.split(/\n+/);
  const clauses = [];
  let buf = [];
  let currentId = "";
  let begin = 0;
  let cursor = 0;

  function flush(titleGuess) {
    if (buf.length === 0) return;

    const body = buf.join(" ").trim();
    if (body.length < 10) {
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

    const mCFR = trimmed.match(/§?\s*([0-9]{2,3}\.[0-9]+(?:\([a-z0-9]\))*)/i);
    const mEASA = trimmed.match(/([0-9]{3}\.[A-Z]\.[0-9]+(?:\([a-z0-9]\))*)/i);
    const mPart = trimmed.match(/Part\s+([0-9]+[A-Z]?)/i);

    if (mCFR || mEASA || mPart) {
      flush();
      currentId = (mCFR?.[1] || mEASA?.[1] || `Part-${mPart?.[1]}`);
      buf.push(trimmed);
      continue;
    }

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

function autoId(n) {
  return `C${String(n).padStart(4, "0")}`;
}

function idLevel(id) {
  const dots = (id.match(/[.\(]/g) || []).length;
  return Math.min(1 + dots, 3);
}
