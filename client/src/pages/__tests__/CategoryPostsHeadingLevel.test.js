import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import CategoryPosts from '../CategoryPosts';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

const headingLevel = (el) => Number(el.tagName.slice(1));

const post = {
  _id: 'p1',
  title: 'A question about backprop',
  content: 'How does backprop work?',
  user: { username: 'ada' },
  category: { name: 'Deep Learning' },
  createdAt: new Date().toISOString(),
  comments: [],
  views: 3,
  upvotes: [],
  downvotes: [],
  tags: [],
  isSolved: false
};

describe('CategoryPosts heading sequence', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/posts')) {
        return Promise.resolve({
          data: { success: true, count: 1, data: [post] }
        });
      }
      return Promise.resolve({
        data: { success: true, data: { _id: '1', name: 'Deep Learning', description: 'Neural nets' } }
      });
    });
  });

  it('never skips a heading level, and an h2 sits between the h1 and the first post h3', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter initialEntries={['/categories/1']}>
            <Routes>
              <Route path="/categories/:categoryId" element={<CategoryPosts />} />
            </Routes>
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('A question about backprop');

    const headings = screen.getAllByRole('heading');
    const levels = headings.map(headingLevel);

    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }

    const firstH3Index = levels.findIndex(l => l === 3);
    const h2Index = levels.findIndex(l => l === 2);
    expect(h2Index).toBeGreaterThan(-1);
    expect(h2Index).toBeLessThan(firstH3Index);
  });
});
