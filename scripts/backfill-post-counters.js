#!/usr/bin/env node
/**
 * One-off backfill for the denormalised `Post.commentCount` and `Post.score`
 * fields introduced alongside this script. Those fields are kept in sync
 * going forward by the comment/vote controllers, but any post that existed
 * before this change (or whose counters drifted for any other reason) needs
 * a one-time reconciliation against the source of truth: the `Comment`
 * collection for `commentCount`, and `upvotes`/`downvotes` for `score`.
 *
 * Not run automatically by any npm script or CI job. A human must run this
 * manually against a target database:
 *
 *   MONGO_URI="mongodb://<host>/<db>" node scripts/backfill-post-counters.js
 *
 * By default this is a DRY RUN: it reports what would change but writes
 * nothing. Pass --apply to persist the changes:
 *
 *   MONGO_URI="mongodb://<host>/<db>" node scripts/backfill-post-counters.js --apply
 *
 * What it does, per post:
 *   - recomputes commentCount as the number of Comment documents referencing
 *     the post (this includes replies, matching the existing `comments`
 *     reverse-populate virtual)
 *   - recomputes score as upvotes.length - downvotes.length
 * Only posts whose counters actually change are touched.
 */
const Post = require('../server/models/Post');
const Comment = require('../server/models/Comment');

// Reconciles every post's commentCount/score against source-of-truth data.
// Assumes a mongoose connection is already open. Returns the list of posts
// whose counters were wrong (and, if apply is true, have now been fixed).
async function reconcilePostCounters({ apply = false } = {}) {
  const posts = await Post.find().select('_id commentCount score upvotes downvotes');
  const changes = [];

  for (const post of posts) {
    const correctCommentCount = await Comment.countDocuments({ post: post._id });
    const correctScore = post.upvotes.length - post.downvotes.length;

    const isSame =
      post.commentCount === correctCommentCount && post.score === correctScore;

    if (isSame) {
      continue;
    }

    changes.push({
      postId: post._id,
      before: { commentCount: post.commentCount, score: post.score },
      after: { commentCount: correctCommentCount, score: correctScore }
    });

    if (apply) {
      await Post.updateOne(
        { _id: post._id },
        { $set: { commentCount: correctCommentCount, score: correctScore } }
      );
    }
  }

  return changes;
}

module.exports = { reconcilePostCounters };

if (require.main === module) {
  const path = require('path');
  const dotenv = require('dotenv');
  const mongoose = require('mongoose');

  dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

  const APPLY = process.argv.includes('--apply');

  (async () => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum';
    await mongoose.connect(uri);
    console.log(`Connected to ${uri}`);
    console.log(APPLY ? 'Mode: APPLY (writing changes)' : 'Mode: DRY RUN (no writes — pass --apply to persist)');

    const total = await Post.countDocuments();
    const changes = await reconcilePostCounters({ apply: APPLY });

    for (const change of changes) {
      console.log(`Post ${change.postId}:`);
      console.log(`  commentCount: ${change.before.commentCount} -> ${change.after.commentCount}`);
      console.log(`  score:        ${change.before.score} -> ${change.after.score}`);
    }

    console.log(`\n${changes.length} of ${total} post(s) with counters ${APPLY ? 'updated' : 'would be updated'}.`);

    await mongoose.disconnect();
  })().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
