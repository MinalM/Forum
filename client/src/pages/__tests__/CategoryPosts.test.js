import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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
