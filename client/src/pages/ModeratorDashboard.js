import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { hasPermission } from '../utils/permissions';

const ModeratorDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionAction, setResolutionAction] = useState('');
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  
  // Check moderator access
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    
    if (!hasPermission(user, 'viewReports')) {
      setAlert('Access denied. You need moderator privileges to access this page.', 'danger');
      navigate('/');
    }
  }, [isAuthenticated, user, navigate, setAlert]);

  // Fetch reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/reports?status=${filter}`);
        setReports(response.data.data);
      } catch (error) {
        console.error('Error fetching reports:', error);
        setAlert('Failed to load reports', 'danger');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && hasPermission(user, 'viewReports')) {
      fetchReports();
    }
  }, [isAuthenticated, user, filter, setAlert]);

  const handleOpenResolution = (report) => {
    setSelectedReport(report);
    setShowResolutionModal(true);
  };

  const handleResolveReport = async (e) => {
    e.preventDefault();
    
    if (!selectedReport) return;
    
    try {
      await axios.put(`/api/reports/${selectedReport._id}/resolve`, {
        resolutionNotes,
        action: resolutionAction
      });
      
      setReports(reports.filter(report => report._id !== selectedReport._id));
      setShowResolutionModal(false);
      setSelectedReport(null);
      setResolutionNotes('');
      setResolutionAction('');
      
      setAlert('Report resolved successfully', 'success');
    } catch (error) {
      console.error('Error resolving report:', error);
      setAlert('Failed to resolve report', 'danger');
    }
  };

  const handleDismissReport = async (reportId) => {
    try {
      await axios.put(`/api/reports/${reportId}/dismiss`);
      setReports(reports.filter(report => report._id !== reportId));
      setAlert('Report dismissed', 'success');
    } catch (error) {
      console.error('Error dismissing report:', error);
      setAlert('Failed to dismiss report', 'danger');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <h1>Moderator Dashboard</h1>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Reports</h3>
          <div className="filter-controls">
            <button 
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending
            </button>
            <button 
              className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`}
              onClick={() => setFilter('resolved')}
            >
              Resolved
            </button>
            <button 
              className={`filter-btn ${filter === 'dismissed' ? 'active' : ''}`}
              onClick={() => setFilter('dismissed')}
            >
              Dismissed
            </button>
          </div>
        </div>
      </div>

      <div className="reports-list">
        <h2>Reports ({filter})</h2>
        {reports.length > 0 ? (
          <table className="table reports-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Reporter</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report._id}>
                  <td>
                    <span className={`report-type ${report.type}`}>
                      {report.type}
                    </span>
                  </td>
                  <td>{report.reportedBy?.name || 'Anonymous'}</td>
                  <td className="report-reason">{report.reason}</td>
                  <td>
                    {formatDistanceToNow(new Date(report.createdAt), {
                      addSuffix: true
                    })}
                  </td>
                  <td className="action-buttons">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleOpenResolution(report)}
                    >
                      Review
                    </button>
                    {filter === 'pending' && (
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleDismissReport(report._id)}
                      >
                        Dismiss
                      </button>
                    )}
                    {report.type === 'post' && (
                      <Link 
                        to={`/posts/${report.post?._id}`}
                        className="btn btn-sm btn-info"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Post
                      </Link>
                    )}
                    {report.type === 'comment' && (
                      <Link 
                        to={`/posts/${report.comment?.post}`}
                        className="btn btn-sm btn-info"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Comment
                      </Link>
                    )}
                    {report.type === 'user' && (
                      <Link 
                        to={`/profile/${report.reportedUser?._id}`}
                        className="btn btn-sm btn-info"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View User
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No {filter} reports found.</p>
        )}
      </div>

      {showResolutionModal && selectedReport && (
        <div className="modal">
          <div className="modal-content">
            <h2>Resolve Report</h2>
            <div className="report-details">
              <p><strong>Type:</strong> {selectedReport.type}</p>
              <p><strong>Reported by:</strong> {selectedReport.reportedBy?.name || 'Anonymous'}</p>
              <p><strong>Reason:</strong> {selectedReport.reason}</p>
            </div>
            <form onSubmit={handleResolveReport}>
              <div className="form-group">
                <label htmlFor="resolutionAction">Action Taken</label>
                <select
                  id="resolutionAction"
                  className="form-control"
                  value={resolutionAction}
                  onChange={(e) => setResolutionAction(e.target.value)}
                  required
                >
                  <option value="">Select an action</option>
                  <option value="none">No action needed</option>
                  <option value="deleted">Content deleted</option>
                  <option value="edited">Content edited</option>
                  <option value="warned">User warned</option>
                  <option value="timeout">User timeout</option>
                  <option value="banned">User banned</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="resolutionNotes">Resolution Notes</label>
                <textarea
                  id="resolutionNotes"
                  className="form-control"
                  rows="3"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn btn-success">Resolve Report</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowResolutionModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeratorDashboard;