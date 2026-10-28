import crypto from "crypto";

export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// crude modality extraction for auditing strength
export function extractModality(text: string): string[] {
  const t = text.toLowerCase();
  const out = new Set<string>();
  if (/\bshall\b/.test(t)) out.add("shall");
  if (/\bmust\b/.test(t)) out.add("must");
  if (/\brequired\b/.test(t)) out.add("required");
  if (/\bwill\b/.test(t)) out.add("will");
  if (/\bensure\b/.test(t)) out.add("ensure");
  if (/\bmaintain\b/.test(t)) out.add("maintain");
  return Array.from(out);
}

// simple topic tags
export function extractTags(text: string): string[] {
  const t = text.toLowerCase();
  const tags = new Set<string>();
  const add = (k: string) => tags.add(k);

  if (/\bcompetence|training|awareness\b/.test(t)) add("training");
  if (/\bcalibration|measurement|equipment|msa\b/.test(t)) add("measurement");
  if (/\binspection|test|verify\b/.test(t)) add("inspection");
  if (/\brecord|retention|documented information\b/.test(t)) add("records");
  if (/\bnonconform|corrective action|car|ncr\b/.test(t)) add("nonconformance");
  if (/\brisk|mitigation|fmea|priority\b/.test(t)) add("risk");
  if (/\brelease|acceptance|authority\b/.test(t)) add("release");
  if (/\bconfiguration|traceability\b/.test(t)) add("configuration");
  return Array.from(tags);
}

