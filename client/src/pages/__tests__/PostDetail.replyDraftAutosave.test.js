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
const ASKER = { _id: '000000000000000000000010', name: 'Asker', role: 'user' };
const ANSWERER = { _id: '000000000000000000000011', name: 'Answerer', role: 'user' };

const basePost = {
  _id: POST_ID,
  title: 'A post with an answer to reply to',
  content: 'Some content',
  user: { _id: ASKER._id, name: ASKER.name },
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

// Fixed in the future relative to "now" so this comment reliably sorts
// first (newest-first tie-break in PostDetail's default 'helpful' sort,
// since both comments have equal vote counts) - avoids depending on DOM
// traversal to disambiguate which "Reply" button belongs to which comment.
const answerComment = {
  _id: '000000000000000000000020',
  content: 'Here is an answer',
  user: { _id: ANSWERER._id, name: ANSWERER.name },
  createdAt: '2030-01-02T00:00:00.000Z',
  isAnswer: false,
  parentComment: null
};

const DRAFT_KEY = `draft:post:${POST_ID}:reply:${answerComment._id}`;

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
      return Promise.resolve({ data: { data: ASKER } });
    }
    if (url.endsWith('/comments')) {
      return Promise.resolve({ data: { success: true, data: [answerComment] } });
    }
    if (url.includes('/related')) {
      return Promise.resolve({ data: { success: true, data: [] } });
    }
    return Promise.resolve({ data: { success: true, data: basePost } });
  });
};

describe('PostDetail reply draft autosave', () => {
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

  const openReplyForm = async () => {
    await screen.findByText('Here is an answer');
    fireEvent.click(screen.getByRole('button', { name: /^reply$/i }));
    return screen.getByPlaceholderText(/write a reply/i);
  };

  it('debounces saving the reply text to localStorage, keyed by the parent comment', async () => {
    renderPostDetail();
    const textarea = await openReplyForm();

    fireEvent.change(textarea, { target: { value: 'Thanks, this helped!' } });
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    expect(JSON.parse(localStorage.getItem(DRAFT_KEY))).toBe('Thanks, this helped!');
  });

  it('restores a saved reply draft on reopening that comment’s reply form', async () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify('unfinished reply'));

    renderPostDetail();
    const textarea = await openReplyForm();

    expect(textarea).toHaveValue('unfinished reply');
    expect(screen.getByText(/draft restored/i)).toBeInTheDocument();
  });

  it('discarding the restored reply draft clears the field and the stored draft', async () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify('unfinished reply'));

    renderPostDetail();
    await openReplyForm();
    await screen.findByText(/draft restored/i);

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.getByPlaceholderText(/write a reply/i)).toHaveValue('');
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('clears the stored reply draft after successfully posting the reply', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          _id: 'r1',
          content: 'Thanks, this helped!',
          user: ASKER,
          createdAt: new Date().toISOString(),
          parentComment: answerComment._id
        }
      }
    });

    renderPostDetail();
    const textarea = await openReplyForm();

    fireEvent.change(textarea, { target: { value: 'Thanks, this helped!' } });
    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /post reply/i }));

    await waitFor(() => {
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });
  });

  it('keeps the draft in storage (for later restore) when the reply form is cancelled', async () => {
    renderPostDetail();
    const textarea = await openReplyForm();

    fireEvent.change(textarea, { target: { value: 'Half-written reply' } });
    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^reply$/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/write a reply/i)).toHaveValue('Half-written reply');
    });
  });

  it('keeps replies to different comments in separate drafts', async () => {
    const otherAnswer = {
      _id: '000000000000000000000021',
      content: 'A second answer',
      user: { _id: ANSWERER._id, name: ANSWERER.name },
      createdAt: '2030-01-01T00:00:00.000Z',
      isAnswer: false,
      parentComment: null
    };
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: ASKER } });
      }
      if (url.endsWith('/comments')) {
        return Promise.resolve({
          data: { success: true, data: [answerComment, otherAnswer] }
        });
      }
      if (url.includes('/related')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: { success: true, data: basePost } });
    });

    renderPostDetail();
    await screen.findByText('Here is an answer');

    const replyButtons = screen.getAllByRole('button', { name: /^reply$/i });
    fireEvent.click(replyButtons[0]);
    fireEvent.change(screen.getByPlaceholderText(/write a reply/i), {
      target: { value: 'Reply for the first answer' }
    });
    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    expect(
      JSON.parse(localStorage.getItem(`draft:post:${POST_ID}:reply:${answerComment._id}`))
    ).toBe('Reply for the first answer');
    expect(
      localStorage.getItem(`draft:post:${POST_ID}:reply:${otherAnswer._id}`)
    ).toBeNull();
  });
});
