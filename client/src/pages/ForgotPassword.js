import React, { useState } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const ForgotPassword = () => {
  useDocumentTitle('Forgot Password');

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async e => {
    e.preventDefault();

    try {
      await axios.post('/api/users/forgotpassword', { email });
    } catch (err) {
      // The API always answers 200 so this can't be used to enumerate
      // accounts; a network/server error still gets the same generic
      // confirmation rather than leaking whether the address exists.
    } finally {
      setSubmitted(true);
    }
  };

  return (
    <div className="main-content">
      <div className="form-container">
        <h1 className="form-title">Forgot Password</h1>

        {submitted ? (
          <div className="alert alert-success">
            If an account exists for that email, we've sent a password reset
            link. Check your inbox for instructions.
          </div>
        ) : (
          <>
            <p className="text-center mb-4">
              Enter your email address and we'll send you a link to reset
              your password.
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
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <button type="submit" className="btn btn-block">
                Send Reset Link
              </button>
            </form>
          </>
        )}

        <div className="form-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
