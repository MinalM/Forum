import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import axios from 'axios';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import PostItem from '../components/posts/PostItem';
import { FeedComposerProvider } from '../context/FeedComposerContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const CategoryPosts = () => {
  const { categoryId } = useParams();
  const { setAlert } = useAlert();
  const { isAuthenticated } = useAuth();
  const [category, setCategory] = useState(null);
  const [notFound, setNotFound] = useState(false);
  useDocumentTitle(notFound ? 'Category Not Found' : category?.name);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        // Fetch category details
        const categoryRes = await axios.get(`/api/categories/${categoryId}`);
        setCategory(categoryRes.data.data);
        setNotFound(false);

        // Fetch posts in this category, newest-first, optionally filtered by solved status
        const params = { page, limit: 10 };
        if (filter === 'solved') {
          params.solved = true;
        } else if (filter === 'unsolved') {
          params.solved = false;
        }

        const postsRes = await axios.get(`/api/categories/${categoryId}/posts`, {
          params
        });

        setPosts(postsRes.data.data);

        // Calculate total pages if pagination info is available
        if (postsRes.data.pagination) {
          const total = postsRes.data.pagination.total || postsRes.data.count;
          const limit = postsRes.data.pagination.limit || 10;
          setTotalPages(Math.ceil(total / limit));
        }

        setLoading(false);
      } catch (err) {
        setCategory(null);
        setPosts([]);
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setAlert('Error fetching category data', 'danger');
        }
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [categoryId, page, filter, setAlert]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo(0, 0);
    }
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!category) {
    if (notFound) {
      return (
        <div className="main-content">
          <div className="not-found">
            <div className="not-found-content">
              <h1>Category Not Found</h1>
              <p>
                This category may have been removed, or the link you followed
                may be out of date.
              </p>
              <Link to="/categories" className="btn">
                <i className="fas fa-arrow-left"></i> Browse Categories
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="main-content">
        <div className="alert alert-danger">Category not found</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="category-header">
        <div className="category-info">
          <h1>{category.name}</h1>
          <p>{category.description}</p>
        </div>
        {isAuthenticated && (
          <div className="category-actions">
            <Link to="/create-post" className="btn btn-link">
              <i className="fas fa-plus"></i> New Post
            </Link>
          </div>
        )}
      </div>

      <div className="category-controls">
        <label htmlFor="post-filter">Filter</label>
        <select id="post-filter" value={filter} onChange={handleFilterChange}>
          <option value="all">All</option>
          <option value="unsolved">Unsolved</option>
          <option value="solved">Solved</option>
        </select>
      </div>

      <div className="post-list">
        {posts.length > 0 ? (
          <FeedComposerProvider>
            {posts.map(post => <PostItem key={post._id} post={post} />)}
          </FeedComposerProvider>
        ) : (
          <div className="empty-state">
            <p>No posts in this category yet.</p>
            {isAuthenticated ? (
              <Link to="/create-post" className="btn btn-sm">
                Create the First Post
              </Link>
            ) : (
              <Link to="/login" className="btn btn-sm">
                Login to Post
              </Link>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <i className="fas fa-chevron-left"></i> Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
          >
            Next <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}

      <div className="category-footer">
        <Link to="/categories" className="btn btn-secondary btn-sm">
          <i className="fas fa-arrow-left"></i> All Categories
        </Link>
      </div>
    </div>
  );
};

export default CategoryPosts;
