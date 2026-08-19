import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import NotFound from '../NotFound';

describe('NotFound document title', () => {
  it('sets the document title to Page Not Found', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(document.title).toBe('Page Not Found | AI/ML Career Forum');
  });
});
