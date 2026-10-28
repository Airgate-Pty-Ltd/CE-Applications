/**
 * Document Parsers
 * Converts HTML/PDF/DOCX to plain text
 */

import * as cheerio from "cheerio";
import pdfParse from "pdf-parse";

export async function parseToText(raw: Buffer): Promise<string> {
  // Naive type sniff
  const head = raw.slice(0, 8).toString("hex");
  const isPDF = head.startsWith("25504446"); // %PDF

  if (isPDF) {
    try {
      const data = await pdfParse(raw);
      return cleanWhitespace(data.text);
    } catch (err) {
      throw new Error(`PDF parsing failed: ${err}`);
    }
  }

  const s = raw.toString("utf8");
  if (looksLikeHTML(s)) {
    try {
      const $ = cheerio.load(s);
      // Remove script and style elements
      $("script, style").remove();
      const text = $("body").text() || $("html").text() || s;
      return cleanWhitespace(text);
    } catch (err) {
      // If cheerio fails, return raw text
      return cleanWhitespace(s);
    }
  }

  // Fallback plain text
  return cleanWhitespace(s);
}

function looksLikeHTML(s: string): boolean {
  return /<html[\s>]/i.test(s) || /<\/(p|div|section|body)>/i.test(s);
}

function cleanWhitespace(s: string): string {
  return s
    .replace(/\r/g, " ")
    .replace(/\t/g, " ")
    .replace(/\u00a0/g, " ") // Non-breaking space
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

