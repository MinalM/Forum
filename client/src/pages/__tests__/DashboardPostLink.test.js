import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import Dashboard from '../Dashboard';
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

const USER = { _id: 'u1', name: 'Ada Lovelace', role: 'user' };
const POST_ID = '000000000000000000000001';

const userPost = {
  _id: POST_ID,
  title: 'Landing my first ML role',
  content: 'Some content',
  user: { _id: 'u1', name: 'Ada Lovelace' },
  category: { _id: 'c1', name: 'Career Advice' },
  tags: [],
  upvotes: [],
  downvotes: [],
  comments: [],
  views: 3,
  isSolved: false,
  createdAt: new Date().toISOString()
};

const renderApp = () =>
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/posts/:id" element={<PostDetail />} />
          </Routes>
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

describe('Dashboard post link navigation', () => {
  beforeEach(() => {
    axios.get.mockReset();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return Promise.resolve({ data: { data: USER } });
      }
      if (url === `/api/users/${USER._id}/posts`) {
        return Promise.resolve({ data: { data: [userPost] } });
      }
      if (url === '/api/comments') {
        return Promise.resolve({ data: { count: 0, data: [] } });
      }
      if (url === `/api/posts/${POST_ID}`) {
        return Promise.resolve({ data: { success: true, data: userPost } });
      }
      if (url === `/api/posts/${POST_ID}/comments`) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
  });

  it('navigates to the post detail page when a post link is clicked', async () => {
    renderApp();

    const link = await screen.findByRole('link', {
      name: 'Landing my first ML role'
    });
    expect(link).toHaveAttribute('href', `/posts/${POST_ID}`);

    await userEvent.click(link);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Landing my first ML role'
      })
    ).toBeInTheDocument();
    expect(screen.queryByText('Post not found')).not.toBeInTheDocument();
  });
});
