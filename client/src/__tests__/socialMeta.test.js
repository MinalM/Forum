const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '../../index.html'),
  'utf8'
);

function hasMeta(attr, value) {
  const re = new RegExp(`<meta[^>]*${attr}=["']${value}["']`);
  const reReversed = new RegExp(
    `<meta[^>]*content=["'][^"']*["'][^>]*${attr}=["']${value}["']`
  );
  return re.test(html) || reReversed.test(html);
}

// index.html used to hard-code one static og:*/twitter:*/description block,
// identical on every route (the exact bug the "per-page metadata" backlog
// item fixes). Those tags are now rendered per-route at runtime by
// client/src/components/common/Seo.js (see Seo.test.js and the per-page
// head tests in Home/PostDetail/CategoryPosts/SearchResults/NotFound) via
// react-helmet-async. A static duplicate here would sit in the DOM
// alongside whatever Helmet injects, so index.html must not declare them
// itself - this test guards against that regressing back in.
describe('client/index.html static <head>', () => {
  it('does not hard-code a static description or Open Graph/Twitter block', () => {
    expect(hasMeta('name', 'description')).toBe(false);
    expect(hasMeta('property', 'og:title')).toBe(false);
    expect(hasMeta('property', 'og:description')).toBe(false);
    expect(hasMeta('property', 'og:type')).toBe(false);
    expect(hasMeta('property', 'og:url')).toBe(false);
    expect(hasMeta('name', 'twitter:card')).toBe(false);
    expect(hasMeta('name', 'twitter:title')).toBe(false);
    expect(hasMeta('name', 'twitter:description')).toBe(false);
  });

  it('still ships a fallback <title> for before hydration / no-JS', () => {
    expect(html).toMatch(/<title>[^<]+<\/title>/);
  });
});
