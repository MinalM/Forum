import React, { useState } from 'react';
import { Link } from 'react-router';
import PropTypes from 'prop-types';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { markdownToPlainText } from '../../utils/markdown';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';

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

  const commentCount =
    typeof post.commentCount === 'number'
      ? post.commentCount
      : comments
      ? comments.length
      : 0;

  const formattedDate = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true
  });

  const voteCount = upvotes.length - downvotes.length;
  const hasUpvoted = Boolean(user && upvotes.includes(user._id));
  const hasDownvoted = Boolean(user && downvotes.includes(user._id));
  const needsAnswer = !isSolved && commentCount === 0;

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
              </div>
            </div>
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
