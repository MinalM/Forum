import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import EditPost from '../EditPost';
import { AlertProvider } from '../../context/AlertContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  put: jest.fn()
}));

const AUTHOR = { _id: 'author1', name: 'Post Author', role: 'user' };

// EditPost reads the post before an async AuthProvider would ever resolve
// its own user, so its own effect needs a synchronously-available `user`.
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: AUTHOR })
}));

const POST_ID = '000000000000000000000001';

describe('EditPost document title', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
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

  it('sets the document title to Edit Post', async () => {
    render(
      <AlertProvider>
        <MemoryRouter initialEntries={[`/posts/edit/${POST_ID}`]}>
          <Routes>
            <Route path="/posts/edit/:id" element={<EditPost />} />
          </Routes>
        </MemoryRouter>
      </AlertProvider>
    );

    await screen.findByText('Edit Post');
    expect(document.title).toBe('Edit Post | AI/ML Career Forum');
  });
});
