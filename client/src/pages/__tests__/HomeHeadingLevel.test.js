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

jest.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => false
}));

const headingLevel = (el) => Number(el.tagName.slice(1));

const renderHome = (authValue) => {
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

describe('Home heading sequence', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            _id: 'p1',
            title: 'A question',
            user: { username: 'a' },
            category: { name: 'ML' },
            createdAt: new Date().toISOString(),
            upvotes: [],
            downvotes: [],
            comments: []
          }
        ],
        unansweredCount: 1
      }
    });
  });

  it('renders exactly one h1, and it comes before any h2/h3, in the anonymous value-bar state', async () => {
    renderHome({ isAuthenticated: false, user: null });

    await screen.findByText('Join the Community');
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    await screen.findByText('Popular Categories');

    const headings = screen.getAllByRole('heading');
    const h1s = headings.filter(h => headingLevel(h) === 1);
    expect(h1s).toHaveLength(1);
    expect(headings[0]).toBe(h1s[0]);

    const levels = headings.map(headingLevel);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it('renders exactly one h1, and it comes before any h2/h3, in the authenticated feed state', async () => {
    renderHome({ isAuthenticated: true, user: { _id: '1', username: 'alice' } });

    await screen.findByRole('tab', { name: /For you/ });
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    await screen.findByText('Popular Categories');

    const headings = screen.getAllByRole('heading');
    const h1s = headings.filter(h => headingLevel(h) === 1);
    expect(h1s).toHaveLength(1);
    expect(headings[0]).toBe(h1s[0]);

    const levels = headings.map(headingLevel);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });
});
