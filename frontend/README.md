# Frontend

React, TypeScript, Vite, and Tailwind CSS dashboard for Abandon-AI.

The dashboard currently uses mock authentication and in-memory mock services.
The active Convex backend lives in `../api/convex` and is not yet wired into
this app.

## Commands

```powershell
npm install
npm run dev       # development server
npm run lint      # Oxlint
npm test          # Vitest (jsdom)
npm run build     # type-check and production build
npm run preview   # preview the production build
```

## Structure

| Path | Purpose |
| --- | --- |
| `src/app/` | Router and navigation |
| `src/features/` | Dashboard, cameras, areas, monitoring, detections, incidents, reports, users, settings |
| `src/services/` | Mock service layer and provider boundary |
| `src/mocks/` | Demo data for Valencia City and Bukidnon |
| `src/features/users/auth/` | Mock authentication provider |

Real authentication and the Convex data layer are intentionally deferred.
