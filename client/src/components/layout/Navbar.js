import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showStaffMenu, setShowStaffMenu] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

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

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    if (showStaffMenu) setShowStaffMenu(false);
  };

  const toggleStaffMenu = () => {
    setShowStaffMenu(!showStaffMenu);
    if (showUserMenu) setShowUserMenu(false);
  };

  const closeMenus = () => {
    setShowUserMenu(false);
    setShowStaffMenu(false);
  };

  const handleLogout = () => {
    closeMenus();
    logout();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    setShowMobileMenu(false);
  };

  const isAdmin = user && hasPermission(user, 'accessAdminDashboard');
  const isModerator = user && hasPermission(user, 'accessModeratorDashboard');
  const isStaff = isAdmin || isModerator;

  const authLinks = (
    <>
      <li className="nav-item">
        <Link className="nav-create-btn" to="/create-post">
          <i className="fas fa-plus"></i> Create
        </Link>
      </li>
      <NotificationBell />
      <li className={`nav-item dropdown ${showUserMenu ? 'show' : ''}`}>
        <button
          type="button"
          className="nav-link dropdown-toggle nav-user-toggle"
          id="userMenuToggle"
          aria-haspopup="true"
          aria-expanded={showUserMenu}
          onClick={toggleUserMenu}
        >
          <i className="fas fa-user-circle"></i>
          <span className="nav-user-name">{user?.name || 'Account'}</span>
        </button>
        {showUserMenu && (
          <div className="dropdown-menu dropdown-menu-end" role="menu" aria-labelledby="userMenuToggle">
            <Link className="dropdown-item" to="/dashboard" onClick={closeMenus}>
              <i className="fas fa-tachometer-alt"></i> Dashboard
            </Link>
            <Link className="dropdown-item" to="/saved-posts" onClick={closeMenus}>
              <i className="fas fa-bookmark"></i> Saved
            </Link>
            <Link className="dropdown-item" to={`/profile/${user?._id}`} onClick={closeMenus}>
              <i className="fas fa-user"></i> Profile
            </Link>
            <a href="#!" className="dropdown-item" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </a>
          </div>
        )}
      </li>

      {/* Staff menu: merges the Admin and Moderator destinations behind one disclosure */}
      {isStaff && (
        <li className={`nav-item dropdown ${showStaffMenu ? 'show' : ''}`}>
          <button
            type="button"
            className="nav-link dropdown-toggle nav-staff-toggle"
            id="staffMenuToggle"
            aria-haspopup="true"
            aria-expanded={showStaffMenu}
            onClick={toggleStaffMenu}
          >
            <i className="fas fa-user-shield"></i> Admin
            {notificationCount > 0 && (
              <span className="notification-badge">{notificationCount}</span>
            )}
          </button>
          {showStaffMenu && (
            <div className="dropdown-menu dropdown-menu-end" role="menu" aria-labelledby="staffMenuToggle">
              {isAdmin && (
                <Link className="dropdown-item" to="/admin/users" onClick={closeMenus}>
                  <i className="fas fa-users-cog"></i> User Management
                </Link>
              )}
              {isAdmin && (
                <Link className="dropdown-item" to="/admin" onClick={closeMenus}>
                  <i className="fas fa-tachometer-alt"></i> Admin Dashboard
                </Link>
              )}
              {isModerator && (
                <Link className="dropdown-item" to="/moderator" onClick={closeMenus}>
                  <i className="fas fa-flag"></i> Reports Dashboard
                </Link>
              )}
            </div>
          )}
        </li>
      )}
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

        <form className="navbar-search" onSubmit={handleSearchSubmit} role="search">
          <input
            type="search"
            className="navbar-search-input"
            placeholder="Search posts..."
            aria-label="Search posts"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {/* type="button" (not "submit"): this form is the only place in the
              app where a bare `button[type="submit"]` selector would be
              ambiguous, since Navbar renders on every page alongside each
              page's own form. Enter still submits via the form's onSubmit -
              a lone text field triggers implicit submission with no default
              button needed. */}
          <button type="button" className="navbar-search-btn" aria-label="Submit search" onClick={handleSearchSubmit}>
            <i className="fas fa-search"></i>
          </button>
        </form>

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
