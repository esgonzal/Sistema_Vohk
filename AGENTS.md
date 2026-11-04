# Repository runtime

- The required runtime for every task in this repository is Node.js `22.16.0` with npm `10.9.2`.
- Do not downgrade to Node 18 or infer a different Node version from Angular's age.
- Before installing dependencies, building, or testing, run `node --version` and `npm --version` and report a mismatch.
- Install backend dependencies with `npm ci` from `backend/`.
- Install frontend dependencies with `npm ci` from `frontend/`.
- Run the complete backend suite with `npm test` from `backend/`.
- Build Vohk One with `npm run build:one` from `frontend/`.

The authoritative version declarations are `.nvmrc`, `.node-version`, the npm `engines` fields, and this file. Codex and Linear environments must set `CODEX_ENV_NODE_VERSION=22.16.0` when that variable is available.

## Temporary files

- Never clone or copy a repository into this repository's `tmp/`, `artifacts/`, `deploy/`, `backend/`, or `frontend/` directories.
- Never place generated `node_modules`, build output, caches, screenshots, diagnostic captures, or document render intermediates inside the repository unless the task explicitly requires a tracked artifact.
- Use the operating system temporary directory for disposable work and remove it when the task finishes.
- The repository-level `tmp/` directory is ignored and reserved only for short-lived local files; it must not contain repository clones.
- Do not create repository-level `artifacts/` or `deploy/` directories. Research output and droplet configuration copies must remain outside the source repository.
