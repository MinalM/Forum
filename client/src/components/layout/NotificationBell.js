import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const POLL_INTERVAL_MS = 60000;

const describeNotification = (notification) => {
  const actorName = notification.actor?.name || 'Someone';
  const postTitle = notification.post?.title || 'a post';
  return notification.type === 'reply'
    ? `${actorName} replied on "${postTitle}"`
    : `${actorName} answered "${postTitle}"`;
};

const NotificationBell = () => {
  const { isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await axios.get('/api/notifications/unread/count');
      setUnreadCount(res.data.data.count);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return undefined;

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, fetchUnreadCount]);

  const openDropdown = async () => {
    setShowDropdown(true);
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data.data);
      await axios.put('/api/notifications/read-all');
      setUnreadCount(0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const toggleDropdown = () => {
    if (showDropdown) {
      setShowDropdown(false);
    } else {
      openDropdown();
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <li className="nav-item notification-bell">
      <button
        type="button"
        className="notification-bell-btn"
        onClick={toggleDropdown}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={showDropdown}
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>
      {showDropdown && (
        <div className="notification-dropdown" role="menu">
          {notifications.length === 0 ? (
            <p className="notification-empty">No notifications yet</p>
          ) : (
            notifications.map((notification) => (
              <Link
                key={notification._id}
                to={`/posts/${notification.post?._id}`}
                className={`notification-item${notification.read ? '' : ' unread'}`}
                onClick={() => setShowDropdown(false)}
              >
                {describeNotification(notification)}
              </Link>
            ))
          )}
        </div>
      )}
    </li>
  );
};

export default NotificationBell;
