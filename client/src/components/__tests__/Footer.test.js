import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../layout/Footer';

jest.mock('../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => false
}));

describe('Footer', () => {
  it('links AI/ML Resources to the categories page, not an invalid category id', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'AI/ML Resources' });
    expect(link).toHaveAttribute('href', '/categories');
  });
});
