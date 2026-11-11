# Campus Safety API

> **DECOMMISSIONED / LEGACY:** This FastAPI + PostgreSQL foundation is inactive and is not part of the active Phase 7A architecture. The Convex backend in `apps/web-dashboard/convex` is the sole active backend. This directory and the repository root `compose.yaml` are retained unchanged for historical reference only. Do not deploy, extend, or depend on them.

FastAPI backend foundation for Campus Safety Command.

## Local setup (legacy, do not use)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

API documentation is available at `http://127.0.0.1:8000/docs`.

## Quality checks

```powershell
pytest
ruff check .
```

## Current scope (legacy)

This directory records the superseded Phase 7A FastAPI/PostgreSQL attempt. It
provided configuration, database infrastructure, canonical schemas,
health/version endpoints, migrations, and tests. Authentication, operational
CRUD endpoints, WebSockets, AI processing, and CCTV connections were never
implemented here.

The active backend is Convex. See `apps/web-dashboard/convex/README.md` and the
repository root `README.md`.
