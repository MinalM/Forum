const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '../../index.html'),
  'utf8'
);

function metaContent(attr, value) {
  const re = new RegExp(
    `<meta[^>]*${attr}=["']${value}["'][^>]*content=["']([^"']*)["']`
  );
  const reReversed = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${value}["']`
  );
  const match = html.match(re) || html.match(reReversed);
  return match ? match[1] : null;
}

describe('client/index.html Open Graph / social preview metadata', () => {
  it('has a non-empty og:title', () => {
    expect(metaContent('property', 'og:title')).toBeTruthy();
  });

  it('has a non-empty og:description', () => {
    expect(metaContent('property', 'og:description')).toBeTruthy();
  });

  it('declares og:type as website', () => {
    expect(metaContent('property', 'og:type')).toBe('website');
  });

  it('has a non-empty og:url', () => {
    expect(metaContent('property', 'og:url')).toBeTruthy();
  });

  it('declares a twitter:card', () => {
    expect(metaContent('name', 'twitter:card')).toBeTruthy();
  });
});
