/**
 * Diff and Flag Detection
 * Compares packs and flags suspicious changes
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { sha256 } from "./PackWriter.js";

export async function diffPacksAndFlag(authId, regId, packPath) {
  const current = fs.readFileSync(packPath, "utf8");
  const currentHash = sha256(current);

  let flagged = false;
  const flags = [];

  const histDir = path.join(
    process.cwd(),
    "regs-registry",
    "history",
    authId,
    regId
  );

  const files = fs.existsSync(histDir)
    ? fs
        .readdirSync(histDir)
        .filter((f) => f.endsWith(".yaml"))
        .sort()
    : [];

  const prevFile = files.length ? path.join(histDir, files[files.length - 1]) : null;

  if (prevFile) {
    try {
      const prev = fs.readFileSync(prevFile, "utf8");
      const prevObj = yaml.load(prev);
      const curObj = yaml.load(current);

      const prevCount = prevObj.clauses?.length || 0;
      const curCount = curObj.clauses?.length || 0;

      if (curCount === 0) {
        flagged = true;
        flags.push("ZERO_CLAUSES");
      }

      if (prevCount > 0 && curCount < prevCount * 0.9) {
        flagged = true;
        flags.push(`CLAUSE_DROP_${prevCount}_to_${curCount}`);
      }

      const prevText = (prevObj.clauses || [])
        .map((c) => c.text)
        .join(" ")
        .toLowerCase();
      const curText = (curObj.clauses || [])
        .map((c) => c.text)
        .join(" ")
        .toLowerCase();

      const sentinels = [
        "shall",
        "must",
        "approved design",
        "release",
        "maintenance",
        "inspection",
        "test",
        "certifying staff"
      ];

      const lost = sentinels.filter(
        (k) => prevText.includes(k) && !curText.includes(k)
      );

      if (lost.length) {
        flagged = true;
        flags.push(`LOST_KEY_TERMS:${lost.join(",")}`);
      }

      if (
        prevObj.meta?.publisher &&
        curObj.meta?.publisher &&
        prevObj.meta.publisher !== curObj.meta.publisher
      ) {
        flagged = true;
        flags.push(
          `PUBLISHER_CHANGE:${prevObj.meta.publisher}_to_${curObj.meta.publisher}`
        );
      }
    } catch (err) {
      console.log(`⚠️  Diff failed for ${authId}/${regId}:`, err);
    }
  }

  return { flagged, flags, hash: currentHash };
}
