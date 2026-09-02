import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import Seo, { truncateDescription, toAbsoluteUrl, DEFAULT_DESCRIPTION } from '../Seo';
import { getHeadMeta, getHeadLink } from '../../../test-utils/headMeta';

const getMeta = getHeadMeta;

const renderSeo = (props) =>
  render(
    <HelmetProvider>
      <Seo {...props} />
    </HelmetProvider>
  );

describe('Seo', () => {
  it('renders the site default description and og/twitter tags with no props', async () => {
    renderSeo({});

    await waitFor(() => {
      expect(getMeta('name', 'description')).toHaveAttribute(
        'content',
        DEFAULT_DESCRIPTION
      );
    });
    expect(getMeta('property', 'og:title')).toHaveAttribute(
      'content',
      'AI/ML Career Forum'
    );
    expect(getMeta('property', 'og:url')).toHaveAttribute(
      'content',
      toAbsoluteUrl('/')
    );
    expect(getMeta('property', 'og:type')).toHaveAttribute('content', 'website');
    expect(getMeta('name', 'twitter:card')).toHaveAttribute('content', 'summary');
  });

  it('renders route-specific description, canonical, and og:url for a given path', async () => {
    renderSeo({
      title: 'Transformers 101',
      description: 'An intro to transformers.',
      path: '/posts/abc123',
      type: 'article'
    });

    await waitFor(() => {
      expect(getMeta('property', 'og:title')).toHaveAttribute(
        'content',
        'Transformers 101 | AI/ML Career Forum'
      );
    });
    expect(getMeta('name', 'description')).toHaveAttribute(
      'content',
      'An intro to transformers.'
    );
    expect(getMeta('property', 'og:description')).toHaveAttribute(
      'content',
      'An intro to transformers.'
    );
    expect(getMeta('property', 'og:type')).toHaveAttribute('content', 'article');
    expect(getMeta('property', 'og:url')).toHaveAttribute(
      'content',
      toAbsoluteUrl('/posts/abc123')
    );
    expect(getHeadLink('canonical')).toHaveAttribute(
      'href',
      toAbsoluteUrl('/posts/abc123')
    );
  });

  it('does not touch document.title, leaving that to useDocumentTitle', async () => {
    document.title = 'Untouched';
    renderSeo({ title: 'Some Page' });

    await waitFor(() => {
      expect(getMeta('property', 'og:title')).toHaveAttribute(
        'content',
        'Some Page | AI/ML Career Forum'
      );
    });
    expect(document.title).toBe('Untouched');
  });

  it('adds a noindex robots tag only when requested', async () => {
    renderSeo({ title: 'Page Not Found', noindex: true });

    await waitFor(() => {
      expect(getMeta('name', 'robots')).toHaveAttribute('content', 'noindex');
    });
  });

  it('omits the robots tag by default', async () => {
    renderSeo({});

    await waitFor(() => {
      expect(getMeta('property', 'og:title')).toBeInTheDocument();
    });
    expect(getMeta('name', 'robots')).not.toBeInTheDocument();
  });

  it('uses a large-image twitter card and og:image only when an image is given', async () => {
    renderSeo({ title: 'With image', image: 'https://example.com/cover.png' });

    await waitFor(() => {
      expect(getMeta('name', 'twitter:card')).toHaveAttribute(
        'content',
        'summary_large_image'
      );
    });
    expect(getMeta('property', 'og:image')).toHaveAttribute(
      'content',
      'https://example.com/cover.png'
    );
    expect(getMeta('name', 'twitter:image')).toHaveAttribute(
      'content',
      'https://example.com/cover.png'
    );
  });
});

describe('truncateDescription', () => {
  it('falls back to the default description for empty input', () => {
    expect(truncateDescription('')).toBe(DEFAULT_DESCRIPTION);
    expect(truncateDescription(null)).toBe(DEFAULT_DESCRIPTION);
  });

  it('collapses whitespace and returns short text unchanged', () => {
    expect(truncateDescription('  Hello   world  ')).toBe('Hello world');
  });

  it('truncates long text to the max length with an ellipsis', () => {
    const long = 'a'.repeat(200);
    const result = truncateDescription(long, 160);
    expect(result.length).toBe(160);
    expect(result.endsWith('…')).toBe(true);
  });
});
