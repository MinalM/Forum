import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import PostItem from '../PostItem';
import { AuthProvider } from '../../../context/AuthContext';
import { AlertProvider } from '../../../context/AlertContext';
import { FeedComposerProvider } from '../../../context/FeedComposerContext';
import Alert from '../../layout/Alert';

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
          <Alert />
          <PostItem post={post} />
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

const renderTwoPostItems = (postA, postB) =>
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter>
          <FeedComposerProvider>
            <PostItem post={postA} />
            <PostItem post={postB} />
          </FeedComposerProvider>
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

// Authenticates the AuthProvider by seeding a token and mocking the
// /api/users/me load it triggers on mount.
const CURRENT_USER = { _id: '000000000000000000000099', name: 'Voter' };
const signIn = () => {
  localStorage.setItem('token', 'test-token');
  axios.get.mockImplementation((url) => {
    if (url === '/api/users/me') {
      return Promise.resolve({ data: { data: CURRENT_USER } });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

beforeEach(() => {
  localStorage.clear();
  axios.get.mockReset();
  axios.put.mockReset();
  axios.post.mockReset();
  axios.delete.mockReset();
});

describe('PostItem excerpt', () => {
  it('shows plain text with no raw markdown syntax', () => {
    renderPostItem({
      ...basePost,
      content: '**Title:** Image Classification Model in Python **Description:**'
    });

    const excerpt = screen.getByText(
      /Title: Image Classification Model in Python Description:/
    );
    expect(excerpt).toBeInTheDocument();
    expect(excerpt.textContent).not.toContain('**');
  });

  it('strips links and code syntax down to visible text', () => {
    renderPostItem({
      ...basePost,
      content: 'See [the docs](https://example.com) and run `npm test`'
    });

    const excerpt = screen.getByText(/See the docs and run npm test/);
    expect(excerpt.textContent).not.toMatch(/[[\]`]/);
  });

  it('truncates long excerpts to 200 characters plus ellipsis', () => {
    const longContent = 'a'.repeat(250);
    renderPostItem({ ...basePost, content: longContent });

    const excerpt = screen.getByText(/^a+\.\.\.$/);
    expect(excerpt.textContent).toBe('a'.repeat(200) + '...');
  });

  it('never renders raw HTML from post content', () => {
    renderPostItem({
      ...basePost,
      content: 'hi <script>alert(1)</script> there'
    });

    expect(screen.getByText(/hi\s+there/)).toBeInTheDocument();
    expect(screen.queryByText(/alert\(1\)/)).not.toBeInTheDocument();
  });
});

describe('PostItem post/solved/needs-answer states', () => {
  it('shows a "Needs an answer" badge and the amber card modifier for a commentless open question', () => {
    renderPostItem({ ...basePost, commentCount: 0, isSolved: false });

    expect(screen.getByText('Needs an answer')).toBeInTheDocument();
    expect(screen.queryByText('Solved')).not.toBeInTheDocument();
    expect(screen.getByTestId('post-card').className).toMatch(/post-card--needs-answer/);
  });

  it('shows a "Solved" badge and no needs-answer state once answered and accepted', () => {
    renderPostItem({ ...basePost, commentCount: 2, isSolved: true });

    expect(screen.getByText('Solved')).toBeInTheDocument();
    expect(screen.queryByText('Needs an answer')).not.toBeInTheDocument();
    expect(screen.getByTestId('post-card').className).not.toMatch(/post-card--needs-answer/);
  });

  it('shows neither badge for a post that already has discussion but is not marked solved', () => {
    renderPostItem({ ...basePost, commentCount: 3, isSolved: false });

    expect(screen.queryByText('Solved')).not.toBeInTheDocument();
    expect(screen.queryByText('Needs an answer')).not.toBeInTheDocument();
    expect(screen.getByTestId('post-card').className).not.toMatch(/post-card--needs-answer/);
  });

  it('renders the aiMlLevel badge the app has never displayed before', () => {
    renderPostItem({ ...basePost, aiMlLevel: 'intermediate' });

    expect(screen.getByText('Intermediate')).toBeInTheDocument();
  });
});

describe('PostItem voting, unauthenticated', () => {
  it('renders vote controls disabled rather than hidden', () => {
    renderPostItem(basePost);

    expect(screen.getByLabelText('Upvote post')).toBeDisabled();
    expect(screen.getByLabelText('Downvote post')).toBeDisabled();
  });

  it('does not call the vote endpoint when disabled', () => {
    renderPostItem(basePost);

    fireEvent.click(screen.getByLabelText('Upvote post'));

    expect(axios.put).not.toHaveBeenCalled();
  });
});

describe('PostItem voting, authenticated', () => {
  const voteCount = () => screen.getByTestId('vote-count').textContent;

  it('optimistically updates the vote count and calls the server', async () => {
    signIn();
    axios.put.mockResolvedValue({
      data: { data: { upvotes: [CURRENT_USER._id], downvotes: [], score: 1 } }
    });

    renderPostItem(basePost);

    await waitFor(() => expect(screen.getByLabelText('Upvote post')).toBeEnabled());

    fireEvent.click(screen.getByLabelText('Upvote post'));

    // Optimistic: the count moves before the mocked request resolves.
    expect(voteCount()).toBe('1');
    expect(axios.put).toHaveBeenCalledWith(`/api/posts/${POST_ID}/upvote`);

    await waitFor(() => expect(voteCount()).toBe('1'));
  });

  it('retracts an active vote back to zero', async () => {
    signIn();
    axios.put.mockResolvedValue({
      data: { data: { upvotes: [], downvotes: [], score: 0 } }
    });

    renderPostItem({ ...basePost, upvotes: [CURRENT_USER._id] });

    await waitFor(() => expect(screen.getByLabelText('Upvote post')).toBeEnabled());
    expect(screen.getByLabelText('Upvote post')).toHaveClass('active');
    expect(voteCount()).toBe('1');

    fireEvent.click(screen.getByLabelText('Upvote post'));

    expect(voteCount()).toBe('0');
    await waitFor(() =>
      expect(screen.getByLabelText('Upvote post')).not.toHaveClass('active')
    );
  });

  it('rolls back the optimistic update if the server call fails', async () => {
    signIn();
    axios.put.mockRejectedValue(new Error('network error'));

    renderPostItem(basePost);

    await waitFor(() => expect(screen.getByLabelText('Upvote post')).toBeEnabled());

    fireEvent.click(screen.getByLabelText('Upvote post'));

    expect(voteCount()).toBe('1');

    await waitFor(() => expect(voteCount()).toBe('0'));
  });
});

describe('PostItem save toggle, unauthenticated', () => {
  it('renders the save control disabled rather than hidden', () => {
    renderPostItem(basePost);

    expect(screen.getByLabelText('Save post')).toBeDisabled();
  });

  it('does not call the save endpoint when disabled', () => {
    renderPostItem(basePost);

    fireEvent.click(screen.getByLabelText('Save post'));

    expect(axios.post).not.toHaveBeenCalled();
    expect(axios.delete).not.toHaveBeenCalled();
  });
});

describe('PostItem save toggle, authenticated', () => {
  const signInWithSaveStatus = (saved) => {
    localStorage.setItem('token', 'test-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: CURRENT_USER } });
      }
      if (url === `/api/posts/${POST_ID}/save`) {
        return Promise.resolve({ data: { data: { saved } } });
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
  };

  it('fetches save status on mount and reflects an already-saved post', async () => {
    signInWithSaveStatus(true);

    renderPostItem(basePost);

    expect(await screen.findByLabelText('Unsave post')).toHaveClass('active');
  });

  it('optimistically saves a post and calls the server', async () => {
    signInWithSaveStatus(false);
    axios.post.mockResolvedValue({ data: { data: { saved: true } } });

    renderPostItem(basePost);

    await waitFor(() => expect(screen.getByLabelText('Save post')).toBeEnabled());

    fireEvent.click(screen.getByLabelText('Save post'));

    expect(screen.getByLabelText('Unsave post')).toHaveClass('active');
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(`/api/posts/${POST_ID}/save`)
    );
  });

  it('unsaves an already-saved post', async () => {
    signInWithSaveStatus(true);
    axios.delete.mockResolvedValue({ data: { data: { saved: false } } });

    renderPostItem(basePost);

    fireEvent.click(await screen.findByLabelText('Unsave post'));

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(`/api/posts/${POST_ID}/save`)
    );
    expect(screen.getByLabelText('Save post')).not.toHaveClass('active');
  });

  it('rolls back the optimistic update if the save call fails', async () => {
    signInWithSaveStatus(false);
    axios.post.mockRejectedValue(new Error('network error'));

    renderPostItem(basePost);

    await waitFor(() => expect(screen.getByLabelText('Save post')).toBeEnabled());

    fireEvent.click(screen.getByLabelText('Save post'));

    expect(screen.getByLabelText('Unsave post')).toBeInTheDocument();

    await screen.findByLabelText('Save post');
  });
});

describe('PostItem answer composer', () => {
  const draftField = () => screen.getByPlaceholderText('Write your answer...');

  it('shows a filled Answer button for a commentless question', () => {
    renderPostItem({ ...basePost, commentCount: 0 });

    const button = screen.getByRole('button', { name: 'Answer' });
    expect(button).toHaveClass('answer-btn--filled');
  });

  it('shows an outline Reply button once a post already has discussion', () => {
    renderPostItem({ ...basePost, commentCount: 2 });

    const button = screen.getByRole('button', { name: 'Reply' });
    expect(button).toHaveClass('answer-btn--outline');
  });

  it('opens a composer, submits an answer, and the card leaves the needs-answer state', async () => {
    signIn();
    axios.post.mockResolvedValue({ data: { data: { _id: 'c1', content: 'My answer' } } });

    renderPostItem({ ...basePost, commentCount: 0 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Answer' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    fireEvent.change(draftField(), { target: { value: 'My answer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post answer' }));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(`/api/posts/${POST_ID}/comments`, {
        content: 'My answer'
      })
    );

    await waitFor(() => expect(screen.queryByText('Needs an answer')).not.toBeInTheDocument());
    expect(screen.queryByPlaceholderText('Write your answer...')).not.toBeInTheDocument();
  });

  it('discards the draft on cancel', async () => {
    signIn();
    renderPostItem({ ...basePost, commentCount: 0 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Answer' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    fireEvent.change(draftField(), { target: { value: 'Half-written thought' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByPlaceholderText('Write your answer...')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    expect(draftField()).toHaveValue('');
  });

  it('leaves the draft intact and surfaces an alert when submitting fails', async () => {
    signIn();
    axios.post.mockRejectedValue(new Error('network error'));

    renderPostItem({ ...basePost, commentCount: 0 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Answer' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    fireEvent.change(draftField(), { target: { value: 'My answer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post answer' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    expect(draftField()).toHaveValue('My answer');
    expect(await screen.findByText(/error posting your answer/i)).toBeInTheDocument();
  });

  it('shows a sign-in prompt instead of the composer for unauthenticated users', () => {
    renderPostItem({ ...basePost, commentCount: 0 });

    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));

    expect(screen.queryByPlaceholderText('Write your answer...')).not.toBeInTheDocument();
    expect(screen.getByText(/log in/i)).toBeInTheDocument();
  });

  it('keeps only one composer open at a time across a shared feed', async () => {
    signIn();
    const postA = { ...basePost, _id: POST_ID, commentCount: 0 };
    const postB = {
      ...basePost,
      _id: '000000000000000000000003',
      commentCount: 0
    };

    renderTwoPostItems(postA, postB);
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Answer' })[0]).toBeEnabled()
    );

    const [answerA, answerB] = screen.getAllByRole('button', { name: 'Answer' });
    fireEvent.click(answerA);
    expect(screen.getAllByPlaceholderText('Write your answer...')).toHaveLength(1);

    fireEvent.click(answerB);
    expect(screen.getAllByPlaceholderText('Write your answer...')).toHaveLength(1);
  });
});
