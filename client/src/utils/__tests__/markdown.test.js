/* eslint-disable testing-library/render-result-naming-convention --
   renderMarkdown() is a plain string-to-string helper, not a Testing
   Library render; the plugin's aggressive-render heuristic flags any
   call whose name contains "render" regardless of import. */
import { renderMarkdown, markdownToPlainText } from '../markdown';

describe('renderMarkdown', () => {
  it('renders bold and italic text', () => {
    const html = renderMarkdown('**bold** and *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders links with href preserved', () => {
    const html = renderMarkdown('[docs](https://example.com/docs)');
    expect(html).toContain('<a href="https://example.com/docs">docs</a>');
  });

  it('renders inline code and fenced code blocks', () => {
    const html = renderMarkdown('use `npm test`');
    expect(html).toContain('<code>npm test</code>');

    const blockHtml = renderMarkdown('```\nconst x = 1;\n```');
    expect(blockHtml).toContain('<pre>');
    expect(blockHtml).toContain('const x = 1;');
  });

  it('renders unordered and ordered lists', () => {
    const html = renderMarkdown('- one\n- two');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');

    const orderedHtml = renderMarkdown('1. first\n2. second');
    expect(orderedHtml).toContain('<ol>');
    expect(orderedHtml).toContain('<li>first</li>');
  });

  it('strips <script> tags from raw HTML in post content', () => {
    const html = renderMarkdown('hello <script>alert("xss")</script> world');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('alert(');
  });

  it('strips event-handler attributes like onerror', () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain('onerror');
  });

  it('neutralizes javascript: URIs in markdown links', () => {
    const html = renderMarkdown('[click me](javascript:alert(1))');
    expect(html).not.toContain('javascript:alert');
  });

  it('neutralizes javascript: URIs in raw anchor tags', () => {
    const html = renderMarkdown('<a href="javascript:alert(1)">click</a>');
    expect(html).not.toContain('javascript:alert');
  });
});

describe('markdownToPlainText', () => {
  it('strips markdown syntax characters, leaving readable text', () => {
    const plain = markdownToPlainText(
      '**Title:** Image Classification Model in Python **Description:**'
    );
    expect(plain).not.toContain('**');
    expect(plain).toContain('Title:');
    expect(plain).toContain('Description:');
  });

  it('strips links down to their visible text', () => {
    const plain = markdownToPlainText('See [the docs](https://example.com)');
    expect(plain).not.toContain('[');
    expect(plain).not.toContain('](');
    expect(plain).toContain('the docs');
  });

  it('removes script content entirely', () => {
    const plain = markdownToPlainText('hi <script>alert(1)</script> there');
    expect(plain).not.toContain('alert(1)');
  });

  it('returns an empty string for empty input', () => {
    expect(markdownToPlainText('')).toBe('');
  });
});
