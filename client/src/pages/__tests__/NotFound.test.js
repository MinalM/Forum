import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import NotFound from '../NotFound';
import { getHeadMeta } from '../../test-utils/headMeta';

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

describe('NotFound <head> metadata', () => {
  it('marks the 404 page noindex with a route-specific description', async () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getHeadMeta('name', 'robots')).toHaveAttribute('content', 'noindex');
    });
    expect(getHeadMeta('property', 'og:title')).toHaveAttribute(
      'content',
      'Page Not Found | AI/ML Career Forum'
    );
    expect(getHeadMeta('name', 'description').getAttribute('content')).toMatch(
      /might have been removed/i
    );
  });
});
