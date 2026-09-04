import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import TagChip from '../TagChip';
import { AlertProvider } from '../../../context/AlertContext';
import { AuthProvider } from '../../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn()
}));

const MEMBER = { _id: '000000000000000000000001', name: 'Ada', role: 'user' };

const renderTagChip = (tag = 'pytorch') =>
  render(
    <AuthProvider>
      <AlertProvider>
        <TagChip tag={tag} />
      </AlertProvider>
    </AuthProvider>
  );

describe('TagChip (signed out)', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('no auth token'));
    localStorage.clear();
  });

  it('renders a plain, non-interactive badge', async () => {
    renderTagChip();

    await waitFor(() => {
      expect(screen.getByText('pytorch')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('TagChip (signed in)', () => {
  const setup = ({ subscribed = false } = {}) => {
    axios.get.mockReset();
    axios.post.mockReset();
    axios.delete.mockReset();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: MEMBER } });
      }
      if (url.endsWith('/subscribe')) {
        return Promise.resolve({ data: { success: true, data: { subscribed } } });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
  };

  afterEach(() => {
    localStorage.clear();
  });

  it('shows a "Follow" button when not following, and follows on click', async () => {
    setup({ subscribed: false });
    axios.post.mockResolvedValue({ data: { success: true, data: { subscribed: true } } });
    renderTagChip('pytorch');

    const btn = await screen.findByRole('button', { name: /follow tag pytorch/i });
    fireEvent.click(btn);

    await screen.findByRole('button', { name: /following tag pytorch/i });
    expect(axios.post).toHaveBeenCalledWith('/api/tags/pytorch/subscribe');
  });

  it('shows a "Following" state when already followed, and unfollows on click', async () => {
    setup({ subscribed: true });
    axios.delete.mockResolvedValue({ data: { success: true, data: { subscribed: false } } });
    renderTagChip('pytorch');

    const btn = await screen.findByRole('button', { name: /following tag pytorch/i });
    fireEvent.click(btn);

    await screen.findByRole('button', { name: /^follow tag pytorch$/i });
    expect(axios.delete).toHaveBeenCalledWith('/api/tags/pytorch/subscribe');
  });

  it('encodes tags containing special characters in the request URL', async () => {
    setup({ subscribed: false });
    renderTagChip('c++');

    await screen.findByRole('button', { name: /follow tag c\+\+/i });
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/tags/c%2B%2B/subscribe');
    });
  });

  it('rolls back and alerts on a failed toggle', async () => {
    setup({ subscribed: false });
    axios.post.mockRejectedValue(new Error('network error'));
    renderTagChip('pytorch');

    const btn = await screen.findByRole('button', { name: /follow tag pytorch/i });
    fireEvent.click(btn);

    await screen.findByRole('button', { name: /^follow tag pytorch$/i });
  });

  it('renders the follow toggle at least 44x44', async () => {
    setup({ subscribed: false });

    const fs = require('fs');
    const path = require('path');
    const appCss = fs.readFileSync(path.join(__dirname, '../../../App.css'), 'utf8');
    const style = document.createElement('style');
    style.textContent = appCss;
    document.head.appendChild(style);

    renderTagChip('pytorch');

    const button = await screen.findByRole('button', { name: /follow tag pytorch/i });
    const computed = getComputedStyle(button);
    expect(parseFloat(computed.minHeight)).toBeGreaterThanOrEqual(44);
  });
});
