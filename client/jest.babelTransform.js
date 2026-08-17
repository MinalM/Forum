// Custom Jest transformer: @babel/preset-env + @babel/preset-react directly
// (no react-scripts preset in the chain, now that the client build runs on
// Vite) plus a tiny plugin that replaces `import.meta` with
// `({ env: process.env })` so ESM-only packages (react-router 8) can be
// transformed to CJS for Jest, and so application code reading
// `import.meta.env.REACT_APP_*` (Vite's env var convention, replacing
// `process.env.REACT_APP_*`) resolves to the same Jest/Node env vars it
// would have read directly. Wired up via the "jest.transform" override in
// package.json.
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

const babelOptions = {
  presets: [
    [require.resolve('@babel/preset-env'), { targets: { node: 'current' } }],
    [require.resolve('@babel/preset-react'), { runtime: 'automatic' }]
  ],
  plugins: [stripImportMeta],
  babelrc: false,
  configFile: false
};

module.exports = babelJest.createTransformer(babelOptions);
module.exports.babelOptions = babelOptions;
