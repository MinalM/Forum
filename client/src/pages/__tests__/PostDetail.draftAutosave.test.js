import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  delete: jest.fn()
}));

const POST_ID = '000000000000000000000001';
const CURRENT_USER = { _id: '000000000000000000000010', name: 'Reader', role: 'user' };
const DRAFT_KEY = `draft:post:${POST_ID}:comment`;

const basePost = {
  _id: POST_ID,
  title: 'A post to comment on',
  content: 'Some content',
  user: { _id: '000000000000000000000011', name: 'Author' },
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

const setup = () => {
  axios.get.mockReset();
  axios.get.mockImplementation((url) => {
    if (url === '/api/users/me') {
      return Promise.resolve({ data: { data: CURRENT_USER } });
    }
    if (url.endsWith('/comments')) {
      return Promise.resolve({ data: { success: true, data: [] } });
    }
    if (url.includes('/related')) {
      return Promise.resolve({ data: { success: true, data: [] } });
    }
    return Promise.resolve({ data: { success: true, data: basePost } });
  });
};

describe('PostDetail comment draft autosave', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    setup();
    jest.useFakeTimers({ legacyFakeTimers: false });
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it('debounces saving the comment text to localStorage as the user types', async () => {
    renderPostDetail();
    const textarea = await screen.findByPlaceholderText('Add a comment...');

    fireEvent.change(textarea, { target: { value: 'A helpful answer' } });
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    expect(JSON.parse(localStorage.getItem(DRAFT_KEY))).toBe('A helpful answer');
  });

  it('restores a saved comment draft on mount and shows a discard affordance', async () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify('unfinished answer'));

    renderPostDetail();
    const textarea = await screen.findByPlaceholderText('Add a comment...');

    expect(textarea).toHaveValue('unfinished answer');
    expect(screen.getByText(/draft restored/i)).toBeInTheDocument();
  });

  it('discarding the restored draft clears the field and the stored draft', async () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify('unfinished answer'));

    renderPostDetail();
    await screen.findByText(/draft restored/i);

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.getByPlaceholderText('Add a comment...')).toHaveValue('');
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('clears the stored draft after successfully posting the comment', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          _id: 'c1',
          content: 'A helpful answer',
          user: CURRENT_USER,
          createdAt: new Date().toISOString()
        }
      }
    });

    renderPostDetail();
    const textarea = await screen.findByPlaceholderText('Add a comment...');

    fireEvent.change(textarea, { target: { value: 'A helpful answer' } });
    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Post Comment' }));

    await waitFor(() => {
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });
  });
});
