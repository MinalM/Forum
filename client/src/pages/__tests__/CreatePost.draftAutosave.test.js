import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import CreatePost from '../CreatePost';
import { AlertProvider } from '../../context/AlertContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn()
}));

const DRAFT_KEY = 'draft:create-post';

const renderCreatePost = () =>
  render(
    <AlertProvider>
      <MemoryRouter>
        <CreatePost />
      </MemoryRouter>
    </AlertProvider>
  );

describe('CreatePost draft autosave', () => {
  beforeEach(() => {
    localStorage.clear();
    axios.get.mockReset();
    axios.post.mockReset();
    axios.get.mockResolvedValue({
      data: { success: true, data: [{ _id: 'cat1', name: 'Career Advice' }] }
    });
    jest.useFakeTimers({ legacyFakeTimers: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces saving title/content to localStorage as the user types', async () => {
    renderCreatePost();
    await screen.findByLabelText('Title *');

    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { name: 'title', value: 'My question' }
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    expect(JSON.parse(localStorage.getItem(DRAFT_KEY))).toEqual({
      title: 'My question',
      content: ''
    });
  });

  it('restores a saved draft on mount and shows a discard affordance', async () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ title: 'Restored title', content: 'Restored content' })
    );

    renderCreatePost();
    await screen.findByLabelText('Title *');

    expect(screen.getByLabelText('Title *')).toHaveValue('Restored title');
    expect(screen.getByLabelText('Content *')).toHaveValue('Restored content');
    expect(screen.getByText(/draft restored/i)).toBeInTheDocument();
  });

  it('discarding the restored draft clears the fields and the stored draft', async () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ title: 'Restored title', content: 'Restored content' })
    );

    renderCreatePost();
    await screen.findByText(/draft restored/i);

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.getByLabelText('Title *')).toHaveValue('');
    expect(screen.getByLabelText('Content *')).toHaveValue('');
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(screen.queryByText(/draft restored/i)).not.toBeInTheDocument();
  });

  it('clears the stored draft after a successful submit', async () => {
    axios.post.mockResolvedValue({ data: { data: { _id: 'post1' } } });

    renderCreatePost();
    await screen.findByLabelText('Title *');

    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { name: 'title', value: 'My question' }
    });
    fireEvent.change(screen.getByLabelText('Content *'), {
      target: { name: 'content', value: 'Details of my question' }
    });
    fireEvent.change(screen.getByLabelText('Category *'), {
      target: { name: 'category', value: 'cat1' }
    });

    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Create Post' }));

    await waitFor(() => {
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });
  });
});
