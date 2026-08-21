import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import { useAlert } from '../context/AlertContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setAlert } = useAlert();
  useDocumentTitle('Forum Categories');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get('/api/categories');
        setCategories(res.data.data || []);
        setLoading(false);
      } catch (err) {
        console.log('Error fetching categories:', err.message);
        // Don't set an alert, just continue with empty categories
        setLoading(false);
      }
    };

    fetchCategories();
  }, [setAlert]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Helper function to get an icon for a category
  const getCategoryIcon = (category) => {
    const iconMap = {
      'machine learning': 'brain',
      'deep learning': 'network-wired',
      'data science': 'chart-bar',
      'natural language processing': 'language',
      'computer vision': 'eye',
      'reinforcement learning': 'robot',
      'career advice': 'briefcase',
      'interviews': 'user-tie',
      'projects': 'project-diagram',
      'resources': 'book',
      'tools': 'tools',
      'news': 'newspaper',
      'events': 'calendar',
      'jobs': 'briefcase',
      'discussion': 'comments'
    };

    // Try to match the category name with the icon map
    const lowerCaseName = category.name.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerCaseName.includes(key)) {
        return icon;
      }
    }

    // Default icon if no match is found
    return category.icon || 'folder';
  };

  return (
    <div className="main-content">
      <div className="categories-header">
        <h1>Forum Categories</h1>
        <p>Browse discussions by topic</p>
      </div>

      <div className="categories-grid">
        {categories.length > 0 ? (
          categories.map(category => (
            <Link
              to={`/categories/${category._id}`}
              key={category._id}
              className="category-card"
            >
              <div className="category-icon">
                <i className={`fas fa-${getCategoryIcon(category)}`}></i>
              </div>
              <h3 className="category-title">{category.name}</h3>
              <p className="category-description">{category.description}</p>
            </Link>
          ))
        ) : (
          <p>No categories found</p>
        )}
      </div>

      <div className="categories-footer" style={{ marginTop: '3rem' }}>
        <div className="card">
          <div className="card-body">
            <h3>AI/ML Career Transition</h3>
            <p>
              Our forum is specifically designed to help professionals transition
              to careers in Artificial Intelligence and Machine Learning. Browse
              the categories above to find discussions relevant to your career
              journey.
            </p>
            <Link to="/register" className="btn">
              Join the Community
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;
