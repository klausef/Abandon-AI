# Campus Safety Command

A phased campus security monitoring system for reviewing cameras, simulated object detections, and public-safety incidents.

## Current status

**Phases 1–6** are implemented in the web dashboard: project foundation, operational dashboard, camera management, simulated live monitoring, detection history, incident management, reports, analytics, user management, and simulated role permissions. The dashboard still uses in-memory mock records and does not call the backend.

**Phase 7A** adds the active backend foundation under `apps/web-dashboard/convex`: a Convex schema, HMAC-authenticated processor ingestion, provider-agnostic role-based access control, incident workflow, audit logging, automated tests, and documentation. The dashboard is **not** connected to Convex yet; that integration belongs to Phase 7B.

**Phase 7B processor integration is implemented but not activated:** `apps/processor` provides an authorized-video reader, Roboflow YOLO-World Serverless API adapter, ByteTrack tracking, conservative unattended-object state logic, and HMAC event delivery to Convex. It requires a private Roboflow API key, processor secret, an authorized video source, and a deployed Convex backend before it can run. Real user authentication and dashboard-to-Convex queries remain deferred, so the dashboard continues to use mock login and mock records.

The current processor source mode is explicitly `disabled`. Live Monitoring
displays a `MOCK PREVIEW — NO CAMERA CONNECTED` placeholder for the future Tapo
C200C. No camera stream is opened and no frame is sent to Roboflow until an
authorized RTSP configuration is supplied.

## Architecture

| Path | Status | Purpose |
| --- | --- | --- |
| `apps/web-dashboard` | Active | React/Vite dashboard using Phase 1–6 in-memory mock services |
| `apps/web-dashboard/convex` | Active | Sole backend: schema, ingestion, RBAC, incident workflow, tests |
| `apps/processor` | Active, configuration required | Roboflow detection, ByteTrack tracking, unattended-object state logic, HMAC ingestion client |
| `apps/api` | **Decommissioned legacy** | Inactive FastAPI/PostgreSQL foundation retained for reference only |
| `compose.yaml` | **Decommissioned legacy** | Inactive PostgreSQL orchestration retained for reference only |

Convex is the only active backend. Do not deploy, extend, or depend on `apps/api` or `compose.yaml`.

## Web dashboard setup

```powershell
cd "apps\web-dashboard"
npm install
npm run dev
```

The development server is available at the URL printed by Vite, normally `http://localhost:5173`.

### Quality checks

```powershell
cd "apps\web-dashboard"
npm run lint
npm run test
npm run build
npx convex codegen
```

`npm run test` runs both projects. You can also run them separately:

```powershell
npm run test:web
npm run test:convex
npm run typecheck:convex
```

Processor checks:

```powershell
cd "apps\processor"
uv sync --extra vision --extra dev
uv run pytest
uv run ruff check .
uv run mypy
```

## Phase 7B AI processor

The processor uses Roboflow's hosted YOLO-World API with an explicit prompt
allowlist for people, bags, drink containers, boxes, packages, and parcels.
It does not use a visual prompt such as “suspicious-looking object”; appearance
alone is not evidence that an object is abandoned or dangerous.

```text
Authorized MP4/webcam/RTSP source
  -> Roboflow YOLO-World detections
  -> separate person/object ByteTrack trackers
  -> background + movement + stationarity + person association
  -> potential unattended-object metadata
  -> Convex HMAC ingestion
```

Setup instructions and every processor variable are documented in
`apps/processor/README.md` and `apps/processor/.env.example`. The default
configuration fails closed unless both `VIDEO_SOURCE_AUTHORIZED=true` and
`ROBOFLOW_CLOUD_UPLOAD_ACKNOWLEDGED=true` are explicitly set.

Use `apps/processor/scripts/set-roboflow-key.ps1` to enter a newly rotated
Roboflow key through a masked prompt. Never reuse a key exposed in chat or logs.

The configured cloud deployment target is:

```text
https://youthful-pigeon-735.ap-southeast-2.convex.cloud
```

The Convex functions are deployed to its HTTP Actions endpoint. Cloud health
returned HTTP 200 and an HMAC-signed heartbeat returned HTTP 201. The deployment
contains only the documented reference seed and smoke-test heartbeats; Roboflow
processing remains disabled until an API key and authorized video source are
provided locally.

