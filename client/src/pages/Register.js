import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password2: '',
    currentRole: '',
    targetRole: '',
    aiMlExperience: 'beginner'
  });

  const { name, email, password, password2, currentRole, targetRole, aiMlExperience } = formData;

  const { register, googleLogin, isAuthenticated, error, clearErrors } = useAuth();
  const { setAlert } = useAlert();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if authenticated
    if (isAuthenticated) {
      navigate('/dashboard');
    }

    // Show error alert if registration fails
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

    if (password !== password2) {
      setAlert('Passwords do not match', 'danger');
    } else {
      const success = await register({
        name,
        email,
        password,
        currentRole,
        targetRole,
        aiMlExperience
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
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="currentRole">Current Role/Profession</label>
            <input
              type="text"
              className="form-control"
              id="currentRole"
              name="currentRole"
              value={currentRole}
              onChange={onChange}
              placeholder="e.g. Software Developer, Data Analyst, Student"
            />
          </div>

          <div className="form-group">
            <label htmlFor="targetRole">Target AI/ML Role</label>
            <input
              type="text"
              className="form-control"
              id="targetRole"
              name="targetRole"
              value={targetRole}
              onChange={onChange}
              placeholder="e.g. Machine Learning Engineer, Data Scientist"
            />
          </div>

          <div className="form-group">
            <label htmlFor="aiMlExperience">AI/ML Experience Level</label>
            <select
              className="form-control"
              id="aiMlExperience"
              name="aiMlExperience"
              value={aiMlExperience}
              onChange={onChange}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
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
