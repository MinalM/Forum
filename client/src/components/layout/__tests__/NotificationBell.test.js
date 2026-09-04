import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import NotificationBell from '../NotificationBell';
import { AuthProvider } from '../../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  put: jest.fn()
}));

const MEMBER = { _id: '000000000000000000000001', name: 'Ada', role: 'user' };

const NOTIFICATION = {
  _id: '000000000000000000000099',
  post: { _id: '000000000000000000000002', title: 'Best way to learn transformers?' },
  comment: { _id: '000000000000000000000003' },
  actor: { _id: '000000000000000000000004', name: 'Grace' },
  type: 'answer',
  read: false,
  createdAt: new Date().toISOString()
};

const renderBell = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <ul>
          <NotificationBell />
        </ul>
      </MemoryRouter>
    </AuthProvider>
  );

const mockAuthenticated = (overrides = {}) => {
  localStorage.setItem('token', 'fake-token');
  axios.get.mockImplementation((url) => {
    if (url === '/api/users/me') {
      return Promise.resolve({ data: { data: MEMBER } });
    }
    if (url === '/api/notifications/unread/count') {
      return Promise.resolve({ data: { success: true, data: { count: overrides.count ?? 1 } } });
    }
    if (url === '/api/notifications') {
      return Promise.resolve({ data: { success: true, data: overrides.notifications ?? [NOTIFICATION] } });
    }
    return Promise.reject(new Error(`unexpected request: ${url}`));
  });
};

describe('NotificationBell (unauthenticated)', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('no auth token'));
    localStorage.clear();
  });

  it('renders nothing for a signed-out visitor', async () => {
    renderBell();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
    });
  });
});

describe('NotificationBell (authenticated member)', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.put.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows the unread count badge', async () => {
    mockAuthenticated({ count: 3 });
    renderBell();

    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('hides the badge when there are no unread notifications', async () => {
    mockAuthenticated({ count: 0 });
    renderBell();

    await screen.findByRole('button', { name: /notifications/i });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opens the dropdown, lists recent notifications, and marks them read', async () => {
    mockAuthenticated({ count: 1 });
    axios.put.mockResolvedValue({ data: { success: true, data: {} } });
    renderBell();

    const button = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    expect(
      await screen.findByRole('link', { name: /grace answered "best way to learn transformers\?"/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/notifications/read-all');
    });
    await waitFor(() => {
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  it('describes a tag_post notification', async () => {
    mockAuthenticated({
      count: 1,
      notifications: [
        {
          ...NOTIFICATION,
          _id: '000000000000000000000098',
          comment: undefined,
          type: 'tag_post'
        }
      ]
    });
    renderBell();

    const button = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    expect(
      await screen.findByRole('link', {
        name: /grace posted "best way to learn transformers\?" in a tag you follow/i
      })
    ).toBeInTheDocument();
  });

  it('shows an empty state when there are no notifications', async () => {
    mockAuthenticated({ count: 0, notifications: [] });
    renderBell();

    const button = await screen.findByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it('stops polling for the unread count once unmounted', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    mockAuthenticated({ count: 1 });

    const { unmount } = renderBell();

    await waitFor(() => expect(axios.get).toHaveBeenCalledWith('/api/notifications/unread/count'));
    const callsBeforeUnmount = axios.get.mock.calls.filter(
      ([url]) => url === '/api/notifications/unread/count'
    ).length;

    unmount();

    jest.advanceTimersByTime(5 * 60 * 1000);

    const callsAfterUnmount = axios.get.mock.calls.filter(
      ([url]) => url === '/api/notifications/unread/count'
    ).length;
    expect(callsAfterUnmount).toBe(callsBeforeUnmount);

    jest.useRealTimers();
  });
});
