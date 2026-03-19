import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
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

KeyboardShortcutsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default KeyboardShortcutsModal;
