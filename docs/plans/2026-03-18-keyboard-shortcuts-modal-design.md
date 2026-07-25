# Keyboard Shortcuts Help Modal — Design

**Date:** 2026-03-18
**Feature flag:** `keyboard_shortcuts_modal`

## Goal

Add a help modal that lists the app's keyboard shortcuts, triggered by pressing `?`. The entire feature — listener, modal, and footer hint — is gated behind a Statsig feature flag so it can be enabled/disabled without a deploy.

## Architecture

The modal and its global keydown listener live in `App.js`, the natural mount point for app-wide UI that persists across routes. When the flag is off, `useFeatureFlag` returns `false`, the effect returns early (no listener registered), and the modal is never rendered.

**New files:**
- `client/src/components/KeyboardShortcutsModal.js`
- `client/src/components/KeyboardShortcutsModal.css`

**Modified files:**
- `client/src/App.js` — flag check, keydown listener, modal mount
- `client/src/components/layout/Footer.js` — gated `?` hint in `footer-bottom`

## Component Structure

```
App.js
 ├── useFeatureFlag('keyboard_shortcuts_modal')  → showShortcuts
 ├── useState(false)                             → [shortcutsOpen, setShortcutsOpen]
 ├── useEffect → window keydown '?' listener     (only when showShortcuts is true)
 └── {showShortcuts && <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={...} />}

KeyboardShortcutsModal.js
 ├── SHORTCUTS config array (module-level const)
 ├── useEffect → Escape key closes modal
 ├── Overlay div (onClick → close)
 └── Modal panel
      ├── Header: "Keyboard Shortcuts" + × close button
      ├── 2-column CSS grid of shortcut rows (<kbd> + description)
      └── Footer hint: "Press Escape to close"
```

## Shortcut Config

Defined as a plain array at the top of `KeyboardShortcutsModal.js`. Easy to extend without touching component logic.

```js
const SHORTCUTS = [
  { key: '?',    description: 'Show this help' },
  { key: 'g h',  description: 'Go to Home' },
  { key: 'g c',  description: 'Go to Categories' },
  { key: 'n',    description: 'New post' },
  { key: 'Esc',  description: 'Close modal / Cancel' },
];
```

## Gating Pattern

Follows the exact same pattern used for `trending_posts_section` in `Home.js`:

```js
const showShortcuts = useFeatureFlag('keyboard_shortcuts_modal', false);

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

## Visual Hint

In `Footer.js`, inside the existing `footer-bottom` div, conditionally render a small muted hint. Uses the same `useFeatureFlag` call — no new hook or state needed.

```jsx
{showShortcuts && (
  <span className="shortcuts-hint">
    Press <kbd>?</kbd> for keyboard shortcuts
  </span>
)}
```

## Styling

Plain CSS overlay — no new dependencies. Uses:
- `position: fixed`, `z-index: 1000` for overlay
- `rgba(0,0,0,0.5)` backdrop
- CSS grid (`grid-template-columns: auto 1fr`) for 2-column shortcut rows
- Existing CSS variables (`var(--primary-color)`, etc.)
- Font Awesome `fa-keyboard` icon in modal header

## Verification

| Condition | Expected |
|-----------|----------|
| Gate OFF | `?` keypress does nothing; modal absent from DOM; no footer hint |
| Gate ON | `?` opens modal; Escape closes; click outside closes |
| Input focused + gate ON | `?` does NOT open modal (input guard) |
| Statsig dashboard | Gate override to ON shows modal immediately |
