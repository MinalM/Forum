# Design: migrate `client/` from Create React App to Vite

Status: design only — no implementation in this PR. Follow-up items are
listed at the bottom and will be split out into their own backlog entries.

## Why

`react-scripts` (CRA) is unmaintained upstream. Consequences we're already
carrying:

- Its dev dependency tree pins `webpack-dev-server` 4.x, which has advisories
  with no CRA-compatible fix. CI's `security` job works around this by
  auditing the client's production deps only (`npm audit --omit=dev`) — see
  `.github/workflows/node.js.yml`.
- `axios` (ESM-only in its default export) needs a `moduleNameMapper` hack in
  `client/package.json` to resolve to its CJS build under Jest.
- `react-router` v8 is ESM-only and uses `import.meta`, which CRA's Jest
  environment doesn't support. We carry a custom transform
  (`client/jest.babelTransform.js`) that strips `import.meta` via a Babel
  plugin, plus a `transformIgnorePatterns` allowlist that has to be extended
  for every new ESM-only dependency.
- `react-scripts start`/`build` are slow relative to Vite's native-ESM dev
  server and esbuild/Rollup-based bundling.

None of this is broken today — it's accumulating workarounds. Vite has no
`import.meta`/ESM problem (it's ESM-native) and a maintained ecosystem.

## Scope of this migration

In scope: `client/` build tooling, dev server, test runner, env vars, CI
build step. Out of scope: any application code changes beyond what the
tooling swap mechanically requires (import paths, env var access pattern).
No component/business logic changes.

## Current CRA surface to replace

| Concern | CRA today | File(s) |
|---|---|---|
| Dev server | `react-scripts start`, proxies `/api` → `localhost:2000` | `client/package.json` `"proxy"` |
| Build | `react-scripts build` → `client/build/` | `client/package.json` scripts, root `build`/`build:client` |
| Test runner | `react-scripts test` (Jest, jsdom) | `client/package.json` `"jest"` block, `jest.babelTransform.js`, `src/setupTests.js` |
| Env vars | `process.env.REACT_APP_*`, injected via `.env.production`, CI `echo REACT_APP_API_URL=... > client/.env` | `src/config.js`, `src/index.js`, CI workflow |
| HTML entry | `public/index.html` with `%PUBLIC_URL%` templating | `client/public/index.html` |
| Static assets | `public/` (favicon, `manifest.json`, `images/`), referenced via `%PUBLIC_URL%` and absolute `/` paths | `client/public/` |
| Global polyfills | `TextEncoder`/`TextDecoder` shim for react-router 8 | `src/setupTests.js` |

## Target tooling

- **Bundler/dev server:** Vite (`vite`, `@vitejs/plugin-react`).
- **Test runner: keep Jest, do not switch to Vitest.** Reasoning: the CRA
  Jest config already works and is well understood; switching test runner
  *and* bundler in the same migration doubles the risk surface and this repo
  is TDD-heavy (121+ server tests, dozens of client tests) where a flaky
  runner swap is expensive to debug. Vite's dev/build speed win doesn't
  require Vitest. We'd use `babel-jest` (already a dependency of
  `react-scripts`, would need to become a direct devDependency) or
  `ts-jest`-style config with `jsdom` test environment, same as today.
  Concretely: keep `client/package.json`'s `"jest"` block and
  `jest.babelTransform.js`, dropping the `import.meta`-strip plugin (see
  below) but keeping the `axios` CJS `moduleNameMapper` (Vite doesn't affect
  Jest's module resolution) and `TextEncoder`/`TextDecoder` shim in
  `setupTests.js` (still needed — Jest's jsdom environment is unchanged).
  Revisit Vitest as a separate future item once the bundler swap alone has
  proven stable in CI for a few weeks.

## Migration steps

1. **Add Vite deps.** `vite`, `@vitejs/plugin-react` as client devDeps.
2. **`client/vite.config.js`:**
   - `plugins: [react()]`.
   - `server.proxy: { '/api': 'http://localhost:2000' }` to replace CRA's
     `"proxy"` field.
   - `server.port: 3000` to match existing convention (CI, Playwright config,
     and developer habit all assume port 3000).
   - `build.outDir: 'build'` to keep `client/build/` as the output dir — CI's
     Netlify `publish-dir: './client/build'` and root `npm run build`/
     `build:client` scripts depend on that path and shouldn't need to change.
   - `envPrefix: 'REACT_APP_'` so existing `.env` files and CI env-injection
     keep working unmodified — Vite supports a custom prefix instead of
     forcing a rename to `VITE_*`. This avoids touching `.env.production`,
     the CI step that writes `client/.env`, and the Playwright `webServer`
     env block, all of which set `REACT_APP_API_URL`.
3. **Env var access.** Vite exposes env vars via `import.meta.env.*`, not
   `process.env.*`. Two call sites need updating:
   - `client/src/config.js`: `process.env.REACT_APP_API_URL` →
     `import.meta.env.REACT_APP_API_URL`; `process.env.CI` (used to detect
     the CI-only API URL override) has no Vite equivalent since `CI` isn't
     one of the app's `REACT_APP_*`/custom-prefixed vars — pass it through
     explicitly as `VITE_CI` or resolve the CI branch a different way (e.g.
     drop the CI-specific branch and let CI set `REACT_APP_API_URL`
     directly, which it already effectively does via the workflow's `echo`
     step and Playwright's `webServer` env).
   - `client/src/index.js`: `process.env.REACT_APP_STATSIG_CLIENT_KEY` →
     `import.meta.env.REACT_APP_STATSIG_CLIENT_KEY`.
   - Jest keeps using `process.env` (Node, not Vite) — no change needed
     there, since the test runner isn't Vite.
4. **HTML entry.** Move `client/public/index.html` to `client/index.html`
   (Vite's convention — HTML is the dev-server entry, not something injected
   into `public/`). Replace `%PUBLIC_URL%/favicon.ico` etc. with root-relative
   `/favicon.ico` (Vite serves `public/` at `/` automatically, so the
   templating placeholder is unnecessary). Add
   `<script type="module" src="/src/index.js"></script>` before `</body>`
   (Vite's entry-point convention, replacing CRA's implicit
   `src/index.js` pickup).
5. **Static assets.** `client/public/` (images, `manifest.json`, favicon)
   stays as-is; Vite serves it the same way CRA did. Audit `%PUBLIC_URL%`
   usages elsewhere in `src/` (none found beyond `index.html` as of this
   writing, but re-check at implementation time) and convert to root-relative
   paths.
6. **Jest config.** In `client/package.json`'s `"jest"` block:
   - Drop the `import.meta`-strip Babel plugin need — confirm whether
     react-router 8 still requires it under plain `babel-jest` without CRA's
     preset chain, since the preset (`babel-preset-react-app`) is a CRA
     package we'd be dropping. Likely replacement: `@babel/preset-env` +
     `@babel/preset-react` configured directly in `jest.babelTransform.js`,
     keeping the `import.meta`→`({})` plugin regardless (react-router 8 uses
     `import.meta` regardless of bundler, so the strip is still needed under
     Jest specifically — this is a Jest/ESM problem, not a CRA problem, and
     survives the migration unchanged).
   - Keep `transformIgnorePatterns` allowlist as-is.
   - `moduleNameMapper` for `axios` stays as-is.
7. **Scripts.** `client/package.json`:
   - `"start": "vite"` (replaces `react-scripts start`)
   - `"build": "vite build"` (replaces `react-scripts build`)
   - `"preview": "vite preview"` (new — Vite convenience, not currently used
     by any workflow, but useful for manually sanity-checking a production
     build locally)
   - `"test": "jest"` or equivalent explicit Jest invocation (replaces
     `react-scripts test`, which wrapped Jest with CRA-specific config
     merging that we'd now do explicitly in the `"jest"` block, same as
     today).
   - Drop `"eject"` (meaningless without react-scripts).
8. **ESLint.** `"eslintConfig": { "extends": ["react-app", "react-app/jest"] }`
   depends on `eslint-config-react-app`, a react-scripts package. Replace
   with a standalone ESLint config (flat config or `.eslintrc`) using
   `eslint-plugin-react`/`eslint-plugin-react-hooks` directly, or Vite's
   community-recommended ESLint setup. This is the one piece with no
   drop-in equivalent and needs its own rule-parity pass.
9. **`overrides` in `client/package.json`.** Current overrides
   (`nth-check`, `postcss`, `svgo`, `@svgr/webpack`, `resolve-url-loader`,
   `form-data`, `formidable`) exist to patch CVEs in react-scripts's
   transitive webpack/SVG tooling. Once react-scripts is gone, re-run
   `npm audit` and drop overrides that no longer apply; keep
   `form-data`/`formidable` if still pulled in by remaining deps (verify at
   implementation time — they may be server-side leftovers copy-pasted into
   client's `package.json`, worth double-checking during implementation).
10. **CI (`.github/workflows/node.js.yml`).** No structural changes expected:
    - `build-and-test` job's `echo "REACT_APP_API_URL=..." > client/.env`
      step keeps working unchanged (`envPrefix` handles it).
    - `CI=false npm run build --if-present` — the `CI=false` was a CRA
      convention (CRA treats warnings as errors when `CI=true`); Vite
      doesn't have this behavior, so this can likely become plain
      `npm run build`, but verify no other script depends on `CI=false`
      before removing it.
    - `deploy` job's Netlify `publish-dir: './client/build'` is unaffected
      since `build.outDir` is kept at `build`.
    - `security` job's `npm audit --omit=dev` for client: re-verify after
      the swap: Vite's dev-only deps (Vite itself, `@vitejs/plugin-react`)
      shouldn't be in the production audit scope, so this should stay green
      or improve (no more webpack-dev-server 4.x advisory to carve out).
11. **Playwright.** `playwright.config.ts`'s `webServer` entries invoke
    `npm run client`/`npm run server` and poll the client on `CLIENT_PORT`
    (3000) — unaffected as long as `vite` (via `npm start`) binds to 3000
    (set `server.port` explicitly, since Vite defaults to 5173).

## Test-runner choice: Jest (not Vitest) — expanded rationale

Considered switching to Vitest since it shares Vite's config/transform
pipeline and would remove the need for a separate Babel transform entirely.
Decided against it *for this migration*:

- Two simultaneous tool swaps (bundler + test runner) makes it hard to
  bisect regressions — if a test fails after the migration, is it Vite or
  Vitest?
- Vitest's jsdom/mocking APIs differ enough from Jest's
  (`vi.mock` vs `jest.mock`, module-reset timing, `@testing-library/jest-dom`
  matcher registration) that every existing test file would need review, not
  just a config change — this repo has dozens of client test files.
- CLAUDE.md's TDD convention and existing test suite are Jest-idiomatic
  throughout the stack (server tests are Jest too) — keeping Jest keeps one
  test runner mental model across `server/` and `client/`.
- The main pain point this migration fixes (ESM/`import.meta` compatibility
  in the *dev/build* pipeline) is a Vite concern, not a Jest concern — Jest
  will still need its own ESM handling regardless of bundler, since Jest
  doesn't use Vite's transform pipeline unless you adopt Vitest.

Vitest remains a reasonable *future* follow-up once the bundler swap has
soaked, evaluated on its own with its own test-file migration pass.

## Risks / open questions

- **ESLint config parity** (step 8) is the least mechanical step — needs a
  rule-by-rule comparison against `eslint-config-react-app` to avoid
  silently losing lint coverage (e.g. hooks rules, JSX a11y rules bundled
  into `react-app`).
- **`import.meta` under Jest** (step 6) needs a spike to confirm the strip
  plugin still works without `babel-preset-react-app` in the chain — the
  preset may have been doing other transform work (JSX runtime resolution,
  class properties, etc.) that a hand-rolled preset combo needs to replicate.
- **Font Awesome CDN link** in `public/index.html` (`cdnjs.cloudflare.com`)
  is unrelated to the bundler and carries over as-is — noting it here only
  because the whole file is being restructured (CRA `public/index.html` →
  Vite `index.html`) and it'd be easy to drop by accident.
- **Node 18 in CI** (`.github/workflows/node.js.yml` matrix): current Vite
  major versions require Node ^18.x or newer — confirm the exact Vite
  version target's minimum Node before pinning a version, since the CI
  matrix is currently `[18.x]` only.

## Suggested follow-up items (to be added to `BACKLOG.md` as separate,
scoped PRs once this design is reviewed)

1. Add Vite + `@vitejs/plugin-react`, `vite.config.js`, move/rewrite
   `index.html`, update `start`/`build`/`preview` scripts. Verify
   `npm run client` serves on port 3000 and proxies `/api` correctly.
2. Update env var access (`config.js`, `index.js`) from `process.env.*` to
   `import.meta.env.*`; update `.env.production` / CI env-injection if the
   prefix or CI-detection logic changes.
3. Re-point Jest config for the post-CRA transform chain (drop
   `babel-preset-react-app` dependency, replace with direct Babel presets;
   confirm `import.meta` strip still works); full client test suite green.
4. Replace `eslintConfig` (`react-app`/`react-app/jest`) with a standalone
   ESLint config; fix any newly-surfaced lint violations.
5. Prune `client/package.json` `overrides` that no longer apply once
   react-scripts is removed; re-verify `npm audit --omit=dev` is clean.
6. CI workflow cleanup: drop `CI=false` if no longer needed, re-verify
   `build-and-test` and `deploy` jobs end-to-end (including Playwright)
   against the Vite build.
