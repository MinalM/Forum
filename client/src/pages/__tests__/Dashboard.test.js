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

describe('Dashboard document title', () => {
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

  it('sets the document title to Dashboard', async () => {
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
    expect(document.title).toBe('Dashboard | AI/ML Career Forum');
  });
});
