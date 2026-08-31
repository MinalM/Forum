import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import PostDetail from '../PostDetail';
import { AlertProvider, useAlert } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

const appCss = fs.readFileSync(path.join(__dirname, '../../App.css'), 'utf8');

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

describe('PostDetail comment markdown rendering', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  const baseComment = {
    _id: '000000000000000000000003',
    user: { _id: '000000000000000000000004', name: 'Commenter' },
    createdAt: new Date().toISOString(),
    isAnswer: false
  };

  const renderWithCommentContent = (content) => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/comments')) {
        return Promise.resolve({
          data: { success: true, data: [{ ...baseComment, content }] }
        });
      }
      return Promise.resolve({ data: { success: true, data: basePost } });
    });
    return renderPostDetail();
  };

  it('renders markdown formatting in comment content instead of raw syntax', async () => {
    renderWithCommentContent('**bold** and a [link](https://example.com)');

    await screen.findByText('Orphaned post');
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'link' })).toHaveAttribute(
      'href',
      'https://example.com'
    );
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it('neutralizes a <script> XSS payload in comment content', async () => {
    renderWithCommentContent('hello <script>alert("xss")</script> world');

    await screen.findByText('Orphaned post');
    expect(screen.getByText(/hello\s+world/)).toBeInTheDocument();
    expect(screen.queryByText(/alert\(/)).not.toBeInTheDocument();
  });

  it('neutralizes an onerror-attribute XSS payload in comment content', async () => {
    renderWithCommentContent('<img src="x" onerror="alert(1)">');

    await screen.findByText('Orphaned post');
    expect(screen.getByRole('img', { name: '' })).not.toHaveAttribute('onerror');
  });
});

describe('PostDetail vote button touch targets (WCAG 2.5.5)', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/comments')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: { success: true, data: basePost } });
    });

    // Inject the real App.css source as an actual <style> tag so
    // getComputedStyle() below reflects real rule matching instead of the
    // transform stub Jest normally substitutes for a CSS import.
    const style = document.createElement('style');
    style.textContent = appCss;
    document.head.appendChild(style);
  });

  it('renders the upvote and downvote buttons at least 44x44', async () => {
    renderPostDetail();

    await screen.findByText('Orphaned post');
    const voteButtons = screen
      .getAllByRole('button')
      .filter((button) => button.className.includes('vote-btn'));
    expect(voteButtons).toHaveLength(2);

    voteButtons.forEach((button) => {
      const style = getComputedStyle(button);
      expect(parseFloat(style.minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseFloat(style.minWidth)).toBeGreaterThanOrEqual(44);
    });
  });

});

