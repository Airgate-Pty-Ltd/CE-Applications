/**
 * CAAC HTML Adapter
 * Generic HTML fetcher for CAAC regulations
 */

import fetch from "node-fetch";

export async function crawlCAAC(ctx: any): Promise<Buffer> {
  return genericHTML(ctx);
}

async function genericHTML(ctx: any): Promise<Buffer> {
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
    throw new Error(`Fetch failed (${res.status}): ${item.url}`);
  }

  const html = await res.text();
  return Buffer.from(html, "utf8");
}

