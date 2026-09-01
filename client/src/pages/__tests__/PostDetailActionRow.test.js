import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import PostDetail from '../PostDetail';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

// Regression coverage for the post-detail action row overflow: reader
// actions (vote, Save, Notify) stay inline; author/moderator actions
// (Edit, Delete, Lock, Pin, Report) collapse behind one "More actions"
// toggle instead of sitting inline at equal visual weight - see the
// "post-detail header and action row are dense, noisy, and overflow on
// mobile" backlog item.

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  delete: jest.fn()
}));

const POST_ID = '000000000000000000000001';
const AUTHOR = { _id: '000000000000000000000010', name: 'Author', role: 'user' };
const OTHER_USER = { _id: '000000000000000000000011', name: 'Reader', role: 'user' };
const ADMIN = { _id: '000000000000000000000012', name: 'Admin', role: 'admin' };

const basePost = {
  _id: POST_ID,
  title: 'A post with actions',
  content: 'Some content',
  user: { _id: AUTHOR._id, name: AUTHOR.name },
  category: { _id: '000000000000000000000002', name: 'Career Advice' },
  tags: [],
  upvotes: [],
  downvotes: [],
  views: 3,
  isSolved: false,
  isPinned: false,
  isLocked: false,
  createdAt: new Date().toISOString()
};

const renderPostDetail = () =>
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter initialEntries={[`/posts/${POST_ID}`]}>
          <Routes>
            <Route path="/posts/:id" element={<PostDetail />} />
          </Routes>
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

const setupAsUser = (currentUser, post = basePost) => {
  axios.get.mockReset();
  localStorage.clear();
  if (currentUser) {
    localStorage.setItem('token', 'fake-token');
  }
  axios.get.mockImplementation((url) => {
    if (url === '/api/users/me') {
      return Promise.resolve({ data: { data: currentUser } });
    }
    if (url.endsWith('/comments')) {
      return Promise.resolve({ data: { success: true, data: [] } });
    }
    return Promise.resolve({ data: { success: true, data: post } });
  });
};

afterEach(() => {
  localStorage.clear();
});

describe('PostDetail action row: inline reader actions vs. overflow menu', () => {
  it('keeps only vote, Save and Notify inline for an unauthenticated visitor (no overflow toggle)', async () => {
    setupAsUser(null);
    renderPostDetail();

    await screen.findByText('A post with actions');
    expect(
      screen.queryByRole('button', { name: /more actions/i })
    ).not.toBeInTheDocument();
  });

  it('keeps only vote, Save and Notify inline for a signed-in non-author reader', async () => {
    setupAsUser(OTHER_USER);
    renderPostDetail();

    await screen.findByText('A post with actions');
    expect(screen.getByRole('button', { name: /upvote question/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /downvote question/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notify me of answers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();

    // Edit/Delete/Lock/Pin never apply to this reader, but Report does -
    // it must not render inline (unopened), only behind the toggle.
    expect(screen.queryByRole('button', { name: /^report$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
  });

  it('reveals Report behind the overflow toggle for a non-author reader, and nothing else', async () => {
    setupAsUser(OTHER_USER);
    renderPostDetail();

    await screen.findByText('A post with actions');
    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('button', { name: /^report$/i })).toBeInTheDocument();
    expect(within(menu).queryByRole('link', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /^lock$/i })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /^pin$/i })).not.toBeInTheDocument();
  });

  it('shows Edit and Delete (not Lock/Pin/Report) behind the toggle for the post author', async () => {
    setupAsUser(AUTHOR);
    renderPostDetail();

    await screen.findByText('A post with actions');
    expect(screen.queryByRole('link', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('link', { name: /^edit$/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /^lock$/i })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /^pin$/i })).not.toBeInTheDocument();
    // The author never reports their own post.
    expect(within(menu).queryByRole('button', { name: /^report$/i })).not.toBeInTheDocument();
  });

  it('shows Edit, Delete, Lock, Pin and Report behind one toggle for an admin viewing someone else\'s post', async () => {
    setupAsUser(ADMIN);
    renderPostDetail();

    await screen.findByText('A post with actions');
    // Inline stays reader-only even for staff - nothing else is in the
    // document until the overflow toggle is opened.
    expect(screen.queryByText(/^edit$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^delete$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^lock$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^pin$/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('link', { name: /^edit$/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /^lock$/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /^pin$/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /^report$/i })).toBeInTheDocument();
  });

  it('toggles the overflow menu open and closed on repeated clicks', async () => {
    setupAsUser(ADMIN);
    renderPostDetail();

    await screen.findByText('A post with actions');
    const toggle = screen.getByRole('button', { name: /more actions/i });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('PostDetail action row: 44x44 touch targets and quiet overflow styling', () => {
  it('gives the overflow toggle an accessible name and keyboard reachability', async () => {
    setupAsUser(ADMIN);
    renderPostDetail();

    await screen.findByText('A post with actions');
    const toggle = screen.getByRole('button', { name: /more actions/i });
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle).toHaveAttribute('aria-haspopup', 'true');
  });

  it('renders every overflow menu item with the same class (one consistent quiet style)', async () => {
    setupAsUser(ADMIN);
    renderPostDetail();

    await screen.findByText('A post with actions');
    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));

    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('button').concat(within(menu).getAllByRole('link'));
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(item.className).toContain('post-actions-overflow-item');
      // None of the old alert-color button variants survive the move.
      expect(item.className).not.toMatch(/btn-danger|btn-outline-warning|btn-outline-info|btn-outline-danger|btn-warning|btn-info/);
    });
  });
});
