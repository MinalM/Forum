import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { hasPermission } from '../utils/permissions';
import PostItem from '../components/posts/PostItem';
import ReportModal from '../components/reports/ReportModal';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const Profile = () => {
  const { id } = useParams();
  const { user: authUser, isAuthenticated, token } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  useDocumentTitle(user?.name);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile using the public profile endpoint
        const userRes = await axios.get(`/api/users/${id}/profile`);
        console.log('User data received:', userRes.data.data);
        setUser(userRes.data.data);

        // Fetch user's posts
        const postsRes = await axios.get(`/api/users/${id}/posts`);
        setUserPosts(postsRes.data.data);
        
        setError(false);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError(true);
        setAlert('Error fetching user profile', 'danger');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserData();
    }
  }, [id, setAlert]);

  const handleReportUser = () => {
    if (!isAuthenticated) {
      setAlert('You must be logged in to report a user', 'danger');
      navigate('/login');
      return;
    }
    
    setShowReportModal(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="main-content">
        <div className="alert alert-danger">
          User not found or profile could not be loaded
          <button 
            className="btn btn-primary ml-3" 
            onClick={() => navigate('/')}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="profile-header">
        <img
          src={user.avatar ? user.avatar : '/images/default-avatar1.png'}
          alt={user.name}
          className="profile-avatar"
          onError={(e) => (e.target.src = '/images/default-avatar1.png')}
        />
        <div className="profile-info">
          <div className="profile-name-section">
            <h1 className="profile-name">{user.name}</h1>
            {authUser && authUser._id === user._id && (
              <Link to="/edit-profile" className="btn btn-link">
                <i className="fas fa-user-edit"></i> Edit Profile
              </Link>
            )}
            {/* Report user button - only show if logged in and not viewing own profile */}
            {isAuthenticated && authUser._id !== user._id && (
              <button 
                className="btn btn-sm btn-outline-danger"
                onClick={handleReportUser}
              >
                <i className="fas fa-flag"></i> Report User
              </button>
            )}
            {/* Moderation actions for admins/moderators */}
            {isAuthenticated && hasPermission(authUser, 'timeoutUser') && authUser._id !== user._id && (
              <Link 
                to={`/admin/users`} 
                className="btn btn-sm btn-warning"
              >
                <i className="fas fa-user-shield"></i> Moderation Actions
              </Link>
            )}
          </div>
          {/* Role badge with different styling based on role */}
          {user.role && (
            <p className="profile-user-role">
              <span className="user-role-label">Role: </span>
              <span className={`user-role-badge role-${user.role}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </p>
          )}
          {/* Display current and target roles in a separate paragraph */}
          {(user.currentRole || user.targetRole) && (
            <p className="profile-career-info">
              {user.currentRole && <span>Current: {user.currentRole}</span>}
              {user.currentRole && user.targetRole && ' → '}
              {user.targetRole && <span>Target: {user.targetRole}</span>}
            </p>
          )}
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

      {/* Report modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        type="user"
        itemId={user._id}
        itemName={`User: ${user.name}`}
      />
    </div>
  );
};

export default Profile;
