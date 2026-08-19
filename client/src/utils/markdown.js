import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

// Post/comment content is user-supplied markdown. marked does not sanitize
// its HTML output, so every render must go through DOMPurify before it is
// used with dangerouslySetInnerHTML.
export function renderMarkdown(markdown) {
  const html = marked.parse(markdown || '', { async: false });
  return DOMPurify.sanitize(html);
}

export function markdownToPlainText(markdown) {
  const html = renderMarkdown(markdown);
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.textContent || '';
}
