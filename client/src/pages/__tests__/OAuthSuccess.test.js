import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import OAuthSuccess from '../OAuthSuccess';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { AlertProvider } from '../../context/AlertContext';

jest.mock('axios', () => ({
  defaults: { headers: { common: {} } },
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

describe('OAuthSuccess document title', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('no auth token'));
    localStorage.clear();
  });

  it('sets the document title to Signing In', async () => {
    // Routed the same way the app routes it (a dedicated /login destination
    // to navigate to on failure) so OAuthSuccess actually unmounts once
    // its effect redirects, instead of re-firing forever on a bare render.
    // Title is set by an earlier effect in the component than the one that
    // redirects on a missing token, so it's asserted right after render
    // rather than waiting on "Processing..." text that the redirect races
    // away.
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter initialEntries={['/oauth-success']}>
            <Routes>
              <Route path="/oauth-success" element={<OAuthSuccess />} />
              <Route path="/login" element={<div>Login page</div>} />
            </Routes>
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    expect(document.title).toBe('Signing In | AI/ML Career Forum');
  });
});

describe('OAuthSuccess Fix Validation', () => {
  it('should expose setToken from AuthContext', () => {
    let authContextValue;
    
    const TestComponent = () => {
      const auth = useAuth();
      authContextValue = auth;
      return null;
    };

    render(
      <BrowserRouter>
        <AuthProvider>
          <AlertProvider>
            <TestComponent />
          </AlertProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify setToken is available and is a function
    expect(authContextValue.setToken).toBeDefined();
    expect(typeof authContextValue.setToken).toBe('function');
    
    // Verify it can be called without error
    expect(() => {
      authContextValue.setToken('test-token');
    }).not.toThrow();
  });
});

