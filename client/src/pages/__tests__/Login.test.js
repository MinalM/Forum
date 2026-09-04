import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import Login from '../Login';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn()
}));

describe('Login document title', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('not authenticated'));
  });

  it('sets the document title to Login', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <Login />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Sign in to your AI/ML Career Forum account');
    expect(document.title).toBe('Login | AI/ML Career Forum');
  });
});

describe('Login autocomplete attributes', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('not authenticated'));
  });

  it('sets autocomplete="email" on the email input', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <Login />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Sign in to your AI/ML Career Forum account');
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('autocomplete', 'email');
  });

  it('sets autocomplete="current-password" on the password input', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <Login />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Sign in to your AI/ML Career Forum account');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  });
});

describe('Login forgot-password link', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('not authenticated'));
  });

  it('links to the forgot-password page', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <Login />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Sign in to your AI/ML Career Forum account');
    expect(screen.getByRole('link', { name: /forgot password\?/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });
});
