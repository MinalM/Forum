import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set axios default headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await axios.get('/api/users/me');
          setUser(res.data.data);
          setIsAuthenticated(true);
        } catch (err) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setError('Authentication error. Please login again.');
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // Register user
  const register = async (formData) => {
    try {
      const res = await axios.post('/api/users/register', formData);
      
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setError(null);
      
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/users/login', { email, password });
      
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setError(null);
      
      return true;
    } catch (err) {
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
      
      // Handle token response (server now returns a token instead of user data)
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
      setError(err.response?.data?.error || 'Failed to update profile');
      return false;
    }
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
