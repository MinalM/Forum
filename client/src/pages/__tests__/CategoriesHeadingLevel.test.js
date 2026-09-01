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

const headingLevel = (el) => Number(el.tagName.slice(1));

describe('Categories heading sequence', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          { _id: '1', name: 'Career Advice', description: 'Career talk' },
          { _id: '2', name: 'Deep Learning', description: 'Neural nets' }
        ]
      }
    });
  });

  it('never skips a heading level, and an h2 sits between the h1 and the first category h3', async () => {
    render(
      <AlertProvider>
        <MemoryRouter>
          <Categories />
        </MemoryRouter>
      </AlertProvider>
    );

    await screen.findByText('Career Advice');

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
