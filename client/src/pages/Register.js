import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const Register = () => {
  useDocumentTitle('Register');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password2: ''
  });

  const { name, email, password, password2 } = formData;

  const { register, googleLogin, user, isAuthenticated, error, clearErrors } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if authenticated - straight to the onboarding track step for
    // an account that hasn't been through it yet, dashboard otherwise.
    if (isAuthenticated && user) {
      navigate(user.onboardingCompleted ? '/dashboard' : '/onboarding');
    }

    // Show error alert if registration fails
    if (error) {
      setAlert(error, 'danger');
      clearErrors();
    }
  }, [isAuthenticated, user, error, navigate, setAlert, clearErrors]);

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async e => {
    e.preventDefault();

    if (password !== password2) {
      setAlert('Passwords do not match', 'danger');
    } else {
      const success = await register({
        name,
        email,
        password
      });

      if (success) {
        setAlert('Registration successful! Welcome to the community.', 'success');
      }
    }
  };

  return (
    <div className="main-content">
      <div className="form-container">
        <h1 className="form-title">Create an Account</h1>
        <p className="text-center mb-4">
          Join the AI/ML Career Transition community
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              className="form-control"
              id="name"
              name="name"
              value={name}
              onChange={onChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              className="form-control"
              id="email"
              name="email"
              value={email}
              onChange={onChange}
              autoComplete="email"
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
              minLength="6"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password2">Confirm Password</label>
            <input
              type="password"
              className="form-control"
              id="password2"
              name="password2"
              value={password2}
              onChange={onChange}
              minLength="6"
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-block">
            Register
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="google-login-container">
          <button 
            onClick={googleLogin}
            className="btn btn-google btn-block"
          >
            <i className="fab fa-google"></i> Register with Google
          </button>
        </div>

        <div className="form-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
