const fs = require('fs');
const path = require('path');

// jsdom has no layout engine, so getBoundingClientRect()/scrollWidth are
// always 0 - they can't tell us whether the admin table or stat-card row
// actually overflows at a narrow viewport. Instead we assert directly
// against the CSS source, the same raw-source-assertion pattern used in
// mobileTouchTargets.test.js / navbarSearchOverflow.test.js.
//
// Reproduces the live-site bug: `/admin/users`' table container and
// `/admin`'s stat-card row had no rule that contained or reflowed their
// content, so `document.documentElement.scrollWidth` exceeded a 375px
// viewport's `clientWidth` on both pages.

const appCss = fs.readFileSync(path.join(__dirname, '../App.css'), 'utf8');
const adminUsersCss = fs.readFileSync(
  path.join(__dirname, '../pages/AdminUsers.css'),
  'utf8'
);

function extractRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
  if (matches.length === 0) throw new Error(`selector "${selector}" not found`);
  return matches.map((match) => match[1]).join('\n');
}

describe('/admin/users table does not force horizontal page overflow', () => {
  it('.users-table-container scrolls its own overflow instead of the page', () => {
    const rule = extractRule(adminUsersCss, '.users-table-container');
    expect(rule).toMatch(/overflow-x:\s*auto/);
  });

  it('.users-table uses the available width instead of shrinking to content', () => {
    const rule = extractRule(adminUsersCss, '.users-table');
    expect(rule).toMatch(/width:\s*100%/);
  });

  it('.users-table th/td have real horizontal cell padding, not the browser default', () => {
    // Compound selector (".users-table th,\n.users-table td { ... }") -
    // extractRule's single-selector matcher can't find it, same as the
    // .nav-user-toggle/.nav-staff-toggle case in mobileTouchTargets.test.js -
    // match the comma-joined block directly instead.
    const match = adminUsersCss.match(/\.users-table th,\s*\.users-table td\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const rule = match[1];
    // A "12px 16px"-style shorthand's second value is the horizontal one.
    expect(rule).toMatch(/padding:\s*\d+(?:\.\d+)?px\s+\d+(?:\.\d+)?px/);
    const horizontalMatch = rule.match(/padding:\s*\d+(?:\.\d+)?px\s+(\d+(?:\.\d+)?)px/);
    expect(parseFloat(horizontalMatch[1])).toBeGreaterThan(0);
  });
});

describe('/admin and /admin/users stat cards do not force horizontal page overflow', () => {
  it('.dashboard-stats wraps its stat cards instead of forcing one nowrap row', () => {
    const rule = extractRule(appCss, '.dashboard-stats');
    expect(rule).toMatch(/flex-wrap:\s*wrap/);
  });
});
