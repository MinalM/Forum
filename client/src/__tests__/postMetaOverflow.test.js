const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect()/scrollWidth are
// always 0 - they can't tell us whether the post-meta row actually wraps at
// a narrow viewport. Instead we assert directly against the CSS source, the
// same raw-source-assertion pattern used in mobileTouchTargets.test.js.

const appCss = fs.readFileSync(path.join(__dirname, '../App.css'), 'utf8');

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