describe('PostDetail accepted answers', () => {
  const ASKER = { _id: '000000000000000000000010', name: 'Asker', role: 'user' };
  const OTHER_USER = { _id: '000000000000000000000011', name: 'Commenter', role: 'user' };
  const MODERATOR = { _id: '000000000000000000000012', name: 'Mod', role: 'moderator' };

  const answerComment = {
    _id: '000000000000000000000020',
    content: 'Here is an answer',
    user: { _id: OTHER_USER._id, name: OTHER_USER.name },
    createdAt: new Date().toISOString(),
    isAnswer: false
  };

  const postWithAsker = {
    ...basePost,
    user: { _id: ASKER._id, name: ASKER.name }
  };

  const setupAsUser = (currentUser, comments = [answerComment], post = postWithAsker) => {
    axios.get.mockReset();
    axios.put.mockReset();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: currentUser } });
      }
      if (url.endsWith('/comments')) {
        return Promise.resolve({ data: { success: true, data: comments } });
      }
      return Promise.resolve({ data: { success: true, data: post } });
    });
  };

  afterEach(() => {
    localStorage.clear();
  });

  it('shows the accept control to the asker', async () => {
    setupAsUser(ASKER);
    renderPostDetail();

    await screen.findByText('Orphaned post');
    expect(
      screen.getByRole('button', { name: /accept this answer/i })
    ).toBeInTheDocument();
  });

  it('hides the accept control from a user who is not the asker or a moderator', async () => {
    setupAsUser(OTHER_USER);
    renderPostDetail();

    await screen.findByText('Orphaned post');
    expect(
      screen.queryByRole('button', { name: /accept this answer/i })
    ).not.toBeInTheDocument();
  });

  it('shows the accept control to a moderator who is not the asker', async () => {
    setupAsUser(MODERATOR);
    renderPostDetail();

    await screen.findByText('Orphaned post');
    expect(
      screen.getByRole('button', { name: /accept this answer/i })
    ).toBeInTheDocument();
  });

  it('accepting an answer flips the comment card and the question badge', async () => {
    setupAsUser(ASKER);
    axios.put.mockResolvedValue({
      data: { success: true, data: { ...answerComment, isAnswer: true } }
    });
    renderPostDetail();

    await screen.findByText('Needs an answer');

    fireEvent.click(screen.getByRole('button', { name: /accept this answer/i }));

    await screen.findByText('Solved', { selector: 'span.badge-success' });
    expect(screen.getByText(/accepted by asker/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^unaccept$/i })).toBeInTheDocument();
  });

  it('un-accepting an answer reverts the comment card and the question badge', async () => {
    setupAsUser(
      ASKER,
      [{ ...answerComment, isAnswer: true }],
      { ...postWithAsker, isSolved: true }
    );
    axios.put.mockResolvedValue({
      data: { success: true, data: { ...answerComment, isAnswer: false } }
    });
    renderPostDetail();

    await screen.findByText('Solved', { selector: 'span.badge-success' });

    fireEvent.click(screen.getByRole('button', { name: /^unaccept$/i }));

    await screen.findByText('Needs an answer');
    expect(screen.queryByText(/accepted by/i)).not.toBeInTheDocument();
  });

  it('renders the accept-answer button at least 44x44', async () => {
    setupAsUser(ASKER);

    const style = document.createElement('style');
    style.textContent = appCss;
    document.head.appendChild(style);

    renderPostDetail();

    const button = await screen.findByRole('button', { name: /accept this answer/i });
    const computed = getComputedStyle(button);
    expect(parseFloat(computed.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(computed.minWidth)).toBeGreaterThanOrEqual(44);
  });

  it('does not offer a standalone "Mark as Solved" control to the asker — accepting an answer is the only way to solve a post', async () => {
    setupAsUser(ASKER);
    renderPostDetail();

    await screen.findByText('Orphaned post');
    expect(
      screen.queryByRole('button', { name: /mark as solved/i })
    ).not.toBeInTheDocument();
  });

  it('the two isSolved paths cannot disagree: solving is driven only by accepting/unaccepting an answer', async () => {
    setupAsUser(ASKER);
    axios.put.mockResolvedValue({
      data: { success: true, data: { ...answerComment, isAnswer: true } }
    });
    renderPostDetail();

    await screen.findByText('Needs an answer');

    fireEvent.click(screen.getByRole('button', { name: /accept this answer/i }));

    await screen.findByText('Solved', { selector: 'span.badge-success' });
    // No standalone control exists that could set isSolved independently
    // of the accepted-answer state, so the two can never diverge.
    expect(
      screen.queryByRole('button', { name: /mark as solved/i })
    ).not.toBeInTheDocument();
    expect(axios.put).not.toHaveBeenCalledWith(
      expect.stringContaining('/solve')
    );
  });
});

