// Custom Jest transformer: CRA's babel-preset-react-app plus a tiny plugin
// that replaces `import.meta` with `({ env: process.env })` so ESM-only
// packages (react-router 8) can be transformed to CJS for Jest, and so
// application code reading `import.meta.env.REACT_APP_*` (Vite's env var
// convention, replacing `process.env.REACT_APP_*`) resolves to the same
// Jest/Node env vars it would have read directly. Wired up via the
// "jest.transform" override in package.json.
const babelJest = require('babel-jest').default;

const stripImportMeta = () => ({
  visitor: {
    MetaProperty(path) {
      if (path.node.meta && path.node.meta.name === 'import') {
        path.replaceWithSourceString('({ env: process.env })');
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
