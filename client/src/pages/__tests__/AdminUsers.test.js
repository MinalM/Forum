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

  // Reproduces the live-site bug: Edit Role, Timeout and Ban all rendered as
  // full-weight `.btn` buttons on every row, so the row's most destructive
  // action (Ban) was as visually prominent as its primary one (Edit Role).
  it('demotes Timeout and Ban to a quieter treatment than the primary Edit Role action', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <AdminUsers />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    const editButton = await screen.findByRole('button', { name: 'Edit Role' });
    const timeoutButton = screen.getByRole('button', { name: 'Timeout' });
    const banButton = screen.getByRole('button', { name: 'Ban' });

    expect(editButton).toHaveClass('btn-primary');
    // Outline treatment, not the same filled emphasis class as Edit Role.
    expect(timeoutButton).toHaveClass('btn-outline-warning');
    expect(timeoutButton).not.toHaveClass('btn-primary');
    expect(timeoutButton).not.toHaveClass('btn-warning');
    expect(banButton).toHaveClass('btn-outline-danger');
    expect(banButton).not.toHaveClass('btn-primary');
    expect(banButton).not.toHaveClass('btn-danger');
  });
});
