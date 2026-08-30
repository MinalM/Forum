#!/usr/bin/env node
/**
 * Audit for posts whose `content` opens with a "Title: X" line naming a
 * different subject than the post's own `title` — a title/content pairing
 * shuffle found in live data (see BACKLOG.md), the same class of bug as the
 * tag pollution fixed by `scripts/cleanup-post-tags.js` (#33), but affecting
 * title/content pairing instead of tags.
 *
 * Unlike the tag pollution, there is no mechanical fix here: a polluted tag
 * could be dropped by a length/format rule, but a mismatched post's correct
 * content can't be derived from its title — the real content is presumably
 * paired with some *other* post's title elsewhere in the data (or missing
 * entirely). So this script is READ-ONLY. It reports mismatched posts for a
 * human to review and fix by hand (or re-pair with the post that has the
 * matching orphaned title, if one exists); it never writes.
 *
 * Not run automatically by any npm script or CI job. A human runs it
 * manually against a target database:
 *
 *   MONGO_URI="mongodb://<host>/<db>" node scripts/audit-post-title-mismatch.js
 */
const Post = require('../server/models/Post');
const { extractEmbeddedTitle, isTitleContentMismatch } = require('../server/utils/titleContentMismatch');

// Returns the list of posts whose content's leading "Title:" line names a
// different subject than the post's own title. Assumes a mongoose
// connection is already open. Read-only — never writes.
async function findTitleContentMismatches() {
  const posts = await Post.find().select('_id title content');
  const mismatches = [];

  for (const post of posts) {
    if (isTitleContentMismatch(post.title, post.content)) {
      mismatches.push({
        postId: post._id,
        title: post.title,
        embeddedTitle: extractEmbeddedTitle(post.content)
      });
    }
  }

  return mismatches;
}

module.exports = { findTitleContentMismatches };

if (require.main === module) {
  const path = require('path');
  const dotenv = require('dotenv');
  const mongoose = require('mongoose');

  dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

  (async () => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum';
    await mongoose.connect(uri);
    console.log(`Connected to ${uri}`);

    const total = await Post.countDocuments();
    const mismatches = await findTitleContentMismatches();

    for (const mismatch of mismatches) {
      console.log(`Post ${mismatch.postId}:`);
      console.log(`  title:          ${mismatch.title}`);
      console.log(`  embedded title: ${mismatch.embeddedTitle}`);
    }

    console.log(`\n${mismatches.length} of ${total} post(s) have a mismatched title/content pairing.`);
    console.log('This script is read-only — review and fix these by hand.');

    await mongoose.disconnect();
  })().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
