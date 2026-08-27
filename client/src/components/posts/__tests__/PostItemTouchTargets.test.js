const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect() always returns 0 -
// same raw-CSS-source assertion pattern as mobileTouchTargets.test.js. The
// vote buttons are the only interactive controls PostItem (the feed card)
// ships, and they must stay >= 44x44 CSS px (WCAG 2.5.5) at every viewport,
// not just the mobile media query.

const appCss = fs.readFileSync(
  path.join(__dirname, '../../../App.css'),
  'utf8'
);

// Matches `selector` anywhere in a rule's (possibly comma-separated)
// selector list, not just as the sole selector, since .answer-composer-cancel
// and .answer-composer-submit share one declaration block.
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

describe('PostItem vote button touch targets', () => {
  it('.vote-btn is at least 44x44 unconditionally (feed cards render outside any mobile media query)', () => {
    const rule = extractRule(appCss, '.vote-btn');
    expect(minPx(rule, 'min-width')).toBeGreaterThanOrEqual(44);
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(44);
  });
});

describe('PostItem save toggle touch targets', () => {
  it('.save-toggle-btn is at least 44x44 unconditionally (feed cards render outside any mobile media query)', () => {
    const rule = extractRule(appCss, '.save-toggle-btn');
    expect(minPx(rule, 'min-width')).toBeGreaterThanOrEqual(44);
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(44);
  });
});

describe('PostItem answer composer touch targets', () => {
  it('.answer-btn is at least 44px tall', () => {
    const rule = extractRule(appCss, '.answer-btn');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(44);
  });

  it.each(['.answer-composer-cancel', '.answer-composer-submit'])(
    '%s is at least 44px tall',
    (selector) => {
      const rule = extractRule(appCss, selector);
      expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(44);
    }
  );
});
