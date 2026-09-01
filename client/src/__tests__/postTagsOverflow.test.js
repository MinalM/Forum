const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect()/scrollWidth are
// always 0 - they can't tell us whether a single over-long tag chip actually
// stays within the card at a narrow viewport. Instead we assert directly
// against the CSS source, the same raw-source-assertion pattern used in
// postMetaOverflow.test.js / mobileTouchTargets.test.js.

const appCss = fs.readFileSync(path.join(__dirname, '../App.css'), 'utf8');
const indexCss = fs.readFileSync(path.join(__dirname, '../index.css'), 'utf8');

function extractRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
  if (matches.length === 0) throw new Error(`selector "${selector}" not found`);
  return matches.map((match) => match[1]).join('\n');
}

describe('tag chips do not force horizontal overflow on a card', () => {
  it('.post-tags itself is bounded to its container width', () => {
    const rule = extractRule(appCss, '.post-tags');
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
    expect(rule).toMatch(/max-width:\s*100%/);
  });

  it('.badge (used elsewhere for status labels) forces a single nowrap line by default', () => {
    // Confirms the actual overflow source this test guards against: without
    // a .post-tags-scoped override, a long tag's intrinsic width is
    // unbounded because .badge never wraps or breaks its own text.
    const rule = extractRule(indexCss, '.badge');
    expect(rule).toMatch(/white-space:\s*nowrap/);
  });

  it('.post-tags .badge overrides that so an over-long tag wraps and stays within the card', () => {
    const rule = extractRule(appCss, '.post-tags .badge');
    expect(rule).toMatch(/white-space:\s*normal/);
    expect(rule).toMatch(/max-width:\s*100%/);
    expect(rule).toMatch(/overflow-wrap:\s*break-word/);
  });
});
