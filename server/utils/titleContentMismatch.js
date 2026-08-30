// A post's `content` occasionally opens with a literal "Title: <subject>"
// line naming a different subject than the post's own `title` — the
// title/content pairing shuffle described in BACKLOG.md. Shared between the
// Post schema validator (rejects it going forward) and the audit script
// (reports it for already-seeded data).
const TITLE_LINE_PATTERN = /^\s*Title:\s*(.+?)\s*(?:\r?\n|$)/;

// Returns the subject named by a leading "Title: ..." line in `content`, or
// null if content has no such line.
function extractEmbeddedTitle(content) {
  if (typeof content !== 'string') {
    return null;
  }

  const match = TITLE_LINE_PATTERN.exec(content);
  return match ? match[1].trim() : null;
}

// True when content opens with a "Title: X" line whose subject differs from
// the post's own title (case/whitespace-insensitive). False when content has
// no such line at all — most posts don't, and that's not a mismatch.
function isTitleContentMismatch(title, content) {
  const embedded = extractEmbeddedTitle(content);
  if (embedded === null) {
    return false;
  }

  return embedded.toLowerCase() !== (title || '').trim().toLowerCase();
}

module.exports = { extractEmbeddedTitle, isTitleContentMismatch };
