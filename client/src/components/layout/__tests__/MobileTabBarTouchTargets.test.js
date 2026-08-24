const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect() always returns 0 -
// same raw-CSS-source assertion pattern as mobileTouchTargets.test.js and
// NotificationBellTouchTargets.test.js. The tab bar only ever renders inside
// the <=768px media query, so its rules live there too.

const appCss = fs.readFileSync(path.join(__dirname, '../../../App.css'), 'utf8');

// App.css has two separate `@media (max-width: 768px)` blocks (see
// mobileTouchTargets.test.js) - concatenate every such block's declarations
// together so a rule works no matter which one it lives in.
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
  const matches = [
    ...css.matchAll(new RegExp(`[^{}]*${escaped}[^{}]*\\{([^}]*)\\}`, 'g'))
  ];
  if (matches.length === 0) throw new Error(`selector "${selector}" not found`);
  return matches.map((match) => match[1]).join('\n');
}

function minPx(declarations, property) {
  const matches = [
    ...declarations.matchAll(new RegExp(`${property}:\\s*(\\d+(?:\\.\\d+)?)px`, 'g')),
  ];
  if (matches.length === 0) return null;
  return parseFloat(matches[matches.length - 1][1]);
}

describe('MobileTabBar touch targets', () => {
  const mobile = extractMobileMediaDeclarations(appCss);

  it('.mobile-tab-bar-item is at least 44px tall', () => {
    const rule = extractRule(mobile, '.mobile-tab-bar-item');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(44);
  });

  it('.mobile-tab-bar-item--ask (the raised Ask button) is at least 44x44', () => {
    const rule = extractRule(mobile, '.mobile-tab-bar-item--ask');
    const width = minPx(rule, 'width');
    const height = minPx(rule, 'height');
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  });
});
