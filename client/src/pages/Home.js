import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import PostItem from '../components/posts/PostItem';
import { useAlert } from '../context/AlertContext';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useExperiment } from '../hooks/useExperiment';
import TrendingPosts from '../components/TrendingPosts';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const Home = () => {
  useDocumentTitle();

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setAlert } = useAlert();
  const { isAuthenticated } = useAuth();
  const showTrending = useFeatureFlag('trending_posts_section', false);
  const sortVariant = useExperiment('default_sort_order');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recent posts — sort order determined by A/B experiment
        try {
          const sortParam = sortVariant === 'treatment' ? '-upvotes' : '-createdAt';
          const postsRes = await axios.get(`/api/posts?sort=${sortParam}&limit=5`);

          const validPosts = (postsRes.data.data || []).filter(post => post && post.user && post.category);
          setPosts(validPosts);
        } catch (err) {
          console.log('Error fetching posts:', err.message);
          // Don't set an alert, just continue with empty posts
        }

        // Fetch AI/ML specific categories
        try {
          const categoriesRes = await axios.get('/api/categories/aiml');
          setCategories(categoriesRes.data.data || []);
        } catch (err) {
          console.log('Error fetching categories:', err.message);
          // Don't set an alert, just continue with empty categories
        }

        setLoading(false);
      } catch (err) {
        console.error('Error in fetchData:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, [setAlert, sortVariant]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <section className="hero">
        <div className="container">
          <h1>Welcome to the AI/ML Career Transition Forum</h1>
          <p>
            Connect with professionals transitioning to careers in Artificial Intelligence
            and Machine Learning. Share knowledge, ask questions, and grow together.
          </p>
          <div>
            {isAuthenticated ? (
              <>
                <Link to="/create-post" className="btn btn-lg">
                  Create Post
                </Link>
                <Link to="/dashboard" className="btn btn-lg btn-secondary ml-3">
                  Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-lg">
                  Join the Community
                </Link>
                <Link to="/categories" className="btn btn-lg btn-secondary ml-3">
                  Browse Topics
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="container">
        <h2 className="text-center mb-4">Why Join Our Community?</h2>
        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-users"></i>
            </div>
            <h3 className="feature-title">Connect</h3>
            <p>
              Network with professionals at all stages of their AI/ML career transition
              journey, from beginners to experts.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-lightbulb"></i>
            </div>
            <h3 className="feature-title">Learn</h3>
            <p>
              Access curated resources, tutorials, and discussions tailored for
              transitioning professionals.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-rocket"></i>
            </div>
            <h3 className="feature-title">Grow</h3>
            <p>
              Accelerate your career transition with mentorship, job postings, and
              practical advice from those who've succeeded.
            </p>
          </div>
        </div>
      </section>

      <section className="container mt-5">
        <div className="row">
          <div className="col-md-8">
            <h2 className="mb-4">Recent Discussions</h2>
            <div className="post-list">
              {posts.length > 0 ? (
                posts.map(post => <PostItem key={post._id} post={post} />)
              ) : (
                <p>No posts found</p>
              )}
            </div>
            <div className="text-center mt-4">
              <Link to="/categories" className="btn">
                View All Discussions
              </Link>
            </div>
          </div>

          <div className="col-md-4">
            {showTrending && <TrendingPosts />}
            <h2 className="mb-4">Popular Categories</h2>
            <div className="categories-sidebar">
              {categories.length > 0 ? (
                categories.map(category => (
                  <div key={category._id} className="category-item">
                    <Link to={`/categories/${category._id}`}>
                      <i className={`fas fa-${category.icon || 'folder'}`}></i>{' '}
                      {category.name}
                    </Link>
                  </div>
                ))
              ) : (
                <p>No categories found</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
