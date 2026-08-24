import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router';
import axios from 'axios';
import { useAlert } from '../../context/AlertContext';

const POLL_INTERVAL_MS = 60000;

// Bottom tab bar for mobile (<=768px, hidden on desktop via CSS - see
// .mobile-tab-bar in App.css). "Saved" has no backing feature yet (there is
// no bookmarks/saved-posts model in this app), so it surfaces a "coming
// soon" alert instead of a dead link; a real implementation is tracked as
// its own BACKLOG.md item.
const MobileTabBar = () => {
  const location = useLocation();
  const { setAlert } = useAlert();
  const [unansweredCount, setUnansweredCount] = useState(0);

  const fetchUnansweredCount = useCallback(async () => {
    try {
      const res = await axios.get('/api/posts?feed=unanswered&limit=1');
      if (typeof res.data.unansweredCount === 'number') {
        setUnansweredCount(res.data.unansweredCount);
      }
    } catch (err) {
      console.error('Error fetching unanswered count:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchUnansweredCount();
    const interval = setInterval(fetchUnansweredCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchUnansweredCount]);

  const isUnansweredView =
    location.pathname === '/' && new URLSearchParams(location.search).get('feed') === 'unanswered';
  const isFeedActive = location.pathname === '/' && !isUnansweredView;
  const isAskActive = location.pathname === '/create-post';
  const isYouActive = location.pathname === '/dashboard';

  const handleSavedClick = () => {
    setAlert('Saved posts are coming soon', 'info');
  };

  return (
    <nav className="mobile-tab-bar" aria-label="Primary">
      <Link
        to="/"
        className={`mobile-tab-bar-item${isFeedActive ? ' active' : ''}`}
        aria-current={isFeedActive ? 'page' : undefined}
      >
        <i className="fas fa-home"></i>
        <span>Feed</span>
      </Link>

      <Link
        to="/?feed=unanswered"
        className={`mobile-tab-bar-item${isUnansweredView ? ' active' : ''}`}
        aria-current={isUnansweredView ? 'page' : undefined}
      >
        <i className="fas fa-question-circle"></i>
        <span>Answer</span>
        {unansweredCount > 0 && (
          <span className="mobile-tab-bar-badge">{unansweredCount}</span>
        )}
      </Link>

      <Link
        to="/create-post"
        className={`mobile-tab-bar-item mobile-tab-bar-item--ask${isAskActive ? ' active' : ''}`}
        aria-label="Ask a question"
        aria-current={isAskActive ? 'page' : undefined}
      >
        <i className="fas fa-plus"></i>
      </Link>

      <button type="button" className="mobile-tab-bar-item" onClick={handleSavedClick}>
        <i className="fas fa-bookmark"></i>
        <span>Saved</span>
      </button>

      <Link
        to="/dashboard"
        className={`mobile-tab-bar-item${isYouActive ? ' active' : ''}`}
        aria-current={isYouActive ? 'page' : undefined}
      >
        <i className="fas fa-user"></i>
        <span>You</span>
      </Link>
    </nav>
  );
};

export default MobileTabBar;
