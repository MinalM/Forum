import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import PostItem from '../components/posts/PostItem';

const Profile = () => {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  const { setAlert } = useAlert();
  const [user, setUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user profile
        const userRes = await axios.get(`/api/users/${id}`);
        setUser(userRes.data.data);

        // Fetch user's posts
        const postsRes = await axios.get(`/api/users/${id}/posts`);
        setUserPosts(postsRes.data.data);

        setLoading(false);
      } catch (err) {
        setAlert('Error fetching user profile', 'danger');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id, setAlert]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="main-content">
        <div className="alert alert-danger">User not found</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="profile-header">
        <img
          src={user.avatar || 'https://via.placeholder.com/150'}
          alt={user.name}
          className="profile-avatar"
        />
        <div className="profile-info">
          <h1 className="profile-name">{user.name}</h1>
          <p className="profile-role">
            {user.currentRole && `Current: ${user.currentRole}`}
            {user.currentRole && user.targetRole && ' → '}
            {user.targetRole && `Target: ${user.targetRole}`}
          </p>
          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-value">{userPosts.length}</div>
              <div className="profile-stat-label">Posts</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-value">
                {user.aiMlExperience ? user.aiMlExperience.charAt(0).toUpperCase() + user.aiMlExperience.slice(1) : 'Beginner'}
              </div>
              <div className="profile-stat-label">AI/ML Level</div>
            </div>
          </div>
          {authUser && authUser._id === user._id && (
            <div className="profile-actions">
              <Link to="/edit-profile" className="btn btn-secondary">
                <i className="fas fa-user-edit"></i> Edit Profile
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="profile-details">
        {user.bio && (
          <div className="profile-section">
            <h2 className="profile-section-title">Bio</h2>
            <p className="profile-bio">{user.bio}</p>
          </div>
        )}

        {user.skills && user.skills.length > 0 && (
          <div className="profile-section">
            <h2 className="profile-section-title">Skills</h2>
            <div className="profile-skills">
              {user.skills.map((skill, index) => (
                <span key={index} className="badge badge-primary">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="profile-posts">
        <h2 className="profile-section-title">Recent Posts</h2>
        {userPosts.length > 0 ? (
          <div className="post-list">
            {userPosts.map(post => (
              <PostItem key={post._id} post={post} />
            ))}
          </div>
        ) : (
          <p>No posts yet</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
