import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { setAlert } = useAlert();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setAlert('You must be logged in to access this page', 'danger');
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    setAlert('Access denied. Admin privileges required.', 'danger');
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;