describe('PostDetail threaded replies', () => {
  const ASKER = { _id: '000000000000000000000010', name: 'Asker', role: 'user' };
  const ANSWERER = { _id: '000000000000000000000011', name: 'Answerer', role: 'user' };
  const OTHER_USER = { _id: '000000000000000000000012', name: 'Other', role: 'user' };

  const postWithAsker = {
    ...basePost,
    user: { _id: ASKER._id, name: ASKER.name }
  };

  const answerComment = {
    _id: '000000000000000000000020',
    content: 'Here is an answer',
    user: { _id: ANSWERER._id, name: ANSWERER.name },
    createdAt: new Date().toISOString(),
    isAnswer: false,
    parentComment: null
  };

  const askerReply = {
    _id: '000000000000000000000021',
    content: 'Thanks, that worked!',
    user: { _id: ASKER._id, name: ASKER.name },
    createdAt: new Date().toISOString(),
    isAnswer: false,
    parentComment: answerComment._id
  };

  const setupAsUser = (currentUser, comments, post = postWithAsker) => {
    axios.get.mockReset();
    axios.put.mockReset();
    axios.post.mockReset();
    localStorage.clear();
    if (currentUser) {
      localStorage.setItem('token', 'fake-token');
    }
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: currentUser } });
      }
      if (url.endsWith('/comments')) {
        return Promise.resolve({ data: { success: true, data: comments } });
      }
      return Promise.resolve({ data: { success: true, data: post } });
    });
  };

  afterEach(() => {
    localStorage.clear();
  });

  it('loads existing replies nested under their parent comment', async () => {
    setupAsUser(ASKER, [answerComment, askerReply]);
    renderPostDetail();

    await screen.findByText('Here is an answer');
    const repliesContainer = screen.getByTestId('comment-replies');
    expect(within(repliesContainer).getByText('Thanks, that worked!')).toBeInTheDocument();
  });

  it('posting a new reply appears under the right parent', async () => {
    setupAsUser(ASKER, [answerComment]);
    axios.post.mockResolvedValue({
      data: { success: true, data: askerReply }
    });
    renderPostDetail();

    await screen.findByText('Here is an answer');
    fireEvent.click(screen.getByRole('button', { name: /^reply$/i }));

    const textarea = screen.getByPlaceholderText(/write a reply/i);
    fireEvent.change(textarea, { target: { value: 'Thanks, that worked!' } });
    fireEvent.click(screen.getByRole('button', { name: /post reply/i }));

    const repliesContainer = await screen.findByTestId('comment-replies');
    expect(within(repliesContainer).getByText('Thanks, that worked!', { selector: 'p' })).toBeInTheDocument();
    expect(axios.post).toHaveBeenCalledWith(
      `/api/comments/${answerComment._id}/replies`,
      { content: 'Thanks, that worked!' }
    );
  });

  it('does not offer the reply control on a locked thread', async () => {
    setupAsUser(ASKER, [answerComment], { ...postWithAsker, isLocked: true });
    renderPostDetail();

    await screen.findByText('Here is an answer');
    expect(screen.queryByRole('button', { name: /^reply$/i })).not.toBeInTheDocument();
  });

  it('marks a reply from the asker with an Asker chip', async () => {
    setupAsUser(OTHER_USER, [answerComment, askerReply]);
    renderPostDetail();

    const repliesContainer = await screen.findByTestId('comment-replies');
    expect(within(repliesContainer).getByText('Thanks, that worked!')).toBeInTheDocument();
    expect(within(repliesContainer).getByText('Asker', { selector: 'span' })).toBeInTheDocument();
  });

  it('does not mark a non-asker reply with an Asker chip', async () => {
    const otherReply = {
      ...askerReply,
      _id: '000000000000000000000022',
      user: { _id: OTHER_USER._id, name: OTHER_USER.name }
    };
    setupAsUser(OTHER_USER, [answerComment, otherReply]);
    renderPostDetail();

    const repliesContainer = await screen.findByTestId('comment-replies');
    expect(within(repliesContainer).getByText('Thanks, that worked!')).toBeInTheDocument();
    expect(within(repliesContainer).queryByText('Asker', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('renders the reply and post-reply buttons at least 44x44', async () => {
    setupAsUser(ASKER, [answerComment]);

    const style = document.createElement('style');
    style.textContent = appCss;
    document.head.appendChild(style);

    renderPostDetail();

    await screen.findByText('Here is an answer');
    const replyButton = screen.getByRole('button', { name: /^reply$/i });
    let computed = getComputedStyle(replyButton);
    expect(parseFloat(computed.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(computed.minWidth)).toBeGreaterThanOrEqual(44);

    fireEvent.click(replyButton);
    const postReplyButton = screen.getByRole('button', { name: /post reply/i });
    computed = getComputedStyle(postReplyButton);
    expect(parseFloat(computed.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(computed.minWidth)).toBeGreaterThanOrEqual(44);
  });
});

describe('PostDetail answer voting and Most helpful ordering', () => {
  const ASKER = { _id: '000000000000000000000010', name: 'Asker', role: 'user' };
  const ANSWERER = { _id: '000000000000000000000011', name: 'Answerer', role: 'user' };

  const postWithAsker = {
    ...basePost,
    user: { _id: ASKER._id, name: ASKER.name }
  };

  const makeComment = (overrides) => ({
    _id: '000000000000000000000020',
    content: 'An answer',
    user: { _id: ANSWERER._id, name: ANSWERER.name },
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    isAnswer: false,
    parentComment: null,
    upvotes: [],
    downvotes: [],
    ...overrides
  });

  const setupAsUser = (currentUser, comments, post = postWithAsker) => {
    axios.get.mockReset();
    axios.put.mockReset();
    localStorage.clear();
    if (currentUser) {
      localStorage.setItem('token', 'fake-token');
    }
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: currentUser } });
      }
      if (url.endsWith('/comments')) {
        return Promise.resolve({ data: { success: true, data: comments } });
      }
      return Promise.resolve({ data: { success: true, data: post } });
    });
  };

  afterEach(() => {
    localStorage.clear();
  });

  const contentOrder = (labels) =>
    screen
      .getAllByText(new RegExp(`^(${labels.join('|')})$`), { selector: 'p' })
      .map((el) => el.textContent);

  it('upvoting an answer sends the vote and updates the count', async () => {
    const comment = makeComment({ content: 'Answer A' });
    setupAsUser(ANSWERER, [comment]);
    axios.put.mockResolvedValue({
      data: { success: true, data: { ...comment, upvotes: [ANSWERER._id] } }
    });
    renderPostDetail();

    await screen.findByText('Answer A');
    fireEvent.click(screen.getByRole('button', { name: /upvote answer/i }));

    expect(axios.put).toHaveBeenCalledWith(
      `/api/comments/${comment._id}/upvote`
    );
    const voteCount = screen.getByTestId(`comment-vote-count-${comment._id}`);
    await waitFor(() => expect(voteCount).toHaveTextContent('1'));
    expect(
      screen.getByRole('button', { name: /upvote answer/i })
    ).toHaveClass('active');
  });

  it('retracts an answer upvote on a second click', async () => {
    const comment = makeComment({
      content: 'Answer A',
      upvotes: [ANSWERER._id]
    });
    setupAsUser(ANSWERER, [comment]);
    axios.put.mockResolvedValue({
      data: { success: true, data: { ...comment, upvotes: [] } }
    });
    renderPostDetail();

    await screen.findByText('Answer A');
    fireEvent.click(screen.getByRole('button', { name: /upvote answer/i }));

    const voteCount = screen.getByTestId(`comment-vote-count-${comment._id}`);
    await waitFor(() => expect(voteCount).toHaveTextContent('0'));
    expect(
      screen.getByRole('button', { name: /upvote answer/i })
    ).not.toHaveClass('active');
  });

  it('disables answer vote buttons for an unauthenticated visitor', async () => {
    const comment = makeComment({ content: 'Answer A' });
    setupAsUser(null, [comment]);
    renderPostDetail();

    await screen.findByText('Answer A');
    expect(screen.getByRole('button', { name: /upvote answer/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /downvote answer/i })).toBeDisabled();
  });

  it('orders answers by vote count under Most helpful (the default)', async () => {
    const low = makeComment({
      _id: 'a1', content: 'Answer A', upvotes: ['u1'],
      createdAt: '2026-01-01T00:00:00.000Z'
    });
    const high = makeComment({
      _id: 'a2', content: 'Answer B', upvotes: ['u1', 'u2', 'u3'],
      createdAt: '2026-01-02T00:00:00.000Z'
    });
    const zero = makeComment({
      _id: 'a3', content: 'Answer C', upvotes: [],
      createdAt: '2026-01-03T00:00:00.000Z'
    });
    setupAsUser(ANSWERER, [low, high, zero]);
    renderPostDetail();

    await screen.findByText('Answer A');
    expect(contentOrder(['Answer A', 'Answer B', 'Answer C'])).toEqual([
      'Answer B', 'Answer A', 'Answer C'
    ]);
  });

  it('orders answers by recency under Newest', async () => {
    const low = makeComment({
      _id: 'a1', content: 'Answer A', upvotes: ['u1'],
      createdAt: '2026-01-01T00:00:00.000Z'
    });
    const high = makeComment({
      _id: 'a2', content: 'Answer B', upvotes: ['u1', 'u2', 'u3'],
      createdAt: '2026-01-02T00:00:00.000Z'
    });
    const zero = makeComment({
      _id: 'a3', content: 'Answer C', upvotes: [],
      createdAt: '2026-01-03T00:00:00.000Z'
    });
    setupAsUser(ANSWERER, [low, high, zero]);
    renderPostDetail();

    await screen.findByText('Answer A');
    fireEvent.click(screen.getByRole('button', { name: /^newest$/i }));

    expect(contentOrder(['Answer A', 'Answer B', 'Answer C'])).toEqual([
      'Answer C', 'Answer B', 'Answer A'
    ]);
  });

  it('keeps the accepted answer pinned first under both sort orders', async () => {
    const accepted = makeComment({
      _id: 'a1', content: 'Accepted answer', upvotes: [],
      isAnswer: true, createdAt: '2026-01-01T00:00:00.000Z'
    });
    const popular = makeComment({
      _id: 'a2', content: 'Popular answer', upvotes: ['u1', 'u2', 'u3'],
      createdAt: '2026-01-03T00:00:00.000Z'
    });
    setupAsUser(ANSWERER, [accepted, popular]);
    renderPostDetail();

    await screen.findByText('Accepted answer');
    expect(contentOrder(['Accepted answer', 'Popular answer'])).toEqual([
      'Accepted answer', 'Popular answer'
    ]);

    fireEvent.click(screen.getByRole('button', { name: /^newest$/i }));
    expect(contentOrder(['Accepted answer', 'Popular answer'])).toEqual([
      'Accepted answer', 'Popular answer'
    ]);
  });

  it('renders the sort toggle and vote buttons at least 44x44', async () => {
    const comment = makeComment({ content: 'Answer A' });
    setupAsUser(ANSWERER, [comment]);

    const style = document.createElement('style');
    style.textContent = appCss;
    document.head.appendChild(style);

    renderPostDetail();

    await screen.findByText('Answer A');
    const targets = [
      screen.getByRole('button', { name: /^most helpful$/i }),
      screen.getByRole('button', { name: /^newest$/i }),
      screen.getByRole('button', { name: /upvote answer/i }),
      screen.getByRole('button', { name: /downvote answer/i })
    ];

    targets.forEach((button) => {
      const computed = getComputedStyle(button);
      expect(parseFloat(computed.minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseFloat(computed.minWidth)).toBeGreaterThanOrEqual(44);
    });
  });
});

