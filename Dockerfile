# syntax=docker/dockerfile:1
# Self-hosted image for AWS (App Runner / ECS / Lightsail). The Vercel
# deployment does not use this file — it is additive.
#
# Build (the env file is a BuildKit secret so it never lands in a layer;
# prerendered pages read live Neon data at build time, same as on Vercel):
#   docker build --secret id=env,src=.env.local -t bhojpatra .
# Run:
#   docker run -p 3000:3000 --env-file <runtime-env> bhojpatra

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT=standalone
ENV NEXT_TELEMETRY_DISABLED=1
# cookieSign.ts enforces SESSION_SECRET at request time, not build time; no
# cookie is ever signed during prerender, so a throwaway keeps the build
# honest while the real secret is injected only at run time.
ENV SESSION_SECRET=docker-build-only-never-used-at-runtime
RUN --mount=type=secret,id=env,target=/app/.env.local npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# The JSON fallback store is read via process.cwd()/data, which output file
# tracing cannot see — ship it alongside server.js.
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
USER nextjs
ENV PORT=3000
EXPOSE 3000
# HOSTNAME is forced at launch, not via ENV: AWS App Runner (and some other
# runtimes) inject HOSTNAME=<pod-hostname>, which would make the standalone
# server bind the wrong interface and fail health checks. `exec` keeps node
# as PID 1 for clean SIGTERM handling.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
