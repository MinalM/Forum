import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { AlertProvider } from '../../context/AlertContext';

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

