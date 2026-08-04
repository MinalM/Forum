import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import axios from 'axios';
import { useAlert } from '../context/AlertContext';
import PostItem from '../components/posts/PostItem';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { setAlert } = useAlert();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (!query) {
      setPosts([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/posts/search', {
          params: { q: query, page, limit: 10 }
        });

        if (cancelled) return;

        setPosts(res.data.data);

        if (res.data.pagination) {
          const total = res.data.pagination.total ?? res.data.count;
          const limit = res.data.pagination.limit || 10;
          setTotalPages(Math.max(1, Math.ceil(total / limit)));
        }
      } catch (err) {
        if (cancelled) return;
        setPosts([]);
        setAlert('Error fetching search results', 'danger');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchResults();

    return () => {
      cancelled = true;
    };
  }, [query, page, setAlert]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo(0, 0);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="category-header">
        <div className="category-info">
          <h1>Search Results</h1>
          {query && <p>Showing results for &ldquo;{query}&rdquo;</p>}
        </div>
      </div>

      <div className="post-list">
        {posts.length > 0 ? (
          posts.map(post => <PostItem key={post._id} post={post} />)
        ) : (
          <div className="empty-state">
            <p>No results found{query ? ` for "${query}"` : ''}.</p>
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
    </div>
  );
};

export default SearchResults;
