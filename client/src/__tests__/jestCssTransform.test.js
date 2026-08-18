const transformer = require('../../jest.cssTransform');

describe('jest.cssTransform', () => {
  it('turns a CSS source file into an empty module', () => {
    const result = transformer.process('.widget { color: red; }', 'App.css');
    expect(result).toEqual({ code: 'module.exports = {};' });
  });

  it('returns a stable cache key so Jest can cache the transform', () => {
    expect(transformer.getCacheKey()).toBe('cssTransform');
  });
});
