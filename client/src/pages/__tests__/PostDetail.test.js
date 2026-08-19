import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import PostDetail from '../PostDetail';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

const POST_ID = '000000000000000000000001';

const basePost = {
  _id: POST_ID,
  title: 'Orphaned post',
  content: 'Some content',
  user: null,
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

describe('PostDetail with a deleted author (post.user is null)', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/comments')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: { success: true, data: basePost } });
    });
  });

  it('mounts without throwing and shows a deleted-user placeholder', async () => {
    renderPostDetail();

    expect(await screen.findByText('Orphaned post')).toBeInTheDocument();
    expect(screen.getByText(/deleted user/i)).toBeInTheDocument();
  });

  it('still renders the rest of the post (content and category)', async () => {
    renderPostDetail();

    expect(await screen.findByText('Orphaned post')).toBeInTheDocument();
    expect(screen.getByText('Some content')).toBeInTheDocument();
    expect(screen.getByText('Career Advice')).toBeInTheDocument();
  });

  it('sets the document title to the post title once loaded', async () => {
    renderPostDetail();

    await screen.findByText('Orphaned post');
    expect(document.title).toBe('Orphaned post | AI/ML Career Forum');
  });
});

describe('PostDetail markdown rendering', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  const renderWithContent = (content) => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/comments')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({
        data: { success: true, data: { ...basePost, content } }
      });
    });
    return renderPostDetail();
  };

  it('renders markdown formatting instead of raw syntax', async () => {
    renderWithContent('**bold** and a [link](https://example.com)');

    await screen.findByText('Orphaned post');
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'link' })).toHaveAttribute(
      'href',
      'https://example.com'
    );
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it('neutralizes a <script> XSS payload in post content', async () => {
    renderWithContent('hello <script>alert("xss")</script> world');

    await screen.findByText('Orphaned post');
    expect(screen.getByText(/hello\s+world/)).toBeInTheDocument();
    expect(screen.queryByText(/alert\(/)).not.toBeInTheDocument();
  });

  it('neutralizes an onerror-attribute XSS payload in post content', async () => {
    renderWithContent('<img src="x" onerror="alert(1)">');

    await screen.findByText('Orphaned post');
    expect(screen.getByRole('img')).not.toHaveAttribute('onerror');
  });
});