## Convex backend setup (Windows PowerShell)

### 1. Start a local deployment

For a linked cloud project:

```powershell
cd "apps\web-dashboard"
npx convex login
npx convex dev
```

For the anonymous local deployment used in this workspace (no Convex account):

```powershell
cd "apps\web-dashboard"
$env:CONVEX_AGENT_MODE = "anonymous"
npx convex dev
```

Leave `npx convex dev` running while using HTTP actions. It writes `.env.local` with the deployment name, client URL, and HTTP actions URL. That file is ignored by Git.

A local deployment normally uses:

- Client/API URL: `http://127.0.0.1:3210`
- HTTP actions URL: `http://127.0.0.1:3211`

### 2. Configure processor credentials

The shared secret lives only in the Convex deployment environment. It is never stored in the repository and never shipped to the browser. It must be at least 32 characters.

```powershell
cd "apps\web-dashboard"

# Generate a local-only secret without writing it to the repository.
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })

# Pipe it through stdin so it does not appear in shell history.
$secret | npx convex env set PROCESSOR_SHARED_SECRET

# Keep it in this terminal only for the smoke test below.
$env:PROCESSOR_SHARED_SECRET = $secret
```

Optional settings:

```powershell
# Comma-separated device allowlist. When unset, any registered active device is accepted.
npx convex env set PROCESSOR_DEVICE_ID "PROCESSOR-DEMO-001"

# Request timestamp tolerance in seconds (30–3600, default 300).
npx convex env set PROCESSOR_MAX_CLOCK_SKEW_SECONDS "300"

# Maximum request body size in bytes (1024–1048576, default 262144).
npx convex env set PROCESSOR_MAX_REQUEST_BYTES "262144"
```

If `PROCESSOR_SHARED_SECRET` is missing or shorter than 32 characters, ingestion fails closed with HTTP `503 INGESTION_NOT_CONFIGURED`.

Phase 7A uses one shared secret for all processor devices, plus an optional device allowlist and database-backed device revocation. Per-device secrets and automated secret rotation are deferred.

### 3. Seed local reference data

```powershell
cd "apps\web-dashboard"
npx convex run development:seedReferenceData
```

The seed is idempotent and creates only:

- The five existing dashboard camera identifiers (`CAM-001` through `CAM-005`)
- Five explicitly labeled demonstration monitoring zones (`ZONE-DEMO-001` through `ZONE-DEMO-005`)
- Four demo identities used by tests and future identity-provider mapping
- One demo processor registration (`PROCESSOR-DEMO-001`) with no device connected

It never creates detections, incidents, model evaluations, or CCTV footage.

### 4. Run the signed ingestion smoke test

With `npx convex dev` still running and `PROCESSOR_SHARED_SECRET` set in the current terminal:

```powershell
cd "apps\web-dashboard"
.\scripts\smoke-ingestion.ps1
```

The script signs a heartbeat with HMAC-SHA256 and posts it to the local HTTP actions endpoint. It prints the JSON response.

## Processor ingestion contract

`POST /api/ai/events`

Required headers:

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `X-Processor-Device-Id` | Registered processor device ID |
| `X-Processor-Timestamp` | Unix timestamp in seconds |
| `X-Processor-Nonce` | Unique nonce per request |
| `X-Processor-Signature` | Lowercase hex HMAC-SHA256 |
| `X-Processor-Signature-Version` | Optional; only `v1` is supported |

The signed canonical string is:

```text
v1
POST
/api/ai/events
<device id>
<unix timestamp seconds>
<nonce>
<sha256 hex of the exact request body>
```

The body hash is computed over the exact bytes sent. JSON key order, whitespace, and number formatting must match between signing and transmission.

Replay and idempotency rules:

- Requests outside the allowed clock-skew window return `401 STALE_REQUEST`.
- Reusing a nonce returns `401 NONCE_REPLAY`.
- Reusing an idempotency key with identical bytes returns HTTP `200` with `status: "duplicate"`.
- Reusing an idempotency key with different bytes returns `409 IDEMPOTENCY_CONFLICT`.
- A retry must resend the identical body bytes with a new nonce.

Supported event types:

