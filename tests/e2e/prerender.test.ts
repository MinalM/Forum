import { test, expect, request as playwrightRequest } from '@playwright/test';
import { execFileSync } from 'child_process';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';

// Proves scripts/prerender.js does what BACKLOG.md's "Prerendering for
// crawlers" item asks: a non-JS client (no browser, no JavaScript) fetching
// a post URL gets the post's title and body in the raw HTML, not the empty
// `<div id="root">` shell client/index.html ships by default.
//
// CI's "Build the app" step already produced client/build before Playwright
// runs, and "Start Server" already has the API up against seeded data - this
// test runs the prerender script against that build/API, then serves the
// result with a plain Node http server (standing in for Netlify's own
// pretty-url handling) and reads it with `fetch`, deliberately not a browser
// context, so nothing here can execute client JavaScript.

const ROOT_DIR = path.join(__dirname, '..', '..');
const BUILD_DIR = path.join(ROOT_DIR, 'client', 'build');
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:2000';
const STATIC_SERVER_PORT = 4599;
const PRERENDER_PORT = 4174;

function startStaticServer(rootDir: string, port: number): Promise<http.Server> {
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const direct = path.join(rootDir, urlPath);
      const stat = await fs.stat(direct).catch(() => null);
      const filePath =
        stat && stat.isFile() ? direct : path.join(rootDir, urlPath, 'index.html');

      const data = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, () => resolve(server));
  });
}

test.describe('crawler prerendering', () => {
  let server: http.Server;
  let postId: string;
  let postTitle: string;
  let bodySample: string;

  test.beforeAll(async () => {
    test.setTimeout(180_000);

    const apiContext = await playwrightRequest.newContext();
    const postsRes = await apiContext.get(`${API_URL}/api/posts?limit=1&sort=-createdAt`);
    expect(postsRes.ok()).toBe(true);
    const { data } = await postsRes.json();
    await apiContext.dispose();

    expect(data.length).toBeGreaterThan(0);
    postId = data[0]._id;
    postTitle = data[0].title;
    bodySample = String(data[0].content)
      .replace(/[#*`_>[\]()]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(' ');

    execFileSync('node', ['scripts/prerender.js'], {
      cwd: ROOT_DIR,
      env: { ...process.env, REACT_APP_API_URL: API_URL, PRERENDER_PORT: String(PRERENDER_PORT) },
      stdio: 'inherit'
    });

    server = await startStaticServer(BUILD_DIR, STATIC_SERVER_PORT);
  });

  test.afterAll(async () => {
    await new Promise((resolve) => (server ? server.close(() => resolve(undefined)) : resolve(undefined)));
  });

  test("serves a post's title and body in raw HTML to a non-JS fetch", async () => {
    const res = await fetch(`http://localhost:${STATIC_SERVER_PORT}/posts/${postId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    });
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).not.toContain('<div id="root"></div>');
    expect(html).toContain(postTitle);
    expect(html).toContain(bodySample);
  });

  test('serves rendered content for the homepage too', async () => {
    const res = await fetch(`http://localhost:${STATIC_SERVER_PORT}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    });
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).not.toContain('<div id="root"></div>');
  });
});
