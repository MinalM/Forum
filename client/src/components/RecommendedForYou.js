import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// The "You can answer these" right-rail card (BACKLOG.md item 11/12) -
// unanswered questions ranked against the member's targetRole/skills/
// aiMlExperience by GET /api/posts/recommended (server/utils/feedRanking.js).
// Personalization-only: nothing to rank for a signed-out visitor, so the
// card doesn't render at all rather than showing a generic list.
const RecommendedForYou = () => {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    setLoading(true);

    axios
      .get('/api/posts/recommended')
      .then(res => {
        if (cancelled) return;
        setPosts(res.data.data || []);
      })
      .catch(() => {
        if (cancelled) return;
        setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <div className="recommended-for-you">
      <h2 className="mb-4">You can answer these</h2>
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : posts.length > 0 ? (
        <ul className="recommended-for-you-list">
          {posts.map(post => (
            <li key={post._id} className="recommended-for-you-item">
              <Link to={`/posts/${post._id}`}>
                <span className="recommended-for-you-title">{post.title}</span>
                {post.category && post.category.name && (
                  <span className="recommended-for-you-meta">{post.category.name}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="recommended-for-you-empty">
          Nothing matches your skills right now. Browse{' '}
          <Link to="/categories">all unanswered questions</Link> instead.
        </p>
      )}
    </div>
  );
};

export default RecommendedForYou;
