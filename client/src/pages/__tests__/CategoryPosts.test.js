import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import axios from 'axios';
import CategoryPosts from '../CategoryPosts';
import { AlertProvider, useAlert } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

const AlertCountProbe = () => {
  const { alerts } = useAlert();
  return <div data-testid="alert-count">{alerts.length}</div>;
};

const renderAtCategory = (categoryId) =>
  render(
    <AuthProvider>
      <AlertProvider>
        <MemoryRouter initialEntries={[`/categories/${categoryId}`]}>
          <Routes>
            <Route path="/categories/:categoryId" element={<CategoryPosts />} />
          </Routes>
        </MemoryRouter>
        <AlertCountProbe />
      </AlertProvider>
    </AuthProvider>
  );

describe('CategoryPosts error handling', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it('shows "Category not found" when the posts fetch fails, even if the category endpoint returned list data', async () => {
    // Simulates /categories/aiml: the category request resolves with an
    // array (the aiml list endpoint), then the posts request fails.
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/posts')) {
        return Promise.reject(new Error('CastError'));
      }
      return Promise.resolve({
        data: { success: true, data: [{ _id: '1', name: 'Career Advice' }] }
      });
    });

    renderAtCategory('aiml');

    expect(await screen.findByText('Category not found')).toBeInTheDocument();
  });

  it('fetches once and fires exactly one alert when the category fetch fails', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));

    renderAtCategory('000000000000000000000000');

    expect(await screen.findByText('Category not found')).toBeInTheDocument();

    // Flush follow-on render/effect cycles: an unstable setAlert identity
    // would re-trigger the fetch effect here and add more alerts.
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('alert-count')).toHaveTextContent('1');
  });
});

describe('CategoryPosts Solved/Unsolved filter', () => {
  const CATEGORY_ID = '000000000000000000000001';

  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/posts')) {
        return Promise.resolve({
          data: { success: true, count: 0, data: [] }
        });
      }
      return Promise.resolve({
        data: { success: true, data: { _id: CATEGORY_ID, name: 'Career Advice' } }
      });
    });
  });

  const lastPostsCall = () =>
    axios.get.mock.calls
      .filter(([url]) => url.endsWith('/posts'))
      .slice(-1)[0];

  it('fetches with no solved param by default', async () => {
    renderAtCategory(CATEGORY_ID);

    await screen.findByText('Career Advice');

    const [, config] = lastPostsCall();
    expect(config.params.solved).toBeUndefined();
  });

  it('reflects the selected filter and refetches solved-only posts', async () => {
    renderAtCategory(CATEGORY_ID);
    await screen.findByText('Career Advice');

    const select = screen.getByLabelText(/filter/i);
    fireEvent.change(select, { target: { value: 'solved' } });

    expect(select.value).toBe('solved');
    const [, config] = await waitForCallWithParam('solved', true);
    expect(config.params.solved).toBe(true);
    expect(config.params.page).toBe(1);
  });

  it('reflects the selected filter and refetches unsolved-only posts', async () => {
    renderAtCategory(CATEGORY_ID);
    await screen.findByText('Career Advice');

    const select = screen.getByLabelText(/filter/i);
    fireEvent.change(select, { target: { value: 'unsolved' } });

    expect(select.value).toBe('unsolved');
    const [, config] = await waitForCallWithParam('solved', false);
    expect(config.params.solved).toBe(false);
  });

  async function waitForCallWithParam(key, value) {
    let match;
    await act(async () => {
      for (let i = 0; i < 10 && !match; i++) {
        await Promise.resolve();
        match = axios.get.mock.calls
          .filter(([url]) => url.endsWith('/posts'))
          .reverse()
          .find(([, config]) => config?.params?.[key] === value);
      }
    });
    if (!match) {
      throw new Error(`No /posts call found with ${key}=${value}`);
    }
    return match;
  }
});
