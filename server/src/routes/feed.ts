import { Router } from 'express';

// Plain-JS models/utils, same require pattern server.ts and sitemap.ts
// already use for code living outside src/.
const Post = require('../../models/Post');
const Category = require('../../models/Category');
const ErrorResponse = require('../../utils/errorResponse');

import { toFeedSummary } from '../utils/feedSummary';

const router = Router();

// How many of the most recent posts a feed carries. RSS/Atom readers poll
// periodically rather than paginate, so a fixed cap (no ?limit=) is enough.
const FEED_POST_LIMIT = 20;

const getSiteUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.CORS_ORIGIN || 'https://cerulean-marshmallow-003d16.netlify.app';
  }
  return 'http://localhost:3000';
};

const escapeXml = (value: string): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

interface FeedPost {
  _id: unknown;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user?: { name?: string } | null;
}

const buildAtomFeed = ({
  title,
  selfUrl,
  feedLink,
  siteUrl,
  posts
}: {
  title: string;
  selfUrl: string;
  feedLink: string;
  siteUrl: string;
  posts: FeedPost[];
}): string => {
  const updated = posts.length > 0
    ? new Date(posts[0].updatedAt || posts[0].createdAt).toISOString()
    : new Date().toISOString();

  const entries = posts.map((post) => {
    const postUrl = `${siteUrl}/posts/${post._id}`;
    const authorName = post.user && post.user.name ? escapeXml(post.user.name) : 'Anonymous';

    return [
      '  <entry>',
      `    <title>${escapeXml(post.title)}</title>`,
      `    <link href="${postUrl}" />`,
      `    <id>${postUrl}</id>`,
      `    <updated>${new Date(post.updatedAt || post.createdAt).toISOString()}</updated>`,
      `    <published>${new Date(post.createdAt).toISOString()}</published>`,
      `    <author><name>${authorName}</name></author>`,
      `    <summary>${escapeXml(toFeedSummary(post.content))}</summary>`,
      '  </entry>'
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${escapeXml(title)}</title>`,
    `  <link href="${feedLink}" />`,
    `  <link href="${selfUrl}" rel="self" type="application/atom+xml" />`,
    `  <id>${selfUrl}</id>`,
    `  <updated>${updated}</updated>`,
    ...entries,
    '</feed>',
    ''
  ].join('\n');
};

// Matches GET /api/posts?feed=recent's default (anonymous) ordering -
// `-createdAt`, no filter - see server/middleware/advancedResults.js. A
// syndication feed has no signed-in reader to personalize for, so it always
// gets the plain-recency order every anonymous visitor sees too.
router.get('/feed.xml', async (req, res, next) => {
  try {
    const siteUrl = getSiteUrl();
    const posts = await Post.find()
      .sort('-createdAt')
      .limit(FEED_POST_LIMIT)
      .populate('user', 'name')
      .lean();

    const xml = buildAtomFeed({
      title: 'AI/ML Career Forum — Recent Questions',
      selfUrl: `${siteUrl}/api/feed.xml`,
      feedLink: `${siteUrl}/`,
      siteUrl,
      posts
    });

    res.set('Content-Type', 'application/atom+xml; charset=utf-8');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

router.get('/categories/:id/feed.xml', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).lean();

    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    const siteUrl = getSiteUrl();
    const posts = await Post.find({ category: category._id })
      .sort('-createdAt')
      .limit(FEED_POST_LIMIT)
      .populate('user', 'name')
      .lean();

    const xml = buildAtomFeed({
      title: `AI/ML Career Forum — ${category.name}`,
      selfUrl: `${siteUrl}/api/categories/${category._id}/feed.xml`,
      feedLink: `${siteUrl}/categories/${category._id}`,
      siteUrl,
      posts
    });

    res.set('Content-Type', 'application/atom+xml; charset=utf-8');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

export default router;
