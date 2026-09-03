import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import Seo, {
  truncateDescription,
  toAbsoluteUrl,
  DEFAULT_DESCRIPTION,
  buildQaPageJsonLd
} from '../Seo';
import { getHeadMeta, getHeadLink, getJsonLd } from '../../../test-utils/headMeta';

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

  it('renders a JSON-LD script tag when jsonLd is given', async () => {
    const jsonLd = { '@context': 'https://schema.org', '@type': 'QAPage' };
    renderSeo({ title: 'With structured data', jsonLd });

    await waitFor(() => {
      expect(getJsonLd()).toEqual(jsonLd);
    });
  });

  it('omits the JSON-LD script tag when jsonLd is not given', async () => {
    renderSeo({});

    await waitFor(() => {
      expect(getMeta('property', 'og:title')).toBeInTheDocument();
    });
    expect(getJsonLd()).toBeNull();
  });
});

describe('buildQaPageJsonLd', () => {
  const post = {
    _id: 'post1',
    title: 'How do I fine-tune a transformer?',
    content: 'What is the **best** way to fine-tune a small transformer model?',
    user: { name: 'Asker Anna' },
    upvotes: ['u1', 'u2'],
    downvotes: ['u3'],
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  const acceptedAnswer = {
    _id: 'c1',
    content: 'Use LoRA for parameter-efficient fine-tuning.',
    user: { name: 'Helper Hana' },
    isAnswer: true,
    upvotes: ['u1', 'u2', 'u3'],
    downvotes: [],
    createdAt: '2026-01-02T00:00:00.000Z'
  };

  const otherAnswer = {
    _id: 'c2',
    content: 'Full fine-tuning also works if you have the compute.',
    user: { name: 'Helper Hank' },
    isAnswer: false,
    upvotes: ['u1'],
    downvotes: [],
    createdAt: '2026-01-03T00:00:00.000Z'
  };

  it('parses as QAPage with the accepted answer and its upvoteCount', () => {
    const jsonLd = buildQaPageJsonLd({ post, answers: [acceptedAnswer, otherAnswer] });
    const reparsed = JSON.parse(JSON.stringify(jsonLd));

    expect(reparsed['@type']).toBe('QAPage');
    expect(reparsed.mainEntity['@type']).toBe('Question');
    expect(reparsed.mainEntity.name).toBe(post.title);
    expect(reparsed.mainEntity.upvoteCount).toBe(1);
    expect(reparsed.mainEntity.answerCount).toBe(2);
    expect(reparsed.mainEntity.acceptedAnswer).toEqual({
      '@type': 'Answer',
      text: acceptedAnswer.content,
      upvoteCount: 3,
      dateCreated: acceptedAnswer.createdAt,
      url: toAbsoluteUrl(`/posts/${post._id}`),
      author: { '@type': 'Person', name: 'Helper Hana' }
    });
    expect(reparsed.mainEntity.suggestedAnswer).toEqual([
      {
        '@type': 'Answer',
        text: otherAnswer.content,
        upvoteCount: 1,
        dateCreated: otherAnswer.createdAt,
        url: toAbsoluteUrl(`/posts/${post._id}`),
        author: { '@type': 'Person', name: 'Helper Hank' }
      }
    ]);
  });

  it('omits acceptedAnswer entirely when no answer is accepted', () => {
    const jsonLd = buildQaPageJsonLd({ post, answers: [otherAnswer] });

    expect(jsonLd.mainEntity).not.toHaveProperty('acceptedAnswer');
    expect(jsonLd.mainEntity.suggestedAnswer).toHaveLength(1);
  });

  it('omits suggestedAnswer entirely when there are no other answers', () => {
    const jsonLd = buildQaPageJsonLd({ post, answers: [acceptedAnswer] });

    expect(jsonLd.mainEntity.acceptedAnswer).toBeDefined();
    expect(jsonLd.mainEntity).not.toHaveProperty('suggestedAnswer');
  });

  it('omits author when the post has no user (deleted account)', () => {
    const jsonLd = buildQaPageJsonLd({ post: { ...post, user: null }, answers: [] });

    expect(jsonLd.mainEntity).not.toHaveProperty('author');
    expect(jsonLd.mainEntity.answerCount).toBe(0);
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
