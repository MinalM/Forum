import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import Dashboard from '../Dashboard';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

const USER = { _id: 'u1', name: 'Ada Lovelace', role: 'user' };

const headingLevel = (el) => Number(el.tagName.slice(1));

describe('Dashboard heading sequence', () => {
  beforeEach(() => {
    axios.get.mockReset();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: USER } });
      }
      if (url.endsWith('/posts')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === '/api/comments') {
        return Promise.resolve({ data: { count: 0, data: [] } });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
  });

  it('skips no heading level, and no heading is a bare number', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Welcome back, Ada Lovelace');
    await screen.findByText('Your Recent Posts');

    const headings = screen.getAllByRole('heading');
    const h1s = headings.filter(h => headingLevel(h) === 1);
    expect(h1s).toHaveLength(1);
    expect(headings[0]).toBe(h1s[0]);

    const levels = headings.map(headingLevel);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }

    headings.forEach(h => {
      expect(h.textContent.trim()).not.toMatch(/^\d+$/);
    });
  });
});
