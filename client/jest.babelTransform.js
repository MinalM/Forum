// Custom Jest transformer: CRA's babel-preset-react-app plus a tiny plugin
// that replaces `import.meta` with `({})` so ESM-only packages
// (react-router 8) can be transformed to CJS for Jest. Wired up via the
// "jest.transform" override in package.json.
const babelJest = require('babel-jest').default;

const stripImportMeta = () => ({
  visitor: {
    MetaProperty(path) {
      if (path.node.meta && path.node.meta.name === 'import') {
        path.replaceWithSourceString('({})');
      }
    }
  }
});

module.exports = babelJest.createTransformer({
  presets: [
    [
      require.resolve('babel-preset-react-app'),
      {
        runtime: 'automatic'
      }
    ]
  ],
  plugins: [stripImportMeta],
  babelrc: false,
  configFile: false
});