describe('PostDetail notify-me subscription toggle', () => {
  const MEMBER = { _id: '000000000000000000000040', name: 'Member', role: 'user' };

  const setup = ({ subscribed = false } = {}) => {
    axios.get.mockReset();
    axios.put.mockReset();
    axios.post.mockReset();
    axios.delete.mockReset();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: MEMBER } });
      }
      if (url.endsWith('/comments')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.endsWith('/subscribe')) {
        return Promise.resolve({ data: { success: true, data: { subscribed } } });
      }
      return Promise.resolve({ data: { success: true, data: basePost } });
    });
  };

  afterEach(() => {
    localStorage.clear();
  });

  it('shows "Notify me of answers" when not subscribed, and subscribes on click', async () => {
    setup({ subscribed: false });
    axios.post.mockResolvedValue({ data: { success: true, data: { subscribed: true } } });
    renderPostDetail();

    const btn = await screen.findByRole('button', { name: /notify me of answers/i });
    fireEvent.click(btn);

    await screen.findByRole('button', { name: /^notified$/i });
    expect(axios.post).toHaveBeenCalledWith(`/api/posts/${POST_ID}/subscribe`);
  });

  it('shows "Notified" when already subscribed, and unsubscribes on click', async () => {
    setup({ subscribed: true });
    axios.delete.mockResolvedValue({ data: { success: true, data: { subscribed: false } } });
    renderPostDetail();

    const btn = await screen.findByRole('button', { name: /^notified$/i });
    fireEvent.click(btn);

    await screen.findByRole('button', { name: /notify me of answers/i });
    expect(axios.delete).toHaveBeenCalledWith(`/api/posts/${POST_ID}/subscribe`);
  });

  it('does not show the toggle for unauthenticated visitors', async () => {
    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/comments')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: { success: true, data: basePost } });
    });
    renderPostDetail();

    await screen.findByText('Orphaned post');
    expect(
      screen.queryByRole('button', { name: /notify me of answers/i })
    ).not.toBeInTheDocument();
  });

  it('renders the subscribe toggle at least 44x44', async () => {
    setup({ subscribed: false });

    const style = document.createElement('style');
    style.textContent = appCss;
    document.head.appendChild(style);

    renderPostDetail();

    const button = await screen.findByRole('button', { name: /notify me of answers/i });
    const computed = getComputedStyle(button);
    expect(parseFloat(computed.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(computed.minWidth)).toBeGreaterThanOrEqual(44);
  });
});

