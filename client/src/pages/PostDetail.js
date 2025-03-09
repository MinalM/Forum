import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

const PostDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPostData = async () => {
      try {
        // Fetch post details
        const postRes = await axios.get(`/api/posts/${id}`);
        setPost(postRes.data.data);

        // Fetch comments for this post
        const commentsRes = await axios.get(`/api/posts/${id}/comments`);
        setComments(commentsRes.data.data);

        setLoading(false);
      } catch (err) {
        setAlert('Error fetching post data', 'danger');
        setLoading(false);
      }
    };

    fetchPostData();
  }, [id, setAlert]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!commentText.trim()) {
      setAlert('Comment cannot be empty', 'danger');
      return;
    }

    try {
      const res = await axios.post(`/api/posts/${id}/comments`, {
        content: commentText
      });

      // Add the new comment to the comments array
      setComments([...comments, res.data.data]);
      setCommentText('');
      setAlert('Comment added successfully', 'success');
    } catch (err) {
      setAlert('Error adding comment', 'danger');
    }
  };

  const handleUpvote = async () => {
    if (!isAuthenticated) {
      setAlert('Please log in to vote', 'danger');
      return;
    }

    try {
      const res = await axios.put(`/api/posts/${id}/upvote`);
      setPost(res.data.data);
    } catch (err) {
      setAlert('Error upvoting post', 'danger');
    }
  };

  const handleDownvote = async () => {
    if (!isAuthenticated) {
      setAlert('Please log in to vote', 'danger');
      return;
    }

    try {
      const res = await axios.put(`/api/posts/${id}/downvote`);
      setPost(res.data.data);
    } catch (err) {
      setAlert('Error downvoting post', 'danger');
    }
  };

  const handleSolve = async () => {
    try {
      const res = await axios.put(`/api/posts/${id}/solve`);
      setPost(res.data.data);
      setAlert(
        res.data.data.isSolved
          ? 'Post marked as solved'
          : 'Post marked as unsolved',
        'success'
      );
    } catch (err) {
      setAlert('Error updating post status', 'danger');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await axios.delete(`/api/posts/${id}`);
        setAlert('Post deleted successfully', 'success');
        navigate('/');
      } catch (err) {
        setAlert('Error deleting post', 'danger');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="main-content">
        <div className="alert alert-danger">Post not found</div>
      </div>
    );
  }

  const isAuthor = user && post.user && user._id === post.user._id;
  const isAdmin = user && user.role === 'admin';
  const canEdit = isAuthor || isAdmin;
  const formattedDate = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true
  });
  const voteCount = post.upvotes.length - post.downvotes.length;
  const hasUpvoted = user && post.upvotes.includes(user._id);
  const hasDownvoted = user && post.downvotes.includes(user._id);

  return (
    <div className="main-content">
      <div className="post-detail">
        <div className="post-header">
          <h1 className="post-title">
            {post.title}
            {post.isSolved && (
              <span className="badge badge-success ml-2">Solved</span>
            )}
          </h1>
          <div className="post-meta">
            <div className="post-meta-item">
              <i className="fas fa-user"></i>{' '}
              <Link to={`/profile/${post.user._id}`}>{post.user.name}</Link>
            </div>
            <div className="post-meta-item">
              <i className="fas fa-folder"></i>{' '}
              <Link to={`/categories/${post.category._id}`}>
                {post.category.name}
              </Link>
            </div>
            <div className="post-meta-item">
              <i className="fas fa-clock"></i> {formattedDate}
            </div>
            <div className="post-meta-item">
              <i className="fas fa-eye"></i> {post.views} views
            </div>
          </div>
        </div>

        <div className="post-content">{post.content}</div>

        <div className="post-tags">
          {post.tags &&
            post.tags.map((tag, index) => (
              <span key={index} className="badge badge-primary">
                {tag}
              </span>
            ))}
        </div>

        <div className="post-actions">
          <div className="vote-buttons">
            <button
              className={`vote-btn upvote ${hasUpvoted ? 'active' : ''}`}
              onClick={handleUpvote}
              disabled={!isAuthenticated}
            >
              <i className="fas fa-arrow-up"></i>
            </button>
            <span className="vote-count">{voteCount}</span>
            <button
              className={`vote-btn downvote ${hasDownvoted ? 'active' : ''}`}
              onClick={handleDownvote}
              disabled={!isAuthenticated}
            >
              <i className="fas fa-arrow-down"></i>
            </button>
          </div>

          {isAuthor && (
            <button
              className={`btn btn-sm ${post.isSolved ? 'btn-success' : 'btn-secondary'}`}
              onClick={handleSolve}
            >
              <i className={`fas fa-${post.isSolved ? 'check-circle' : 'question-circle'}`}></i>{' '}
              {post.isSolved ? 'Solved' : 'Mark as Solved'}
            </button>
          )}

          {canEdit && (
            <>
              <Link to={`/edit-post/${post._id}`} className="btn btn-sm">
                <i className="fas fa-edit"></i> Edit
              </Link>
              <button className="btn btn-sm btn-danger" onClick={handleDelete}>
                <i className="fas fa-trash"></i> Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="comments-section">
        <h2>
          Comments ({comments.length})
        </h2>

        {isAuthenticated ? (
          <div className="comment-form">
            <form onSubmit={handleCommentSubmit}>
              <div className="form-group">
                <textarea
                  className="form-control"
                  name="comment"
                  rows="3"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn">
                Post Comment
              </button>
            </form>
          </div>
        ) : (
          <div className="alert alert-info">
            <Link to="/login">Login</Link> or{' '}
            <Link to="/register">Register</Link> to join the discussion
          </div>
        )}

        <div className="comments-list">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment._id} className="comment">
                <div className="comment-header">
                  <div className="comment-user">
                    <img
                      src={comment.user.avatar || 'https://via.placeholder.com/40'}
                      alt={comment.user.name}
                      className="comment-avatar"
                    />
                    <div>
                      <Link to={`/profile/${comment.user._id}`} className="comment-username">
                        {comment.user.name}
                      </Link>
                      <div className="comment-meta">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true
                        })}
                      </div>
                    </div>
                  </div>
                  {comment.isAnswer && (
                    <span className="badge badge-success">Answer</span>
                  )}
                </div>
                <div className="comment-content">{comment.content}</div>
              </div>
            ))
          ) : (
            <p>No comments yet. Be the first to comment!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
