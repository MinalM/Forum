import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import Footer from '../layout/Footer';
import Login from '../../pages/Login';
import { AlertProvider } from '../../context/AlertContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => false
}));

jest.mock('axios', () => ({
  defaults: {},
  interceptors: {
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn()
}));

const headingLevel = (el) => Number(el.tagName.slice(1));

describe('Footer heading levels', () => {
  it('does not render its section titles as headings that skip a level', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const headings = screen.queryAllByRole('heading');
    expect(headings).toHaveLength(0);
  });

  it('keeps the .footer-heading class on its section titles for styling', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByText('AI/ML Career Forum', { selector: '.footer-heading' })).toBeInTheDocument();
    expect(screen.getByText('Quick Links', { selector: '.footer-heading' })).toBeInTheDocument();
    expect(screen.getByText('Career Resources', { selector: '.footer-heading' })).toBeInTheDocument();
  });
});

describe('Page heading sequence (Login + Footer)', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('not authenticated'));
  });

  it('never skips a heading level from h1 down to the last heading rendered', async () => {
    render(
      <AuthProvider>
        <AlertProvider>
          <MemoryRouter>
            <Login />
            <Footer />
          </MemoryRouter>
        </AlertProvider>
      </AuthProvider>
    );

    await screen.findByText('Sign in to your AI/ML Career Forum account');

    const levels = screen.getAllByRole('heading').map(headingLevel);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });
});
