const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect() always returns 0
// for every element - it can't tell us whether a button is actually 44px
// tall. Instead we assert directly against the CSS source, the same way
// packageJson.test.js asserts against package.json's raw contents.

const appCss = fs.readFileSync(path.join(__dirname, '../App.css'), 'utf8');
const indexCss = fs.readFileSync(path.join(__dirname, '../index.css'), 'utf8');
const navbarCss = fs.readFileSync(
  path.join(__dirname, '../components/layout/Navbar.css'),
  'utf8'
);
const navbarSource = fs.readFileSync(
  path.join(__dirname, '../components/layout/Navbar.js'),
  'utf8'
);
const adminUsersCss = fs.readFileSync(
  path.join(__dirname, '../pages/AdminUsers.css'),
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

// Removes every top-level `@media (...) { ... }` block (any condition, not
// just max-width: 768px) from the source, leaving only the CSS that applies
// regardless of viewport width - used to prove a rule holds *without* a
// media-query wrapper, rather than merely holding somewhere in the file.
function stripMediaQueries(css) {
  let result = '';
  let i = 0;

  while (true) {
    const start = css.indexOf('@media', i);
    if (start === -1) {
      result += css.slice(i);
      break;
    }
    result += css.slice(i, start);

    const openBrace = css.indexOf('{', start);
    let depth = 0;
    let end = -1;
    for (let j = openBrace; j < css.length; j++) {
      if (css[j] === '{') depth++;
      if (css[j] === '}') {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) throw new Error('unbalanced braces in media query');

    i = end + 1;
  }

  return result;
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
  const indexMobile = extractMobileMediaDeclarations(indexCss);
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

  it('.btn (Login/Register submit buttons) is at least 44px tall', () => {
    const rule = extractRule(indexMobile, '.btn');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('.form-control (Login/Register inputs) is at least 44px tall', () => {
    const rule = extractRule(indexMobile, '.form-control');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('.footer-link a is at least 44px tall and uses a display that lets min-height apply', () => {
    const rule = extractRule(appMobile, '.footer-link a');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(rule).toMatch(/display:\s*(flex|block)/);
  });
});

describe('navbar hierarchy controls are at least 44px tall (unconditional, not mobile-scoped)', () => {
  it('the "Create" button meets the touch target minimum', () => {
    const rule = extractRule(navbarCss, '.nav-create-btn');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('the user menu and staff menu toggles meet the touch target minimum', () => {
    // Declared as a compound selector (".nav-user-toggle,\n.nav-staff-toggle
    // { ... }"), so extractRule's single-selector matcher can't find it -
    // match the comma-joined block directly instead.
    const match = navbarCss.match(/\.nav-user-toggle,\s*\.nav-staff-toggle\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(minPx(match[1], 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('dropdown menu items meet the touch target minimum', () => {
    const rule = extractRule(navbarCss, '.dropdown-item');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});

describe('category sidebar links (Home) are at least 44px tall', () => {
  it('declares a min-height of 44px on the category-item link', () => {
    const rule = extractRule(appCss, '.categories-sidebar .category-item a');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});

describe('feed tab buttons (Home) are at least 44px tall', () => {
  it('declares a min-height of 44px on the feed-tab button', () => {
    const rule = extractRule(appCss, '.feed-tab');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});

describe('"You can answer these" rail links (Home) are at least 44px tall', () => {
  it('declares a min-height of 44px on the recommended-for-you-item link', () => {
    const rule = extractRule(appCss, '.recommended-for-you-item a');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});

describe('category page filter select is at least 44px tall', () => {
  it('declares a min-height of 44px on #post-filter within the mobile media block', () => {
    const appMobile = extractMobileMediaDeclarations(appCss);
    const rule = extractRule(appMobile, '#post-filter');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});

// The mobile-scoped tests above only prove these controls are >=44px under
// `@media (max-width: 768px)` - at wider viewports the same markup used to
// fall back to whatever (often much smaller) height the unconditional rule
// gave it. These assert the 44px floor applies with the media queries
// stripped out entirely, i.e. at every width, closing that gap. WCAG 2.5.8
// (AA, WCAG 2.2) sets a 24px floor regardless of input device; these use the
// same 44px (2.5.5) target the rest of the suite does since that's what the
// shipped rules apply everywhere now.
describe('touch targets meet the 44px floor at every width, not just <=768px', () => {
  const indexUnconditional = stripMediaQueries(indexCss);
  const navbarUnconditional = stripMediaQueries(navbarCss);
  const appUnconditional = stripMediaQueries(appCss);

  it('.btn is at least 44px tall with no max-width wrapper', () => {
    const rule = extractRule(indexUnconditional, '.btn');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('.btn-sm is at least 44px tall with no max-width wrapper', () => {
    const rule = extractRule(indexUnconditional, '.btn-sm');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('.form-control is at least 44px tall with no max-width wrapper', () => {
    const rule = extractRule(indexUnconditional, '.form-control');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('bare <select> elements are at least 44px tall with no max-width wrapper', () => {
    const rule = extractRule(indexUnconditional, 'select');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('the navbar search input is at least 44px tall with no max-width wrapper', () => {
    const rule = extractRule(navbarUnconditional, '.navbar-search-input');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('the navbar search submit button is at least 44x44 with no max-width wrapper', () => {
    const rule = extractRule(navbarUnconditional, '.navbar-search-btn');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(minPx(rule, 'min-width')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('the moderator dashboard Pending/Resolved/Dismissed tabs are at least 44px tall', () => {
    const rule = extractRule(appUnconditional, '.filter-btn');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('the admin user-search input is at least 44px tall', () => {
    const adminUsersUnconditional = stripMediaQueries(adminUsersCss);
    const rule = extractRule(adminUsersUnconditional, '.search-form input');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});
