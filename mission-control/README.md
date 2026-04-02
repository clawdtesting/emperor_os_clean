# AGI Alpha Mission Control

Mission Control is the AGI Alpha operator dashboard.

## Scope

This app is intentionally focused on AGI Alpha workflows:
- monitor live AGI Alpha jobs from MCP
- inspect job briefs and completion metadata
- monitor autonomous/keepalive GitHub workflows
- browse local AGI Alpha test jobs
- connect MetaMask (foundation for request/apply/validate contract actions)

## Runtime layout

- `src/` — React + Vite frontend (dashboard UI)
- `server.js` — Express API proxy + SSE endpoints + local test runner

## Key API routes

- `GET /api/jobs` — live jobs via MCP (`list_jobs`)
- `GET /api/job-spec/:jobId` — job detail via MCP (`get_job`)
- `GET /api/job-metadata/:jobId` — completion metadata (`fetch_job_metadata`)
- `GET /api/pipelines` — available local pipeline files
- `GET /api/test-jobs` — local test job specs from `../tests`
- `POST /api/test-run` — stream local lobster execution
- `GET /api/agent` — identity metadata for the Mission Control UI

## Development

```bash
npm install
npm run dev
```

To run the backend API server:

```bash
node server.js
```

## Next integration target

Add contract calls behind the wallet panel for:
- `requestJob(...)`
- `applyToJob(...)`
- `validateCompletion(...)`
