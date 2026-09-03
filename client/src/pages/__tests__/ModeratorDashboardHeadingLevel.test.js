import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import ModeratorDashboard from '../ModeratorDashboard';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

const MODERATOR = { _id: 'mod1', name: 'Mod Erator', role: 'moderator' };

const headingLevel = (el) => Number(el.tagName.slice(1));

describe('ModeratorDashboard heading sequence', () => {
  beforeEach(() => {
    axios.get.mockReset();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: MODERATOR } });
      }
      if (url.startsWith('/api/reports?')) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
  });

  it('skips no heading level, and does not emit an H3 before its H2', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <ModeratorDashboard />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Reports (pending)');

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
