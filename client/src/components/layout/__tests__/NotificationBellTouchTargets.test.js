const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect() always returns 0 -
// same raw-CSS-source assertion pattern as mobileTouchTargets.test.js and
// PostItemTouchTargets.test.js. The bell button and dropdown items render in
// the navbar at every viewport, not just inside a mobile media query.

const navbarCss = fs.readFileSync(path.join(__dirname, '../Navbar.css'), 'utf8');

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

describe('NotificationBell touch targets', () => {
  it('.notification-bell-btn is at least 44x44 unconditionally', () => {
    const rule = extractRule(navbarCss, '.notification-bell-btn');
    expect(minPx(rule, 'min-width')).toBeGreaterThanOrEqual(44);
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(44);
  });

  it('.notification-item is at least 44px tall', () => {
    const rule = extractRule(navbarCss, '.notification-item');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(44);
  });
});
