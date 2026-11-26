# API and backend

This directory contains every server-side component of Abandon-AI.

| Path | Purpose |
| --- | --- |
| `convex/` | Active Convex backend: ingestion, incidents, RBAC, audit logs, training runs, and the Roboflow webhook |
| `processor/` | Python unattended-object processor that samples frames, talks to Roboflow, and posts signed events to Convex |
| `training/` | Private Kaggle kernel that trains YOLOv8n and reports metrics to Convex |
| `legacy/` | Decommissioned FastAPI + PostgreSQL foundation, retained for historical reference only |
| `scripts/` | Signed-ingestion smoke test |

## Convex

```powershell
npm install
npm run convex:dev      # sync functions and generate types
npm run typecheck       # tsc -p convex/tsconfig.json
npm test                # Vitest in the edge runtime
```

Deployment environment variables are listed in `.env.example`. Secrets are set
with `npx convex env set` and must never be committed.

The web dashboard does not call Convex yet; real authentication remains
deferred. See `convex/README.md` for the ingestion contract.

## Processor

```powershell
cd processor
uv sync --extra vision --extra dev
uv run campus-safety-processor
```

See `processor/README.md` for camera, Roboflow, and HMAC configuration.

## Training

See `training/README.md` for Kaggle secrets, the kernel identity, and the
Roboflow webhook setup.
