import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import PostItem from '../components/posts/PostItem';
import PostDetail from '../pages/PostDetail';
import { AuthProvider } from '../context/AuthContext';
import { AlertProvider } from '../context/AlertContext';

// Regression coverage for the feed card (PostItem) and the thread page
// (PostDetail) disagreeing about a post's "Needs an answer" / "Solved"
// state — both must derive it from the same shared helper
// (client/src/utils/postStatus.js) and therefore agree for any given post.

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

const basePost = {
  _id: POST_ID,
  title: 'Shared post',
  content: 'Some content',
  user: { _id: '000000000000000000000002', name: 'Author' },
  category: { _id: '000000000000000000000003', name: 'Career Advice' },
  tags: [],
  upvotes: [],
  downvotes: [],
  views: 1,
  isPinned: false,
  createdAt: new Date().toISOString()
};

beforeEach(() => {
  localStorage.clear();
  axios.get.mockReset();
});

const renderFeedCard = (post) => {
  cleanup();
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter>
          <PostItem post={post} />
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );
};

const renderThreadPage = async (post, comments) => {
  cleanup();
  axios.get.mockImplementation((url) => {
    if (url.endsWith('/comments')) {
      return Promise.resolve({ data: { success: true, data: comments } });
    }
    return Promise.resolve({ data: { success: true, data: post } });
  });
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
  await screen.findByText(post.title);
};

const readBadgeState = () => ({
  solved: screen.queryAllByText('Solved').length > 0,
  needsAnswer: screen.queryAllByText('Needs an answer').length > 0
});

describe('post status badge parity between the feed card and the thread page', () => {
  const cases = [
    {
      name: 'solved',
      overrides: { isSolved: true, isLocked: false },
      comments: [{ _id: 'c1', createdAt: new Date().toISOString() }]
    },
    {
      name: 'unsolved with no answers',
      overrides: { isSolved: false, isLocked: false },
      comments: []
    },
    {
      name: 'unsolved with answers',
      overrides: { isSolved: false, isLocked: false },
      comments: [{ _id: 'c1', createdAt: new Date().toISOString() }]
    },
    {
      name: 'locked and unsolved',
      overrides: { isSolved: false, isLocked: true },
      comments: []
    }
  ];

  it.each(cases)(
    'renders the same badge state for "$name" on both surfaces',
    async ({ overrides, comments }) => {
      const post = { ...basePost, ...overrides };

      renderFeedCard({ ...post, commentCount: comments.length, comments });
      const feedState = readBadgeState();

      await renderThreadPage(post, comments);
      const threadState = readBadgeState();

      expect(threadState).toEqual(feedState);
    }
  );
});
