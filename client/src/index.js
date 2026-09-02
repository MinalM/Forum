import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { StatsigProvider } from '@statsig/react-bindings';

// Google OAuth client ID from environment
const googleClientId = '91363676802-sqipb7jo9504rt03pp9tsm865rgkcin4.apps.googleusercontent.com';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <AlertProvider>
              <StatsigProvider
                sdkKey={import.meta.env.REACT_APP_STATSIG_CLIENT_KEY || ''}
                user={{ userID: 'anonymous' }}
                waitForInitialization={false}
              >
                <App />
              </StatsigProvider>
            </AlertProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
