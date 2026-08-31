import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import CategoryPosts from '../CategoryPosts';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

// jsdom doesn't evaluate @media conditions when computing style (see
// LoginRegisterTouchTargets.test.js), so pull the actual mobile
// declarations out of the source and apply them as plain, unwrapped rules.
const appCss = fs.readFileSync(path.join(__dirname, '../../App.css'), 'utf8');
const indexCss = fs.readFileSync(path.join(__dirname, '../../index.css'), 'utf8');

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
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
  if (matches.length === 0) throw new Error(`selector "${selector}" not found`);
  return matches.map((match) => match[1]).join('\n');
}

const appMobile = extractMobileMediaDeclarations(appCss);
const indexMobile = extractMobileMediaDeclarations(indexCss);
const mobileTouchTargetCss = `
  #post-filter { ${extractRule(appMobile, '#post-filter')} }
  .btn { ${extractRule(indexMobile, '.btn')} }
`;

function injectMobileTouchTargetCss() {
  const style = document.createElement('style');
  style.textContent = mobileTouchTargetCss;
  document.head.appendChild(style);
}

const CATEGORY_ID = '000000000000000000000001';

const renderAtCategory = () =>
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter initialEntries={[`/categories/${CATEGORY_ID}`]}>
          <Routes>
            <Route path="/categories/:categoryId" element={<CategoryPosts />} />
          </Routes>
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

describe('CategoryPosts touch targets (WCAG 2.5.5, <=768px viewport)', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/posts')) {
        return Promise.resolve({ data: { success: true, count: 0, data: [] } });
      }
      return Promise.resolve({
        data: { success: true, data: { _id: CATEGORY_ID, name: 'Career Advice' } }
      });
    });
    injectMobileTouchTargetCss();
  });

  it('renders the Solved/Unsolved filter select at least 44px tall', async () => {
    renderAtCategory();

    const select = await screen.findByLabelText(/filter/i);
    expect(parseFloat(getComputedStyle(select).minHeight)).toBeGreaterThanOrEqual(44);
  });

  it('renders the empty-state and "All Categories" links at least 44px tall', async () => {
    renderAtCategory();

    const link = await screen.findByRole('link', { name: /login to post/i });
    expect(parseFloat(getComputedStyle(link).minHeight)).toBeGreaterThanOrEqual(44);

    const backLink = screen.getByRole('link', { name: /all categories/i });
    expect(parseFloat(getComputedStyle(backLink).minHeight)).toBeGreaterThanOrEqual(44);

    await act(async () => {
      await Promise.resolve();
    });
  });
});
