# Keyboard Shortcuts Help Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a help modal listing keyboard shortcuts triggered by `?`, gated behind the `keyboard_shortcuts_modal` Statsig feature flag.

**Architecture:** A `KeyboardShortcutsModal` component receives `isOpen`/`onClose` props and renders a CSS overlay with a 2-column shortcut grid. `App.js` owns state, registers a gated global keydown listener, and mounts the modal. Footer gets a gated `?` hint. When the flag is off, nothing is registered and nothing is rendered.

**Tech Stack:** React 18, `@statsig/react-bindings` (`useGateValue` via existing `useFeatureFlag` hook), `@testing-library/react`, `@testing-library/user-event`, CSS custom properties.

---

## Task 1: Create the Statsig feature gate

**Files:**
- No code files — Statsig dashboard only (via MCP tool)

**Step 1: Call the MCP tool**

Use the `create_gate` MCP tool with:
```
name: keyboard_shortcuts_modal
description: Shows a help modal listing keyboard shortcuts when user presses ?
default: false (0% rollout)
```

**Step 2: Verify in dashboard**

Confirm the gate appears in the Statsig console with status OFF.

**Step 3: Commit a note**

```bash
git commit --allow-empty -m "feat: create keyboard_shortcuts_modal Statsig gate"
```

---

## Task 2: Implement `KeyboardShortcutsModal` component (TDD)

**Files:**
- Create: `client/src/components/KeyboardShortcutsModal.js`
- Create: `client/src/components/KeyboardShortcutsModal.css`
- Create: `client/src/components/__tests__/KeyboardShortcutsModal.test.js`

**Step 1: Write the failing tests**

Create `client/src/components/__tests__/KeyboardShortcutsModal.test.js`:

```js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KeyboardShortcutsModal from '../KeyboardShortcutsModal';

describe('KeyboardShortcutsModal', () => {
  const onClose = jest.fn();

  beforeEach(() => onClose.mockClear());

  it('renders nothing when isOpen is false', () => {
    render(<KeyboardShortcutsModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });

  it('renders the modal when isOpen is true', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('renders at least one shortcut row', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Show this help')).toBeInTheDocument();
  });

  it('calls onClose when × button is clicked', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close keyboard shortcuts'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay (backdrop) is clicked', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('shortcuts-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the modal panel', () => {
    render(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd client && npm test -- --testPathPattern=KeyboardShortcutsModal --watchAll=false
```

Expected: All tests fail with `Cannot find module '../KeyboardShortcutsModal'`.

**Step 3: Create the component**

Create `client/src/components/KeyboardShortcutsModal.js`:

```js
import React, { useEffect } from 'react';
import './KeyboardShortcutsModal.css';

const SHORTCUTS = [
  { key: '?',    description: 'Show this help' },
  { key: 'g h',  description: 'Go to Home' },
  { key: 'g c',  description: 'Go to Categories' },
  { key: 'n',    description: 'New post' },
  { key: 'Esc',  description: 'Close modal / Cancel' },
];

const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="shortcuts-overlay"
      data-testid="shortcuts-overlay"
      onClick={onClose}
    >
      <div
        className="shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-header">
          <h2><i className="fas fa-keyboard" aria-hidden="true"></i> Keyboard Shortcuts</h2>
          <button
            className="shortcuts-close"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
          >
            &times;
          </button>
        </div>
        <div className="shortcuts-grid">
          {SHORTCUTS.map(({ key, description }) => (
            <React.Fragment key={key}>
              <kbd className="shortcut-key">{key}</kbd>
              <span className="shortcut-desc">{description}</span>
            </React.Fragment>
          ))}
        </div>
        <p className="shortcuts-footer">Press <kbd>Esc</kbd> to close</p>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
```

**Step 4: Create the CSS**

Create `client/src/components/KeyboardShortcutsModal.css`:

```css
.shortcuts-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shortcuts-modal {
  background: var(--bg-color, #fff);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 1.5rem;
  min-width: 320px;
  max-width: 480px;
  width: 90%;
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  padding-bottom: 0.75rem;
}

.shortcuts-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--primary-color);
}

.shortcuts-header h2 i {
  margin-right: 0.5rem;
}

.shortcuts-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted, #666);
  line-height: 1;
  padding: 0;
}

.shortcuts-close:hover {
  color: var(--text-color, #222);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  align-items: center;
}

.shortcut-key {
  display: inline-block;
  background: var(--bg-light, #f5f5f5);
  border: 1px solid var(--border-color, #ccc);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: nowrap;
}

.shortcut-desc {
  color: var(--text-color, #333);
  font-size: 0.9rem;
}

.shortcuts-footer {
  margin: 1rem 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted, #888);
}

.shortcuts-footer kbd {
  background: var(--bg-light, #f5f5f5);
  border: 1px solid var(--border-color, #ccc);
  border-radius: 3px;
  padding: 0.1rem 0.3rem;
  font-size: 0.8rem;
}
```

**Step 5: Run tests to verify they pass**

```bash
cd client && npm test -- --testPathPattern=KeyboardShortcutsModal --watchAll=false
```

