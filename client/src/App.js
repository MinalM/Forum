import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router';
import './App.css';

// Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Alert from './components/layout/Alert';
import AnnouncementBanner from './components/AnnouncementBanner';
import MobileTabBar from './components/layout/MobileTabBar';

// Page Components
import Home from './pages/Home';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Categories from './pages/Categories';
import CategoryPosts from './pages/CategoryPosts';
import SearchResults from './pages/SearchResults';
import PostDetail from './pages/PostDetail';
import SavedPosts from './pages/SavedPosts';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import AdminUsers from './pages/AdminUsers';
import AdminDashboard from './pages/AdminDashboard';
import ModeratorDashboard from './pages/ModeratorDashboard';
import OAuthSuccess from './pages/OAuthSuccess';
import NotFound from './pages/NotFound';

// Route Protection
import PrivateRoute from './components/routing/PrivateRoute';
import AdminRoute from './components/routing/AdminRoute';
import ModeratorRoute from './components/routing/ModeratorRoute';
import { useAuth } from './context/AuthContext';
import { useSyncStatsigUser } from './hooks/useSyncStatsigUser';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { useFeatureFlag } from './hooks/useFeatureFlag';

const App = () => {
  const { loading } = useAuth();
  useSyncStatsigUser();

  const showShortcuts = useFeatureFlag('keyboard_shortcuts_modal', false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    if (!showShortcuts) return;
    const handler = (e) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        setShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showShortcuts]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <>
      <AnnouncementBanner />
      <Navbar />
      <div className="container">
        <Alert />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/edit-profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:categoryId" element={<CategoryPosts />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/saved-posts" element={<PrivateRoute><SavedPosts /></PrivateRoute>} />
          <Route path="/create-post" element={<PrivateRoute><CreatePost /></PrivateRoute>} />
          <Route path="/edit-post/:id" element={<PrivateRoute><EditPost /></PrivateRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/moderator" element={<ModeratorRoute><ModeratorDashboard /></ModeratorRoute>} />
          <Route path="/oauth-success" element={<OAuthSuccess />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
      <MobileTabBar />
      {showShortcuts && (
        <KeyboardShortcutsModal
          isOpen={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />
      )}
    </>
  );
};

export default App;
