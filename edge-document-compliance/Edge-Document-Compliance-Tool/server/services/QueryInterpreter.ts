export type ParsedQuery = {
  authorityHint?: "faa"|"easa"|"ukcaa"|"afac"|"caac";
  numberHint?: string;
  clauseSuffix?: string;
  topicHints: string[];
  askKind: "clause"|"list"|"search"|"where-covered"|"compare"|"explain"|"presence"|"capabilities"|"list-standards"|"list-uploads";
  raw: string;
  standardHints: string[]; // e.g., ["AS9100","AS9100D","ISO 9001"]
};

const AUTH_RE = /(faa|easa|uk\s*CAA|caac|afac)/i;
const CFR_RE  = /(?:14\s*CFR\s*)?(\d{2,3}\.\d+(?:\([a-z0-9]\))?)/i;
const EASA_RE = /(145\.[A-Z]\.\d+(?:\([a-z0-9]\))?|\b145\b)/i;

const KINDS: Array<[RegExp, ParsedQuery["askKind"]]> = [
  [/^\s*$/i, "capabilities"],
  [/\b(can|do)\s+you\s+(see|access|find|locate|read)\b/i, "presence"],
  [/\bdo\s+you\s+have\b/i, "presence"],
  [/\blist\b.*\b(standards|regs|requirements)\b/i, "list-standards"],
  [/\blist\b.*\b(uploads|files|documents)\b/i, "list-uploads"],
  [/\bwhat\s+does\b|\bshow\b/i, "clause"],
  [/\bwhere\s+do\s+we\s+cover\b/i, "where-covered"],
  [/\bcompare\b/i, "compare"],
  [/\bexplain\b/i, "explain"],
  [/\bsearch\b|\bfind\b/i, "search"]
];

const STANDARD_ALIASES: Record<string,string[]> = {
  "AS9100": ["AS 9100","AS9100D","AS9100 Rev D","AS9100:2016","9100"],
  "AS9110": ["AS 9110","AS9110C","AS9110 Rev C","9110"],
  "AS9120": ["AS 9120","AS9120B","AS9120 Rev B","9120"],
  "ISO9001": ["ISO 9001","ISO9001:2015","9001"],
  "EASA PART-145": ["EASA 145","Part 145","145.A", "145"],
  "FAA 14 CFR": ["14 CFR","CFR Title 14","FAR"]
};

function detectStandardHints(q: string): string[] {
  const out = new Set<string>();
  const s = q.toLowerCase();

  for (const canon of Object.keys(STANDARD_ALIASES)) {
    const aliases = [canon, ...STANDARD_ALIASES[canon]];
    for (const a of aliases) {
      const re = new RegExp(`\\b${a.replace(/\s+/g,"\\s*")}\\b`, "i");
      if (re.test(q)) out.add(canon);
    }
  }

  // Special case: "AS9100" digits
  if (/\bas\s*9100\b/i.test(q)) out.add("AS9100");
  if (/\b9100\b/.test(q)) out.add("AS9100");

  return Array.from(out);
}

export function parseUserText(q: string): ParsedQuery {
  const s = (q||"").trim();
  const authority = (s.match(AUTH_RE)?.[1] || "").toLowerCase().replace(/\s+/g,"");
  const number  = s.match(CFR_RE)?.[1] || s.match(EASA_RE)?.[1] || "";
  const clauseSuffix = (number.match(/\(([a-z0-9])\)$/)?.[0]) || "";
  const askKind = (KINDS.find(([re])=> re.test(s))?.[1]) || (number ? "clause" : "search");
  const topics = Array.from(new Set(
    s.toLowerCase().match(/\b(training|competence|inspection|test|verify|release|record|retention|risk|audit|calibration|configuration)\b/g) || []
  ));
  const authorityHint = (authority || undefined) as any;
  const standardHints = detectStandardHints(s);
  return { authorityHint, numberHint: number || undefined, clauseSuffix: clauseSuffix || undefined, topicHints: topics, askKind, raw: s, standardHints };
}
