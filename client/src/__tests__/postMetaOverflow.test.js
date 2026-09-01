const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect()/scrollWidth are
// always 0 - they can't tell us whether the post-meta row actually wraps at
// a narrow viewport. Instead we assert directly against the CSS source, the
// same raw-source-assertion pattern used in mobileTouchTargets.test.js.

const appCss = fs.readFileSync(path.join(__dirname, '../App.css'), 'utf8');
const navbarCss = fs.readFileSync(
  path.join(__dirname, '../components/layout/Navbar.css'),
  'utf8'
);

function extractRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
  if (matches.length === 0) throw new Error(`selector "${selector}" not found`);
  return matches.map((match) => match[1]).join('\n');
}

describe('post detail meta row does not force horizontal overflow', () => {
  it('.post-meta allows wrapping instead of forcing a single nowrap line', () => {
    const rule = extractRule(appCss, '.post-meta');
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });
});

describe('post detail header row does not force horizontal overflow', () => {
  // .post-header lays the title, the Solved/Needs-an-answer badge and the
  // .post-meta row out as flex siblings - on a narrow viewport that's three
  // items wide enough on their own to overflow unless the row can wrap.
  it('.post-header allows wrapping instead of forcing a single nowrap line', () => {
    const rule = extractRule(appCss, '.post-header');
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });
});

describe('feed card footer does not force horizontal overflow', () => {
  // .post-footer lays the tag chips and the comment/view counts + Answer
  // button out as flex siblings with no wrap - the same overflow risk as
  // .post-header, just on the feed card (PostItem) instead of PostDetail.
  it('.post-footer allows wrapping instead of forcing a single nowrap line', () => {
    const rule = extractRule(appCss, '.post-footer');
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });
});

describe('post detail action row does not force horizontal overflow', () => {
  // .post-actions used to lay the vote buttons, Notify/Save toggles and
  // every author/moderator button out as flex siblings with no wrap - on a
  // narrow viewport that overflowed the card (203px past the 375px
  // viewport, traced to one of the moderation .btn.btn-sm buttons). The
  // author/moderator controls now live behind a single collapsed menu, but
  // the row itself still needs to wrap for the remaining reader controls.
  it('.post-actions allows wrapping instead of forcing a single nowrap line', () => {
    const rule = extractRule(appCss, '.post-actions');
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });
});

describe('post detail header row (title + status badges) does not force horizontal overflow', () => {
  // Shared with the feed card (PostItem) - reused here so the post-detail
  // title/badge row gets the same wrap behaviour instead of a second,
  // duplicated rule.
  it('.post-card-header-row allows wrapping instead of forcing a single nowrap line', () => {
    const rule = extractRule(appCss, '.post-card-header-row');
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });
});

describe('post detail "More actions" menu stays anchored within the viewport', () => {
  // .post-actions wraps at a narrow viewport, so the toggle can land on its
  // own flex line at the row's *left* edge. dropdown-menu-end right-aligns
  // the menu to its wrapper's right edge, so the wrapper itself has to be
  // pinned to the row's trailing edge (not just wherever it happens to
  // wrap) or the menu opens off the left side of the viewport.
  it('.post-actions-dropdown is pinned to the trailing edge of the row', () => {
    const rule = extractRule(appCss, '.post-actions-dropdown');
    expect(rule).toMatch(/margin-left:\s*auto/);
  });

  // The fixed mobile bottom tab bar (z-index: 1000) sits low on every page
  // and would otherwise render on top of a dropdown opened near the bottom
  // of the viewport, hiding it entirely.
  it('.dropdown-menu is layered above the fixed mobile bottom tab bar', () => {
    const menuRule = extractRule(navbarCss, '.dropdown-menu');
    const menuZ = parseInt(menuRule.match(/z-index:\s*(\d+)/)[1], 10);
    const tabBarRule = extractRule(appCss, '.mobile-tab-bar');
    const tabBarZ = parseInt(tabBarRule.match(/z-index:\s*(\d+)/)[1], 10);
    expect(menuZ).toBeGreaterThan(tabBarZ);
  });
});
