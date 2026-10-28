/**
 * FAA / eCFR HTML Adapter
 * Fetches regulations from eCFR.gov
 */

import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function crawlECFR(ctx: any): Promise<Buffer> {
  const { item, cfg } = ctx;
  
  const res = await fetch(item.url, {
    headers: {
      "user-agent": cfg.user_agent,
      "accept": "text/html"
    },
    redirect: "follow",
    timeout: cfg.request_timeout_sec * 1000
  });

  if (!res.ok) {
    throw new Error(`ECFR fetch failed (${res.status}): ${item.url}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // eCFR uses section ids like #p-21.137 etc.; keep entire section area if present
  const hashPart = item.url.split("#").pop();
  const target = hashPart
    ? $(`#${hashPart}`).closest("section").text() || $(`#${hashPart}`).text()
    : $("main").text() || $("body").text();

  return Buffer.from(target || html, "utf8");
}

