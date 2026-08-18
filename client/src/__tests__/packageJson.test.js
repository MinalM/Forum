const pkg = require('../../package.json');

describe('client/package.json (Vite migration step 5a)', () => {
  it('does not depend on react-scripts', () => {
    expect(pkg.devDependencies).not.toHaveProperty('react-scripts');
    expect(pkg.dependencies || {}).not.toHaveProperty('react-scripts');
  });

  it('runs the test script through plain jest, not react-scripts', () => {
    expect(pkg.scripts.test).not.toMatch(/react-scripts/);
    expect(pkg.scripts.test).toMatch(/^jest$/);
  });

  it('declares jest and jest-environment-jsdom as direct devDependencies', () => {
    expect(pkg.devDependencies).toHaveProperty('jest');
    expect(pkg.devDependencies).toHaveProperty('jest-environment-jsdom');
  });
});
