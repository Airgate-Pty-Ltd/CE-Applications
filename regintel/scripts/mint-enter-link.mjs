#!/usr/bin/env node
// Mint a RegIntel /enter handoff link.
//
// RegIntel has no login page by design: the Conform-Edge website is the source
// of truth for entitlement and hands users off to /enter with a short-lived,
// HMAC-signed token. Until that issuer exists, this script does the website's
// job locally so you can actually get into the product.
//
// The token format is the contract (see nextjs/lib/handoff.ts):
//   base64url(payloadJson) + "." + base64url(hmacSha256(payloadJson, secret))
//
// Tokens are valid for 120 SECONDS and are SINGLE USE — the /enter route
// records the jti and refuses replays. Re-run this for each login.
//
//   node scripts/mint-enter-link.mjs [--url <base>] [--email <addr>]
//                                    [--tier basic|pro|enterprise]
//                                    [--status active|trialing]

import { createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function envFromFile(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      out[t.slice(0, i)] = t.slice(i + 1).replace(/^"|"$/g, '');
    }
  } catch { /* file is optional */ }
  return out;
}

const fileEnv = envFromFile(join(root, 'nextjs', '.env.local'));
const secret = process.env.HANDOFF_SECRET || fileEnv.HANDOFF_SECRET;

if (!secret) {
  console.error('HANDOFF_SECRET not found (checked $HANDOFF_SECRET and nextjs/.env.local).');
  process.exit(1);
}

const base = (arg('url', process.env.REGINTEL_URL || 'http://localhost:3000')).replace(/\/$/, '');
const email = arg('email', fileEnv.NEXT_PUBLIC_ADMIN_EMAIL || 'mike@airgate.com.au');
const tier = arg('tier', 'enterprise');
const status = arg('status', 'active');

const b64url = (buf) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// `sub` is the website's stable user id. Derived from the email here so repeat
// runs keep the same identity on the profile row.
const payload = {
  sub: `local-${Buffer.from(email).toString('hex').slice(0, 16)}`,
  email,
  tier,
  status,
  iat: Math.floor(Date.now() / 1000),
  jti: randomUUID(),
};

const json = JSON.stringify(payload);
const token = `${b64url(Buffer.from(json, 'utf8'))}.${b64url(
  createHmac('sha256', secret).update(json).digest()
)}`;

const url = `${base}/enter?token=${token}`;

console.log(`\n  ${email} · ${tier} · ${status}`);
console.log(`  ${url}\n`);

// The token lives 120 seconds and is single use, so the link has to reach a
// browser fast.
//
//   (default)  open it here — no copy-paste race at all
//   --share    copy it to the clipboard to send to someone else, who must click
//              within 120s. They only need to catch ONE link: the Supabase
//              session then persists in their browser.
//   --no-open  just print it
const share = process.argv.includes('--share');
const openIt = !share && !process.argv.includes('--no-open');

if (openIt) {
  const cmd = process.platform === 'darwin' ? 'open'
            : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [url], { detached: true, stdio: 'ignore', shell: process.platform === 'win32' }).unref();
  console.log('  Opening in your browser…\n');
} else if (share) {
  const copier = process.platform === 'darwin' ? 'pbcopy'
               : process.platform === 'win32' ? 'clip' : 'xclip';
  try {
    const c = spawn(copier, process.platform === 'linux' ? ['-selection', 'clipboard'] : [], {
      stdio: ['pipe', 'ignore', 'ignore'],
      shell: process.platform === 'win32',
    });
    c.stdin.end(url);
    console.log('  Copied to clipboard — paste it to them now.');
  } catch {
    console.log('  (clipboard copy unavailable — copy the URL above)');
  }
  console.log('  They must click within 120 SECONDS. Re-run if it lapses.\n');
} else {
  console.log('  Valid 120 seconds, single use.\n');
}
