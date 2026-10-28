/**
 * Regulatory Crawler Orchestrator
 * Fetches regulations from whitelisted sources, parses, normalizes, and stores as packs
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import crypto from "crypto";

import { crawlECFR } from "./adapters/ecfr.js";
import { crawlEASA } from "./adapters/easa.js";
import { crawlUKCAA } from "./adapters/ukcaa.js";
import { crawlCAAC } from "./adapters/caac.js";
import { crawlAFAC } from "./adapters/afac.js";

import { parseToText } from "./Parsers.js";
import { normalizeToClauses } from "./Normalizer.js";
import { writePack } from "./PackWriter.js";
import { diffPacksAndFlag } from "./Diff.js";

export async function runRegRefresh(configPath = "config/sources.regs.yaml") {
  // Try multiple paths: project root, backend root, or relative to current file
  const possiblePaths = [
    path.join(process.cwd(), configPath),
    path.join(process.cwd(), "..", "..", configPath),
    path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..", "..", configPath)
  ];
  
  let configFullPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      configFullPath = p;
      break;
    }
  }
  
  if (!configFullPath) {
    throw new Error(`Config file not found. Tried: ${possiblePaths.join(", ")}`);
  }

  const cfg = yaml.load(fs.readFileSync(configFullPath, "utf8"));
  const netVar = cfg.net_enabled_env_var || "ENABLE_NET";
  
  if (String(process.env[netVar]).toLowerCase() !== "true") {
    throw new Error(`Networking disabled. Set ${netVar}=true to crawl regulations.`);
  }

  const results = [];

  for (const auth of cfg.authorities) {
    for (const adapter of auth.adapters) {
      for (const item of adapter.items) {
        const context = { cfg, auth, adapter, item };

        try {
          const raw = await routeAndFetch(context);
          const text = await parseToText(raw);
          const clauses = await normalizeToClauses(item.label, text);
          
          const packPath = await writePack(auth.id, item.reg_id, {
            meta: {
              name: item.label,
              version: new Date().toISOString().slice(0, 10),
              publisher: auth.name,
              scope: "Regulatory Requirement",
              jurisdiction: auth.id.toUpperCase()
            },
            clauses
          });

          const { flagged, flags, hash } = await diffPacksAndFlag(auth.id, item.reg_id, packPath);

          results.push({
            authority: auth.id,
            reg_id: item.reg_id,
            label: item.label,
            ok: true,
            packPath,
            flagged,
            flags,
            hash
          });
        } catch (e) {
          const msg = e?.message || String(e);
          results.push({
            authority: auth.id,
            reg_id: item.reg_id,
            label: item.label,
            ok: false,
            message: msg
          });

          const alertsDir = path.join(process.cwd(), "regs-registry", "alerts");
          ensureDir(alertsDir);
          const alertFile = path.join(
            alertsDir,
            `${auth.id}__${item.reg_id}__${Date.now()}.json`
          );
          fs.writeFileSync(
            alertFile,
            JSON.stringify(
              {
                when: new Date().toISOString(),
                error: msg,
                context: { auth: auth.id, item }
              },
              null,
              2
            )
          );
        }
      }
    }
  }

  return results;
}

async function routeAndFetch(ctx) {
  const t = ctx.adapter.type;
  if (t === "ecfr") return crawlECFR(ctx);
  if (t === "easa_pdf") return crawlEASA(ctx);
  if (t === "ukcaa_html") return crawlUKCAA(ctx);
  if (t === "caac_html") return crawlCAAC(ctx);
  if (t === "afac_html") return crawlAFAC(ctx);
  throw new Error(`Unknown adapter type: ${t}`);
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

