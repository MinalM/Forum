import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { email, password } = formData;

  const { login, isAuthenticated, error, clearErrors } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if authenticated
    if (isAuthenticated) {
      navigate('/dashboard');
    }

    // Show error alert if login fails
    if (error) {
      setAlert(error, 'danger');
      clearErrors();
    }
  }, [isAuthenticated, error, navigate, setAlert, clearErrors]);

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async e => {
    e.preventDefault();
    const success = await login(email, password);
    
    if (success) {
      setAlert('Login successful! Welcome back.', 'success');
    }
  };

  return (
    <div className="main-content">
      <div className="form-container">
        <h1 className="form-title">Login</h1>
        <p className="text-center mb-4">
          Sign in to your AI/ML Career Forum account
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              className="form-control"
              id="email"
              name="email"
              value={email}
              onChange={onChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              className="form-control"
              id="password"
              name="password"
              value={password}
              onChange={onChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-block">
            Login
          </button>
        </form>

        <div className="form-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