- `processor_heartbeat`
- `model_information`
- `camera_processing_status`
- `detection`
- `track_summary`
- `person_association`
- `potential_unattended_object`

Processor payloads use snake_case. Convex documents use camelCase. Person-only detections never create incidents. Supported candidate objects include backpacks, handbags, suitcases, duffel bags, shopping bags, briefcases, generic bags, bottles, mugs, cups, boxes, packages, and parcels. Potential incidents are stored as `new` for human verification; the system does not claim that an object is abandoned or dangerous.

Phase 7A stores detection and evidence **metadata only**. It does not accept images, video frames, recordings, or base64 media.

## Access control

Convex never trusts browser-supplied roles. Every user-facing query and mutation resolves the caller through `ctx.auth.getUserIdentity()` and then loads the provisioned user record.

| Role | Access |
| --- | --- |
| Administrator | Full access, including users, cameras, processors, models, incidents, and activity logs |
| Supervisor | View and manage all incidents, assign officers, view cameras/detections/reports |
| Security Officer | View and operate only incidents assigned to them |

Assignment is allowed while an incident is `new`, `acknowledged`, or `investigating`. Assigned officers can acknowledge, investigate, add notes, resolve, or mark a false alarm on their own incidents.

**Authentication currently fails closed.** No identity provider has been selected for this phase. Until one is configured and users are provisioned with matching `tokenIdentifier` values, all user-facing Convex functions return `UNAUTHENTICATED` or `USER_NOT_PROVISIONED`. The demo identities in the seed are test fixtures, not credentials, and cannot authenticate on their own.

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `CONVEX_DEPLOYMENT` | `.env.local` | Deployment selected by the Convex CLI |
| `VITE_CONVEX_URL` | `.env.local` | Convex client URL for future dashboard integration |
| `VITE_CONVEX_SITE_URL` | `.env.local` | Convex HTTP actions URL |
| `PROCESSOR_SHARED_SECRET` | Convex deployment | HMAC secret; at least 32 characters |
| `PROCESSOR_DEVICE_ID` | Convex deployment | Optional comma-separated device allowlist |
| `PROCESSOR_MAX_CLOCK_SKEW_SECONDS` | Convex deployment | Request timestamp tolerance |
| `PROCESSOR_MAX_REQUEST_BYTES` | Convex deployment | Maximum request body size |

Processor-side variables, including `ROBOFLOW_API_KEY`, `VIDEO_SOURCE`, and
the experimental temporal thresholds, belong only in the ignored
`apps/processor/.env` file. See its `.env.example` for the complete list.

Copy `apps/web-dashboard/.env.example` for the shape of local frontend variables. Never put `PROCESSOR_*` secrets in a `VITE_*` variable, a committed file, or the processor's source code.

## Data policy

- Demo cameras and demo zones are reference configuration only. No CCTV device is contacted.
- Mock and demo records are explicitly labeled. The backend never fabricates detections, incidents, model capabilities, evaluation metrics, or footage.
- Seeded reference records use `source: "MOCK"`; administrator-created camera records use `source: "LIVE"`.
- Processor-created records use `source: "PROCESSOR"`.
- Model class support stays `classesVerified: false` until an administrator records a manual inspection result.
- The demo priority rule (`confidence >= 0.95` → `critical`, otherwise `high`) mirrors the existing mock workflow. It is **not** a validated campus safety threshold.

## Legacy backend

`apps/api` and `compose.yaml` are decommissioned. They are retained unchanged for historical reference and must not be deployed or extended. See `apps/api/README.md`.

## Project phases

- Phase 1: Project foundation — complete
- Phase 2: Dashboard — complete
- Phase 3: Camera management — complete
- Phase 4: Detection and monitoring — complete
- Phase 5: Incident management — complete
- Phase 6: Reports and user management — complete
- Phase 7A: Convex backend foundation — complete
- Phase 7B: Roboflow AI processor and expanded object ingestion — implemented and cloud backend deployed; Roboflow credentials and authorized video still required
- Phase 7B: Real authentication and dashboard-to-Convex integration — deferred

The dashboard remains on mock login and mock data. Convex user APIs continue to
fail closed until real authentication is selected; processor ingestion uses its
separate HMAC credential path.
#   A I - A s s i s t O b j e c t  
 