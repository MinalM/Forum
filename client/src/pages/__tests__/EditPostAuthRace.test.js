import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import EditPost from '../EditPost';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  put: jest.fn()
}));

const AUTHOR = { _id: 'author1', name: 'Post Author', role: 'user' };
const POST_ID = '000000000000000000000001';

// Regression test for the bug where EditPost dereferenced `user._id`
// before AuthContext's own `/api/users/me` request had resolved. This
// renders EditPost behind a real AuthProvider (not a mocked one) and
// makes the post fetch resolve before the auth fetch, reproducing a
// direct page load / hard refresh where both requests race.
describe('EditPost auth race on a direct/hard-refresh load', () => {
  let resolveUserMe;

  beforeEach(() => {
    localStorage.setItem('token', 'test-token');

    const userMePromise = new Promise(resolve => {
      resolveUserMe = resolve;
    });

    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
      if (url === '/api/users/me') {
        return userMePromise;
      }
      if (url === `/api/posts/${POST_ID}`) {
        return Promise.resolve({
          data: {
            data: {
              _id: POST_ID,
              title: 'Existing Post',
              content: 'Some content',
              user: AUTHOR,
              category: { _id: 'cat1', name: 'Career Advice' },
              tags: [],
              aiMlLevel: 'all'
            }
          }
        });
      }
      if (url === '/api/categories') {
        return Promise.resolve({ data: { data: [{ _id: 'cat1', name: 'Career Advice' }] } });
      }
      return Promise.reject(new Error(`unexpected request: ${url}`));
    });
  });

  afterEach(() => {
    localStorage.removeItem('token');
  });

  it('waits for auth instead of crash-redirecting to / when the post fetch resolves first', async () => {
    render(
      <AlertProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[`/edit-post/${POST_ID}`]}>
            <Routes>
              <Route path="/edit-post/:id" element={<EditPost />} />
              <Route path="/" element={<div>Home Page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </AlertProvider>
    );

    // Let the post-details fetch resolve while /api/users/me is still
    // pending, reproducing the pre-fix crash-on-null `user._id`.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();

    await act(async () => {
      resolveUserMe({ data: { data: AUTHOR } });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(await screen.findByText('Edit Post')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Post')).toBeInTheDocument();
  });
});
