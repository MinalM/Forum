#!/usr/bin/env node
/**
 * Scheduled entry point for the weekly digest: finds every member (opt-outs
 * are filtered by buildDigestForUser itself), builds each one's digest via
 * server/utils/digestBuilder.js, and sends it via
 * server/utils/digestMailer.js. Not wired to a live cron yet - a human or
 * infra scheduler runs this manually or on a recurring job:
 *
 *   MONGO_URI="mongodb://<host>/<db>" node scripts/send-weekly-digest.js
 *
 * `since` defaults to 7 days ago; pass --since=<ISO date> to cover a
 * different window (e.g. re-running after a missed week).
 */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const User = require('../server/models/User');
const { buildWeeklyDigests } = require('../server/utils/digestBuilder');
const { sendWeeklyDigestEmails } = require('../server/utils/digestMailer');

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Reads --since=<ISO date> out of an argv list, defaulting to 7 days ago.
// Throws on a value that doesn't parse, rather than silently sending a
// digest for the wrong window.
function parseSinceArg(argv) {
  const arg = argv.find(a => a.startsWith('--since='));
  if (!arg) {
    return new Date(Date.now() - ONE_WEEK_MS);
  }

  const since = new Date(arg.slice('--since='.length));
  if (Number.isNaN(since.getTime())) {
    throw new Error(`Invalid --since date: ${arg}`);
  }

  return since;
}

// Builds and sends this run's digest to every eligible member. Assumes a
// mongoose connection is already open. Returns the ids of users the digest
// was actually sent to - opted-out users and users with nothing new are
// skipped by buildWeeklyDigests, not counted as failures.
async function runWeeklyDigest({ since }) {
  const users = await User.find();
  const digests = await buildWeeklyDigests(users, since);
  return sendWeeklyDigestEmails(digests);
}

module.exports = { runWeeklyDigest, parseSinceArg };

if (require.main === module) {
  (async () => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum';
    await mongoose.connect(uri);
    console.log(`Connected to ${uri}`);

    const since = parseSinceArg(process.argv.slice(2));
    console.log(`Building weekly digests for activity since ${since.toISOString()}`);

    const sentTo = await runWeeklyDigest({ since });
    console.log(`Sent ${sentTo.length} digest email(s).`);

    await mongoose.disconnect();
  })().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
