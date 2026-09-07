import { useCallback, useEffect, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 800;
const defaultIsEmpty = (value) => !value;

// localStorage can throw (private browsing, storage disabled, quota
// exceeded) - autosave is a nice-to-have, so every access degrades to a
// silent no-op instead of crashing the composer around it.
function safeGetItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function safeSetItem(key, raw) {
  try {
    window.localStorage.setItem(key, raw);
  } catch (err) {
    // ignore - see comment above
  }
}

function safeRemoveItem(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    // ignore - see comment above
  }
}

// Debounced localStorage draft autosave for a composer. `key` should be
// stable per route/target (e.g. `draft:post:${postId}:comment`) so unrelated
// composers never collide. On mount, any existing (non-empty) draft under
// `key` is surfaced as `restoredDraft` for the caller to apply to its own
// field state and show a restore affordance for; call `clearDraft` from a
// discard action or after a successful submit.
export function useDraftAutosave(
  key,
  value,
  { debounceMs = DEFAULT_DEBOUNCE_MS, isEmpty = defaultIsEmpty } = {}
) {
  const [restoredDraft, setRestoredDraft] = useState(null);

  useEffect(() => {
    const raw = safeGetItem(key);
    if (raw === null) {
      return;
    }

    try {
      const draft = JSON.parse(raw);
      if (!isEmpty(draft)) {
        setRestoredDraft(draft);
      }
    } catch (err) {
      // malformed draft (e.g. hand-edited storage) - ignore it
    }
    // Only re-check when the target itself changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (isEmpty(value)) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      safeSetItem(key, JSON.stringify(value));
    }, debounceMs);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value, debounceMs]);

  const clearDraft = useCallback(() => {
    safeRemoveItem(key);
    setRestoredDraft(null);
  }, [key]);

  return { restoredDraft, clearDraft };
}
