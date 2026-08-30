const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect()/scrollWidth are
// always 0 - they can't tell us whether the navbar actually overflows at a
// narrow viewport. Instead we assert directly against the CSS source, the
// same raw-source-assertion pattern used in postMetaOverflow.test.js and
// mobileTouchTargets.test.js.
//
// Reproduces the live-site bug: `.navbar-search` (Navbar.css) has no rule at
// any narrow-viewport breakpoint that hides, restacks or shrinks it, so on a
// 375px viewport it stays at its full desktop width and gets pushed off the
// right edge of the screen, forcing document.documentElement.scrollWidth
// past clientWidth on every page (navbar renders on all of them).

const appCss = fs.readFileSync(path.join(__dirname, '../App.css'), 'utf8');
const navbarCss = fs.readFileSync(
  path.join(__dirname, '../components/layout/Navbar.css'),
  'utf8'
);

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

function extractRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
  if (matches.length === 0) throw new Error(`selector "${selector}" not found`);
  return matches.map((match) => match[1]).join('\n');
}

describe('navbar search does not force horizontal overflow on mobile', () => {
  const appMobile = extractMobileMediaDeclarations(appCss);
  const navbarMobile = extractMobileMediaDeclarations(navbarCss);

  it('.navbar-container wraps its children instead of forcing one nowrap row', () => {
    const rule = extractRule(appMobile, '.navbar-container');
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });

  it('.navbar-search restacks onto its own full-width row instead of staying at desktop width', () => {
    const rule = extractRule(navbarMobile, '.navbar-search');
    // A flex-basis of 100% on a wrapped flex container forces it onto a new
    // line below the brand/toggle row rather than being squeezed sideways
    // off the viewport.
    expect(rule).toMatch(/flex(?:-basis)?:\s*(?:1\s+1\s+)?100%/);
  });
});
