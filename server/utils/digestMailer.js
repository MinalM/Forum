const crypto = require('crypto');
const sendEmail = require('./sendEmail');

// Comfortably longer than the weekly cadence, so a digest that sits unread
// for a week still has a working unsubscribe link when the next one lands.
const UNSUBSCRIBE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Same shape as the forgot-password email's reset link (server/controllers/users.js):
// the server's own base URL, since this is composed outside of any HTTP
// request (a scheduled script has no `req` to read the host from).
function unsubscribeUrl(rawToken) {
  const serverUrl = (process.env.SERVER_URL || 'http://localhost:2000').replace(/\/$/, '');
  return `${serverUrl}/api/users/digest-unsubscribe/${rawToken}`;
}

function renderDigestText({ user, activity, unansweredQuestions }, unsubscribeLink) {
  const lines = [`Hi ${user.name},`, '', "Here's what's new since your last digest:"];

  for (const { post, comments } of activity) {
    lines.push('', post.title);
    for (const comment of comments) {
      const author = comment.author?.name || 'Someone';
      lines.push(`  - ${author}: ${comment.content}`);
    }
  }

  if (unansweredQuestions.length > 0) {
    lines.push('', 'Questions you might be able to answer:');
    for (const post of unansweredQuestions) {
      lines.push(`  - ${post.title}`);
    }
  }

  lines.push('', `Don't want these emails? Unsubscribe: ${unsubscribeLink}`);

  return lines.join('\n');
}

// Generates and persists a fresh one-click unsubscribe token for the
// digest's recipient, then sends the email. The token is single-use (the
// digest-unsubscribe endpoint clears it once consumed) and also expires on
// its own, independent of whether it's ever used.
async function sendDigestEmail(digest) {
  const { user } = digest;
  const rawToken = crypto.randomBytes(20).toString('hex');
  user.digestUnsubscribeToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.digestUnsubscribeExpire = Date.now() + UNSUBSCRIBE_TOKEN_TTL_MS;
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: user.email,
    subject: 'Your weekly AI/ML Career Forum digest',
    text: renderDigestText(digest, unsubscribeUrl(rawToken))
  });
}

// Sends every digest in `digests` (the output of
// server/utils/digestBuilder.js's buildWeeklyDigests) one at a time, so a
// slow SMTP provider isn't hit with a burst. One recipient's failure is
// logged and skipped rather than aborting the rest of the run. Returns the
// ids of users the email was actually sent to.
async function sendWeeklyDigestEmails(digests) {
  const sentTo = [];

  for (const digest of digests) {
    try {
      await sendDigestEmail(digest);
      sentTo.push(digest.user._id);
    } catch (err) {
      console.error(`Failed to send weekly digest to ${digest.user.email}:`, err);
    }
  }

  return sentTo;
}

module.exports = { sendDigestEmail, sendWeeklyDigestEmails, UNSUBSCRIBE_TOKEN_TTL_MS };
