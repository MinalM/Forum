import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import SearchResults from '../SearchResults';
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
  title: 'Transformers 101',
  content: 'An intro to transformers',
  user: { name: 'Ada' },
  category: { name: 'NLP' },
  createdAt: new Date().toISOString(),
  comments: [],
  views: 3,
  upvotes: [],
  downvotes: [],
  tags: [],
  isSolved: false
};

const renderAtSearch = (query) =>
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter initialEntries={[`/search?q=${encodeURIComponent(query)}`]}>
          <Routes>
            <Route path="/search" element={<SearchResults />} />
          </Routes>
        </MemoryRouter>
      </AlertProvider>
    </AuthProvider>
  );

describe('SearchResults heading sequence', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({
      data: {
        success: true,
        count: 1,
        pagination: { total: 1, limit: 10, page: 1, pages: 1 },
        data: [post]
      }
    });
  });

  it('never skips a heading level, and an h2 sits between the h1 and the first result h3', async () => {
    renderAtSearch('transformers');

    await screen.findByText('Transformers 101');

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
