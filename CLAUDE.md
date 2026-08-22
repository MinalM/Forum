# AI/ML Career Forum

MERN app: Express 5 + Mongoose server (`server/`), Vite + React client
(`client/`), MongoDB via Docker. Statsig for feature flags/experiments,
OpenTelemetry for observability.

## Architecture

- `server/src/` is TypeScript, compiled to `server/dist/` (which is
  **committed**). `server/server.js` is a legacy shim that loads `dist/`.
  After editing `server/src/`, run `cd server && npm run build` or the change
  does nothing at runtime.
- `server/` also has plain-JS `controllers/`, `routes/`, `models/`,
  `middleware/` used by `dist/server.js` — check both when tracing a route.
- Client is Vite 6 + `@vitejs/plugin-react` 4 on React 19 + `react-router` v8
  (not react-router-dom — v8 merged the packages). It was Create React App
  until the migration completed in Aug 2026; `docs/BACKLOG-ARCHIVE.md` has the
  step-by-step record, and `docs/vite-migration-design.md` the design.
- Two leftovers of that migration bite if you don't know them:
  - `client/index.html` lives at the **client root**, not in `public/`, and
    carries no `%PUBLIC_URL%` templating. `client/public/` is now only static
    assets (`images/`, `manifest.json`).
  - Source files use JSX inside `.js` files (a CRA convention), which esbuild
    won't parse by default, so `client/vite.config.js` opts them in via
    `esbuild.loader: 'jsx'` + `include`/`exclude`. Keep that block if you touch
    the config.
- Vite pins are deliberate: `vite@^6` / `@vitejs/plugin-react@^4`, not their
  current majors, because Vite 7 / plugin-react 5+ need Node ≥20.19 and CI is
  pinned to Node 18.x.
- Client env vars keep the `REACT_APP_` prefix (`envPrefix` in the Vite
  config) and are read via `import.meta.env`, not `process.env`.
- Client dev server proxies `/api` to `http://localhost:2000`
  (`server.proxy` in `client/vite.config.js`).

## Running locally

- MongoDB: `npm run mongo:up` (Docker, port 27017; needs Docker Desktop).
- Server: `npm run server` (nodemon, port 2000). Health:
  `GET http://localhost:2000/api/health` → `{status, dbState}`.
- Client: `npm run client` (Vite dev server, port 3000).
- Seed data: `npm run seed`.

## Testing

- Server: `npm test` at repo root (Jest 30 + mongodb-memory-server +
  supertest; config `server/jest.config.js`, which runs serially —
  `maxWorkers: 1` — to avoid port conflicts). 14 suites under
  `server/__tests__/`.
- Client: `cd client && npm test` (Jest 30 configured inline in
  `client/package.json`, jsdom environment). 32 suites under `client/src/`.
- E2E: `npx playwright test` (`tests/e2e`, needs server+client running; see
  the CI workflow).
- Client Jest gotchas (all already configured, don't fight them):
  - Jest is standalone here — it is not wired to Vite. Transforms come from
    `client/jest.babelTransform.js` (Babel, for JSX-in-`.js` and ESM deps) and
    `client/jest.cssTransform.js` (CSS imports), both referenced from the
    `jest` block in `client/package.json`.
  - `axios` is ESM-only → mapped to its CJS build via `moduleNameMapper`.
  - `react-router` v8 is ESM-only with `import.meta` → transformed via the
    `transformIgnorePatterns` whitelist (add new ESM-only deps to that
    whitelist, plus the `cookie-es` pattern).
  - `TextEncoder` polyfill lives in `client/src/setupTests.js`.
- Lint: `cd client && npm run lint` (ESLint 9 flat config in
  `client/eslint.config.mjs` — CRA's `eslintConfig` block is gone).

## CI / deployment (.github/workflows/node.js.yml)

- Triggers on push/PR to `main` only.
- Node matrix is pinned to 18.x, which is past upstream end-of-life
  (2025-04-30) — there's a standing backlog item to bump it. Any workflow edit
  needs its own explicitly-scoped PR.
- `security` job: `npm audit` (root, full) and
  `cd client && npm audit --omit=dev`. Never add `npm audit fix --force` to
  CI. Note the inline comment justifying `--omit=dev` still cites
  react-scripts/webpack-dev-server and is stale post-Vite; whether the client
  dev tree can now be audited in full is unverified — check before relying on
  either answer.
- `build-and-test`: unit tests + Playwright against a live stack.
- Merge to `main` deploys automatically (Render server, Netlify client).

## Conventions

- npm `overrides` (root and client package.json) pin vulnerable transitive
  deps. Root pins `brace-expansion@^5.0.9` plus a nested
  `minimatch.brace-expansion@^2.0.2`; client pins `postcss` and `form-data`.
  The old warning that the client must stay on brace-expansion 1.x no longer
  applies — it existed because the pin's API break killed CRA's ESLint at
  build time, and with CRA gone the client tree already resolves 5.0.9 at top
  level (1.1.16 survives only nested under `minimatch`).
- TDD is the norm here: failing test first, then the fix (see
  `client/src/context/__tests__/AlertContext.test.js` for the style).
- Commit style: conventional prefixes (`feat:`, `fix:`, `ci:`, `docs:`),
  granular commits.
- `AlertContext.setAlert`/`removeAlert` are memoized on purpose — consumers
  put them in effect deps; recreating them causes infinite fetch loops.
- Autonomous work: pick items from `BACKLOG.md` (top unchecked item first),
  one item per PR, open PRs against `main`, never merge them yourself.
  Completed items move to `docs/BACKLOG-ARCHIVE.md` with their "Done" notes.