Expected: All 7 tests PASS.

**Step 6: Commit**

```bash
git add client/src/components/KeyboardShortcutsModal.js client/src/components/KeyboardShortcutsModal.css client/src/components/__tests__/KeyboardShortcutsModal.test.js
git commit -m "feat: implement KeyboardShortcutsModal component"
```

---

## Task 3: Wire modal and gated listener into `App.js`

**Files:**
- Modify: `client/src/App.js`

**Step 1: Add imports and state to App.js**

At the top of `client/src/App.js`, add after existing imports:

```js
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { useFeatureFlag } from './hooks/useFeatureFlag';
```

Inside the `App` component body, add after `useSyncStatsigUser()`:

```js
const showShortcuts = useFeatureFlag('keyboard_shortcuts_modal', false);
const [shortcutsOpen, setShortcutsOpen] = useState(false);

useEffect(() => {
  if (!showShortcuts) return;
  const handler = (e) => {
    if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      setShortcutsOpen(prev => !prev);
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [showShortcuts]);
```

Add `useState` and `useEffect` to the React import if not already there:
```js
import React, { useState, useEffect } from 'react';
```

**Step 2: Add modal to App JSX**

In the `return` block of `App`, just before the closing `</>`:

```jsx
{showShortcuts && (
  <KeyboardShortcutsModal
    isOpen={shortcutsOpen}
    onClose={() => setShortcutsOpen(false)}
  />
)}
```

**Step 3: Verify the app still compiles**

```bash
cd client && npm run build 2>&1 | tail -5
```

Expected: `Compiled successfully.` (or with only warnings, no errors).

**Step 4: Commit**

```bash
git add client/src/App.js
git commit -m "feat: wire keyboard shortcuts modal into App.js behind feature flag"
```

---

## Task 4: Add gated hint to Footer

**Files:**
- Modify: `client/src/components/layout/Footer.js`

**Step 1: Add import and flag check**

Add at the top of `Footer.js`:

```js
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
```

Inside the `Footer` component, add:

```js
const showShortcuts = useFeatureFlag('keyboard_shortcuts_modal', false);
```

**Step 2: Add hint to `footer-bottom`**

Find the `footer-bottom` div:
```jsx
<div className="footer-bottom">
  <p>&copy; {new Date().getFullYear()} AI/ML Career Forum. All rights reserved.</p>
</div>
```

Replace with:
```jsx
<div className="footer-bottom">
  <p>&copy; {new Date().getFullYear()} AI/ML Career Forum. All rights reserved.</p>
  {showShortcuts && (
    <p className="shortcuts-hint">
      Press <kbd>?</kbd> for keyboard shortcuts
    </p>
  )}
</div>
```

**Step 3: Add hint CSS**

Append to `client/src/components/KeyboardShortcutsModal.css`:

```css
.shortcuts-hint {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--footer-text, #aaa);
}

.shortcuts-hint kbd {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 3px;
  padding: 0.1rem 0.3rem;
  font-size: 0.75rem;
}
```

**Step 4: Verify build**

```bash
cd client && npm run build 2>&1 | tail -5
```

Expected: `Compiled successfully.`

**Step 5: Commit**

```bash
git add client/src/components/layout/Footer.js client/src/components/KeyboardShortcutsModal.css
git commit -m "feat: add gated keyboard shortcuts hint to footer"
```

---

## Task 5: Verify end-to-end

**Step 1: Start the app**

```bash
cd client && npm start
```

**Step 2: Verify gate OFF (default)**

- Press `?` anywhere on the page → nothing happens
- Inspect DOM → `shortcuts-overlay` not present
- Footer → no `?` hint text

**Step 3: Enable gate for yourself in Statsig**

In the Statsig console:
1. Open the `keyboard_shortcuts_modal` gate
2. Add a local override for your user ID (or temporarily set to 100%)

Refresh the page.

**Step 4: Verify gate ON**

- Footer shows "Press ? for keyboard shortcuts"
- Press `?` → modal appears with shortcut list
- Press `Esc` → modal closes
- Press `?` again → modal appears
- Click outside modal → modal closes
- Click *inside* modal → modal stays open
- Click inside an `<input>` then press `?` → modal does NOT open

**Step 5: Run full client test suite**

```bash
cd client && npm test -- --watchAll=false
```

Expected: All tests pass, no regressions.

**Step 6: Final commit if any fixups needed, then done**

```bash
git log --oneline -5
```

---

## Final Checklist

- [ ] `keyboard_shortcuts_modal` gate exists in Statsig (default OFF)
- [ ] `KeyboardShortcutsModal` component renders shortcuts in 2-column grid
- [ ] All 7 unit tests pass
- [ ] `?` key opens/toggles modal (gate ON only)
- [ ] `?` inside input/textarea does nothing
- [ ] Escape closes modal
- [ ] Click outside closes modal
- [ ] Click inside does not close modal
- [ ] Footer hint visible only when gate ON
- [ ] Gate OFF: zero DOM presence of modal or hint
- [ ] `npm test -- --watchAll=false` passes with no regressions
