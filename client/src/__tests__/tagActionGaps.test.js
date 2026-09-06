const fs = require('fs');
const path = require('path');

// jsdom has no layout engine (getBoundingClientRect() always returns 0) and
// this project's Jest config maps CSS imports to an empty module (see
// jest.cssTransform.js), so an actual rendered gap can't be measured here -
// same constraint documented in mobileTouchTargets.test.js. Assert against
// the raw CSS source instead, the same way that file does.
//
// Regression coverage for: `.post-tags` (PostDetail's tag row, and the same
// class reused by PostItem's feed card via `.post-footer`) and
// `.comment-actions` had no `gap`, so wrapped tag rows touched (0px between
// rows) and the tag block sat flush on `.post-actions` (0px margin below).
// `.post-tags`' only spacing came from `.badge { margin-right: 0.5rem }`
// (index.css), which does nothing between wrapped flex *rows*.

const appCss = fs.readFileSync(path.join(__dirname, '../App.css'), 'utf8');

function extractRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
  if (matches.length === 0) throw new Error(`selector "${selector}" not found`);
  return matches.map((match) => match[1]).join('\n');
}

// Matches a numeric CSS length (px/rem/em/%) for `property`, taking the last
// declaration if the property appears more than once (cascade order).
function lastLength(declarations, property) {
  const matches = [
    ...declarations.matchAll(
      new RegExp(`(?:^|[^-])${property}:\\s*([\\d.]+)(px|rem|em|%)?`, 'g')
    )
  ];
  if (matches.length === 0) return null;
  return parseFloat(matches[matches.length - 1][1]);
}

describe('post-tags and comment-actions declare a real flex gap', () => {
  it('.post-tags has a non-zero gap (used by both PostDetail and PostItem feed cards)', () => {
    const rule = extractRule(appCss, '.post-tags');
    expect(rule).toMatch(/display:\s*flex/);
    const gap = lastLength(rule, 'gap');
    expect(gap).not.toBeNull();
    expect(gap).toBeGreaterThan(0);
  });

  it('.post-tags has a non-zero bottom margin, separating it from .post-actions below it', () => {
    const rule = extractRule(appCss, '.post-tags');
    const marginBottom = lastLength(rule, 'margin-bottom');
    expect(marginBottom).not.toBeNull();
    expect(marginBottom).toBeGreaterThan(0);
  });

  it('.comment-actions has a non-zero gap, not relying on child margins for separation', () => {
    const rule = extractRule(appCss, '.comment-actions');
    expect(rule).toMatch(/display:\s*flex/);
    const gap = lastLength(rule, 'gap');
    expect(gap).not.toBeNull();
    expect(gap).toBeGreaterThan(0);
  });

  it('.post-actions keeps its existing non-zero gap (regression guard, not part of this fix)', () => {
    const rule = extractRule(appCss, '.post-actions');
    const gap = lastLength(rule, 'gap');
    expect(gap).not.toBeNull();
    expect(gap).toBeGreaterThan(0);
  });
});
