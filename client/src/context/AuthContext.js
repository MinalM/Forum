import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

const AuthContext = createContext();

// Configure axios defaults
axios.defaults.withCredentials = config.withCredentials;
axios.defaults.baseURL = config.apiUrl;

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Remove setting Authorization header since we're using httpOnly cookies

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await axios.get('/api/users/me');
        setUser(res.data.data);
        setIsAuthenticated(true);
        setLoading(false);
      } catch (err) {
        console.error('Error loading user:', err);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setError('Authentication error. Please login again.');
        setLoading(false);
      }
    };

    if (token) {
      loadUser();
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, [token]);

  // Register user
  const register = async (formData) => {
    try {
      const res = await axios.post('/api/users/register', formData);
      setToken(res.data.token);
      
      // Immediately fetch user data after registration
      const userRes = await axios.get('/api/users/me');
      setUser(userRes.data.data);
      setIsAuthenticated(true);
      setError(null);
      
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email, apiUrl: config.apiUrl });
      const res = await axios.post('/api/users/login', { email, password });
      console.log('Login response:', res.data);
      
      setToken(res.data.token);
      
      // Immediately fetch user data after login
      const userRes = await axios.get('/api/users/me');
      setUser(userRes.data.data);
      setIsAuthenticated(true);
      setError(null);
      
      return true;
    } catch (err) {
      console.error('Login error:', err.response || err);
      setError(err.response?.data?.error || 'Invalid credentials');
      return false;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await axios.get('/api/users/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Update user profile
  const updateProfile = async (formData) => {
    try {
      const res = await axios.put('/api/users/updatedetails', formData);
      
      // Handle token response
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        
        // Fetch updated user data
        const userRes = await axios.get('/api/users/me');
        setUser(userRes.data.data);
      } else {
        // Fallback to old behavior if token is not returned
        setUser(res.data.data);
      }
      
      setError(null);
      return true;
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err.response?.data?.error || 'Failed to update profile');
      return false;
    }
  };

  // Google login
  const googleLogin = () => {
    window.location.href = `${config.apiUrl}/api/users/auth/google`;
  };

  // Update password
  const updatePassword = async (currentPassword, newPassword) => {
    try {
      await axios.put('/api/users/updatepassword', { 
        currentPassword, 
        newPassword 
      });
      setError(null);
      return true;
    } catch (err) {
      console.error('Update password error:', err);
      setError(err.response?.data?.error || 'Failed to update password');
      return false;
    }
  };

  // Clear errors
  const clearErrors = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        setToken,
        isAuthenticated,
        loading,
        error,
        register,
        login,
        logout,
        googleLogin,
        updateProfile,
        updatePassword,
        clearErrors
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
