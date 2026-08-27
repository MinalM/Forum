import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import Home from '../Home';
import { AlertProvider } from '../../context/AlertContext';
import AuthContext from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

jest.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: jest.fn(() => false)
}));

const { useFeatureFlag } = require('../../hooks/useFeatureFlag');

const renderHome = (authValue, initialEntries = ['/']) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <AlertProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Home />
        </MemoryRouter>
      </AlertProvider>
    </AuthContext.Provider>
  );
};

describe('Home document title', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({ data: { data: [] } });
  });

  it('sets the document title to the site name', async () => {
    renderHome({ isAuthenticated: false, user: null });

    await screen.findByText('Join the Community');
    expect(document.title).toBe('AI/ML Career Forum');
  });
});

describe('Home value bar session-awareness', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({ data: { data: [] } });
  });

  it('shows a value bar with Join/Browse CTAs when logged out', async () => {
    renderHome({ isAuthenticated: false, user: null });

    expect(await screen.findByText('Join the Community')).toBeInTheDocument();
    expect(screen.queryByText('Create Post')).not.toBeInTheDocument();
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument();
  });

  it('shows the feed directly with no value bar when logged in', async () => {
    renderHome({ isAuthenticated: true, user: { _id: '1', username: 'alice' } });

    await screen.findByRole('tab', { name: /For you/ });
    expect(screen.queryByText('Join the Community')).not.toBeInTheDocument();
  });
});

describe('Home feed tabs', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('requests the recent feed by default', async () => {
    axios.get.mockResolvedValue({ data: { data: [], unansweredCount: 0 } });
    renderHome({ isAuthenticated: false, user: null });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('feed=recent'));
    });
  });

  it('starts on the unanswered feed when linked in via ?feed=unanswered (mobile tab bar deep link)', async () => {
    axios.get.mockResolvedValue({ data: { data: [], unansweredCount: 3 } });
    renderHome({ isAuthenticated: false, user: null }, ['/?feed=unanswered']);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('feed=unanswered'));
    });
    expect(await screen.findByRole('tab', { name: /Unanswered/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('falls back to the recent feed for an unrecognised ?feed value', async () => {
    axios.get.mockResolvedValue({ data: { data: [], unansweredCount: 0 } });
    renderHome({ isAuthenticated: false, user: null }, ['/?feed=bogus']);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('feed=recent'));
    });
  });

  it('switches to the unanswered feed on tab click', async () => {
    const user = userEvent.setup();
    axios.get.mockResolvedValue({ data: { data: [], unansweredCount: 2 } });
    renderHome({ isAuthenticated: false, user: null });

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    axios.get.mockClear();

    await user.click(screen.getByRole('tab', { name: /Unanswered/ }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('feed=unanswered'));
    });
  });

  it('switches to the top feed with a since window on tab click', async () => {
    const user = userEvent.setup();
    axios.get.mockResolvedValue({ data: { data: [] } });
    renderHome({ isAuthenticated: false, user: null });

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    axios.get.mockClear();

    await user.click(screen.getByRole('tab', { name: /Top this week/ }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringMatching(/feed=top.*since=7d/)
      );
    });
  });

  it('renders the unanswered tab count from the response envelope', async () => {
    axios.get.mockResolvedValue({ data: { data: [], unansweredCount: 7 } });
    renderHome({ isAuthenticated: false, user: null });

    const tab = await screen.findByRole('tab', { name: /Unanswered/ });
    expect(await within(tab).findByText('7')).toBeInTheDocument();
  });
});

describe('Home feed states', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('shows an empty state when the feed has no posts', async () => {
    axios.get.mockResolvedValue({ data: { data: [] } });
    renderHome({ isAuthenticated: false, user: null });

    expect(await screen.findByText('No posts found')).toBeInTheDocument();
  });

  it('shows an error state when the feed fetch fails', async () => {
    axios.get.mockRejectedValue(new Error('network down'));
    renderHome({ isAuthenticated: false, user: null });

    expect(await screen.findByText('Error loading posts')).toBeInTheDocument();
  });
});

describe('Home trending posts gating', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({ data: { data: [] } });
    useFeatureFlag.mockReset();
  });

  it('does not render TrendingPosts when the flag is off', async () => {
    useFeatureFlag.mockReturnValue(false);
    renderHome({ isAuthenticated: false, user: null });

    await screen.findByText('No posts found');
    expect(screen.queryByText('Trending')).not.toBeInTheDocument();
  });

  it('renders TrendingPosts when the flag is on', async () => {
    useFeatureFlag.mockReturnValue(true);
    axios.get.mockImplementation((url) => {
      if (url.includes('views')) {
        return Promise.resolve({ data: { data: [{ _id: 't1', title: 'Trending post' }] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
    renderHome({ isAuthenticated: false, user: null });

    expect(await screen.findByText('Trending')).toBeInTheDocument();
  });
});

describe('Home "You can answer these" rail', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('renders the rail for an authenticated member', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/posts/recommended')) {
        return Promise.resolve({
          data: { data: [{ _id: 'p1', title: 'Matched question', category: { name: 'Deep Learning' } }] }
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderHome({ isAuthenticated: true, user: { _id: '1', username: 'alice' } });

    expect(await screen.findByText('You can answer these')).toBeInTheDocument();
    expect(await screen.findByText('Matched question')).toBeInTheDocument();
  });

  it('does not render the rail, or request it, for a signed-out visitor', async () => {
    axios.get.mockResolvedValue({ data: { data: [] } });

    renderHome({ isAuthenticated: false, user: null });

    await screen.findByText('No posts found');
    expect(screen.queryByText('You can answer these')).not.toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/posts/recommended')
    );
  });
});
