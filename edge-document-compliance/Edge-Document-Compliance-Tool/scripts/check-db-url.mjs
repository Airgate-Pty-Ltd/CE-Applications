#!/usr/bin/env node
import dotenv from 'dotenv';

dotenv.config();

function redact(url) {
  try {
    const parsed = new URL(url);
    const user = parsed.username ? decodeURIComponent(parsed.username) : '';
    const auth =
      user || parsed.password
        ? `${user}${parsed.password ? ':***' : ''}@`
        : '';
    return `${parsed.protocol}//${auth}${parsed.host}${parsed.pathname}`;
  } catch (error) {
    return 'invalid-url';
  }
}

function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[check:dburl] ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  let parsed;
  try {
    parsed = new URL(dbUrl);
  } catch (error) {
    console.error('[check:dburl] ERROR: Invalid DATABASE_URL ->', error.message);
    process.exit(1);
  }

  const host = parsed.hostname;
  const port = parsed.port || 'default';
  const dbName = parsed.pathname?.replace(/^\//, '') || '(none)';

  console.log('[check:dburl] ✅ DATABASE_URL parsed successfully.');
  console.log(`[check:dburl] Host: ${host}, Port: ${port}, Database: ${dbName}`);
  console.log(`[check:dburl] Redacted: ${redact(dbUrl)}`);
  process.exit(0);
}

main();

