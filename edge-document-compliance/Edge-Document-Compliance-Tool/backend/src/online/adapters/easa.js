/**
 * EASA PDF Adapter
 * Fetches PDF documents from EASA website
 */

import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function crawlEASA(ctx) {
  const { item, cfg } = ctx;

  let pdfUrl = item.url;
  
  try {
    const htmlRes = await fetch(item.url, {
      headers: {
        "user-agent": cfg.user_agent,
        "accept": "text/html"
      },
      redirect: "follow",
      timeout: cfg.request_timeout_sec * 1000
    });

    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const $ = cheerio.load(html);
      
      const pdfLink = $("a[href$='.pdf']").first().attr("href");
      if (pdfLink) {
        pdfUrl = new URL(pdfLink, item.url).href;
      }
    }
  } catch (err) {
    console.log(`⚠️  Could not parse HTML for PDF link, trying direct URL: ${err}`);
  }

  const res = await fetch(pdfUrl, {
    headers: {
      "user-agent": cfg.user_agent,
      "accept": "application/pdf, */*"
    },
    redirect: "follow",
    timeout: cfg.request_timeout_sec * 1000
  });

  if (!res.ok) {
    throw new Error(`EASA fetch failed (${res.status}): ${pdfUrl}`);
  }

  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

