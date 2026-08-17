#!/usr/bin/env node
/**
 * One-off cleanup for posts whose `tags` array was polluted by an earlier
 * seeding bug (category name/description fragments stored as tags — long,
 * comma-split phrases like "deep learning topics related to neural
 * networks"). Not run automatically by any npm script or CI job.
 *
 * A human must run this manually against a target database:
 *
 *   MONGO_URI="mongodb://<host>/<db>" node scripts/cleanup-post-tags.js
 *
 * By default this is a DRY RUN: it reports what would change but writes
 * nothing. Pass --apply to persist the changes:
 *
 *   MONGO_URI="mongodb://<host>/<db>" node scripts/cleanup-post-tags.js --apply
 *
 * What it does, per post:
 *   - trims whitespace and drops empty tags
 *   - dedupes tags case-insensitively
 *   - drops any tag longer than MAX_TAG_LENGTH (this is what removes the
 *     category-description fragments — they're all far longer than a real
 *     tag)
 *   - keeps at most MAX_TAGS tags (first N survive)
 * Only posts whose tags actually change are touched.
 */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const { normalizeTags, MAX_TAG_LENGTH, MAX_TAGS } = require('../server/utils/normalizeTags');
const Post = require('../server/models/Post');

const APPLY = process.argv.includes('--apply');

function cleanTags(tags) {
  return normalizeTags(tags)
    .filter(tag => tag.length <= MAX_TAG_LENGTH)
    .slice(0, MAX_TAGS);
}

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum';
  await mongoose.connect(uri);
  console.log(`Connected to ${uri}`);
  console.log(APPLY ? 'Mode: APPLY (writing changes)' : 'Mode: DRY RUN (no writes — pass --apply to persist)');

  const posts = await Post.find({ tags: { $exists: true, $ne: [] } }).select('_id tags');
  let changed = 0;

  for (const post of posts) {
    const before = post.tags || [];
    const after = cleanTags(before);

    const isSame =
      before.length === after.length && before.every((tag, i) => tag === after[i]);

    if (isSame) {
      continue;
    }

    changed += 1;
    console.log(`Post ${post._id}:`);
    console.log(`  before: ${JSON.stringify(before)}`);
    console.log(`  after:  ${JSON.stringify(after)}`);

    if (APPLY) {
      await Post.updateOne({ _id: post._id }, { $set: { tags: after } });
    }
  }

  console.log(`\n${changed} of ${posts.length} post(s) with tags ${APPLY ? 'updated' : 'would be updated'}.`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
