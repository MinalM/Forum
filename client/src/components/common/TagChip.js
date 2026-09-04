import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';

// A tag badge that doubles as a follow/unfollow toggle for signed-in
// members. Signed-out visitors see the same plain badge tags have always
// been - following requires an account, same as saving a post or
// subscribing to a thread.
const TagChip = ({ tag }) => {
  const { isAuthenticated, user } = useAuth();
  const { setAlert } = useAlert();
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const res = await axios.get(`/api/tags/${encodeURIComponent(tag)}/subscribe`);
        setFollowing(res.data.data.subscribed);
      } catch (err) {
        // Non-fatal - the toggle just starts in the unfollowed state.
      }
    };

    fetchFollowStatus();
  }, [tag, isAuthenticated, user]);

  const handleToggleFollow = async () => {
    const wasFollowing = following;
    setFollowing(!wasFollowing);

    try {
      const res = wasFollowing
        ? await axios.delete(`/api/tags/${encodeURIComponent(tag)}/subscribe`)
        : await axios.post(`/api/tags/${encodeURIComponent(tag)}/subscribe`);
      setFollowing(res.data.data.subscribed);
    } catch (err) {
      setFollowing(wasFollowing);
      setAlert(`Error ${wasFollowing ? 'unfollowing' : 'following'} tag`, 'danger');
    }
  };

  if (!isAuthenticated || !user) {
    return <span className="badge badge-primary">{tag}</span>;
  }

  return (
    <button
      type="button"
      className={`badge badge-primary tag-chip-btn${following ? ' following' : ''}`}
      onClick={handleToggleFollow}
      aria-pressed={following}
      aria-label={following ? `Following tag ${tag}, click to unfollow` : `Follow tag ${tag}`}
    >
      {tag}
    </button>
  );
};

TagChip.propTypes = {
  tag: PropTypes.string.isRequired
};

export default TagChip;
