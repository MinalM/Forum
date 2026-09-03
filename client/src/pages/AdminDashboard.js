import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { hasPermission } from '../utils/permissions';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();
  useDocumentTitle('Admin Dashboard');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    pendingReports: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check admin access
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    
    if (!hasPermission(user, 'accessAdminDashboard')) {
      setAlert('Access denied. Admin privileges required.', 'danger');
      navigate('/');
    }
  }, [isAuthenticated, user, navigate, setAlert]);

  // Fetch admin dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated || !hasPermission(user, 'accessAdminDashboard')) return;
      
      try {
        setLoading(true);
        
        // Get total users count
        const usersRes = await axios.get('/api/users?limit=1');
        const totalUsers = usersRes.data.pagination?.total || 0;
        
        // Get recent users
        const recentUsersRes = await axios.get('/api/users?limit=5&sort=-createdAt');
        setRecentUsers(recentUsersRes.data.data || []);
        
        // Get total posts count
        const postsRes = await axios.get('/api/posts?limit=1');
        const totalPosts = postsRes.data.pagination?.total || 0;
        
        // Get total comments count
        const commentsRes = await axios.get('/api/comments?limit=1');
        const totalComments = commentsRes.data.count || 0;
        
        // Get pending reports count
        const reportsRes = await axios.get('/api/reports/pending/count');
        const pendingReports = reportsRes.data.data?.count || 0;
        
        // Get recent reports
        const recentReportsRes = await axios.get('/api/reports?status=pending&limit=5');
        setRecentReports(recentReportsRes.data.data || []);
        
        setStats({
          totalUsers,
          totalPosts,
          totalComments,
          pendingReports
        });
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        setAlert('Failed to load dashboard data', 'danger');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, user, setAlert]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <h1>Admin Dashboard</h1>
      
      <div className="admin-actions">
        <Link to="/admin/users" className="btn btn-primary">
          <i className="fas fa-users-cog"></i> Manage Users
        </Link>
      </div>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-content">
            <p className="stat-value">{stats.totalUsers}</p>
            <p className="stat-label">Total Users</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-file-alt"></i>
          </div>
          <div className="stat-content">
            <p className="stat-value">{stats.totalPosts}</p>
            <p className="stat-label">Total Posts</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-comments"></i>
          </div>
          <div className="stat-content">
            <p className="stat-value">{stats.totalComments}</p>
            <p className="stat-label">Total Comments</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-flag"></i>
          </div>
          <div className="stat-content">
            <p className="stat-value">{stats.pendingReports}</p>
            <p className="stat-label">Pending Reports</p>
          </div>
        </div>
      </div>

      <div className="admin-panels">
        <div className="admin-panel">
          <h2>Recent Users</h2>
          {recentUsers.length > 0 ? (
            <div className="recent-users-list">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map(user => (
                    <tr key={user._id}>
                      <td>
                        <Link to={`/profile/${user._id}`}>{user.name}</Link>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right">
                <Link to="/admin/users" className="btn btn-link">
                  View All Users <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            </div>
          ) : (
            <p>No users found.</p>
          )}
        </div>
        
        <div className="admin-panel">
          <h2>Recent Reports</h2>
          {recentReports.length > 0 ? (
            <div className="recent-reports-list">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map(report => (
                    <tr key={report._id}>
                      <td>
                        <span className={`report-type ${report.type}`}>
                          {report.type}
                        </span>
                      </td>
                      <td className="report-reason">{report.reason.substring(0, 50)}...</td>
                      <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right">
                <Link to="/moderator" className="btn btn-link">
                  View All Reports <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            </div>
          ) : (
            <p>No pending reports.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;