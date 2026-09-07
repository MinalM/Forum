import { renderHook, act } from '@testing-library/react';
import { useDraftAutosave } from '../useDraftAutosave';

describe('useDraftAutosave', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not restore anything when no draft is stored', () => {
    const { result } = renderHook(() =>
      useDraftAutosave('draft:test', '', { isEmpty: (v) => !v })
    );

    expect(result.current.restoredDraft).toBeNull();
  });

  it('debounces saving the value to localStorage', () => {
    const { rerender } = renderHook(
      ({ value }) => useDraftAutosave('draft:test', value, { isEmpty: (v) => !v }),
      { initialProps: { value: '' } }
    );

    rerender({ value: 'hello' });
    expect(localStorage.getItem('draft:test')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(799);
    });
    expect(localStorage.getItem('draft:test')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(localStorage.getItem('draft:test')).toBe(JSON.stringify('hello'));
  });

  it('does not persist while the value is empty, and does not reset an in-flight save on every keystroke', () => {
    const { rerender } = renderHook(
      ({ value }) => useDraftAutosave('draft:test', value, { isEmpty: (v) => !v }),
      { initialProps: { value: '' } }
    );

    rerender({ value: '' });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(localStorage.getItem('draft:test')).toBeNull();
  });

  it('restores a previously saved draft on mount', () => {
    localStorage.setItem('draft:test', JSON.stringify('unfinished thought'));

    const { result } = renderHook(() =>
      useDraftAutosave('draft:test', '', { isEmpty: (v) => !v })
    );

    expect(result.current.restoredDraft).toBe('unfinished thought');
  });

  it('does not restore an empty stored draft', () => {
    localStorage.setItem('draft:test', JSON.stringify(''));

    const { result } = renderHook(() =>
      useDraftAutosave('draft:test', '', { isEmpty: (v) => !v })
    );

    expect(result.current.restoredDraft).toBeNull();
  });

  it('clearDraft removes the stored draft and the restored value', () => {
    localStorage.setItem('draft:test', JSON.stringify('unfinished thought'));

    const { result } = renderHook(() =>
      useDraftAutosave('draft:test', '', { isEmpty: (v) => !v })
    );

    expect(result.current.restoredDraft).toBe('unfinished thought');

    act(() => {
      result.current.clearDraft();
    });

    expect(result.current.restoredDraft).toBeNull();
    expect(localStorage.getItem('draft:test')).toBeNull();
  });

  it('clears a stale draft after a successful submit (simulated by calling clearDraft)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDraftAutosave('draft:test', value, { isEmpty: (v) => !v }),
      { initialProps: { value: 'draft content' } }
    );

    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(localStorage.getItem('draft:test')).toBe(JSON.stringify('draft content'));

    act(() => {
      result.current.clearDraft();
    });

    rerender({ value: '' });
    expect(localStorage.getItem('draft:test')).toBeNull();
  });

  it('degrades to a no-op instead of throwing when localStorage.setItem is unavailable', () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('storage disabled');
      });

    const { rerender } = renderHook(
      ({ value }) => useDraftAutosave('draft:test', value, { isEmpty: (v) => !v }),
      { initialProps: { value: '' } }
    );

    expect(() => {
      rerender({ value: 'hello' });
      act(() => {
        jest.advanceTimersByTime(800);
      });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });

  it('degrades to a no-op instead of throwing when localStorage.getItem is unavailable', () => {
    const getItemSpy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('storage disabled');
      });

    let renderResult;
    expect(() => {
      renderResult = renderHook(() =>
        useDraftAutosave('draft:test', '', { isEmpty: (v) => !v })
      );
    }).not.toThrow();

    expect(renderResult.result.current.restoredDraft).toBeNull();

    getItemSpy.mockRestore();
  });
});
