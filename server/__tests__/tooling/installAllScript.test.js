const rootPkg = require('../../../package.json');

// Expands `npm run <script>` references inside a script's command string so
// the assertions below reflect what actually executes, not just the literal
// text of `install-all` (e.g. `npm run prepare` counts as installing client).
function expandScript(scripts, name, seen = new Set()) {
  if (seen.has(name)) return '';
  seen.add(name);
  const script = scripts[name] || '';
  return script.replace(/npm run ([a-zA-Z0-9:_-]+)/g, (match, ref) =>
    expandScript(scripts, ref, seen)
  );
}

describe('root package.json "install-all" script', () => {
  it('installs the root project dependencies', () => {
    const expanded = expandScript(rootPkg.scripts, 'install-all');
    expect(expanded).toMatch(/(^|&&\s*)npm install(\s|$)/);
  });

  it('installs the client dependencies', () => {
    const expanded = expandScript(rootPkg.scripts, 'install-all');
    expect(expanded).toMatch(/cd client\s*&&\s*npm install/);
  });

  it('installs the server dependencies', () => {
    const expanded = expandScript(rootPkg.scripts, 'install-all');
    expect(expanded).toMatch(/cd server\s*&&\s*npm install/);
  });
});
