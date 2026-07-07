# Bhojpatra — Client Showcase Kit

Everything you need to demo and QA the platform for the client.

| File | Use it to |
| --- | --- |
| **[DEMO-SCRIPT.md](DEMO-SCRIPT.md)** | Present live — a start-to-finish walkthrough of every feature, in "acts", with what to click and say. |
| **[QA-CHECKLIST.md](QA-CHECKLIST.md)** | Test every feature works before the client sees it — checkboxes with expected results. |
| **[DEPLOY.md](DEPLOY.md)** | Publish the demo to Vercel and verify the live URL. |

## Quick start
```bash
npm run dev            # http://localhost:3000
```
- **Live demo:** https://bhojpatra-gray.vercel.app (auto-deploys on push to `main`)
- **Admin console:** `/admin/login` → `Ankit23690@gmail.com` + owner's password

## Two things to know first
1. The public **caterer catalog (`/vendors`) is empty** — demo browsing through
   **`/book`** (fully populated) and **admin**, or seed vendors (QA §11).
2. **Local and the Vercel deploy share one Neon database** — test data you create
   is visible in the demo. Use throwaway data and clean up in admin.
