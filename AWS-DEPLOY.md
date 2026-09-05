# Deploying Bhojpatra to AWS

This repo can now build a self-contained Docker image (`Dockerfile` +
`output: "standalone"` gated behind `NEXT_OUTPUT`) that runs the app with
plain `node server.js` — no Vercel adapter involved.

**Nothing here affects the existing Vercel deployment.** Vercel builds never
set `NEXT_OUTPUT`, so its build output is byte-for-byte what it was before.
Keep Vercel live until the AWS deployment has served a real end-to-end
booking + payment; DNS cutover is the last step, and rolling back is just
pointing DNS back.

## Local build & smoke test

```bash
# Build. The env file is a BuildKit secret — used during prerender (pages
# read live Neon data at build time, same as on Vercel) but never stored
# in an image layer.
docker build --secret id=env,src=.env.local -t bhojpatra:aws .

# Run with runtime env (see the variable list below), then open
# http://localhost:3000
docker run --rm -p 3000:3000 --env-file /path/to/runtime.env bhojpatra:aws
```

Note on `--env-file`: Docker passes values raw. Unlike `.env.local`, do NOT
escape `$` as `\$` — paste `ADMIN_PASSWORD_HASH` unescaped. Same applies to
the App Runner / ECS console.

## Runtime environment variables

Required:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Same Neon connection string used on Vercel — Neon works from anywhere. |
| `SESSION_SECRET` | `openssl rand -base64 32`. The build uses a throwaway; the real one is runtime-only. |
| `SITE_URL` | **Mandatory on AWS.** On Vercel the app falls back to `VERCEL_PROJECT_PRODUCTION_URL`; that doesn't exist here, and invoice links in emails silently break without it. |
| `BLOB_READ_WRITE_TOKEN` | `@vercel/blob` is a plain HTTP client — uploads keep working from AWS. Migrating to S3 is optional, later. |

Same as on Vercel (copy over): `RESEND_API_KEY`, `ALERT_EMAIL_TO`,
`ALERT_EMAIL_FROM`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (unescaped — see
above), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

## Push to ECR + App Runner

Pick the AWS region closest to the Neon database's region (check the Neon
console) — every request talks to Neon, so DB proximity beats user
proximity. Mumbai is `ap-south-1`.

```bash
AWS_REGION=ap-south-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

aws ecr create-repository --repository-name bhojpatra --region $AWS_REGION
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

# App Runner runs amd64; Apple Silicon must cross-build.
docker buildx build --platform linux/amd64 \
  --secret id=env,src=.env.local \
  -t $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/bhojpatra:latest --push .
```

Then in the App Runner console: **Create service → Container registry →
Amazon ECR → bhojpatra:latest**, port `3000`, paste the runtime env vars,
enable automatic deployments (new ECR push = new deploy). Start with
1 vCPU / 2 GB. App Runner gives you HTTPS on an `awsapprunner.com` URL
immediately; add the real domain under **Custom domains** (it provisions the
certificate and shows the DNS records to add).

## Cutover checklist

1. Smoke-test the App Runner URL: home page, `/vendors`, a full booking, an
   admin login.
2. Set `SITE_URL` to the final domain.
3. Razorpay dashboard → Settings → Webhooks: point the webhook to
   `https://<domain>/api/payments/razorpay/webhook` (payment.captured).
   Until this is done, payments whose tab closes early won't be recorded.
4. Move the domain's DNS records from Vercel to the App Runner custom-domain
   records.
5. Watch the first real payment land, then pause (don't delete) the Vercel
   project.

## Known behavior changes on AWS

- IP-based city hints used Vercel's geo headers; on AWS the app falls back
  to Nominatim reverse geocoding (works, slightly less snappy). CloudFront
  viewer-location headers can restore it later if wanted.
- The `data/` JSON fallback directory is copied into the image (it's read
  via `process.cwd()`, which output tracing can't see), so no code change
  was needed.
