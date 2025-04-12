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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      
      try {
        const res = await axios.get('/api/users/me');
        setUser(res.data.data);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Error loading user:', err);
        // Clear auth state on 401 errors
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setError('Session expired. Please login again.');
        } else {
          setError('Authentication error. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    // Set up axios interceptor for 401 errors
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
        return Promise.reject(error);
      }
    );

    loadUser();

    // Cleanup interceptor
    return () => axios.interceptors.response.eject(interceptor);
  }, [token]);

  // Register user
  const register = async (formData) => {
    try {
      const res = await axios.post('/api/users/register', formData);
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      
      // User data will be loaded by the useEffect
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
      
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      
      // User data will be loaded by the useEffect
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
    
    localStorage.removeItem('token');
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
      }
      
      // Fetch updated user data
      const userRes = await axios.get('/api/users/me');
      setUser(userRes.data.data);
      
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
      const res = await axios.put('/api/users/updatepassword', { 
        currentPassword, 
        newPassword 
      });
      
      // Handle token response if provided
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
      }
      
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
