#!/usr/bin/env node
/**
 * One-off cleanup for the tag pollution `scripts/cleanup-post-tags.js` (#33)
 * cannot remove: whole category name/description phrases and their
 * comma-split fragments stored as post tags (e.g. "deep learning topics
 * related to neural networks", "and applications", "algorithms"), plus the
 * fixed junk tokens "discussion" and "help" present on every affected post.
 * See BACKLOG.md for the full writeup and the live examples this targets.
 * Not run automatically by any npm script or CI job.
 *
 * A human must run this manually against a target database:
 *
 *   MONGO_URI="mongodb://<host>/<db>" node scripts/cleanup-post-tag-pollution.js
 *
 * By default this is a DRY RUN: it reports what would change but writes
 * nothing. Pass --apply to persist the changes:
 *
 *   MONGO_URI="mongodb://<host>/<db>" node scripts/cleanup-post-tag-pollution.js --apply
 *
 * What it does, per post:
 *   - builds the pollution set from the *live* Category collection (name,
 *     description, and each comma-split fragment of the description — see
 *     server/utils/tagPollution.js)
 *   - drops any tag matching that pollution set, or a bare "and ..."
 *     fragment, case/whitespace-insensitively
 *   - also applies `normalizeTags` and the existing MAX_TAG_LENGTH/MAX_TAGS
 *     caps from `scripts/cleanup-post-tags.js`, so one run does the full
 *     tag cleanup rather than requiring both scripts back to back
 * Only posts whose tags actually change are touched. Never touches
 * Category documents.
 */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const { normalizeTags, MAX_TAG_LENGTH, MAX_TAGS } = require('../server/utils/normalizeTags');
const { buildPollutionSet, removePollutedTags } = require('../server/utils/tagPollution');
const Post = require('../server/models/Post');
const Category = require('../server/models/Category');

const APPLY = process.argv.includes('--apply');

// Exported for tests: pure, no DB access.
function cleanTags(tags, pollutionSet) {
  return removePollutedTags(normalizeTags(tags), pollutionSet)
    .filter((tag) => tag.length <= MAX_TAG_LENGTH)
    .slice(0, MAX_TAGS);
}

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum';
  await mongoose.connect(uri);
  console.log(`Connected to ${uri}`);
  console.log(APPLY ? 'Mode: APPLY (writing changes)' : 'Mode: DRY RUN (no writes — pass --apply to persist)');

  const categories = await Category.find().select('name description');
  const pollutionSet = buildPollutionSet(categories);
  console.log(`Built pollution set from ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}.`);

  const posts = await Post.find({ tags: { $exists: true, $ne: [] } }).select('_id tags');
  let changed = 0;

  for (const post of posts) {
    const before = post.tags || [];
    const after = cleanTags(before, pollutionSet);

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

module.exports = { cleanTags };

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
