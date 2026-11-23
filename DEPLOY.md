# Deploying Startup Singam ERP on a permanent URL

## Live deployment (Fly.io)

**Permanent URL: https://singam-1234567.fly.dev/**

- App: `singam-1234567` (org `personal`), region `sin`, machine `d895474f566078`.
- Volume `singam_data` (1 GB) mounted at `/data`; the SQLite file is `/data/singam.db`
  (`SINGAM_DB_PATH`). Data survives redeploys; the machine suspends when idle and wakes on
  the next request.
- Health check: `GET /api/health` (used by the platform and by `fly status`).
- The app runs with `SINGAM_AUTH_DEV=1` (see `fly.toml`) so the prototype's persona switcher
  and returned one-time code work for reviewers. **Remove that line for a real, secured
  deployment** — with it unset, `NODE_ENV=production` turns both off automatically.

### Redeploy after a change

```bash
export FLY_API_TOKEN=...        # a token with write access to singam-1234567
fly deploy --app singam-1234567 --remote-only --ha=false
```

### First-time setup (what was run to create this)

```bash
fly volumes create singam_data --app singam-1234567 --region sin --size 1
fly deploy --app singam-1234567 --remote-only --ha=false
```

---

## Why the workspace link is not permanent

The workspace link (`https://work-1-qnxakxxailpqmibo.prod-runtime.all-hands.dev/`) is a
**review sandbox, not a permanent host**. It is bound to one ephemeral runtime:

- `RUNTIME_ID=qnxakxxailpqmibo` — a new workspace gets a different id and therefore a
  different URL.
- The runtime is recycled after ~20 minutes idle (`OH_RUNTIME_IDLE_TIMEOUT_SECONDS=1200`),
  and the container filesystem (including `data/singam.db`) is wiped on recycle.

Nothing running *inside* the sandbox can change that: a permanent link needs a host that
owns the process, the URL and the disk. This document describes the two supported routes.

The app is already deployment-shaped: it builds with `npm run build`, starts with
`npm run start` on `PORT`, keeps all state in one SQLite file (path from `SINGAM_DB_PATH`),
and exposes `GET /api/health` for platform health checks.

---

## Option A — container host with a volume (recommended)

Works on Fly.io, Railway, Render, a VPS, or any Kubernetes cluster. A `Dockerfile` and
`.dockerignore` are included.

The image runs Node 24 (required by the built-in `node:sqlite` module) and stores the
database on a mounted volume at `/data`, so data survives redeploys.

### Fly.io (shortest path)

```bash
fly launch --no-deploy            # accept the Dockerfile, keep port 12000
fly volumes create singam_data --size 1
# in fly.toml, mount the volume and point the app at it:
#   [mounts]
#     source = "singam_data"
#     destination = "/data"
#   [env]
#     SINGAM_DB_PATH = "/data/singam.db"
#   [[services.http_checks]]
#     path = "/api/health"
fly deploy
```

Fly gives a stable `https://<app>.fly.dev` URL that stays up across restarts.

### Railway / Render

- Create a service from this repository; the platform detects the `Dockerfile`.
- Attach a persistent volume mounted at `/data`.
- Set `SINGAM_DB_PATH=/data/singam.db` and the health check path to `/api/health`.

### Any Docker host / VPS

```bash
docker build -t startup-singam-erp .
docker run -d --name singam -p 80:12000 \
  -v singam_data:/data \
  -e SINGAM_DB_PATH=/data/singam.db \
  --restart unless-stopped \
  startup-singam-erp
```

Put a reverse proxy (Caddy, nginx, Traefik) in front for TLS and a domain name. The
database is the only state, so back it up by copying `/data/singam.db`.

---

## Option B — Vercel (no persistent local disk)

Vercel runs serverless functions with an **ephemeral, read-only** filesystem, so the SQLite
file cannot live there. The app would need a database swap first:

1. Replace the `node:sqlite` client in `src/lib/db/client.ts` with a hosted Postgres client
   (Vercel Postgres, Neon, Supabase) using the same repository interface in
   `src/lib/server/repo.ts`.
2. Move file uploads (currently under `uploads/`) to object storage (S3, Vercel Blob).
3. Deploy; Vercel gives a stable `https://<project>.vercel.app` URL.

This is real work (the SQL dialect and the upload path both change) and is only worth it if
you specifically want Vercel. Option A needs no code changes.

---

## Before you make it public

The review build runs with `SINGAM_AUTH_DEV=1` (in `scripts/serve.sh`) so reviewers can use
the "act as" persona switcher and see the returned one-time code. That is a review
affordance, not security.

For a public deployment:

- Do **not** set `SINGAM_AUTH_DEV`. With `NODE_ENV=production` the switcher and the returned
  dev code are off automatically (see `src/lib/server/auth-config.ts`).
- Terminate TLS at the host or proxy (all platforms above do this).
- Restrict who can reach it (platform access controls, a VPN, or an auth proxy) while the
  prototype is under review.
- Back up `data/singam.db`; there is no other state.

---

## Keeping it up

- **Health check:** point the platform at `GET /api/health`. It returns `200` with
  `{"status":"ok","seasons":<n>}` when the database is reachable, and `503` when it is not.
- **Restarts:** the container host restarts the process if it exits; on a bare VPS use the
  included supervisor (`bash scripts/serve.sh`) or a systemd unit.
- **Redeploys:** `git push` (Railway/Render/Vercel) or `fly deploy`; the volume keeps the data.

## What I can do from this workspace

I can prepare everything in this repository (Dockerfile, health route, this guide) and, if
you give me a target host and a token, run the deploy commands. I cannot create a permanent
tunnel or push to an external host without credentials, and I cannot stop this workspace's
runtime from being recycled.
