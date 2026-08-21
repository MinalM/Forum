import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import Navbar from '../layout/Navbar';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

// jest.cssTransform.js stubs every CSS import to `{}` (see that file), so
// merely importing Navbar.css proves nothing about whether its rules ever
// apply. This mock instead records that the import happened - the factory
// only runs the first time something actually does
// `import './Navbar.css'`, during this file's module graph resolution, so
// if that import is ever removed from Navbar.js again this flag reverts to
// undefined and the assertion below fails.
jest.mock('../layout/Navbar.css', () => {
  global.__navbarCssImported = true;
  return {};
});

const navbarCss = fs.readFileSync(
  path.join(__dirname, '../layout/Navbar.css'),
  'utf8'
);

const renderNavbar = () =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    </AuthProvider>
  );

describe('Navbar stylesheet is actually loaded', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('no auth token'));
    localStorage.clear();

    // Inject the real CSS source as an actual <style> tag so
    // getComputedStyle() below reflects real rule matching instead of the
    // transform stub Jest normally substitutes for a CSS import.
    const style = document.createElement('style');
    style.textContent = navbarCss;
    document.head.appendChild(style);
  });

  it('is imported by Navbar.js, not just present on disk', async () => {
    renderNavbar();

    await screen.findByRole('searchbox', { name: /search posts/i });
    expect(global.__navbarCssImported).toBe(true);
  });

  // jsdom has no `window.matchMedia` and does not evaluate @media
  // conditions in getComputedStyle(), so the mobile-only 44px rules (inside
  // `@media (max-width: 768px)`) can't be verified this way here - that's
  // still covered by the raw-source assertions in mobileTouchTargets.test.js.
  // This checks an unconditional rule instead, to prove the stylesheet is
  // genuinely parsed and applied in a real DOM, not just present in source.
  it('applies its unconditional rules to the search input and button in a real DOM', async () => {
    renderNavbar();

    const input = await screen.findByRole('searchbox', { name: /search posts/i });
    const button = screen.getByRole('button', { name: /submit search/i });

    expect(getComputedStyle(input).borderRadius).toBe('4px 0 0 4px');
    expect(getComputedStyle(button).padding).toBe('0.35rem 0.75rem');
  });
});
