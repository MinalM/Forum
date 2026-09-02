import { Router } from 'express';

// Plain-JS models, same require pattern server.ts already uses for
// plain-JS routes/middleware/config living outside src/.
const Post = require('../../models/Post');
const Category = require('../../models/Category');

const router = Router();

const getSiteUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.CORS_ORIGIN || 'https://cerulean-marshmallow-003d16.netlify.app';
  }
  return 'http://localhost:3000';
};

const xmlUrl = (loc: string, lastmod?: Date): string => {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod.toISOString()}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmodTag}\n  </url>`;
};

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const siteUrl = getSiteUrl();

    const [categories, posts] = await Promise.all([
      Category.find().select('_id').lean(),
      Post.find().select('_id updatedAt').lean(),
    ]);

    const entries = [
      xmlUrl(`${siteUrl}/`),
      xmlUrl(`${siteUrl}/categories`),
      ...categories.map((category: { _id: unknown }) => xmlUrl(`${siteUrl}/categories/${category._id}`)),
      ...posts.map((post: { _id: unknown; updatedAt: Date }) => xmlUrl(`${siteUrl}/posts/${post._id}`, post.updatedAt)),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

router.get('/robots.txt', (req, res) => {
  const siteUrl = getSiteUrl();
  res
    .type('text/plain')
    .send(`User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
});

export default router;
