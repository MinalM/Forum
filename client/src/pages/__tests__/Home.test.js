import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

const renderHome = (authValue) => {
  axios.get.mockResolvedValue({ data: { data: [] } });

  return render(
    <AuthContext.Provider value={authValue}>
      <AlertProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AlertProvider>
    </AuthContext.Provider>
  );
};

describe('Home document title', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('sets the document title to the site name', async () => {
    renderHome({ isAuthenticated: false, user: null });

    await screen.findByText('Join the Community');
    expect(document.title).toBe('AI/ML Career Forum');
  });
});

describe('Home hero session-awareness', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('shows Join the Community / Register CTAs when logged out', async () => {
    renderHome({ isAuthenticated: false, user: null });

    expect(await screen.findByText('Join the Community')).toBeInTheDocument();
    expect(screen.queryByText('Create Post')).not.toBeInTheDocument();
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument();
  });

  it('shows Create Post / Dashboard links when logged in', async () => {
    renderHome({ isAuthenticated: true, user: { _id: '1', username: 'alice' } });

    expect(await screen.findByText('Create Post')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Join the Community')).not.toBeInTheDocument();
  });
});
