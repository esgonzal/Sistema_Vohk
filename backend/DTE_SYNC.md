# Relbase to Monday DTE synchronization

The DTE automation runs as a standalone PM2 process named `dte-sync`. Express
only hosts the existing `/monday/consult` and `/monday/update` webhooks.

## Required environment

- `MONDAY_API_TOKEN`
- `RELBASE_API_USER`
- `RELBASE_API_COMPANY`
- `DTE_MONDAY_BOARD_ID`
- The existing PostgreSQL `DB_*` variables

Optional: `DTE_DISCOVERY_MAX_PER_TYPE` limits how many consecutive documents
of each type are imported in one run (default: 100).

## Scheduling

- Discovery: every five minutes and once at worker startup.
- Tracked status refresh: midnight and noon.
- PostgreSQL advisory locks prevent concurrent workers from processing the
  same run or DTE.

PM2 file watching is disabled. A `git pull` changes the files on disk but does
not reload either process. Restart explicitly when a deployment should take
effect:

```sh
pm2 restart server --update-env
pm2 restart dte-sync --update-env
```

## Legacy import

After migration `database/migrations/008_dte_sync.sql`, run this once before
starting the worker:

```sh
node scripts/importLegacyDteState.js
```

The importer is idempotent. It salvages complete entries from a truncated
legacy watchlist and rewinds the affected cursor so the incomplete DTE is
retried.
