export type Candidate = { authority: string; reg_id: string; label: string; score: number };

export function decideClarification(
  cands: Candidate[], 
  parsed: {authorityHint?: string; numberHint?: string; topicHints: string[]}
):
  | { kind: "confident"; pick: Candidate }
  | { kind: "ask"; question: string; options: Candidate[] } {

  const top = cands[0];
  if (!top) return { kind: "ask", question: "Which regulator or part are you asking about?", options: [] };

  const margin = cands[1] ? top.score - cands[1].score : top.score;
  const strong = (parsed.numberHint && parsed.numberHint.length >= 5) ? 0.15 : 0;
  if (top.score + strong >= 0.55 && margin >= 0.12) return { kind: "confident", pick: top };

  const opts = cands.slice(0,3);
  const who = parsed.authorityHint ? parsed.authorityHint.toUpperCase() : "regulator";
  const part = parsed.numberHint ? ` around ${parsed.numberHint}` : "";
  const optText = opts.map((o,i)=> `${i+1}) ${o.label}`).join("  ");
  const q = `To be precise, do you mean which ${who}${part}? ${optText}`;
  return { kind: "ask", question: q, options: opts };
}

