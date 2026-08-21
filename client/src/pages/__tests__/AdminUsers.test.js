import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import AdminUsers from '../AdminUsers';
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

describe('AdminUsers document title', () => {
  beforeEach(() => {
    axios.get.mockReset();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: ADMIN } });
      }
      if (url.startsWith('/api/users?')) {
        return Promise.resolve({
          data: {
            data: [{ _id: 'u1', name: 'Regular User', email: 'user@example.com', role: 'user' }],
            pagination: { total: 1, limit: 10 }
          }
        });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
  });

  it('sets the document title to User Management', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <AdminUsers />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('User Management');
    expect(document.title).toBe('User Management | AI/ML Career Forum');
  });
});
