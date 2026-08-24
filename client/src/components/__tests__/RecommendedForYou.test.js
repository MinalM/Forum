import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import RecommendedForYou from '../RecommendedForYou';
import AuthContext from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

const renderRail = (authValue) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <RecommendedForYou />
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('RecommendedForYou', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('renders nothing for a signed-out visitor and does not fetch', async () => {
    const { container } = renderRail({ isAuthenticated: false, user: null });

    expect(container).toBeEmptyDOMElement();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('fetches and renders the matched unanswered posts, linking through to the thread', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          { _id: 'post-1', title: 'How do I deploy a PyTorch model?', category: { name: 'Deep Learning' } },
          { _id: 'post-2', title: 'Best way to learn SQL for data roles?', category: { name: 'Career Advice' } }
        ]
      }
    });

    renderRail({ isAuthenticated: true, user: { _id: 'u1' } });

    expect(await screen.findByText('You can answer these')).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/posts/recommended');

    const link = await screen.findByRole('link', { name: /How do I deploy a PyTorch model\?/ });
    expect(link).toHaveAttribute('href', '/posts/post-1');
    expect(screen.getByText('Deep Learning')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Best way to learn SQL for data roles\?/ })).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });

    renderRail({ isAuthenticated: true, user: { _id: 'u1' } });

    expect(await screen.findByText(/Nothing matches your skills right now/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all unanswered questions/ })).toHaveAttribute(
      'href',
      '/categories'
    );
  });

  it('shows an empty state (not an error) when the fetch fails', async () => {
    axios.get.mockRejectedValue(new Error('network down'));

    renderRail({ isAuthenticated: true, user: { _id: 'u1' } });

    expect(await screen.findByText(/Nothing matches your skills right now/)).toBeInTheDocument();
  });

  it('does not fetch again on re-render while staying authenticated', async () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });

    const { rerender } = renderRail({ isAuthenticated: true, user: { _id: 'u1' } });
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    rerender(
      <AuthContext.Provider value={{ isAuthenticated: true, user: { _id: 'u1' } }}>
        <MemoryRouter>
          <RecommendedForYou />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
  });
});
