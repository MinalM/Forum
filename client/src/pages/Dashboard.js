import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import PostItem from '../components/posts/PostItem';

const Dashboard = () => {
  const { user } = useAuth();
  const { setAlert } = useAlert();
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalComments: 0,
    solvedPosts: 0
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user's posts
        const postsRes = await axios.get(`/api/users/${user._id}/posts`);
        setUserPosts(postsRes.data.data);

        // Calculate stats
        const totalPosts = postsRes.data.data.length;
        const solvedPosts = postsRes.data.data.filter(post => post.isSolved).length;
        
        // Fetch user's comments
        const commentsRes = await axios.get('/api/comments', {
          params: { user: user._id }
        });
        
        const totalComments = commentsRes.data.count || 0;

        setStats({
          totalPosts,
          totalComments,
          solvedPosts
        });

        setLoading(false);
      } catch (err) {
        setAlert('Error fetching user data', 'danger');
        setLoading(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user, setAlert]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user.name}</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-file-alt"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalPosts}</h3>
            <p>Posts</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-comment"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalComments}</h3>
            <p>Comments</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.solvedPosts}</h3>
            <p>Solved Posts</p>
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <Link to="/create-post" className="btn">
          <i className="fas fa-plus"></i> Create New Post
        </Link>
        <Link to="/edit-profile" className="btn btn-secondary">
          <i className="fas fa-user-edit"></i> Edit Profile
        </Link>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Your Recent Posts</h2>
          {userPosts.length > 0 ? (
            <div className="post-list">
              {userPosts.slice(0, 5).map(post => (
                <PostItem key={post._id} post={post} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>You haven't created any posts yet.</p>
              <Link to="/create-post" className="btn btn-sm">
                Create Your First Post
              </Link>
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <h2>AI/ML Career Progress</h2>
          <div className="card">
            <div className="card-body">
              <div className="progress-item">
                <div className="progress-label">
                  <span>Current Role:</span>
                  <strong>{user.currentRole || 'Not specified'}</strong>
                </div>
              </div>
              
              <div className="progress-item">
                <div className="progress-label">
                  <span>Target Role:</span>
                  <strong>{user.targetRole || 'Not specified'}</strong>
                </div>
              </div>
              
              <div className="progress-item">
                <div className="progress-label">
                  <span>AI/ML Experience Level:</span>
                  <strong className="capitalize">{user.aiMlExperience || 'Beginner'}</strong>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: 
                        user.aiMlExperience === 'beginner' ? '25%' :
                        user.aiMlExperience === 'intermediate' ? '50%' :
                        user.aiMlExperience === 'advanced' ? '75%' : '100%'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
