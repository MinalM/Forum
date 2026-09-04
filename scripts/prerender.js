#!/usr/bin/env node
/**
 * Build-time crawler prerendering (BACKLOG.md "Prerendering for crawlers").
 *
 * `client/index.html` ships an empty `<div id="root">` - fine for a real
 * browser (index.js's createRoot fills it in) but useless to a crawler that
 * doesn't execute JavaScript, so post bodies were previously invisible to
 * non-JS indexers. This script runs *after* `npm run build` (client/build
 * already exists), serves that build with `vite preview`, drives a real
 * headless browser over STATIC_ROUTES plus a sample of the most recent
 * posts, and overwrites each route's `index.html` in client/build with the
 * fully-rendered DOM - script/link tags included, so a real browser still
 * hydrates normally on top of it.
 *
 * Run after building the client:
 *   REACT_APP_API_URL=http://localhost:2000 node scripts/prerender.js
 *
 * Never fails the build: an unreachable API degrades to STATIC_ROUTES only
 * (logged, not thrown), and a route that errors mid-crawl is skipped with a
 * warning rather than aborting the rest.
 */
const path = require('path');
const fs = require('fs/promises');
const { spawn } = require('child_process');

// `@playwright/test` is required lazily inside main(), not up here: its
// entry point pulls in MCP-bundle code that does a dynamic import() Jest
// can't handle without --experimental-vm-modules, which broke every test
// in this file (server/__tests__/tooling/prerender.test.js) even though
// none of them touch chromium. Only main() ever launches a browser, so
// only main() needs the module loaded.
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const BUILD_DIR = path.join(CLIENT_DIR, 'build');
const STATIC_ROUTES = ['/', '/categories', '/search'];
const DEFAULT_PORT = 4173;
const DEFAULT_POST_LIMIT = 20;

// Exported for tests: pure, no network/DB access.
function buildPostRoutes(postIds) {
  return [...new Set(postIds)].filter(Boolean).map((id) => `/posts/${id}`);
}

function resolveRoutes({ staticRoutes = STATIC_ROUTES, postIds = [] } = {}) {
  return [...new Set([...staticRoutes, ...buildPostRoutes(postIds)])];
}

function routeToOutputPath(buildDir, route) {
  const trimmed = route.replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed === ''
    ? path.join(buildDir, 'index.html')
    : path.join(buildDir, ...trimmed.split('/'), 'index.html');
}

function isPostRoute(route) {
  return /^\/posts\/[^/]+$/.test(route);
}

// Fetches the most recent post ids from the live API. Never throws - an
// unreachable API or non-2xx response degrades to no post routes rather
// than failing the whole prerender pass.
async function fetchRecentPostIds(apiUrl, limit, fetchImpl = fetch) {
  const url = `${apiUrl.replace(/\/+$/, '')}/api/posts?limit=${limit}&sort=-createdAt`;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) {
      console.warn(`[prerender] GET ${url} responded ${res.status}; skipping post routes.`);
      return [];
    }
    const body = await res.json();
    return (body.data || []).map((post) => post._id).filter(Boolean);
  } catch (err) {
    console.warn(`[prerender] could not reach ${url} (${err.message}); skipping post routes.`);
    return [];
  }
}

// Navigates to one route and returns its fully-rendered outerHTML. Post
// routes additionally wait for `.post-title` so the crawl doesn't capture a
// loading state for the one page type whose content is the whole point.
// Generous timeouts: this runs alongside a full dev stack (DB, API, another
// client instance) competing for the same CI runner, and a post page does
// more work than the static routes (an extra fetch for the post + its
// populated comments, then markdown rendering).
async function prerenderRoute(page, baseUrl, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
  if (isPostRoute(route)) {
    await page.waitForSelector('.post-title', { timeout: 20000 });
  }
  return page.content();
}

async function waitForServer(url, { retries = 60, delayMs = 500 } = {}) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Server not up yet - keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const { chromium } = require('@playwright/test');
  const port = process.env.PRERENDER_PORT || DEFAULT_PORT;
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:2000';
  const postLimit = Number(process.env.PRERENDER_POST_LIMIT) || DEFAULT_POST_LIMIT;
  const baseUrl = `http://localhost:${port}`;

  // The local binary directly, not `npx vite` - npx wraps the command in an
  // extra shell process on some npm versions, and killing just the npx PID
  // then leaves that shell (and vite itself) running as orphans.
  const viteBin = path.join(CLIENT_DIR, 'node_modules', '.bin', 'vite');
  const preview = spawn(
    viteBin,
    ['preview', '--port', String(port), '--strictPort'],
    { cwd: CLIENT_DIR, stdio: 'inherit' }
  );
  preview.on('error', (err) => {
    console.error('[prerender] failed to start vite preview:', err);
  });

  try {
    await waitForServer(baseUrl);

    const postIds = await fetchRecentPostIds(apiUrl, postLimit);
    const routes = resolveRoutes({ postIds });
    console.log(`[prerender] crawling ${routes.length} route(s): ${routes.join(', ')}`);

    // --no-sandbox: CI runners typically execute as root, where Chromium's
    // sandbox needs privileges (CAP_SYS_ADMIN) that aren't available.
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      for (const route of routes) {
        // One retry per route: a single slow/cold navigation shouldn't drop
        // a route from the crawl outright.
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          try {
            const html = await prerenderRoute(page, baseUrl, route);
            const outputPath = routeToOutputPath(BUILD_DIR, route);
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, html);
            console.log(`[prerender] wrote ${path.relative(BUILD_DIR, outputPath)}`);
            break;
          } catch (err) {
            if (attempt === 2) {
              console.warn(`[prerender] skipping ${route}: ${err.message}`);
            } else {
              console.warn(`[prerender] retrying ${route} after error: ${err.message}`);
            }
          }
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    // SIGKILL, not the default SIGTERM: this is a throwaway preview server
    // we alone talk to, so there's nothing to shut down gracefully, and a
    // lingering `vite preview` process has been observed to ignore SIGTERM.
    preview.kill('SIGKILL');
  }
}

module.exports = {
  STATIC_ROUTES,
  buildPostRoutes,
  resolveRoutes,
  routeToOutputPath,
  isPostRoute,
  fetchRecentPostIds,
  prerenderRoute
};

if (require.main === module) {
  main().catch((err) => {
    console.error('[prerender] fatal:', err);
    process.exit(1);
  });
}
