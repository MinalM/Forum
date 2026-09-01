import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
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

const renderAs = (user) => {
  localStorage.setItem('token', 'fake-token');
  axios.get.mockImplementation((url) => {
    if (url === '/api/users/me') {
      return Promise.resolve({ data: { data: user } });
    }
    if (url === '/api/reports/pending/count') {
      return Promise.resolve({ data: { data: { count: 0 } } });
    }
    if (url === '/api/notifications/unread/count') {
      return Promise.resolve({ data: { data: { count: 0 } } });
    }
    return Promise.reject(new Error(`unexpected request: ${url}`));
  });

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('Navbar top-level hierarchy', () => {
  beforeEach(() => {
    axios.get.mockReset();
    localStorage.clear();
  });

  it('exposes exactly one top-level "Create" affordance styled as a button, not a plain nav-link', async () => {
    renderAs({ _id: 'u1', name: 'Regular User', role: 'user' });

    const createLinks = await screen.findAllByRole('link', { name: /create/i });
    expect(createLinks).toHaveLength(1);
    expect(createLinks[0]).toHaveClass('nav-create-btn');
    expect(createLinks[0]).not.toHaveClass('nav-link');
  });

  it('collapses Dashboard/Saved/Profile/Logout behind a single user menu, unmounted until opened', async () => {
    renderAs({ _id: 'u1', name: 'Regular User', role: 'user' });

    await screen.findByRole('link', { name: /create/i });

    // Closed by default: menu contents are not in the tree at all.
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^saved$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^profile$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/logout/i)).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /regular user/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^saved$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^profile$/i })).toBeInTheDocument();
    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });

  it('does not render a staff menu for a plain user', async () => {
    renderAs({ _id: 'u1', name: 'Regular User', role: 'user' });

    await screen.findByRole('link', { name: /create/i });
    expect(screen.queryByRole('button', { name: /^admin/i })).not.toBeInTheDocument();
  });

  it('merges the Admin + Moderator destinations behind a single staff menu for an admin, unmounted until opened', async () => {
    renderAs({ _id: 'a1', name: 'Ada Admin', role: 'admin' });

    await screen.findByRole('link', { name: /create/i });

    expect(screen.queryByRole('link', { name: /user management/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reports dashboard/i })).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /^admin/i });
    fireEvent.click(toggle);

    expect(screen.getByRole('link', { name: /user management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reports dashboard/i })).toBeInTheDocument();
  });

  it('gives a moderator only the Reports Dashboard destination in the staff menu', async () => {
    renderAs({ _id: 'm1', name: 'Mo Derator', role: 'moderator' });

    await screen.findByRole('link', { name: /create/i });

    const toggle = screen.getByRole('button', { name: /^admin/i });
    fireEvent.click(toggle);

    expect(screen.getByRole('link', { name: /reports dashboard/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /user management/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
  });

  it('keeps the top-level item count at 7 or fewer for an admin (the densest case)', async () => {
    renderAs({ _id: 'a1', name: 'Ada Admin', role: 'admin' });

    await screen.findByRole('link', { name: /create/i });

    const topLevelItems = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(topLevelItems.length).toBeLessThanOrEqual(7);
  });
});
