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
