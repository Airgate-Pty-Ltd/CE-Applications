/**
 * Pack Writer
 * Writes normalized packs to YAML with versioning and hashing
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import crypto from "crypto";

export async function writePack(
  authorityId: string,
  regId: string,
  pack: any
): Promise<string> {
  const regsDir = path.join(process.cwd(), "regs");
  const dir = path.join(regsDir, authorityId, regId);
  ensureDir(dir);

  const file = path.join(dir, "pack.yaml");
  const y = yaml.dump(pack, { lineWidth: 120 });
  fs.writeFileSync(file, y, "utf8");

  // Write registry record
  const histDir = path.join(
    process.cwd(),
    "regs-registry",
    "history",
    authorityId,
    regId
  );
  ensureDir(histDir);

  const hash = sha256(y);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(histDir, `${stamp}__${hash}.yaml`), y, "utf8");

  // Pointer file
  fs.writeFileSync(path.join(dir, "latest.hash"), hash, "utf8");

  return file;
}

export function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

