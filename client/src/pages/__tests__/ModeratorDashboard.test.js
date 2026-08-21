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

describe('ModeratorDashboard document title', () => {
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

  it('sets the document title to Moderator Dashboard', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <ModeratorDashboard />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Moderator Dashboard');
    expect(document.title).toBe('Moderator Dashboard | AI/ML Career Forum');
  });
});
