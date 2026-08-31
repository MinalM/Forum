import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import Login from '../Login';
import Register from '../Register';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn()
}));

// jsdom doesn't evaluate @media conditions when computing style (verified:
// a plain <style> with a `@media (max-width: 768px)` block never wins over
// an unscoped rule for the same selector, regardless of window.innerWidth),
// so a `.btn`/`.form-control` rule that only exists inside that media block
// (as this fix's rules do - see index.css) can't be exercised by rendering
// with the real stylesheet as-is, unlike the unscoped PostDetail vote-button
// rule this test is otherwise modelled on. Instead, pull the actual mobile
// declarations out of the source (the same extraction mobileTouchTargets.test.js
// uses) and apply them as plain, unwrapped rules - this still fails if a
// future edit lowers the real min-height below 44px, which is the
// regression this test exists to catch.
const indexCss = fs.readFileSync(
  path.join(__dirname, '../../index.css'),
  'utf8'
);

function extractMobileMediaDeclarations(css) {
  const blocks = [];
  let searchFrom = 0;

  while (true) {
    const start = css.indexOf('@media (max-width: 768px)', searchFrom);
    if (start === -1) break;

    const openBrace = css.indexOf('{', start);
    let depth = 0;
    let end = -1;
    for (let i = openBrace; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) throw new Error('unbalanced braces in mobile media query');

    blocks.push(css.slice(openBrace + 1, end));
    searchFrom = end + 1;
  }

  if (blocks.length === 0) throw new Error('no mobile media query found');
  return blocks.join('\n');
}

function extractRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [
    ...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))
  ];
  if (matches.length === 0) throw new Error(`selector "${selector}" not found`);
  return matches.map((match) => match[1]).join('\n');
}

const indexMobile = extractMobileMediaDeclarations(indexCss);
const mobileTouchTargetCss = `
  .btn { ${extractRule(indexMobile, '.btn')} }
  .form-control { ${extractRule(indexMobile, '.form-control')} }
`;

function injectMobileTouchTargetCss() {
  const style = document.createElement('style');
  style.textContent = mobileTouchTargetCss;
  document.head.appendChild(style);
}

function renderWithProviders(ui) {
  return render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );
}

describe('Login/Register touch targets (WCAG 2.5.5, <=768px viewport)', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('not authenticated'));
    injectMobileTouchTargetCss();
  });

  it('renders the Login submit button and inputs at least 44px tall', async () => {
    renderWithProviders(<Login />);

    const button = await screen.findByRole('button', { name: /^login$/i });
    expect(parseFloat(getComputedStyle(button).minHeight)).toBeGreaterThanOrEqual(44);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    [emailInput, passwordInput].forEach((input) => {
      expect(parseFloat(getComputedStyle(input).minHeight)).toBeGreaterThanOrEqual(44);
    });
  });

  it('renders the Register submit button and inputs at least 44px tall', async () => {
    renderWithProviders(<Register />);

    const button = await screen.findByRole('button', { name: /^register$/i });
    expect(parseFloat(getComputedStyle(button).minHeight)).toBeGreaterThanOrEqual(44);

    const nameInput = screen.getByLabelText(/^name$/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const password2Input = screen.getByLabelText(/confirm password/i);
    [nameInput, emailInput, passwordInput, password2Input].forEach((input) => {
      expect(parseFloat(getComputedStyle(input).minHeight)).toBeGreaterThanOrEqual(44);
    });
  });
});
