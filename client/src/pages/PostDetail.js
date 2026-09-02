import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { hasPermission, canModifyResource } from '../utils/permissions';
import { renderMarkdown, markdownToPlainText } from '../utils/markdown';
import { getPostStatus } from '../utils/postStatus';
import { getAvatarUrl } from '../utils/avatar';
import ReportModal from '../components/reports/ReportModal';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Seo, { truncateDescription } from '../components/common/Seo';

const PostDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  useDocumentTitle(notFound ? 'Post Not Found' : post?.title);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [commentSort, setCommentSort] = useState('helpful');
  const [subscribed, setSubscribed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
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
        setNotFound(false);

        // Fetch comments for this post
        const commentsRes = await axios.get(`/api/posts/${id}/comments`);
        setComments(commentsRes.data.data);

        setPageLoading(false);
      } catch (err) {
        setPost(null);
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setAlert('Error fetching post data', 'danger');
        }
        setPageLoading(false);
      }
    };

    fetchPostData();
  }, [id, setAlert]);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const res = await axios.get(`/api/posts/${id}/subscribe`);
        setSubscribed(res.data.data.subscribed);
      } catch (err) {
        // Non-fatal - the toggle just starts in the unsubscribed state.
      }
    };

    fetchSubscriptionStatus();
  }, [id, isAuthenticated, user]);

  const handleToggleSubscribe = async () => {
    if (!isAuthenticated || !user) {
      setAlert('Please log in to get notified', 'danger');
      return;
    }

    try {
      const res = subscribed
        ? await axios.delete(`/api/posts/${id}/subscribe`)
        : await axios.post(`/api/posts/${id}/subscribe`);
      setSubscribed(res.data.data.subscribed);
    } catch (err) {
      setAlert('Error updating notification preference', 'danger');
    }
  };

  useEffect(() => {
    const fetchSaveStatus = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const res = await axios.get(`/api/posts/${id}/save`);
        setSaved(res.data.data.saved);
      } catch (err) {
        // Non-fatal - the toggle just starts in the unsaved state.
      }
    };

    fetchSaveStatus();
  }, [id, isAuthenticated, user]);

  const handleToggleSave = async () => {
    if (!isAuthenticated || !user) {
      setAlert('Please log in to save posts', 'danger');
      return;
    }

    try {
      const res = saved
        ? await axios.delete(`/api/posts/${id}/save`)
        : await axios.post(`/api/posts/${id}/save`);
      setSaved(res.data.data.saved);
    } catch (err) {
      setAlert(`Error ${saved ? 'unsaving' : 'saving'} post`, 'danger');
    }
  };

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

  const closeMoreActions = () => setShowMoreActions(false);

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
    if (notFound) {
      return (
        <div className="main-content">
          <div className="not-found">
            <div className="not-found-content">
              <h1>Post Not Found</h1>
              <p>
                This post may have been removed, or the link you followed
                may be out of date.
              </p>
              <Link to="/" className="btn">
                <i className="fas fa-arrow-left"></i> Back to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

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
  const canLock = hasPermission(user, 'lockThread');
  const canPin = hasPermission(user, 'pinPost');
  const canReport = isAuthenticated && !isAuthor;
  const hasOverflowActions = canEdit || canLock || canPin || canReport;
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

  const postStatus = getPostStatus({
    isSolved: post.isSolved,
    commentCount: comments.length,
    isLocked: post.isLocked
  });

  return (
    <div className="main-content">
      <Seo
        title={post.title}
        description={truncateDescription(markdownToPlainText(post.content))}
        path={`/posts/${post._id}`}
        type="article"
      />
      <div className="post-detail">
        <div className="post-header">
          <div className="post-title-row">
            <h1 className="post-title">{post.title}</h1>
            <div className="post-status-badges">
              {post.isPinned && <span className="badge badge-info">Pinned</span>}
              {post.isLocked && <span className="badge badge-warning">Locked</span>}
              {postStatus === 'solved' && (
                <span className="badge badge-success">Solved</span>
              )}
              {postStatus === 'needs-answer' && (
                <span className="badge badge-warning">Needs an answer</span>
              )}
            </div>
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
          <div className="post-actions-primary">
            <div className="vote-buttons">
              <button
                className={`vote-btn upvote ${hasUpvoted ? 'active' : ''}`}
                onClick={handleUpvote}
                disabled={!isAuthenticated}
                aria-label="Upvote question"
              >
                <i className="fas fa-arrow-up"></i>
              </button>
              <span className="vote-count">{voteCount}</span>
              <button
                className={`vote-btn downvote ${hasDownvoted ? 'active' : ''}`}
                onClick={handleDownvote}
                disabled={!isAuthenticated}
                aria-label="Downvote question"
              >
                <i className="fas fa-arrow-down"></i>
              </button>
            </div>

            {isAuthenticated && (
              <button
                type="button"
                className={`subscribe-toggle-btn${subscribed ? ' active' : ''}`}
                onClick={handleToggleSubscribe}
              >
                <i className={`fas fa-bell${subscribed ? '' : '-slash'}`}></i>{' '}
                {subscribed ? 'Notified' : 'Notify me of answers'}
              </button>
            )}

            {isAuthenticated && (
              <button
                type="button"
                className={`save-toggle-detail-btn${saved ? ' active' : ''}`}
                onClick={handleToggleSave}
              >
                <i className="fas fa-bookmark"></i> {saved ? 'Saved' : 'Save'}
              </button>
            )}
          </div>

          {/* Author/moderator controls collapse behind one quiet toggle -
              a reader only ever needs vote/Save/Notify, and these are used
              at most once per post. */}
          {hasOverflowActions && (
            <div className={`post-actions-overflow${showMoreActions ? ' show' : ''}`}>
              <button
                type="button"
                id="postActionsMoreToggle"
                className="post-actions-overflow-toggle"
                aria-haspopup="true"
                aria-expanded={showMoreActions}
                aria-label="More actions"
                onClick={() => setShowMoreActions(!showMoreActions)}
              >
                <i className="fas fa-ellipsis-h"></i>
              </button>
              {showMoreActions && (
                <div
                  className="post-actions-overflow-menu"
                  role="menu"
                  aria-labelledby="postActionsMoreToggle"
                >
                  {canEdit && (
                    <>
                      <Link
                        to={`/edit-post/${post._id}`}
                        className="post-actions-overflow-item"
                        onClick={closeMoreActions}
                      >
                        <i className="fas fa-edit"></i> Edit
                      </Link>
                      <button
                        type="button"
                        className="post-actions-overflow-item"
                        onClick={() => {
                          closeMoreActions();
                          handleDelete();
                        }}
                      >
                        <i className="fas fa-trash"></i> Delete
                      </button>
                    </>
                  )}

                  {canLock && (
                    <button
                      type="button"
                      className="post-actions-overflow-item"
                      onClick={() => {
                        closeMoreActions();
                        handleLockThread();
                      }}
                    >
                      <i className={`fas fa-${post.isLocked ? 'lock' : 'unlock'}`}></i>{' '}
                      {post.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                  )}

                  {canPin && (
                    <button
                      type="button"
                      className="post-actions-overflow-item"
                      onClick={() => {
                        closeMoreActions();
                        handlePinThread();
                      }}
                    >
                      <i className="fas fa-thumbtack"></i>{' '}
                      {post.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}

                  {canReport && (
                    <button
                      type="button"
                      className="post-actions-overflow-item"
                      onClick={() => {
                        closeMoreActions();
                        openReportModal('post', post._id, post.title);
                      }}
                    >
                      <i className="fas fa-flag"></i> Report
                    </button>
                  )}
                </div>
              )}
            </div>
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
          <div className="answers-toolbar">
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
                      src={getAvatarUrl(comment.user?.avatar)}
                      alt={comment.user?.name || 'User'}
                      className="comment-avatar"
                      onError={(e) => (e.target.src = '/images/default-avatar1.png')}
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
                        type="button"
                        className={`accept-answer-toggle${
                          comment.isAnswer ? ' accept-answer-toggle--accepted' : ''
                        }${
                          !comment.isAnswer && post.isSolved
                            ? ' accept-answer-toggle--muted'
                            : ''
                        }`}
                        onClick={() => handleMarkAnswer(comment._id)}
                        aria-label={comment.isAnswer ? 'Unaccept' : 'Accept this answer'}
                        title={comment.isAnswer ? 'Unaccept this answer' : 'Accept this answer'}
                      >
                        <i className={`fas fa-check${comment.isAnswer ? '' : '-circle'}`}></i>
                      </button>
                    )}
                    {(canModifyResource(user, comment) || hasPermission(user, 'deleteComment') ||
                      (isAuthenticated && user._id !== comment.user?._id)) && (
                      <div
                        className="comment-moderation-actions"
                        role="group"
                        aria-label="Comment moderation actions"
                      >
                        {(canModifyResource(user, comment) || hasPermission(user, 'deleteComment')) && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteComment(comment._id)}
                            aria-label="Delete comment"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                        {isAuthenticated && user._id !== comment.user?._id && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => openReportModal('comment', comment._id, `Comment by ${comment.user?.name}`)}
                            aria-label="Report comment"
                          >
                            <i className="fas fa-flag"></i>
                          </button>
                        )}
                      </div>
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
                              src={getAvatarUrl(reply.user?.avatar)}
                              alt={reply.user?.name || 'User'}
                              className="comment-avatar"
                              onError={(e) => (e.target.src = '/images/default-avatar1.png')}
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
