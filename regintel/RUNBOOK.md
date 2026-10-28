# RegIntel Incident Runbook

Last updated: 2026-08-22

This runbook is for RegIntel maintainers. It covers the most likely failure modes and how to respond without guessing.

## 1. Report did not generate today

**Check the dashboard**
1. Open `/admin` and look at the latest report status.
2. If status is `error`, read `error_message` in the `regulatory_reports` table.

**Check the worker**
1. Open Railway logs for the worker service.
2. Look for the `/api/generate` request from the Next.js cron proxy.
3. Common causes: worker out of memory, Ollama unreachable, CRON_SECRET mismatch.

**Retry safely**
1. The cron route is idempotent by date. Run it again from `/admin` or call `POST /api/reports/generate` with `x-cron-secret`.
2. If retry succeeds, the dashboard updates automatically.

**Escalation path**
1. If the worker is down, users still see yesterday's report.
2. If the worker is down for more than 24 hours, communicate a delay to subscribers and investigate Railway or Ollama health.

## 2. Suspected handoff token leak or replay

**Immediate steps**
1. Rotate `HANDOFF_SECRET` in both RegIntel and the Conform-Edge website at the same time.
2. Existing signed tokens will fail immediately because the old secret is no longer accepted.
3. Ask the website team to invalidate active user sessions if the leak is severe.

**Investigate**
1. Query `audit_log` for `event = 'handoff_rejected'` in the last hour.
2. Query `handoff_redemptions` for repeated `jti` values (should never happen due to the primary key).

## 3. Admin panel is inaccessible

**Cause**
`NEXT_PUBLIC_ADMIN_EMAIL` must exactly match the signed-in user's email. If unset, the admin role is disabled.

**Fix**
1. Check the environment variable in the deployment dashboard.
2. Redeploy is required because `NEXT_PUBLIC_*` variables are embedded at runtime in Next.js 16.
3. Do not add a fallback email in code. That was intentionally removed.

## 4. Need to roll back a bad deployment

**Option A: Railway rollback**
1. In Railway, find the last healthy deployment and click "Redeploy" on that commit.

**Option B: Git revert**
1. `git revert HEAD` on `main`, push, and redeploy.

**After rollback**
1. Verify `/api/health` or `/dashboard` loads.
2. Check the latest report date in `/admin` is still showing expected data.

## 5. Database issue

**Never run manual updates on production.** Use Supabase migrations or a migration script tracked in this repo.

**If the audit log grows too large**
1. Run `select trim_audit_logs(90);` from the Supabase SQL editor.
2. This removes routine events older than 90 days while keeping security events.

## 6. Dependency vulnerability

1. Run `npm audit` in `nextjs/` and `worker/`.
2. Run `safety check` in `scraper/` after `pip install -r requirements.txt`.
3. Fix non-breaking updates with `npm audit fix`.
4. For major-version updates, test `npm run build`, `npm run test`, and `npm run lint` before pushing.

## 7. Enable or verify GitHub security features

Dependabot version updates are configured in `.github/dependabot.yml`. The following features must be enabled manually in the GitHub UI by a repository owner or admin:

1. Repository → **Settings** → **Security** → **Dependabot**
   - Enable **Dependabot alerts**
   - Enable **Dependabot security updates**
2. Repository → **Settings** → **Security** → **Secret scanning**
   - Enable **Secret scanning**
   - Enable **Push protection**

Once enabled, GitHub will:
- open PRs weekly for `npm` and `pip` dependency updates;
- alert on published vulnerabilities in dependencies; and
- block pushes that contain known secret patterns.

## 8. Who to contact

- Infrastructure and deployments: whoever manages Railway and Supabase.
- Website handoff and user entitlements: Conform-Edge website team.
- Regulatory sources and scraper logic: RegIntel product owner.

## 9. Environment variable reference

See `.env.example` in the repo root for the full list and required-versus-optional breakdown.
