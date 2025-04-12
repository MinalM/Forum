import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import './ReportModal.css';

const ReportModal = ({ isOpen, onClose, type, itemId, itemName }) => {
  const { isAuthenticated } = useAuth();
  const { setAlert } = useAlert();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setAlert('You must be logged in to report content', 'danger');
      onClose();
      return;
    }
    
    if (!reason.trim()) {
      setAlert('Please provide a reason for the report', 'danger');
      return;
    }
    
    try {
      setLoading(true);
      let endpoint;
      
      switch (type) {
        case 'post':
          endpoint = `/api/reports/post/${itemId}`;
          break;
        case 'comment':
          endpoint = `/api/reports/comment/${itemId}`;
          break;
        case 'user':
          endpoint = `/api/reports/user/${itemId}`;
          break;
        default:
          throw new Error('Invalid report type');
      }
      
      await axios.post(endpoint, { reason });
      
      setAlert('Report submitted successfully', 'success');
      setReason('');
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      setAlert('Error submitting report. Please try again.', 'danger');
    } finally {
      setLoading(false);
    }
  };
  
  const getItemTypeText = () => {
    switch (type) {
      case 'post':
        return 'post';
      case 'comment':
        return 'comment';
      case 'user':
        return 'user';
      default:
        return 'content';
    }
  };

  return (
    <div className="report-modal-overlay">
      <div className="report-modal">
        <div className="report-modal-header">
          <h2>Report {getItemTypeText()}</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            disabled={loading}
          >
            &times;
          </button>
        </div>
        
        <div className="report-modal-content">
          {itemName && (
            <div className="reported-item">
              <p>
                <strong>Reporting:</strong> {itemName}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="report-reason">
                Please explain why you are reporting this {getItemTypeText()}:
              </label>
              <textarea
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="5"
                placeholder="Please provide details about why this content violates forum rules..."
                disabled={loading}
                required
              ></textarea>
            </div>
            
            <div className="report-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;