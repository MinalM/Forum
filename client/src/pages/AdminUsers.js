import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { hasPermission } from '../utils/permissions';
import './AdminUsers.css';

const AdminUsers = () => {
  const { user, isAuthenticated } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [timeoutUser, setTimeoutUser] = useState(null);
  const [timeoutDuration, setTimeoutDuration] = useState(24);
  const [timeoutReason, setTimeoutReason] = useState('');
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banUser, setBanUser] = useState(null);
  const [banReason, setBanReason] = useState('');

  // Check admin access
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    
    if (!hasPermission(user, 'manageUsers')) {
      setAlert('Access denied. Admin privileges required.', 'danger');
      navigate('/');
    }
  }, [isAuthenticated, user, navigate, setAlert]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/users?page=${currentPage}&limit=10&search=${searchTerm}`);
        setUsers(response.data.data);
        
        if (response.data.pagination) {
          setTotalPages(Math.ceil(response.data.pagination.total / response.data.pagination.limit));
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setAlert('Failed to load users', 'danger');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && hasPermission(user, 'manageUsers')) {
      fetchUsers();
    }
  }, [isAuthenticated, user, currentPage, searchTerm, setAlert]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const startEditingUser = (user) => {
    setEditingUser(user);
    setSelectedRole(user.role);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setSelectedRole('');
  };

  const handleRoleChange = async () => {
    if (!editingUser || !selectedRole) return;
    
    try {
      await axios.put(`/api/users/${editingUser._id}/role`, { role: selectedRole });
      
      // Update the user in the list
      setUsers(users.map(u => 
        u._id === editingUser._id ? { ...u, role: selectedRole } : u
      ));
      
      setAlert(`User ${editingUser.name}'s role updated to ${selectedRole}`, 'success');
      cancelEditing();
    } catch (error) {
      console.error('Error updating role:', error);
      setAlert('Failed to update user role', 'danger');
    }
  };

  const handleBanUser = async () => {
    if (!banUser) return;
    
    try {
      await axios.put(`/api/users/${banUser._id}/ban`, { reason: banReason });
      
      // Update the user in the list
      setUsers(users.map(u => 
        u._id === banUser._id ? { ...u, isBanned: true } : u
      ));
      
      setAlert(`User ${banUser.name} has been banned`, 'success');
      setShowBanModal(false);
      setBanUser(null);
      setBanReason('');
    } catch (error) {
      console.error('Error banning user:', error);
      setAlert('Failed to ban user', 'danger');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await axios.put(`/api/users/${userId}/unban`);
      
      // Update the user in the list
      setUsers(users.map(u => 
        u._id === userId ? { ...u, isBanned: false } : u
      ));
      
      setAlert('User restriction removed successfully', 'success');
    } catch (error) {
      console.error('Error unbanning user:', error);
      setAlert('Failed to remove user restriction', 'danger');
    }
  };

  const openTimeoutModal = (user) => {
    setTimeoutUser(user);
    setTimeoutDuration(24);
    setTimeoutReason('');
    setShowTimeoutModal(true);
  };

  const openBanModal = (user) => {
    setBanUser(user);
    setBanReason('');
    setShowBanModal(true);
  };

  const handleTimeoutUser = async () => {
    if (!timeoutUser) return;
    
    try {
      await axios.put(`/api/users/${timeoutUser._id}/timeout`, { 
        reason: timeoutReason,
        durationHours: timeoutDuration
      });
      
      // Update the user in the list
      setUsers(users.map(u => 
        u._id === timeoutUser._id ? { ...u, isBanned: true } : u
      ));
      
      setAlert(`User ${timeoutUser.name} has been timed out for ${timeoutDuration} hours`, 'success');
      setShowTimeoutModal(false);
      setTimeoutUser(null);
      setTimeoutDuration(24);
      setTimeoutReason('');
    } catch (error) {
      console.error('Error timing out user:', error);
      setAlert('Failed to timeout user', 'danger');
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
      <h1>User Management</h1>
      
      <div className="admin-tools">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      <div className="users-table-container">
        <table className="table users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  {editingUser && editingUser._id === user._id ? (
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td>
                  {user.isBanned ? (
                    <span className="status-badge banned">
                      {user.bannedUntil ? `Timed out (until ${new Date(user.bannedUntil).toLocaleString()})` : 'Banned'}
                    </span>
                  ) : (
                    <span className="status-badge active">Active</span>
                  )}
                </td>
                <td className="action-buttons">
                  {editingUser && editingUser._id === user._id ? (
                    <>
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={handleRoleChange}
                      >
                        Save
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => startEditingUser(user)}
                      >
                        Edit Role
                      </button>
                      
                      {user.isBanned ? (
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleUnbanUser(user._id)}
                        >
                          Remove Restriction
                        </button>
                      ) : (
                        <>
                          <button 
                            className="btn btn-sm btn-warning"
                            onClick={() => openTimeoutModal(user)}
                          >
                            Timeout
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => openBanModal(user)}
                          >
                            Ban
                          </button>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="btn pagination-btn"
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="btn pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {showTimeoutModal && timeoutUser && (
        <div className="modal">
          <div className="modal-content">
            <h2>Timeout User</h2>
            <p>You are about to temporarily restrict {timeoutUser.name}.</p>
            <form onSubmit={(e) => { e.preventDefault(); handleTimeoutUser(); }}>
              <div className="form-group">
                <label htmlFor="timeoutDuration">Duration (hours)</label>
                <input 
                  type="number" 
                  id="timeoutDuration"
                  min="1" 
                  max="720"
                  value={timeoutDuration}
                  onChange={(e) => setTimeoutDuration(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="timeoutReason">Reason</label>
                <textarea
                  id="timeoutReason"
                  value={timeoutReason}
                  onChange={(e) => setTimeoutReason(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-warning">Confirm Timeout</button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowTimeoutModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBanModal && banUser && (
        <div className="modal">
          <div className="modal-content">
            <h2>Ban User</h2>
            <p>You are about to permanently ban {banUser.name}.</p>
            <form onSubmit={(e) => { e.preventDefault(); handleBanUser(); }}>
              <div className="form-group">
                <label htmlFor="banReason">Reason</label>
                <textarea
                  id="banReason"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-danger">Confirm Ban</button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowBanModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;