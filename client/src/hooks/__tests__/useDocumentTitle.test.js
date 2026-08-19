import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from '../useDocumentTitle';

describe('useDocumentTitle', () => {
  it('sets document.title to just the site name when called with no title', () => {
    renderHook(() => useDocumentTitle());

    expect(document.title).toBe('AI/ML Career Forum');
  });

  it('sets document.title to just the site name when given an empty string', () => {
    renderHook(() => useDocumentTitle(''));

    expect(document.title).toBe('AI/ML Career Forum');
  });

  it('suffixes a given title with the site name', () => {
    renderHook(() => useDocumentTitle('Login'));

    expect(document.title).toBe('Login | AI/ML Career Forum');
  });

  it('updates document.title when the title changes across re-renders', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'First' }
    });

    expect(document.title).toBe('First | AI/ML Career Forum');

    rerender({ title: 'Second' });

    expect(document.title).toBe('Second | AI/ML Career Forum');
  });
});
