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

describe('SearchResults', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('renders matching posts for the query', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        count: 1,
        pagination: { total: 1, limit: 10, page: 1, pages: 1 },
        data: [post]
      }
    });

    renderAtSearch('transformers');

    expect(await screen.findByText('Transformers 101')).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/posts/search', {
      params: { q: 'transformers', page: 1, limit: 10 }
    });
  });

  it('sets the document title to include the search query', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        count: 1,
        pagination: { total: 1, limit: 10, page: 1, pages: 1 },
        data: [post]
      }
    });

    renderAtSearch('transformers');

    await screen.findByText('Transformers 101');
    expect(document.title).toBe('Search: transformers | AI/ML Career Forum');
  });

  it('shows an empty state when there are no matches', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        count: 0,
        pagination: { total: 0, limit: 10, page: 1, pages: 0 },
        data: []
      }
    });

    renderAtSearch('nonexistentterm');

    expect(await screen.findByText(/No results found/i)).toBeInTheDocument();
  });

  it('shows an alert and empty state when the request fails', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));

    renderAtSearch('transformers');

    expect(await screen.findByText(/No results found/i)).toBeInTheDocument();
  });
});
