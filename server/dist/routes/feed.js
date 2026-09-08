"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Post = require('../../models/Post');
const Category = require('../../models/Category');
const ErrorResponse = require('../../utils/errorResponse');
const feedSummary_1 = require("../utils/feedSummary");
const router = (0, express_1.Router)();
const FEED_POST_LIMIT = 20;
const getSiteUrl = () => {
    if (process.env.NODE_ENV === 'production') {
        return process.env.CORS_ORIGIN || 'https://cerulean-marshmallow-003d16.netlify.app';
    }
    return 'http://localhost:3000';
};
const escapeXml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
const buildAtomFeed = ({ title, selfUrl, feedLink, siteUrl, posts }) => {
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
            `    <summary>${escapeXml((0, feedSummary_1.toFeedSummary)(post.content))}</summary>`,
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
    }
    catch (err) {
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
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=feed.js.map