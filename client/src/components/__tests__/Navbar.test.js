import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
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
