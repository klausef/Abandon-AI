# Convex backend

Active backend for Campus Safety Command. Processor ingestion is integrated in Phase 7B; the React dashboard still does not call protected functions because authentication remains deferred.

## Layout

| Path | Purpose |
| --- | --- |
| `schema.ts` | Tables and indexes for users, cameras, zones, processors, detections, tracks, incidents, evidence, actions, logs, receipts, nonces, and counters |
| `validators.ts` | Shared Convex validators |
| `http.ts` | `POST /api/ai/events` and `GET /api/ai/health` |
| `ingestion.ts` | Transactional processor event ingestion and incident creation |
| `lib/eventValidation.ts` | Strict Zod payload schemas and snake_case-to-camelCase normalization |
| `lib/hmac.ts` | Canonical request signing and constant-time signature comparison |
| `lib/auth.ts` | `ctx.auth.getUserIdentity()` resolution that fails closed |
| `lib/permissions.ts` | Role-to-permission mapping |
| `lib/incidents.ts` | Incident transitions, assignment rules, and access checks |
| `incidents.ts` | Protected incident queries and workflow mutations |
| `cameras.ts`, `processors.ts`, `models.ts`, `detections.ts`, `users.ts` | Administration and read APIs |
| `activityLogs.ts`, `monitoring.ts` | Audit trail and monitoring overview |
| `development.ts` | Idempotent demo reference-data seed |
| `testSupport.ts` | HMAC signing and event factories for tests |

## Ingestion

`POST /api/ai/events` requires HMAC-SHA256 authentication over the exact request body. The canonical string is documented in the repository root `README.md`. The shared secret is stored only in the Convex deployment environment and must be at least 32 characters.

Ingestion enforces:

- Timestamp clock-skew limits
- Single-use nonces
- Idempotency receipts keyed by `idempotency_key`
- Registered and active processor devices
- Camera and monitoring-zone references
- Strict event validation, including rejection of unknown fields and media payloads

The canonical object vocabulary includes people plus bags, luggage, drink
containers, boxes, packages, and parcels. `person` remains excluded from direct
incident creation. Model reports remain unverified until an administrator
records a manual inspection.

## Tests

```powershell
npm run test:convex
npm run typecheck:convex
```

The Convex test project runs under the edge-runtime environment used by Convex functions. Tests cover HMAC authentication, replay and idempotency protection, event validation, every ingestion event type, incident creation and duplicate suppression, RBAC, workflow transitions, and administration.

## Data policy

Only metadata is stored. No images, video frames, recordings, or footage are accepted or written. Demo cameras and demo zones are reference configuration only. Model class support remains unverified until an administrator records a manual inspection.
