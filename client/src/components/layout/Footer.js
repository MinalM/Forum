import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-heading">AI/ML Career Forum</h3>
            <p>
              A community platform for professionals transitioning to careers in
              Artificial Intelligence and Machine Learning.
            </p>
          </div>

          <div className="footer-section">
            <h3 className="footer-heading">Quick Links</h3>
            <ul className="footer-links">
              <li className="footer-link">
                <Link to="/">Home</Link>
              </li>
              <li className="footer-link">
                <Link to="/categories">Categories</Link>
              </li>
              <li className="footer-link">
                <Link to="/categories/aiml">AI/ML Resources</Link>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-heading">Career Resources</h3>
            <ul className="footer-links">
              <li className="footer-link">
                <a href="https://www.kaggle.com" target="_blank" rel="noopener noreferrer">
                  Kaggle
                </a>
              </li>
              <li className="footer-link">
                <a href="https://www.coursera.org" target="_blank" rel="noopener noreferrer">
                  Coursera
                </a>
              </li>
              <li className="footer-link">
                <a href="https://www.udacity.com" target="_blank" rel="noopener noreferrer">
                  Udacity
                </a>
              </li>
              <li className="footer-link">
                <a href="https://www.fast.ai" target="_blank" rel="noopener noreferrer">
                  Fast.ai
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-heading">Connect</h3>
            <div className="social-links">
              <a href="#!" className="social-link">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#!" className="social-link">
                <i className="fab fa-linkedin"></i>
              </a>
              <a href="#!" className="social-link">
                <i className="fab fa-github"></i>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} AI/ML Career Forum. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
