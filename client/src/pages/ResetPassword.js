import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import axios from 'axios';
import { useAlert } from '../context/AlertContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const ResetPassword = () => {
  useDocumentTitle('Reset Password');

  const { token } = useParams();
  const navigate = useNavigate();
  const { setAlert } = useAlert();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const { password, confirmPassword } = formData;
  const [error, setError] = useState(null);

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async e => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setAlert('Passwords do not match', 'danger');
      return;
    }

    try {
      await axios.put(`/api/users/resetpassword/${token}`, { password });
      setAlert('Password reset successful. Please log in.', 'success');
      navigate('/login');
    } catch (err) {
      setError('Invalid or expired link. Please request a new one.');
    }
  };

  return (
    <div className="main-content">
      <div className="form-container">
        <h1 className="form-title">Reset Password</h1>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              className="form-control"
              id="password"
              name="password"
              value={password}
              onChange={onChange}
              minLength="6"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              className="form-control"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={onChange}
              minLength="6"
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-block">
            Reset Password
          </button>
        </form>

        <div className="form-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
