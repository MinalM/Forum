import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import AdminDashboard from '../AdminDashboard';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

const ADMIN = { _id: 'admin1', name: 'Ada Admin', role: 'admin' };

const headingLevel = (el) => Number(el.tagName.slice(1));

describe('AdminDashboard heading sequence', () => {
  beforeEach(() => {
    axios.get.mockReset();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: ADMIN } });
      }
      if (url.startsWith('/api/users?')) {
        return Promise.resolve({ data: { data: [], pagination: { total: 0 } } });
      }
      if (url.startsWith('/api/reports?')) {
        return Promise.resolve({ data: { data: [], pagination: { total: 0 } } });
      }
      if (url === '/api/reports/pending/count') {
        return Promise.resolve({ data: { data: { count: 0 } } });
      }
      if (url === '/api/posts' || url.startsWith('/api/posts?')) {
        return Promise.resolve({ data: { data: [], pagination: { total: 0 } } });
      }
      if (url === '/api/comments' || url.startsWith('/api/comments?')) {
        return Promise.resolve({ data: { data: [], pagination: { total: 0 } } });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
  });

  it('skips no heading level, and no heading is a bare number', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <AdminDashboard />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Recent Users');

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
