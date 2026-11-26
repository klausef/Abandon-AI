# Abandon-AI

Public Space Safety Command: an abandoned-object detection and incident-review
platform for public spaces. It combines a React operations dashboard, a Convex
backend, a Python vision processor, and a Kaggle training pipeline.

Objects are never flagged as suspicious from appearance alone. Incidents require
temporal evidence (an object that stays stationary and then becomes unattended)
plus human review. `person` detections never create incidents directly.

## Structure

```text
frontend/            React, TypeScript, Vite, Tailwind dashboard
api/
  convex/            Active Convex backend and HTTP actions
  processor/         Python Roboflow + ByteTrack processor
  training/          Private Kaggle YOLOv8 training kernel
  legacy/            Decommissioned FastAPI foundation (reference only)
  scripts/           Signed-ingestion smoke test
```

## Quick start

### Dashboard

```powershell
cd frontend
npm install
npm run dev
```

The dashboard uses mock authentication and in-memory mock data. Real
authentication and the Convex data layer are intentionally deferred.

### Convex backend

```powershell
cd api
npm install
npm run convex:dev
```

`api/.env.local` links the deployment; copy `api/.env.example` if it is missing.
Deployment secrets are set with `npx convex env set` and never committed.

### Processor

```powershell
cd api/processor
uv sync --extra vision --extra dev
uv run campus-safety-processor
```

### Training

See `api/training/README.md`.

## Verification

```powershell
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build

npm --prefix api test
npm --prefix api run typecheck

cd api/processor
uv run pytest
uv run ruff check .
```

## Security model

- Processor events use HMAC-SHA256 over the exact request body, with timestamp,
  nonce, and idempotency checks.
- Roboflow webhook telemetry is authenticated with `x-webhook-secret` and stored
  separately from operational detections. It cannot create incidents.
- Training mutations are public only when `KAGGLE_RUN_SECRET` is unset; set it
  on any public deployment.
- Secrets live in gitignored `.env` files or Convex deployment environment
  variables. Never commit them.

## Legacy

`api/legacy` is a decommissioned FastAPI + PostgreSQL foundation. It is retained
for historical reference and must not be deployed or extended.
