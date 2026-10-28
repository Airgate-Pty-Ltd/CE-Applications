# Deploying RegIntel (static) to VentraIP + Supabase

RegIntel is now a **static site**: `npm run build` produces plain HTML/JS that
any web host can serve, and the browser talks to **Supabase** directly (RLS is
the security gate). Nothing server-side runs on VentraIP.

Both sites live on VentraIP:

| Host | Content | cPanel docroot |
|---|---|---|
| `conform-edge.com` | the marketing website (static) | `public_html/` |
| `regintel.conform-edge.com` | this app (static) | the subdomain's docroot |

Supabase (hosted at supabase.com) is the backend for both. Your daily ingestion
job keeps writing findings to it as it does today — unchanged.

---

## 1. Build the static files

```bash
cd nextjs
# Production env (read at build time only for NEXT_PUBLIC_* values):
#   NEXT_PUBLIC_SUPABASE_URL=https://wyglrodtfwtexnsyajkk.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...            (Supabase → Settings → API → anon)
#   NEXT_PUBLIC_COOKIE_DOMAIN=.conform-edge.com   (shared login across subdomains)
#   NEXT_PUBLIC_WEBSITE_URL=https://conform-edge.com
#   NEXT_PUBLIC_ADMIN_EMAIL=mike@airgate.com.au   (optional; enables /admin)
npm run build
```

The upload-ready files are in **`nextjs/out/`**. (The `service_role` key is NOT
needed here and must never be in this build — only the ingestion job uses it.)

## 2. Create the subdomain in VentraIP (cPanel)

1. cPanel → **Domains / Subdomains** → create `regintel` under `conform-edge.com`.
   cPanel makes a docroot (e.g. `public_html/regintel`) and the DNS record for you
   — because conform-edge.com is already on VentraIP, there's **no external CNAME**.
2. (The main website's static files go in `public_html/` the same way.)

## 3. Upload

Upload the **contents of `nextjs/out/`** (not the folder itself) into the
subdomain docroot — cPanel **File Manager → Upload**, or SFTP/FileZilla. A zip of
`out/` uploaded and "Extract"-ed in File Manager is fastest.

## 4. Add `.htaccess` (routing, HTTPS, security headers)

Static export writes per-route files (`dashboard.html`, `dashboard/archive.html`).
Apache needs a nudge to serve `/dashboard` from `dashboard.html`, and — because we
removed the headers from `next.config` — the security headers (incl. the CSP that
allows Supabase) move here. Put this `.htaccess` in the subdomain docroot:

```apache
Options -MultiViews
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# Pretty URLs: /dashboard -> /dashboard.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.+?)/?$ $1.html [L]

<IfModule mod_headers.c>
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  Header always set X-Frame-Options "DENY"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>
```

Then issue the free **AutoSSL** certificate for the subdomain (cPanel → SSL/TLS
Status) so HTTPS works — the shared-login cookie is `Secure` and needs it.

## 5. Supabase Auth settings (one-time)

Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://conform-edge.com`
- **Redirect URLs:** add `https://conform-edge.com/**` and
  `https://regintel.conform-edge.com/**`

This lets the login email links return to either site, and the shared
`.conform-edge.com` cookie then carries the session to RegIntel.

## 6. How login works now (no handoff token)

1. A user signs in with Supabase Auth on **conform-edge.com** (the website's
   login — still to be built in the `conform-edge-website` repo).
2. The session is stored in a cookie on `.conform-edge.com`, so
   **regintel.conform-edge.com sees it automatically**.
3. RegIntel's pages query Supabase; **RLS** shows findings/reports only to
   profiles whose `subscription_status` is `active` or `trialing`.

A brand-new signup is `inactive` by default (RLS shows them nothing) until their
subscription is marked active — that's the paywall, enforced in the database.

## 7. Updating later

Re-run `npm run build` and re-upload `nextjs/out/`. No redeploy pipeline, no
server to restart.

---

### Not on VentraIP
- **Supabase** — stays at supabase.com (the database/auth/RLS).
- **Ingestion** — the Python scraper keeps running on its schedule, writing to
  Supabase. VentraIP only serves the static front-ends.
