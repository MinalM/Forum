import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { hasPermission, canModifyResource } from '../utils/permissions';
import { renderMarkdown } from '../utils/markdown';
import ReportModal from '../components/reports/ReportModal';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const PostDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  useDocumentTitle(post?.title);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [commentSort, setCommentSort] = useState('helpful');
  const [reportModal, setReportModal] = useState({
    isOpen: false,
    type: 'post',
    itemId: '',
    itemName: ''
  });

  useEffect(() => {
    const fetchPostData = async () => {
      try {
        // Fetch post details
        const postRes = await axios.get(`/api/posts/${id}`);
        setPost(postRes.data.data);

        // Fetch comments for this post
        const commentsRes = await axios.get(`/api/posts/${id}/comments`);
        setComments(commentsRes.data.data);

        setPageLoading(false);
      } catch (err) {
        setAlert('Error fetching post data', 'danger');
        setPageLoading(false);
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
      
      // Refetch post to update comment count in UI
      const postRes = await axios.get(`/api/posts/${id}`);
      setPost(postRes.data.data);
    } catch (err) {
      setAlert('Error adding comment', 'danger');
    }
  };

  const handleUpvote = async () => {
    if (!isAuthenticated || !user) {
      setAlert('Please log in to vote', 'danger');
      return;
    }

    try {
      const res = await axios.put(`/api/posts/${id}/upvote`);
      setPost(res.data.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setAlert('Your session has expired. Please login again.', 'danger');
        navigate('/login');
      } else {
        setAlert('Error upvoting post', 'danger');
      }
    }
  };

  const handleDownvote = async () => {
    if (!isAuthenticated || !user) {
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
        if (err.response?.status === 401) {
          setAlert('Your session has expired. Please login again.', 'danger');
          navigate('/login');
        } else {
          setAlert('Error deleting post', 'danger');
        }
      }
    }
  };

  const handleLockThread = async () => {
    try {
      const res = await axios.put(`/api/posts/${id}/lock`);
      setPost(res.data.data);
      setAlert(
        res.data.data.isLocked
          ? 'Thread locked successfully'
          : 'Thread unlocked successfully',
        'success'
      );
    } catch (err) {
      setAlert('Error updating thread status', 'danger');
    }
  };

  const handlePinThread = async () => {
    try {
      const res = await axios.put(`/api/posts/${id}/pin`);
      setPost(res.data.data);
      setAlert(
        res.data.data.isPinned
          ? 'Thread pinned successfully'
          : 'Thread unpinned successfully',
        'success'
      );
    } catch (err) {
      setAlert('Error updating thread status', 'danger');
    }
  };

  const openReportModal = (type, itemId, itemName) => {
    setReportModal({
      isOpen: true,
      type,
      itemId,
      itemName
    });
  };

  const closeReportModal = () => {
    setReportModal({
      isOpen: false,
      type: 'post',
      itemId: '',
      itemName: ''
    });
  };

  const handleMarkAnswer = async (commentId) => {
    try {
      const res = await axios.put(`/api/comments/${commentId}/answer`);
      const updatedComment = res.data.data;

      setComments(
        comments.map((comment) => {
          if (comment._id === commentId) {
            return { ...comment, isAnswer: updatedComment.isAnswer };
          }
          // Accepting a new answer un-accepts any other on this post.
          return updatedComment.isAnswer
            ? { ...comment, isAnswer: false }
            : comment;
        })
      );
      setPost({ ...post, isSolved: updatedComment.isAnswer });
      setAlert(
        updatedComment.isAnswer ? 'Answer accepted' : 'Answer unaccepted',
        'success'
      );
    } catch (err) {
      setAlert('Error updating answer status', 'danger');
    }
  };

  const handleReplySubmit = async (parentId) => {
    if (!replyText.trim()) {
      setAlert('Reply cannot be empty', 'danger');
      return;
    }

    try {
      const res = await axios.post(`/api/comments/${parentId}/replies`, {
        content: replyText
      });

      setComments([...comments, res.data.data]);
      setReplyText('');
      setReplyingTo(null);
      setAlert('Reply added successfully', 'success');
    } catch (err) {
      setAlert('Error adding reply', 'danger');
    }
  };

  const handleCommentVote = async (commentId, direction) => {
    if (!isAuthenticated || !user) {
      setAlert('Please log in to vote', 'danger');
      return;
    }

    try {
      const res = await axios.put(`/api/comments/${commentId}/${direction}`);
      const { upvotes, downvotes } = res.data.data;
      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment._id === commentId ? { ...comment, upvotes, downvotes } : comment
        )
      );
    } catch (err) {
      if (err.response?.status === 401) {
        setAlert('Your session has expired. Please login again.', 'danger');
        navigate('/login');
      } else {
        setAlert(
          `Error ${direction === 'upvote' ? 'upvoting' : 'downvoting'} answer`,
          'danger'
        );
      }
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await axios.delete(`/api/comments/${commentId}`);
        setComments(comments.filter(comment => comment._id !== commentId));
        setAlert('Comment deleted successfully', 'success');
      } catch (err) {
        setAlert('Error deleting comment', 'danger');
      }
    }
  };

  if (pageLoading || authLoading) {
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
  const canMarkAnswer = isAuthor || hasPermission(user, 'markAnswer');
  const formattedDate = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true
  });
  const voteCount = post.upvotes.length - post.downvotes.length;
  const hasUpvoted = user && post.upvotes.includes(user._id);
  const hasDownvoted = user && post.downvotes.includes(user._id);

  const getCommentVoteCount = (comment) =>
    (comment.upvotes?.length || 0) - (comment.downvotes?.length || 0);

  const sortTopLevelComments = (list, sortMode) => {
    const sorted = [...list].sort((a, b) => {
      if (sortMode === 'helpful') {
        const voteDiff = getCommentVoteCount(b) - getCommentVoteCount(a);
        if (voteDiff !== 0) return voteDiff;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // The accepted answer stays pinned first regardless of sort order.
    const acceptedIndex = sorted.findIndex((comment) => comment.isAnswer);
    if (acceptedIndex > 0) {
      const [accepted] = sorted.splice(acceptedIndex, 1);
      sorted.unshift(accepted);
    }
    return sorted;
  };

  const topLevelComments = sortTopLevelComments(
    comments.filter((comment) => !comment.parentComment),
    commentSort
  );
  const repliesByParent = comments.reduce((acc, comment) => {
    if (comment.parentComment) {
      const key = comment.parentComment;
      acc[key] = acc[key] || [];
      acc[key].push(comment);
    }
    return acc;
  }, {});

  return (
    <div className="main-content">
      <div className="post-detail">
        <div className="post-header">
          <h1 className="post-title">
            {post.title}
            {post.isPinned && (
              <span className="badge badge-info ml-2">Pinned</span>
            )}
            {post.isLocked && (
              <span className="badge badge-warning ml-2">Locked</span>
            )}
          </h1>
          <div className="post-status-badges">
            {post.isSolved ? (
              <span className="badge badge-success">Solved</span>
            ) : (
              <span className="badge badge-warning">Needs an answer</span>
            )}
          </div>
          <div className="post-meta">
            <div className="post-meta-item">
              <i className="fas fa-user"></i>{' '}
              {post.user ? (
                <Link to={`/profile/${post.user._id}`}>{post.user.name}</Link>
              ) : (
                <span>Deleted user</span>
              )}
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

        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

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

          {/* Moderation tools */}
          {hasPermission(user, 'lockThread') && (
            <button 
              className={`btn btn-sm ${post.isLocked ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={handleLockThread}
            >
              <i className={`fas fa-${post.isLocked ? 'lock' : 'unlock'}`}></i>{' '}
              {post.isLocked ? 'Unlock' : 'Lock'}
            </button>
          )}

          {hasPermission(user, 'pinPost') && (
            <button 
              className={`btn btn-sm ${post.isPinned ? 'btn-info' : 'btn-outline-info'}`}
              onClick={handlePinThread}
            >
              <i className="fas fa-thumbtack"></i>{' '}
              {post.isPinned ? 'Unpin' : 'Pin'}
            </button>
          )}

          {/* Report button */}
          {isAuthenticated && !isAuthor && (
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => openReportModal('post', post._id, post.title)}
            >
              <i className="fas fa-flag"></i> Report
            </button>
          )}
        </div>
      </div>

      <div className="comments-section">
        <h2>
          Comments ({comments.length})
        </h2>

        {isAuthenticated && !post.isLocked ? (
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
        ) : post.isLocked ? (
          <div className="alert alert-warning">
            This thread is locked. New comments are disabled.
          </div>
        ) : (
          <div className="alert alert-info">
            <Link to="/login">Login</Link> or{' '}
            <Link to="/register">Register</Link> to join the discussion
          </div>
        )}

        {topLevelComments.length > 0 && (
          <div className="comment-sort-toggle" role="group" aria-label="Sort answers">
            <button
              type="button"
              className={`sort-toggle-btn${commentSort === 'helpful' ? ' active' : ''}`}
              onClick={() => setCommentSort('helpful')}
            >
              Most helpful
            </button>
            <button
              type="button"
              className={`sort-toggle-btn${commentSort === 'newest' ? ' active' : ''}`}
              onClick={() => setCommentSort('newest')}
            >
              Newest
            </button>
          </div>
        )}

        <div className="comments-list">
          {topLevelComments.length > 0 ? (
            topLevelComments.map((comment) => (
              <div
                key={comment._id}
                className={`comment${comment.isAnswer ? ' comment--accepted' : ''}`}
              >
                <div className="comment-header">
                  <div className="comment-user">
                    <img
                      src={comment.user?.avatar || '/images/default-avatar1.png'}
                      alt={comment.user?.name || 'User'}
                      className="comment-avatar"
                    />
                    <div>
                      <Link to={`/profile/${comment.user?._id}`} className="comment-username">
                        {comment.user?.name || 'Anonymous'}
                      </Link>
                      <div className="comment-meta">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="comment-actions">
                    {comment.isAnswer && (
                      <span className="badge badge-success">Answer</span>
                    )}
                    {canMarkAnswer && (
                      <button
                        className="accept-answer-btn"
                        onClick={() => handleMarkAnswer(comment._id)}
                      >
                        <i className={`fas fa-check${comment.isAnswer ? '' : '-circle'}`}></i>{' '}
                        {comment.isAnswer ? 'Unaccept' : 'Accept this answer'}
                      </button>
                    )}
                    {(canModifyResource(user, comment) || hasPermission(user, 'deleteComment')) && (
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteComment(comment._id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                    {isAuthenticated && user._id !== comment.user?._id && (
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => openReportModal('comment', comment._id, `Comment by ${comment.user?.name}`)}
                      >
                        <i className="fas fa-flag"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="comment-vote-row">
                  <div className="vote-buttons">
                    <button
                      className={`vote-btn upvote${comment.upvotes?.includes(user?._id) ? ' active' : ''}`}
                      onClick={() => handleCommentVote(comment._id, 'upvote')}
                      disabled={!isAuthenticated}
                      aria-label="Upvote answer"
                    >
                      <i className="fas fa-arrow-up"></i>
                    </button>
                    <span className="vote-count" data-testid={`comment-vote-count-${comment._id}`}>
                      {getCommentVoteCount(comment)}
                    </span>
                    <button
                      className={`vote-btn downvote${comment.downvotes?.includes(user?._id) ? ' active' : ''}`}
                      onClick={() => handleCommentVote(comment._id, 'downvote')}
                      disabled={!isAuthenticated}
                      aria-label="Downvote answer"
                    >
                      <i className="fas fa-arrow-down"></i>
                    </button>
                  </div>
                </div>
                {comment.isAnswer && (
                  <div className="comment-accepted-note">
                    <i className="fas fa-check-circle"></i>{' '}
                    Accepted by {post.user?.name || 'the asker'}
                  </div>
                )}
                <div
                  className="comment-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.content) }}
                />

                {isAuthenticated && !post.isLocked && (
                  <div className="comment-footer">
                    <button
                      type="button"
                      className="reply-btn"
                      onClick={() =>
                        setReplyingTo(replyingTo === comment._id ? null : comment._id)
                      }
                    >
                      Reply
                    </button>
                  </div>
                )}

                {replyingTo === comment._id && (
                  <div className="comment-form">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleReplySubmit(comment._id);
                      }}
                    >
                      <div className="form-group">
                        <textarea
                          className="form-control"
                          name="reply"
                          rows="2"
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          required
                        ></textarea>
                      </div>
                      <button type="submit" className="reply-btn">
                        Post reply
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyText('');
                        }}
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                )}

                {repliesByParent[comment._id]?.length > 0 && (
                  <div className="comment-replies" data-testid="comment-replies">
                    {repliesByParent[comment._id].map((reply) => (
                      <div key={reply._id} className="comment">
                        <div className="comment-header">
                          <div className="comment-user">
                            <img
                              src={reply.user?.avatar || '/images/default-avatar1.png'}
                              alt={reply.user?.name || 'User'}
                              className="comment-avatar"
                            />
                            <div>
                              <Link to={`/profile/${reply.user?._id}`} className="comment-username">
                                {reply.user?.name || 'Anonymous'}
                              </Link>
                              {post.user && reply.user?._id === post.user._id && (
                                <span className="badge badge-info ml-2">Asker</span>
                              )}
                              <div className="comment-meta">
                                {formatDistanceToNow(new Date(reply.createdAt), {
                                  addSuffix: true
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="comment-actions">
                            {(canModifyResource(user, reply) || hasPermission(user, 'deleteComment')) && (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteComment(reply._id)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                            {isAuthenticated && user._id !== reply.user?._id && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => openReportModal('comment', reply._id, `Comment by ${reply.user?.name}`)}
                              >
                                <i className="fas fa-flag"></i>
                              </button>
                            )}
                          </div>
                        </div>
                        <div
                          className="comment-content"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(reply.content) }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>No comments yet. Be the first to comment!</p>
          )}
        </div>
      </div>

      {/* Report modal */}
      <ReportModal
        isOpen={reportModal.isOpen}
        onClose={closeReportModal}
        type={reportModal.type}
        itemId={reportModal.itemId}
        itemName={reportModal.itemName}
      />
    </div>
  );
};

export default PostDetail;
