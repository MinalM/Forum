const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect()/scrollWidth are
// always 0 - they can't tell us whether the post-detail action row actually
// overflows at a narrow viewport. Instead we assert directly against the CSS
// source, the same raw-source-assertion pattern used in
// mobileTouchTargets.test.js and postMetaOverflow.test.js.

const appCss = fs.readFileSync(path.join(__dirname, '../App.css'), 'utf8');

const MIN_TARGET = 44;

function extractRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
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

describe('post-detail action row does not force horizontal overflow', () => {
  it('.post-actions allows wrapping instead of forcing a single nowrap line', () => {
    const rule = extractRule(appCss, '.post-actions');
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });

  it('.post-actions-primary (reader actions) allows wrapping', () => {
    const rule = extractRule(appCss, '.post-actions-primary');
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });
});

describe('post-detail overflow menu ("More actions") meets the 44x44 touch target minimum', () => {
  it('.post-actions-overflow-toggle is at least 44x44', () => {
    const rule = extractRule(appCss, '.post-actions-overflow-toggle');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(minPx(rule, 'min-width')).toBeGreaterThanOrEqual(MIN_TARGET);
  });

  it('.post-actions-overflow-item is at least 44px tall', () => {
    const rule = extractRule(appCss, '.post-actions-overflow-item');
    expect(minPx(rule, 'min-height')).toBeGreaterThanOrEqual(MIN_TARGET);
  });
});

describe('the answer-sort control is grouped separately from the composer submit button', () => {
  it('.answers-toolbar declares its own top margin/divider instead of sitting flush under the composer', () => {
    const rule = extractRule(appCss, '.answers-toolbar');
    expect(rule).toMatch(/margin-top:\s*(?!0(?:px|rem|em)?\b)\S+/);
    expect(rule).toMatch(/border-top/);
  });
});
