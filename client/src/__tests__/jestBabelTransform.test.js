const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const transformer = require('../../jest.babelTransform');

describe('jest.babelTransform', () => {
  it('does not depend on babel-preset-react-app (a react-scripts package)', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../jest.babelTransform.js'),
      'utf8'
    );
    expect(source).not.toMatch(/babel-preset-react-app/);
  });

  it('strips import.meta so import.meta.env.* resolves to process.env at runtime', () => {
    const code = `const url = import.meta.env.REACT_APP_API_URL;`;
    const result = babel.transformSync(code, transformer.babelOptions);
    expect(result.code).not.toMatch(/import\.meta/);
    expect(result.code).toMatch(/process\.env/);
  });

  it('compiles JSX', () => {
    const code = `export default function Widget() { return <div className="widget">hi</div>; }`;
    const result = babel.transformSync(code, transformer.babelOptions);
    expect(result.code).not.toMatch(/<div/);
  });
});
