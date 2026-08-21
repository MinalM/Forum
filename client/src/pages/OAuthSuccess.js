import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import axios from 'axios';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAlert } = useAlert();
  const auth = useAuth();
  const { setToken } = auth || {};
  useDocumentTitle('Signing In');
  
  useEffect(() => {
    const handleOAuthSuccess = async () => {
      try {
        // Get token from URL query params
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        
        if (token) {
          // Store token in localStorage
          localStorage.setItem('token', token);
          
          // Update token in AuthContext if setToken is available
          if (setToken && typeof setToken === 'function') {
            setToken(token);
          } else {
            console.warn('setToken not available in AuthContext. Token saved to localStorage only.');
            // Force page reload to pick up token from localStorage
            window.location.href = '/dashboard';
            return;
          }
          
          // Set the token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Fetch user data to ensure it's loaded
          try {
            await axios.get('/api/users/me');
          } catch (err) {
            console.error('Error fetching user data:', err);
          }
          
          // Show success message
          setAlert('Successfully logged in with Google!', 'success');
          
          // Redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard');
          }, 500); // Small delay to ensure token is processed
        } else {
          // If no token, show error and redirect to login
          setAlert('Authentication failed. Please try again.', 'danger');
          navigate('/login');
        }
      } catch (err) {
        console.error('OAuth success error:', err);
        setAlert('Authentication error. Please try again.', 'danger');
        navigate('/login');
      }
    };
    
    handleOAuthSuccess();
  }, [location, navigate, setAlert, setToken]);
  
  return (
    <div className="main-content">
      <div className="text-center">
        <h2>Processing your login...</h2>
        <p>Please wait while we complete your authentication.</p>
        <div className="spinner"></div>
      </div>
    </div>
  );
};

export default OAuthSuccess;
