import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import axios from 'axios';
import PostItem from '../components/posts/PostItem';
import { FeedComposerProvider } from '../context/FeedComposerContext';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import TrendingPosts from '../components/TrendingPosts';
import RecommendedForYou from '../components/RecommendedForYou';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Drives GET /api/posts?feed=... (see server/middleware/advancedResults.js).
// "For you" (feed=recent) is ranked server-side against the signed-in
// member's profile when they have one to rank against (server/utils/
// feedRanking.js) - plain recency otherwise, including for anonymous
// visitors and cold-start members.
const FEED_TABS = [
  { key: 'recent', label: 'For you' },
  { key: 'unanswered', label: 'Unanswered' },
  { key: 'top', label: 'Top this week' }
];

const feedQuery = (feedKey) =>
  feedKey === 'top' ? 'feed=top&since=7d' : `feed=${feedKey}`;

const Home = () => {
  useDocumentTitle();

  const [activeTab, setActiveTab] = useState('recent');
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [postsError, setPostsError] = useState(false);
  const { isAuthenticated } = useAuth();
  const showTrending = useFeatureFlag('trending_posts_section', false);

  useEffect(() => {
    let cancelled = false;

    const fetchPosts = async () => {
      setLoading(true);
      try {
        const postsRes = await axios.get(`/api/posts?${feedQuery(activeTab)}&limit=5`);
        if (cancelled) return;

        const validPosts = (postsRes.data.data || []).filter(
          post => post && post.user && post.category
        );
        setPosts(validPosts);
        setPostsError(false);
        if (typeof postsRes.data.unansweredCount === 'number') {
          setUnansweredCount(postsRes.data.unansweredCount);
        }
      } catch (err) {
        if (cancelled) return;
        console.log('Error fetching posts:', err.message);
        setPosts([]);
        setPostsError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPosts();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesRes = await axios.get('/api/categories/aiml');
        setCategories(categoriesRes.data.data || []);
      } catch (err) {
        console.log('Error fetching categories:', err.message);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="main-content">
      {!isAuthenticated && (
        <section className="value-bar">
          <div className="container value-bar-inner">
            <div className="value-bar-copy">
              <p className="value-bar-headline">
                Where people actually make the jump into AI/ML.
              </p>
              <p className="value-bar-subtext">
                Read anything. Sign in to vote, answer, and get questions matched to
                your track.
              </p>
            </div>
            <div className="value-bar-actions">
              <Link to="/register" className="btn btn-lg">
                Join the Community
              </Link>
              <Link to="/categories" className="btn btn-lg btn-secondary">
                Browse Topics
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="container mt-5">
        <div className="row">
          <div className="col-md-8">
            <div className="feed-tabs" role="tablist" aria-label="Feed">
              {FEED_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`feed-tab${activeTab === tab.key ? ' feed-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span>{tab.label}</span>
                  {tab.key === 'unanswered' && (
                    <span className="feed-tab-count">{unansweredCount}</span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <div className="post-list">
                {postsError ? (
                  <p>Error loading posts</p>
                ) : posts.length > 0 ? (
                  <FeedComposerProvider>
                    {posts.map(post => <PostItem key={post._id} post={post} />)}
                  </FeedComposerProvider>
                ) : (
                  <p>No posts found</p>
                )}
              </div>
            )}

            <div className="text-center mt-4">
              <Link to="/categories" className="btn">
                View All Discussions
              </Link>
            </div>
          </div>

          <div className="col-md-4">
            {showTrending && <TrendingPosts />}
            <RecommendedForYou />
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
