import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import axios from 'axios';

const TrendingPosts = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    axios.get('/api/posts?sort=-views&limit=3')
      .then(res => setPosts(res.data.data || []))
      .catch(() => setPosts([]));
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="trending-posts">
      <h3>Trending</h3>
      <ul>
        {posts.map(post => (
          <li key={post._id}>
            <Link to={`/posts/${post._id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrendingPosts;
