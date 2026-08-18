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

describe('client/package.json overrides (Vite migration step 5b)', () => {
  it('drops overrides for CRA/react-scripts-only transitive deps', () => {
    // nth-check, svgo, @svgr/webpack, and resolve-url-loader were only
    // pulled in by react-scripts's webpack/SVG toolchain, which step 5a
    // removed. They no longer resolve anywhere in the dependency tree
    // (verified via `npm ls <pkg> --all`), so their overrides are dead
    // weight.
    expect(pkg.overrides).not.toHaveProperty('nth-check');
    expect(pkg.overrides).not.toHaveProperty('svgo');
    expect(pkg.overrides).not.toHaveProperty('@svgr/webpack');
    expect(pkg.overrides).not.toHaveProperty('resolve-url-loader');
  });

  it('keeps overrides for deps still pulled in by the current tree', () => {
    // postcss is still pulled in transitively by vite; form-data is still
    // pulled in transitively by axios. Both need their override kept.
    expect(pkg.overrides).toHaveProperty('postcss');
    expect(pkg.overrides).toHaveProperty('form-data');
  });
});
