import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';

const PostItem = ({ post }) => {
  const {
    _id,
    title,
    content,
    user,
    category,
    createdAt,
    comments,
    views,
    upvotes,
    downvotes,
    tags,
    isSolved
  } = post;

  // Format the date
  const formattedDate = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true
  });

  // Calculate vote count
  const voteCount = upvotes.length - downvotes.length;

  // Truncate content for excerpt
  const excerpt =
    content.length > 200 ? content.substring(0, 200) + '...' : content;

  return (
    <div className="card post-card">
      <div className="card-body">
        <div className="post-header">
          <div>
            <h3 className="post-title">
              <Link to={`/posts/${_id}`}>{title}</Link>
              {isSolved && (
                <span className="badge badge-success ml-2">Solved</span>
              )}
            </h3>
            <div className="post-meta">
              <div className="post-meta-item">
                <i className="fas fa-user"></i> {user?.name || 'Unknown User'}
              </div>
              <div className="post-meta-item">
                <i className="fas fa-folder"></i> {category?.name || 'Uncategorized'}
              </div>
              <div className="post-meta-item">
                <i className="fas fa-clock"></i> {formattedDate}
              </div>
            </div>
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
              <i className="fas fa-comment"></i> {comments ? comments.length : 0}
            </div>
            <div className="post-action">
              <i className="fas fa-eye"></i> {views}
            </div>
            <div className="post-action">
              <i className={`fas fa-arrow-${voteCount >= 0 ? 'up' : 'down'}`}></i>{' '}
              {Math.abs(voteCount)}
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
