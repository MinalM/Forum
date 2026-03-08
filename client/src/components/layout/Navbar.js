import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showModDropdown, setShowModDropdown] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch pending reports count for moderators and admins
  useEffect(() => {
    const fetchPendingReportsCount = async () => {
      if (!isAuthenticated || !user) return;

      if (!hasPermission(user, 'viewReports')) return;

      try {
        const res = await axios.get('/api/reports/pending/count');
        setNotificationCount(res.data.data.count);
      } catch (error) {
        console.error('Error fetching pending reports count:', error);
      }
    };

    fetchPendingReportsCount();

    // Set up an interval to check for new reports every 2 minutes
    const interval = setInterval(fetchPendingReportsCount, 120000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const toggleAdminDropdown = (e) => {
    e.preventDefault();
    setShowAdminDropdown(!showAdminDropdown);
    // Close the other dropdown if open
    if (showModDropdown) setShowModDropdown(false);
  };

  const toggleModDropdown = (e) => {
    e.preventDefault();
    setShowModDropdown(!showModDropdown);
    // Close the other dropdown if open
    if (showAdminDropdown) setShowAdminDropdown(false);
  };

  const handleLogout = () => {
    logout();
  };

  const authLinks = (
    <>
      <li className="nav-item">
        <Link className="nav-link" to="/dashboard">Dashboard</Link>
      </li>
      <li className="nav-item">
        <Link className="nav-link" to="/create-post">
          Create Post
        </Link>
      </li>
      {/* Admin dropdown menu */}
      {user && hasPermission(user, 'accessAdminDashboard') && (
        <li className={`nav-item dropdown ${showAdminDropdown ? 'show' : ''}`}>
          <a
            className="nav-link dropdown-toggle"
            href="#"
            id="adminDropdown"
            onClick={toggleAdminDropdown}
          >
            <i className="fas fa-user-shield"></i> Admin
          </a>
          <div className={`dropdown-menu ${showAdminDropdown ? 'show' : ''}`} aria-labelledby="adminDropdown">
            <Link
              className="dropdown-item"
              to="/admin/users"
              onClick={() => setShowAdminDropdown(false)}
            >
              <i className="fas fa-users-cog"></i> User Management
            </Link>
            <Link
              className="dropdown-item"
              to="/admin"
              onClick={() => setShowAdminDropdown(false)}
            >
              <i className="fas fa-tachometer-alt"></i> Admin Dashboard
            </Link>
          </div>
        </li>
      )}

      {/* Moderator dropdown menu */}
      {user && hasPermission(user, 'accessModeratorDashboard') && !hasPermission(user, 'admin') && (
        <li className={`nav-item dropdown ${showModDropdown ? 'show' : ''}`}>
          <a
            className="nav-link dropdown-toggle"
            href="#"
            id="modDropdown"
            onClick={toggleModDropdown}
          >
            <i className="fas fa-user-cog"></i> Moderator
            {notificationCount > 0 && (
              <span className="notification-badge">{notificationCount}</span>
            )}
          </a>
          <div className={`dropdown-menu ${showModDropdown ? 'show' : ''}`} aria-labelledby="modDropdown">
            <Link
              className="dropdown-item"
              to="/moderator"
              onClick={() => setShowModDropdown(false)}
            >
              <i className="fas fa-flag"></i> Reports Dashboard
            </Link>
          </div>
        </li>
      )}

      <li className="nav-item">
        <Link className="nav-link" to={`/profile/${user?._id}`}>Profile</Link>
      </li>
      <li className="nav-item">
        <a href="#!" className="nav-link" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </a>
      </li>
    </>
  );

  const guestLinks = (
    <>
      <li className="nav-item">
        <Link className="nav-link" to="/register">Register</Link>
      </li>
      <li className="nav-item">
        <Link className="nav-link" to="/login">Login</Link>
      </li>
    </>
  );

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          <i className="fas fa-brain"></i> AI/ML Career Forum
        </Link>

        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          <i className={`fas ${showMobileMenu ? 'fa-times' : 'fa-bars'}`}></i>
        </button>

        <ul className={`navbar-nav ${showMobileMenu ? 'show' : ''}`}>
          <li className="nav-item">
            <Link className="nav-link" to="/">Home</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/categories">Categories</Link>
          </li>
          {isAuthenticated ? authLinks : guestLinks}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
