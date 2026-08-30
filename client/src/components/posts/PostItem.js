import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import PropTypes from 'prop-types';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { markdownToPlainText } from '../../utils/markdown';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useFeedComposer } from '../../context/FeedComposerContext';

const AI_ML_LEVEL_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
  all: 'All levels'
};

const PostItem = ({ post: initialPost }) => {
  const { user, isAuthenticated } = useAuth();
  const { setAlert } = useAlert();
  const [post, setPost] = useState(initialPost);
  const [draftText, setDraftText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Coordinates with sibling feed cards when a FeedComposerProvider is
  // present; falls back to local-only state otherwise (e.g. in isolation).
  const feedComposer = useFeedComposer();
  const [localComposerOpen, setLocalComposerOpen] = useState(false);

  const {
    _id,
    title,
    content,
    user: author,
    category,
    createdAt,
    comments,
    views,
    upvotes,
    downvotes,
    tags,
    isSolved,
    aiMlLevel
  } = post;

  // Prefer the real comment list over the denormalised `commentCount` field
  // when it's available (every list/detail endpoint that renders PostItem
  // populates `comments` except the user-profile posts list) — some posts
  // were written with `commentCount` missing or stale (see
  // server/utils/postCounters.js on the server), and trusting it over the
  // actual comments is what made "Needs an answer" disagree with the
  // thread's own rendered comment count.
  const commentCount = Array.isArray(comments)
    ? comments.length
    : typeof post.commentCount === 'number'
    ? post.commentCount
    : 0;

  const formattedDate = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true
  });

  const voteCount = upvotes.length - downvotes.length;
  const hasUpvoted = Boolean(user && upvotes.includes(user._id));
  const hasDownvoted = Boolean(user && downvotes.includes(user._id));
  const needsAnswer = !isSolved && commentCount === 0;
  const isQuestion = commentCount === 0;

  useEffect(() => {
    const fetchSaveStatus = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const res = await axios.get(`/api/posts/${_id}/save`);
        setSaved(res.data.data.saved);
      } catch (err) {
        // Non-fatal - the toggle just starts in the unsaved state.
      }
    };

    fetchSaveStatus();
  }, [_id, isAuthenticated, user]);

  const handleToggleSave = async () => {
    if (!isAuthenticated || !user) {
      setAlert('Please log in to save posts', 'danger');
      return;
    }

    const wasSaved = saved;
    setSaved(!wasSaved);

    try {
      await (wasSaved
        ? axios.delete(`/api/posts/${_id}/save`)
        : axios.post(`/api/posts/${_id}/save`));
    } catch (err) {
      setSaved(wasSaved);
      setAlert(`Error ${wasSaved ? 'unsaving' : 'saving'} post`, 'danger');
    }
  };

  const isComposerOpen = feedComposer
    ? feedComposer.openPostId === _id
    : localComposerOpen;

  const openComposer = () => {
    if (feedComposer) {
      feedComposer.setOpenPostId(_id);
    } else {
      setLocalComposerOpen(true);
    }
  };

  const closeComposer = () => {
    setDraftText('');
    if (feedComposer) {
      feedComposer.setOpenPostId(prev => (prev === _id ? null : prev));
    } else {
      setLocalComposerOpen(false);
    }
  };

  const toggleComposer = () => {
    if (isComposerOpen) {
      closeComposer();
    } else {
      openComposer();
    }
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!draftText.trim() || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`/api/posts/${_id}/comments`, { content: draftText });
      setPost(prev => ({
        ...prev,
        commentCount:
          (typeof prev.commentCount === 'number' ? prev.commentCount : 0) + 1,
        comments: Array.isArray(prev.comments)
          ? [...prev.comments, res.data.data]
          : prev.comments
      }));
      closeComposer();
    } catch (err) {
      setAlert('Error posting your answer', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Truncate content for excerpt (plain text, markdown syntax stripped)
  const plainContent = markdownToPlainText(content);
  const excerpt =
    plainContent.length > 200
      ? plainContent.substring(0, 200) + '...'
      : plainContent;

  const handleVote = async (direction) => {
    if (!isAuthenticated || !user) {
      setAlert('Please log in to vote', 'danger');
      return;
    }

    const wasActive = direction === 'upvote' ? hasUpvoted : hasDownvoted;
    const nextUpvotes = upvotes.filter(id => id !== user._id);
    const nextDownvotes = downvotes.filter(id => id !== user._id);
    if (!wasActive) {
      if (direction === 'upvote') {
        nextUpvotes.push(user._id);
      } else {
        nextDownvotes.push(user._id);
      }
    }

    const previousPost = post;
    setPost({ ...post, upvotes: nextUpvotes, downvotes: nextDownvotes });

    try {
      const res = await axios.put(`/api/posts/${_id}/${direction}`);
      setPost(prev => ({
        ...prev,
        upvotes: res.data.data.upvotes,
        downvotes: res.data.data.downvotes,
        score: res.data.data.score
      }));
    } catch (err) {
      setPost(previousPost);
      setAlert(
        `Error ${direction === 'upvote' ? 'upvoting' : 'downvoting'} post`,
        'danger'
      );
    }
  };

  return (
    <div
      className={`card post-card${needsAnswer ? ' post-card--needs-answer' : ''}`}
      data-testid="post-card"
    >
      <div className="card-body">
        <div className="post-card-layout">
          <div className="post-vote-column">
            <button
              type="button"
              className={`vote-btn upvote ${hasUpvoted ? 'active' : ''}`}
              onClick={() => handleVote('upvote')}
              disabled={!isAuthenticated}
              aria-label="Upvote post"
            >
              <i className="fas fa-arrow-up"></i>
            </button>
            <span className="post-vote-count" data-testid="vote-count">
              {voteCount}
            </span>
            <button
              type="button"
              className={`vote-btn downvote ${hasDownvoted ? 'active' : ''}`}
              onClick={() => handleVote('downvote')}
              disabled={!isAuthenticated}
              aria-label="Downvote post"
            >
              <i className="fas fa-arrow-down"></i>
            </button>
          </div>

          <div className="post-card-main">
            <div className="post-card-header-row">
              <h3 className="post-title">
                <Link to={`/posts/${_id}`}>{title}</Link>
              </h3>
              <div className="post-status-badges">
                {isSolved && (
                  <span className="badge badge-success">Solved</span>
                )}
                {needsAnswer && (
                  <span className="badge badge-warning">Needs an answer</span>
                )}
              </div>
            </div>

            <div className="post-meta">
              <div className="post-meta-item">
                <i className="fas fa-user"></i> {author?.name || 'Unknown User'}
              </div>
              {aiMlLevel && (
                <span className="badge badge-info post-level-badge">
                  {AI_ML_LEVEL_LABELS[aiMlLevel] || aiMlLevel}
                </span>
              )}
              <div className="post-meta-item">
                <i className="fas fa-folder"></i> {category?.name || 'Uncategorized'}
              </div>
              <div className="post-meta-item">
                <i className="fas fa-clock"></i> {formattedDate}
              </div>
            </div>

            <div className="post-excerpt">{excerpt}</div>

            <div className="post-footer">
              <div className="post-tags">
                {tags &&
                  tags.map((tag, index) => (
                    <span key={index} className="badge badge-primary">
                      {tag}
                    </span>
                  ))}
              </div>
              <div className="post-actions">
                <div className="post-action">
                  <i className="fas fa-comment"></i> {commentCount}
                </div>
                <div className="post-action">
                  <i className="fas fa-eye"></i> {views}
                </div>
                <button
                  type="button"
                  className={`save-toggle-btn ${saved ? 'active' : ''}`}
                  onClick={handleToggleSave}
                  disabled={!isAuthenticated}
                  aria-label={saved ? 'Unsave post' : 'Save post'}
                >
                  <i className="fas fa-bookmark"></i>
                </button>
                <button
                  type="button"
                  className={`answer-btn ${isQuestion ? 'answer-btn--filled' : 'answer-btn--outline'}`}
                  onClick={toggleComposer}
                >
                  {isQuestion ? 'Answer' : 'Reply'}
                </button>
              </div>
            </div>

            {isComposerOpen && (
              isAuthenticated ? (
                <form className="answer-composer" onSubmit={handleAnswerSubmit}>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Write your answer..."
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    disabled={submitting}
                  ></textarea>
                  <div className="answer-composer-actions">
                    <button
                      type="button"
                      className="answer-composer-cancel"
                      onClick={closeComposer}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="answer-composer-submit"
                      disabled={submitting || !draftText.trim()}
                    >
                      {isQuestion ? 'Post answer' : 'Post reply'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="answer-composer-signin alert alert-info">
                  <Link to="/login">Log in</Link> or{' '}
                  <Link to="/register">register</Link> to{' '}
                  {isQuestion ? 'answer' : 'reply'}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

PostItem.propTypes = {
  post: PropTypes.object.isRequired
};

export default PostItem;
