import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import CreatePost from '../CreatePost';
import { AlertProvider } from '../../context/AlertContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

describe('CreatePost document title', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({
      data: { success: true, data: [{ _id: '1', name: 'Career Advice' }] }
    });
  });

  it('sets the document title to Create New Post', async () => {
    render(
      <AlertProvider>
        <MemoryRouter>
          <CreatePost />
        </MemoryRouter>
      </AlertProvider>
    );

    await screen.findByText('Create New Post');
    expect(document.title).toBe('Create New Post | AI/ML Career Forum');
  });
});
