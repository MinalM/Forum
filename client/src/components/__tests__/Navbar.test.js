import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import axios from 'axios';
import Navbar from '../layout/Navbar';
import Login from '../../pages/Login';
import { AuthProvider } from '../../context/AuthContext';
import { AlertProvider } from '../../context/AlertContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
};

const renderNavbar = () =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/']}>
        <Navbar />
        <LocationProbe />
      </MemoryRouter>
    </AuthProvider>
  );

describe('Navbar search', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('no auth token'));
    localStorage.clear();
  });

  it('navigates to /search with the query when the form is submitted', async () => {
    renderNavbar();

    const input = await screen.findByRole('searchbox', { name: /search posts/i });
    fireEvent.change(input, { target: { value: 'transformers' } });
    fireEvent.submit(input.closest('form'));

    expect(await screen.findByTestId('location')).toHaveTextContent('/search?q=transformers');
  });

  it('does nothing when submitted with an empty query', async () => {
    renderNavbar();

    const input = await screen.findByRole('searchbox', { name: /search posts/i });
    fireEvent.submit(input.closest('form'));

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('navigates to /search when the search button is clicked', async () => {
    renderNavbar();

    const input = await screen.findByRole('searchbox', { name: /search posts/i });
    fireEvent.change(input, { target: { value: 'transformers' } });
    fireEvent.click(screen.getByRole('button', { name: /submit search/i }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/search?q=transformers');
  });

  it('does not use type="submit" for the search button, so it never collides with a page\'s own submit button (e.g. login, register)', async () => {
    renderNavbar();

    const button = await screen.findByRole('button', { name: /submit search/i });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('renders the search box for logged-in users too', async () => {
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({
          data: { data: { _id: 'u1', name: 'Ada', role: 'user' } }
        });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });

    renderNavbar();

    expect(await screen.findByRole('searchbox', { name: /search posts/i })).toBeInTheDocument();
  });
});

describe('Navbar + page interaction', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('no auth token'));
    localStorage.clear();
  });

  // Regression test: e2e tests (login, registration, create-post) all locate
  // their page's submit button with the page-wide `button[type="submit"]`
  // selector, since Navbar renders above every page. If the navbar search
  // button were also type="submit", that selector would match two elements
  // and Playwright would click whichever comes first in the DOM - silently
  // submitting the wrong form instead of throwing, which is worse than a
  // crash because the login/register/post flow just times out with no clue
  // why.
  it('exposes exactly one type="submit" button when rendered alongside a page form (e.g. Login)', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Navbar />
            <Login />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByRole('searchbox', { name: /search posts/i });

    const submitButtons = document.querySelectorAll('button[type="submit"]');
    expect(submitButtons).toHaveLength(1);
  });
});
