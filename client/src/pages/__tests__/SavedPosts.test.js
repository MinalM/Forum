import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import SavedPosts from '../SavedPosts';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';
import Alert from '../../components/layout/Alert';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  delete: jest.fn()
}));

const renderSavedPosts = () =>
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter>
          <Alert />
          <SavedPosts />
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

const savedPost = {
  _id: 'sp1',
  createdAt: new Date().toISOString(),
  post: {
    _id: 'p1',
    title: 'Transformers 101',
    commentCount: 0,
    isSolved: false,
    isLocked: false,
    upvotes: ['u1'],
    downvotes: []
  }
};

beforeEach(() => {
  axios.get.mockReset();
  axios.delete.mockReset();
});

describe('SavedPosts', () => {
  it('renders the list of saved posts with a link into the thread', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, count: 1, data: [savedPost] }
    });

    renderSavedPosts();

    const link = await screen.findByRole('link', { name: /Transformers 101/ });
    expect(link).toHaveAttribute('href', '/posts/p1');
    expect(screen.getByText('Needs an answer')).toBeInTheDocument();
  });

  it('shows a Solved badge for a saved post that has an accepted answer', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        count: 1,
        data: [{ ...savedPost, post: { ...savedPost.post, commentCount: 2, isSolved: true } }]
      }
    });

    renderSavedPosts();

    expect(await screen.findByText('Solved')).toBeInTheDocument();
  });

  it('shows no status badge for an unsolved saved post that already has answers', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        count: 1,
        data: [{ ...savedPost, post: { ...savedPost.post, commentCount: 2, isSolved: false } }]
      }
    });

    renderSavedPosts();

    await screen.findByRole('link', { name: /Transformers 101/ });
    expect(screen.queryByText('Needs an answer')).not.toBeInTheDocument();
    expect(screen.queryByText('Solved')).not.toBeInTheDocument();
  });

  it('shows no status badge for a locked, unsolved saved post with no answers', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        count: 1,
        data: [{ ...savedPost, post: { ...savedPost.post, commentCount: 0, isSolved: false, isLocked: true } }]
      }
    });

    renderSavedPosts();

    await screen.findByRole('link', { name: /Transformers 101/ });
    expect(screen.queryByText('Needs an answer')).not.toBeInTheDocument();
    expect(screen.queryByText('Solved')).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing is saved', async () => {
    axios.get.mockResolvedValue({ data: { success: true, count: 0, data: [] } });

    renderSavedPosts();

    expect(await screen.findByText(/haven.t saved any posts/i)).toBeInTheDocument();
  });

  it('shows an alert when the fetch fails', async () => {
    axios.get.mockRejectedValue(new Error('network error'));

    renderSavedPosts();

    expect(await screen.findByText(/error fetching saved posts/i)).toBeInTheDocument();
  });

  it('unsaves a post and removes it from the list', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, count: 1, data: [savedPost] }
    });
    axios.delete.mockResolvedValue({ data: { success: true, data: { saved: false } } });

    renderSavedPosts();

    await screen.findByRole('link', { name: /Transformers 101/ });
    fireEvent.click(screen.getByRole('button', { name: /unsave/i }));

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith('/api/posts/p1/save')
    );
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /Transformers 101/ })).not.toBeInTheDocument()
    );
  });
});
