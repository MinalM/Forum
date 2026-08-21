const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect() always returns 0
// for every element - it can't tell us whether a button is actually 44px
// tall. Instead we assert directly against the CSS source, the same way
// packageJson.test.js asserts against package.json's raw contents.

const appCss = fs.readFileSync(path.join(__dirname, '../App.css'), 'utf8');
const navbarCss = fs.readFileSync(
  path.join(__dirname, '../components/layout/Navbar.css'),
  'utf8'
);
const navbarSource = fs.readFileSync(
  path.join(__dirname, '../components/layout/Navbar.js'),
  'utf8'
);

const MIN_TARGET = 44;

// App.css has two separate `@media (max-width: 768px)` blocks (a
// pre-existing duplication, not something this test is about) - concatenate
// every such block's declarations together so a rule works no matter which
// one it lives in.
function extractMobileMediaDeclarations(css) {
  const blocks = [];
  let searchFrom = 0;

  while (true) {
    const start = css.indexOf('@media (max-width: 768px)', searchFrom);
    if (start === -1) break;

    const openBrace = css.indexOf('{', start);
    let depth = 0;
    let end = -1;
    for (let i = openBrace; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) throw new Error('unbalanced braces in mobile media query');

    blocks.push(css.slice(openBrace + 1, end));
    searchFrom = end + 1;
  }

  if (blocks.length === 0) throw new Error('no mobile media query found');
  return blocks.join('\n');
}

// App.css also has some pre-existing duplicate rules for the same selector
// within a media query (not something this test is about) - a real browser
// applies declarations from every matching rule, later ones winning on
// conflicting properties, so concatenate every occurrence's declarations
// (in source order) rather than assuming a selector appears only once.
function extractRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
  if (matches.length === 0) throw new Error(`selector "${selector}" not found`);
  return matches.map((match) => match[1]).join('\n');
}

function minPx(declarations, property) {
  // Later declarations win when the same property is set more than once
  // (equal specificity, same as a real cascade), so take the last match.
  const matches = [
    ...declarations.matchAll(new RegExp(`${property}:\\s*(\\d+(?:\\.\\d+)?)px`, 'g')),
  ];
  if (matches.length === 0) return null;
  return parseFloat(matches[matches.length - 1][1]);
}

describe('mobile touch targets (WCAG 2.5.5, <=768px viewport)', () => {
  const appMobile = extractMobileMediaDeclarations(appCss);
  const navbarMobile = extractMobileMediaDeclarations(navbarCss);

  // Navbar.css rules only reach the browser if something actually imports
  // the file - Vite (and every other bundler) drops unimported CSS from the
  // production bundle. Without this check, every assertion below could pass
  // against a stylesheet the app never ships (as happened previously: see
  // NavbarStylesheet.test.js for a render-based check of the same fact).
  it('Navbar.js imports Navbar.css, so these rules actually ship', () => {
    expect(navbarSource).toMatch(/import\s+['"]\.\/Navbar\.css['"]/);
  });

  it('nav links are at least 44px tall', () => {
    const rule = extractRule(appMobile, '.nav-link');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('the mobile menu toggle button is at least 44x44', () => {
    const rule = extractRule(appMobile, '.mobile-menu-toggle');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(minPx(rule, 'min-width')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('pagination buttons are at least 44x44', () => {
    const rule = extractRule(appMobile, '.pagination button');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(minPx(rule, 'min-width')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('the navbar search input is at least 44px tall', () => {
    const rule = extractRule(navbarMobile, '.navbar-search-input');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('the navbar search submit button is at least 44x44', () => {
    const rule = extractRule(navbarMobile, '.navbar-search-btn');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(minPx(rule, 'min-width')).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});

describe('category sidebar links (Home) are at least 44px tall', () => {
  it('declares a min-height of 44px on the category-item link', () => {
    const rule = extractRule(appCss, '.categories-sidebar .category-item a');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});
