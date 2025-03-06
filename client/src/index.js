import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';

// Google OAuth client ID from environment
const googleClientId = '91363676802-sqipb7jo9504rt03pp9tsm865rgkcin4.apps.googleusercontent.com';

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <AlertProvider>
            <App />
          </AlertProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);
