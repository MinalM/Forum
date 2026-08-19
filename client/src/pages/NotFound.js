import React from 'react';
import { Link } from 'react-router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const NotFound = () => {
  useDocumentTitle('Page Not Found');

  return (
    <div className="main-content">
      <div className="not-found">
        <div className="not-found-content">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>
            The page you are looking for might have been removed, had its name
            changed, or is temporarily unavailable.
          </p>
          <Link to="/" className="btn">
            <i className="fas fa-home"></i> Go to Homepage
          </Link>
        </div>
        <div className="not-found-image">
          <i className="fas fa-robot"></i>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
