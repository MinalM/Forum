import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import PostItem from '../PostItem';
import { AuthProvider } from '../../../context/AuthContext';
import { AlertProvider } from '../../../context/AlertContext';

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
const AUTHOR_ID = '000000000000000000000002';
const CURRENT_USER = { _id: '000000000000000000000099', name: 'Voter' };
const DRAFT_KEY = `draft:post:${POST_ID}:quick-answer`;

const basePost = {
  _id: POST_ID,
  title: 'Sample post',
  content: '',
  user: { _id: AUTHOR_ID, name: 'Ada' },
  category: { name: 'Career Advice' },
  createdAt: new Date().toISOString(),
  comments: [],
  commentCount: 0,
  views: 0,
  upvotes: [],
  downvotes: [],
  tags: [],
  isSolved: false
};

const renderPostItem = (post) =>
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter>
          <PostItem post={post} />
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

const signIn = () => {
  localStorage.setItem('token', 'test-token');
  axios.get.mockImplementation((url) => {
    if (url === '/api/users/me') {
      return Promise.resolve({ data: { data: CURRENT_USER } });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

const draftField = () => screen.getByPlaceholderText('Write your answer...');

describe('PostItem quick-answer draft autosave', () => {
  beforeEach(() => {
    localStorage.clear();
    axios.get.mockReset();
    axios.put.mockReset();
    axios.post.mockReset();
    axios.delete.mockReset();
    jest.useFakeTimers({ legacyFakeTimers: false });
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it('debounces saving the answer text to localStorage as the user types', async () => {
    signIn();
    renderPostItem(basePost);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Answer' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    fireEvent.change(draftField(), { target: { value: 'A partial answer' } });
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    expect(JSON.parse(localStorage.getItem(DRAFT_KEY))).toBe('A partial answer');
  });

  it('restores a saved draft on mount and shows a discard affordance', async () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify('unfinished answer'));
    signIn();

    renderPostItem(basePost);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Answer' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));

    expect(draftField()).toHaveValue('unfinished answer');
    expect(screen.getByText(/draft restored/i)).toBeInTheDocument();
  });

  it('discarding the restored draft clears the field and the stored draft', async () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify('unfinished answer'));
    signIn();

    renderPostItem(basePost);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Answer' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    await screen.findByText(/draft restored/i);

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(draftField()).toHaveValue('');
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('clears the stored draft after successfully posting the answer', async () => {
    signIn();
    axios.post.mockResolvedValue({ data: { data: { _id: 'c1', content: 'A partial answer' } } });

    renderPostItem(basePost);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Answer' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));

    fireEvent.change(draftField(), { target: { value: 'A partial answer' } });
    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Post answer' }));

    await waitFor(() => {
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });
  });
});
