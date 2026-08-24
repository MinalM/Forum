const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect() always returns 0 -
// same raw-CSS-source assertion pattern as mobileTouchTargets.test.js and
// PostItemTouchTargets.test.js. Onboarding's chips, submit and skip
// controls are the interactive surface of the post-signup track step and
// must stay >= 44x44 CSS px (WCAG 2.5.5).

const appCss = fs.readFileSync(path.join(__dirname, '../../App.css'), 'utf8');

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

describe('Onboarding touch targets', () => {
  it.each(['.onboarding-chip', '.onboarding-submit', '.onboarding-skip'])(
    '%s is at least 44px tall',
    (selector) => {
      const rule = extractRule(appCss, selector);
      expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(44);
    }
  );
});
