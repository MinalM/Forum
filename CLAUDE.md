# AI/ML Career Forum

MERN app: Express 5 + Mongoose server (`server/`), Create React App client
(`client/`), MongoDB via Docker. Statsig for feature flags/experiments,
OpenTelemetry for observability.

## Architecture

- `server/src/` is TypeScript, compiled to `server/dist/` (which is
  **committed**). `server/server.js` is a legacy shim that loads `dist/`.
  After editing `server/src/`, run `cd server && npm run build` or the change
  does nothing at runtime.
- `server/` also has plain-JS `controllers/`, `routes/`, `models/`,
  `middleware/` used by `dist/server.js` — check both when tracing a route.
- Client is CRA (react-scripts 5, unmaintained) on React 19 +
  `react-router` v8 (not react-router-dom — v8 merged the packages).
- Client dev server proxies `/api` to `http://localhost:2000`
  (see `client/package.json` "proxy").

## Running locally

- MongoDB: `npm run mongo:up` (Docker, port 27017; needs Docker Desktop).
- Server: `npm run server` (nodemon, port 2000). Health:
  `GET http://localhost:2000/api/health` → `{status, dbState}`.
- Client: `npm run client` (CRA dev server, port 3000).
- Seed data: `npm run seed`.

## Testing

- Server: `npm test` at repo root (Jest 30 + mongodb-memory-server +
  supertest; config `server/jest.config.js`). 121 tests as of 2026-08.
- Client: `cd client && CI=true npx react-scripts test --watchAll=false`.
- E2E: `npx playwright test` (needs server+client running; see CI workflow).
- Client Jest gotchas (all already configured, don't fight them):
  - `axios` is ESM-only for CRA's Jest → mapped to its CJS build via
    `moduleNameMapper` in `client/package.json`.
  - `react-router` v8 is ESM-only with `import.meta` → transformed by
    `client/jest.babelTransform.js` + `transformIgnorePatterns` whitelist
    (add new ESM-only deps to that whitelist, plus `cookie-es` pattern).
  - `TextEncoder` polyfill lives in `client/src/setupTests.js`.

## CI / deployment (.github/workflows/node.js.yml)

- Triggers on push/PR to `main` only.
- `security` job: `npm audit` (root, full) and
  `cd client && npm audit --omit=dev`. Client dev tree has known
  unfixable CRA advisories (webpack-dev-server 4.x) — that's why the client
  audit is production-deps-only. Never add `npm audit fix --force` to CI.
- `build-and-test`: unit tests + Playwright against a live stack.
- Merge to `main` deploys automatically (Render server, Netlify client).

## Conventions

- npm `overrides` (root and client package.json) pin vulnerable transitive
  deps. Root pins `brace-expansion@^5.0.8` — do NOT copy that override into
  `client/` (its API break kills CRA's eslint at build time; client build
  chain must keep brace-expansion 1.x).
- TDD is the norm here: failing test first, then the fix (see
  `client/src/context/__tests__/AlertContext.test.js` for the style).
- Commit style: conventional prefixes (`feat:`, `fix:`, `ci:`, `docs:`),
  granular commits.
- `AlertContext.setAlert`/`removeAlert` are memoized on purpose — consumers
  put them in effect deps; recreating them causes infinite fetch loops.
- Autonomous work: pick items from `BACKLOG.md` (top unchecked item first),
  one item per PR, open PRs against `main`, never merge them yourself.
