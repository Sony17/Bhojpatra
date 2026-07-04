# Database & File Storage Setup (Neon + Vercel Blob)

The app now persists all data to **Neon Postgres** (records) and **Vercel Blob**
(KYC file uploads) instead of on-disk JSON files, which don't work on Vercel's
read-only serverless filesystem.

**The code is done and safe to deploy as-is.** Until the two env vars below are
set, the app silently falls back to the old JSON files (fine for `next dev`).
Once they're set on Vercel, it uses Neon + Blob automatically — no code change.

Everything below happens in **Ankit's Vercel account (`ankit23690-1772`)**.

---

## 1. Create the Neon database

1. Vercel dashboard → the **bhojpatra** project → **Storage** tab.
2. **Create Database → Neon** (Postgres) → follow the prompts → **Connect** it
   to the bhojpatra project.
3. Vercel auto-injects `DATABASE_URL` (and related vars) into the project's
   Production + Preview environments. Nothing to copy by hand.

## 2. Create the schema

1. Open the Neon database → **SQL Editor** (in the Neon console, reachable from
   the Vercel Storage tab).
2. Paste the entire contents of [`schema.sql`](./schema.sql) and **Run**.
   It creates all tables and is safe to re-run (`if not exists`).

## 3. Create the Blob store (for vendor KYC uploads)

1. Same **Storage** tab → **Create → Blob**.
2. Connect it to the bhojpatra project. Vercel auto-injects
   `BLOB_READ_WRITE_TOKEN`.

## 4. Redeploy

Trigger a redeploy (push to the connected branch, or **Redeploy** in the
dashboard) so the new env vars are picked up. Done — bookings, payments, leads,
partners, venues, vendor applications and KYC now persist to Neon + Blob, and
the admin console reads the same live data.

---

## Local development

Local dev needs nothing — with no `DATABASE_URL`, the app keeps using the JSON
files under `data/` exactly as before.

To test against the real Neon DB locally, pull the env vars:

```bash
vercel link      # link this folder to the bhojpatra project (once)
vercel env pull  # writes .env.local with DATABASE_URL + BLOB_READ_WRITE_TOKEN
```

## What maps where

| Data                         | Table (`schema.sql`)   | Storage        |
| ---------------------------- | ---------------------- | -------------- |
| Bookings                     | `bookings`             | Neon           |
| Payments                     | `payments`             | Neon           |
| Promo leads                  | `leads`                | Neon           |
| Referral partners            | `partners`             | Neon           |
| Owner venues                 | `venues`               | Neon           |
| Vendor applications          | `vendor_applications`  | Neon           |
| KYC document metadata        | `kyc_documents`        | Neon           |
| KYC file bytes (PDF/JPG/PNG) | —                      | Vercel Blob    |
| Merchant UPI settings        | `settings`             | Neon           |

## Notes

- **KYC privacy:** files upload to Blob with a random, unguessable URL that is
  never exposed to clients — they're only served back through
  `/api/vendors/kyc/[id]`, so access can be gated with real auth later.
- **Migration only touched storage.** Every API route's request/response shape
  is unchanged, so the frontend is untouched.
