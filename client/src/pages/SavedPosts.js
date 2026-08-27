import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import { useAlert } from '../context/AlertContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SavedPosts = () => {
  useDocumentTitle('Saved posts');
  const { setAlert } = useAlert();
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedPosts = async () => {
      try {
        const res = await axios.get('/api/saved-posts');
        setSavedPosts(res.data.data);
      } catch (err) {
        setAlert('Error fetching saved posts', 'danger');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPosts();
  }, [setAlert]);

  const handleUnsave = async (postId) => {
    const previous = savedPosts;
    setSavedPosts(savedPosts.filter((saved) => saved.post?._id !== postId));

    try {
      await axios.delete(`/api/posts/${postId}/save`);
    } catch (err) {
      setSavedPosts(previous);
      setAlert('Error unsaving post', 'danger');
    }
  };

  const voteCount = (post) =>
    (post.upvotes?.length || 0) - (post.downvotes?.length || 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="category-header">
        <div className="category-info">
          <h1>Saved posts</h1>
        </div>
      </div>

      {savedPosts.length > 0 ? (
        <div className="saved-posts-list">
          {savedPosts
            .filter((saved) => saved.post)
            .map((saved) => (
              <div key={saved._id} className="card saved-post-item">
                <div className="card-body saved-post-item-body">
                  <div className="saved-post-item-main">
                    <h3 className="post-title">
                      <Link to={`/posts/${saved.post._id}`}>{saved.post.title}</Link>
                    </h3>
                    <div className="post-status-badges">
                      {saved.post.isSolved ? (
                        <span className="badge badge-success">Solved</span>
                      ) : saved.post.commentCount === 0 ? (
                        <span className="badge badge-warning">Needs an answer</span>
                      ) : null}
                    </div>
                    <div className="post-meta">
                      <div className="post-meta-item">
                        <i className="fas fa-arrow-up"></i> {voteCount(saved.post)}
                      </div>
                      <div className="post-meta-item">
                        <i className="fas fa-comment"></i> {saved.post.commentCount || 0}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="save-toggle-detail-btn active"
                    onClick={() => handleUnsave(saved.post._id)}
                    aria-label={`Unsave ${saved.post.title}`}
                  >
                    <i className="fas fa-bookmark"></i> Unsave
                  </button>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>You haven&rsquo;t saved any posts yet.</p>
        </div>
      )}
    </div>
  );
};

export default SavedPosts;