describe('PostDetail save toggle', () => {
  const MEMBER = { _id: '000000000000000000000041', name: 'Member', role: 'user' };

  const setup = ({ saved = false } = {}) => {
    axios.get.mockReset();
    axios.put.mockReset();
    axios.post.mockReset();
    axios.delete.mockReset();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: MEMBER } });
      }
      if (url.endsWith('/comments')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.endsWith('/subscribe')) {
        return Promise.resolve({ data: { success: true, data: { subscribed: false } } });
      }
      if (url.endsWith('/save')) {
        return Promise.resolve({ data: { success: true, data: { saved } } });
      }
      return Promise.resolve({ data: { success: true, data: basePost } });
    });
  };

  afterEach(() => {
    localStorage.clear();
  });

  it('shows "Save" when not saved, and saves on click', async () => {
    setup({ saved: false });
    axios.post.mockResolvedValue({ data: { success: true, data: { saved: true } } });
    renderPostDetail();

    const btn = await screen.findByRole('button', { name: /^save$/i });
    fireEvent.click(btn);

    await screen.findByRole('button', { name: /^saved$/i });
    expect(axios.post).toHaveBeenCalledWith(`/api/posts/${POST_ID}/save`);
  });

  it('shows "Saved" when already saved, and unsaves on click', async () => {
    setup({ saved: true });
    axios.delete.mockResolvedValue({ data: { success: true, data: { saved: false } } });
    renderPostDetail();

    const btn = await screen.findByRole('button', { name: /^saved$/i });
    fireEvent.click(btn);

    await screen.findByRole('button', { name: /^save$/i });
    expect(axios.delete).toHaveBeenCalledWith(`/api/posts/${POST_ID}/save`);
  });

  it('does not show the save toggle for unauthenticated visitors', async () => {
    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/comments')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: { success: true, data: basePost } });
    });
    renderPostDetail();

    await screen.findByText('Orphaned post');
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
  });

  it('renders the save toggle at least 44x44', async () => {
    setup({ saved: false });

    const style = document.createElement('style');
    style.textContent = appCss;
    document.head.appendChild(style);

    renderPostDetail();

    const button = await screen.findByRole('button', { name: /^save$/i });
    const computed = getComputedStyle(button);
    expect(parseFloat(computed.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(computed.minWidth)).toBeGreaterThanOrEqual(44);
  });
});

