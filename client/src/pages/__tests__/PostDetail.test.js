import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import PostDetail from '../PostDetail';
import { AlertProvider } from '../../context/AlertContext';
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
