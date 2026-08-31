import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';
import { AlertProvider } from '../context/AlertContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn()
}));

jest.mock('../hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => false
}));

const renderApp = (route) => render(
  <AuthProvider>
    <AlertProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </AlertProvider>
  </AuthProvider>
);

describe('main landmark', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({ data: { unansweredCount: 0 } });
  });

  it.each(['/login', '/register'])(
    'wraps the routed content in exactly one <main> landmark on %s',
    async (route) => {
      renderApp(route);

      const mains = await screen.findAllByRole('main');
      expect(mains).toHaveLength(1);
      expect(mains[0]).toContainElement(
        route === '/login'
          ? screen.getByText('Sign in to your AI/ML Career Forum account')
          : screen.getByRole('heading', { name: /create.*account/i })
      );
    }
  );
});

describe('skip link', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({ data: { unansweredCount: 0 } });
  });

  it('renders as the first focusable element and targets the main region', async () => {
    renderApp('/login');
    const main = await screen.findByRole('main');

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveAttribute('href', `#${main.getAttribute('id')}`);

    // The skip link must precede every other link (nav, search, footer, mobile
    // tab bar) so it is reachable with a single Tab press before any of them.
    const links = screen.getAllByRole('link');
    expect(links[0]).toBe(skipLink);
  });
});