const AlertCountProbe = () => {
  const { alerts } = useAlert();
  return <div data-testid="alert-count">{alerts.length}</div>;
};

const renderPostDetailWithAlertProbe = () =>
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter initialEntries={[`/posts/${POST_ID}`]}>
          <Routes>
            <Route path="/posts/:id" element={<PostDetail />} />
          </Routes>
        </MemoryRouter>
        <AlertCountProbe />
      </AlertProvider>
    </AuthProvider>
  );

describe('PostDetail 404 handling', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('renders a not-found state without a danger alert when the post does not exist', async () => {
    const notFoundError = new Error('Request failed with status code 404');
    notFoundError.response = { status: 404 };
    axios.get.mockRejectedValue(notFoundError);

    renderPostDetailWithAlertProbe();

    await screen.findByRole('heading', { name: /post not found/i });
    expect(screen.queryByText('Post not found')).not.toBeInTheDocument();
    expect(screen.getByTestId('alert-count')).toHaveTextContent('0');
    expect(document.title).not.toBe('AI/ML Career Forum');
  });

  it('still surfaces the danger alert for a genuine non-404 failure', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));

    renderPostDetailWithAlertProbe();

    expect(await screen.findByText('Post not found')).toBeInTheDocument();
    expect(screen.getByTestId('alert-count')).toHaveTextContent('1');
  });
});
