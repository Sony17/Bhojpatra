# Bhojpatra — Deploy the Demo to Vercel

**Current live URL:** https://bhojpatra-gray.vercel.app

The site runs on **Ankit's Vercel account** and **auto-deploys on every push** to
GitHub `Sony17/Bhojpatra` (`main`). So the simplest, most reliable path to update
the demo is **Option A (git push)** below.

> ⚠️ **The local `vercel` CLI is mis-linked.** `.vercel/project.json` still points
> at an old, **deleted** Vercel project (the former Sony account), so
> `vercel --prod` from this folder will fail or target the wrong project. Either
> use git push (Option A), or run `vercel link` first and re-link to Ankit's
> project before using the CLI (Option B).

## Prerequisites (one-time)
- Vercel CLI: `npm i -g vercel` (only needed for the CLI path).
- Env vars must exist in the Vercel project (Neon `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`,
  `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SITE_URL`, and optionally
  `RESEND_API_KEY` / `ALERT_EMAIL_*`). They already are — that's where `.env.local`
  was pulled from. Verify in **Vercel → Project → Settings → Environment Variables**.
- **Set `SITE_URL`** (and `SESSION_SECRET`) for Production specifically — locally
  `SITE_URL=http://localhost:3000`; Production must be the deployed URL for links,
  invoices and share buttons to point correctly.

## Option A — Git push (recommended, auto-deploy)
```bash
git add -A
git commit -m "Demo build for client showcase"
git push origin main
```
Vercel builds and deploys `main` automatically. Watch the build in the Vercel
dashboard; the Production URL updates when it's green.

> There are uncommitted working changes (venue approvals, review photos, admin
> tiers, dashboards). Review them before committing, or push a dedicated demo
> branch and promote its preview deployment instead.

## Option B — Vercel CLI (deploy current working tree)
```bash
cd /Users/sonyyadav/Desktop/bhojpatra
vercel link       # REQUIRED first — re-link to Ankit's project (local link is stale)
vercel            # preview deployment (shareable URL, safe to rehearse on)
vercel --prod     # promote to the Production URL for the actual showcase
```

## Pre-deploy sanity
```bash
npm run build     # must pass locally before deploying
npm run lint      # note: repo has some pre-existing lint warnings
```
If the build fails on a missing env var, set it in Vercel (and `.env.local` for the
local build) — the app **requires** `DATABASE_URL` and, in production, `SESSION_SECRET`.

## After deploy — verify the live URL
Run the smoke test from `QA-CHECKLIST.md` §0 against the deployed URL, then confirm:
- `/admin/login` works with `Ankit23690@gmail.com`.
- A test booking completes and the invoice PDF has the **production** URL.
- Blob-served images (KYC, reviews, vendor photos) load over HTTPS.

## ⚠️ Shared database reminder
Local dev and the Vercel deployment point at the **same Neon database**. Anything
you create while rehearsing locally is already live on the deployed demo (and vice
versa). Seed/clean up demo data with that in mind.
