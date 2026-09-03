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

const mockUser = (role) => ({ _id: 'u1', name: 'Ada Lovelace', role });

const renderDashboardAs = async (role) => {
  axios.get.mockReset();
  localStorage.clear();
  localStorage.setItem('token', 'fake-token');
  axios.get.mockImplementation((url) => {
    if (url === '/api/users/me') {
      return Promise.resolve({ data: { data: mockUser(role) } });
    }
    if (url.endsWith('/posts')) {
      return Promise.resolve({ data: { data: [] } });
    }
    if (url === '/api/comments') {
      return Promise.resolve({ data: { count: 0, data: [] } });
    }
    return Promise.reject(new Error(`unexpected request: ${url}`));
  });

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
};

describe('Dashboard admin/moderator shortcut links', () => {
  it('shows both dashboard links for an admin user', async () => {
    await renderDashboardAs('admin');

    expect(screen.getByRole('link', { name: /go to admin dashboard/i })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: /go to moderator dashboard/i })).toHaveAttribute('href', '/moderator');
  });

  it('shows the moderator dashboard link for a moderator user', async () => {
    await renderDashboardAs('moderator');

    expect(screen.getByRole('link', { name: /go to moderator dashboard/i })).toHaveAttribute('href', '/moderator');
    expect(screen.queryByRole('link', { name: /go to admin dashboard/i })).not.toBeInTheDocument();
  });

  it('shows neither link for a plain user', async () => {
    await renderDashboardAs('user');

    expect(screen.queryByRole('link', { name: /go to admin dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /go to moderator dashboard/i })).not.toBeInTheDocument();
  });
});
