import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import Categories from '../Categories';
import { AlertProvider } from '../../context/AlertContext';

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn()
}));

describe('Categories document title', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({
      data: { success: true, data: [{ _id: '1', name: 'Career Advice', description: 'Career talk' }] }
    });
  });

  it('sets the document title to Forum Categories', async () => {
    render(
      <AlertProvider>
        <MemoryRouter>
          <Categories />
        </MemoryRouter>
      </AlertProvider>
    );

    await screen.findByText('Career Advice');
    expect(document.title).toBe('Forum Categories | AI/ML Career Forum');
  });
});
