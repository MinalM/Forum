// react-helmet-async injects <meta>/<link> tags directly into
// document.head, outside the container Testing Library's `screen` queries
// are scoped to (document.body) - and there's no accessible-role query for
// a <meta> tag anyway. Direct DOM access is the only way to assert on it.
// This file lives outside `**/__tests__/**`, so eslint-plugin-testing-library's
// `no-node-access` rule (scoped to test files) doesn't apply here - it does
// still apply, correctly, at every call site inside a *.test.js file.
export const getHeadMeta = (attr, value) =>
  document.head.querySelector(`meta[${attr}="${value}"]`);

export const getHeadLink = (rel) =>
  document.head.querySelector(`link[rel="${rel}"]`);
