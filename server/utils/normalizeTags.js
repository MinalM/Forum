// Post tag limits, shared between the Post schema validators and controllers.
const MAX_TAG_LENGTH = 30;
const MAX_TAGS = 10;

// Trims whitespace, drops empties, and dedupes case-insensitively.
// Does NOT enforce MAX_TAG_LENGTH/MAX_TAGS — those are hard rejections
// handled by the Post schema validators so callers get a clear 400 instead
// of silently truncated data.
function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return tags;
  }

  const seen = new Set();
  const normalized = [];

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      continue;
    }

    const trimmed = tag.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

module.exports = { normalizeTags, MAX_TAG_LENGTH, MAX_TAGS };
