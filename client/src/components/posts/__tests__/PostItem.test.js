import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PostItem from '../PostItem';

const basePost = {
  _id: '000000000000000000000001',
  title: 'Sample post',
  content: '',
  user: { name: 'Ada' },
  category: { name: 'Career Advice' },
  createdAt: new Date().toISOString(),
  comments: [],
  views: 0,
  upvotes: [],
  downvotes: [],
  tags: [],
  isSolved: false
};

const renderPostItem = (post) =>
  render(
    <MemoryRouter>
      <PostItem post={post} />
    </MemoryRouter>
  );

describe('PostItem excerpt', () => {
  it('shows plain text with no raw markdown syntax', () => {
    renderPostItem({
      ...basePost,
      content: '**Title:** Image Classification Model in Python **Description:**'
    });

    const excerpt = screen.getByText(
      /Title: Image Classification Model in Python Description:/
    );
    expect(excerpt).toBeInTheDocument();
    expect(excerpt.textContent).not.toContain('**');
  });

  it('strips links and code syntax down to visible text', () => {
    renderPostItem({
      ...basePost,
      content: 'See [the docs](https://example.com) and run `npm test`'
    });

    const excerpt = screen.getByText(/See the docs and run npm test/);
    expect(excerpt.textContent).not.toMatch(/[[\]`]/);
  });

  it('truncates long excerpts to 200 characters plus ellipsis', () => {
    const longContent = 'a'.repeat(250);
    renderPostItem({ ...basePost, content: longContent });

    const excerpt = screen.getByText(/^a+\.\.\.$/);
    expect(excerpt.textContent).toBe('a'.repeat(200) + '...');
  });

  it('never renders raw HTML from post content', () => {
    renderPostItem({
      ...basePost,
      content: 'hi <script>alert(1)</script> there'
    });

    expect(screen.getByText(/hi\s+there/)).toBeInTheDocument();
    expect(screen.queryByText(/alert\(1\)/)).not.toBeInTheDocument();
  });
});
