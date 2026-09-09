# Independent backend processes

Local preparation only. Nothing here installs a configuration on the droplet.
The original `server.js` and Dockerfile remain the combined-server fallback;
the new PM2 configuration deliberately does not start that entry point.

| Process | Entry point | Port / responsibility |
| --- | --- | --- |
| university-api | server-university.js | 8081: /v1 |
| legacy-api | server-legacy.js | 8082: /v0 and /mail |
| vohk-api | server-vohk.js | 8080: /api, intercom WebSocket, /debug.jpg |
| integrations-api | server-integrations.js | 8083: /monday |
| vohk-worker | workers/vohkWorker.js | Device heartbeat, invitation expiration, access-event sync |
| dte-sync | workers/dteSyncWorker.js | Existing DTE discovery and refresh |

PM2 resolves scripts and `.env` from the backend directory, regardless of the
shell's working directory. Each new HTTP entry point also loads backend/.env
before importing its routes. No new dependencies are required. Ports can be
overridden with UNIVERSITY_PORT, LEGACY_PORT, VOHK_PORT, INTEGRATIONS_PORT;
update Nginx to match if overriding them. HTTP binds to 127.0.0.1 by default;
HOST can override this for development/container use.

Keep all processes single-instance for now. In particular, the VOHK worker's
job guards and the intercom gateway's busy-device reservations are process-local.
Do not run the combined server alongside vohk-worker: both would schedule jobs.
The existing dte-sync worker is retained, not duplicated.

## Review before deployment

- Compare nginx/default.conf with the actual current Nginx file, including any
  changes since the supplied snapshot. Frontend, media, snapshots, detections,
  certificates, redirects and the direct-IP dashboard are preserved.
- Confirm /v1 is the university contract and /v0 plus /mail is the legacy
  contract. Route implementations and public prefixes have not changed.
- Confirm ports 8081-8083 are free and review memory and PostgreSQL connection
  limits. Processes share the database but have independent connection pools.
- Keep existing .env and credential files in place. The Angular CORS allowlist
  is preserved; add the future admin origin when its domain is decided.
- Test on the droplet with nginx -t before reload. Local Windows verification
  does not validate Linux certificates, paths, or the installed Nginx build.

## Proposed migration (only after review)

Commands below assume /opt/Sistema_Vohk/backend. Back up the active Nginx file
and record `pm2 describe server`, `pm2 describe dte-sync`, and the current git
revision first. Keep the old combined server code available for rollback.

1. Install the reviewed revision without restarting `server`. Start only the
   three new processes that use unused ports:

   ```sh
   cd /opt/Sistema_Vohk/backend
   pm2 start backend-pm2.config.js --only university-api,legacy-api,integrations-api
   curl --fail http://127.0.0.1:8081/healthz
   curl --fail http://127.0.0.1:8082/healthz
   curl --fail http://127.0.0.1:8083/healthz
   ```

2. Verify representative read-only requests with appropriate credentials.
   Install the reviewed Nginx draft, run `nginx -t`, then reload Nginx only if
   validation succeeds. Check public university and legacy requests and the
   Monday challenge response. Those paths now reach the new processes while
   the original server still serves VOHK on 8080.

3. In a short VOHK maintenance window, stop the old process before starting
   the API and worker. Active VOHK requests/intercom calls can disconnect.

   ```sh
   pm2 stop server
   pm2 start backend-pm2.config.js --only vohk-api,vohk-worker
   curl --fail http://127.0.0.1:8080/healthz
   ```

   Verify mobile/admin authentication and reads, intercom connectivity, and
   worker logs. Check that university requests continue through this step.
   Leave the already-running dte-sync, mediamtx and snapshots alone.

4. After verification, remove the stopped old process with `pm2 delete server`
   and persist the final process list with `pm2 save`. Never use `restart all`
   as the normal deployment command.

## Rollback

Stop vohk-worker and vohk-api before restarting the old combined server on
8080. If the old PM2 entry still exists, `pm2 restart server`; otherwise use
the recorded original PM2 settings to start server.js as `server` from backend.
Restore the backed-up Nginx configuration, validate it, then reload. Once all
paths reach the combined server again, stop the three extra API processes.
Keep dte-sync running once throughout. Save PM2 only after verifying rollback.

## Subsequent deployments

```sh
pm2 restart vohk-api
# Only when its code changed:
pm2 restart vohk-worker
```

Use the corresponding process name for university, legacy or integration
changes. A webhook change may require integrations-api; shared DTE logic may
require both integrations-api and dte-sync. A shared library change requires
reviewing all its consumers before deciding which processes to restart.

This stage isolates process restarts. It does not isolate shared dependency
installation, live checkout edits, database migrations, CPU or memory. Release
directories remain a later step. /healthz reports process liveness, not provider
or database readiness. New APIs intentionally do not enable multi-instance
scaling or change existing job schedules/business behavior.

## Local verification

From backend, run `node --test test/*.test.js`. The process-isolation test starts
all four real entry points on temporary loopback ports, checks route ownership,
the Monday challenge and unauthenticated WebSocket rejection, and stops/restarts
VOHK while checking university availability. Database access and cron scheduling
are blocked in these API test subprocesses; Firebase initialization is stubbed.
The worker test substitutes device services and cron scheduling to verify the
three schedules without contacting equipment or providers. These checks do not
replace authenticated staging checks or Nginx validation on the droplet.
